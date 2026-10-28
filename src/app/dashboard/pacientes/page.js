'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PatientModal from '@/components/PatientModal';
import { dbService, isSupabaseConfigured } from '@/lib/supabaseClient';
import { calculateAge } from '@/lib/norms';

export default function PacientesPage() {
  const router = useRouter();

  // Estados de dados
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros e busca
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('todos'); // 'todos' | 'com-tac' | 'com-tnvri' | 'sem-aplicacao'

  // Modais
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [selectedPatientForTest, setSelectedPatientForTest] = useState(null);
  const [selectedTestType, setSelectedTestType] = useState('TAC');

  // Modal Ficha do Paciente
  const [viewingPatient, setViewingPatient] = useState(null);

  // Modal Excluir Paciente
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // 1. Carregamento dos dados
  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await dbService.getCurrentUser();
      setUser(currentUser);

      const { data: pats } = await dbService.getPatients();
      const { data: sess } = await dbService.getRecentSessions();

      setPatients(pats || []);
      setSessions(sess || []);
    } catch (err) {
      console.error('Erro ao carregar dados de pacientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 2. Ações do Avaliador
  const handleLogout = async () => {
    await dbService.logout();
    router.push('/login');
  };

  const handleStartTestForPatient = async (patientId, testType) => {
    const { data: session, error } = await dbService.createSession(patientId, testType);
    if (error) {
      alert('Erro ao iniciar teste: ' + error.message);
      return;
    }
    if (testType === 'TNVRI') {
      router.push(`/teste/tnvri/${session.id}`);
    } else {
      router.push(`/teste/tac/${session.id}`);
    }
  };

  const handleDeletePatient = async () => {
    if (!patientToDelete) return;
    setIsDeleting(true);
    try {
      await dbService.deletePatient(patientToDelete.id);
      setPatientToDelete(null);
      await loadData();
      setToastMessage('Paciente excluído com sucesso.');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      alert('Erro ao excluir paciente: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // 3. Enriquecimento de cada paciente com o histórico de testes
  const enrichedPatients = useMemo(() => {
    return patients.map(p => {
      const pSessions = sessions.filter(s => s.patient_id === p.id);
      const completedSessions = pSessions.filter(s => s.status === 'concluido');

      const hasTac = completedSessions.some(s => s.test_type !== 'TNVRI');
      const hasTnvri = completedSessions.some(s => s.test_type === 'TNVRI');

      // Última sessão
      const sorted = [...completedSessions].sort((a, b) => {
        return new Date(b.applied_at || b.created_at) - new Date(a.applied_at || a.created_at);
      });
      const lastSession = sorted[0];

      let lastDate = '—';
      let lastScoreText = '—';

      if (lastSession) {
        lastDate = new Date(lastSession.applied_at || lastSession.created_at).toLocaleDateString('pt-BR');
        if (lastSession.test_type === 'TNVRI') {
          const res = lastSession.tnvri_results?.[0];
          lastScoreText = res ? `${res.total_hits} / ${res.total_items} · TNVRI` : 'Concluído · TNVRI';
        } else {
          const res = lastSession.tac_results?.[0];
          lastScoreText = res ? `${res.total_net_score} pts · TAC` : 'Concluído · TAC';
        }
      }

      return {
        ...p,
        totalApplications: completedSessions.length,
        hasTac,
        hasTnvri,
        lastDate,
        lastScoreText,
        pSessions
      };
    });
  }, [patients, sessions]);

  // Contagens para os botões de filtro
  const countAll = enrichedPatients.length;
  const countWithTac = enrichedPatients.filter(p => p.hasTac).length;
  const countWithTnvri = enrichedPatients.filter(p => p.hasTnvri).length;
  const countWithoutApp = enrichedPatients.filter(p => p.totalApplications === 0).length;

  // Filtragem combinada (Busca + Filtro de Status)
  const filteredPatients = useMemo(() => {
    return enrichedPatients.filter(p => {
      // 1. Filtro de texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (p.full_name || '').toLowerCase().includes(q);
        const matchEdu = (p.education_level || '').toLowerCase().includes(q);
        if (!matchName && !matchEdu) return false;
      }

      // 2. Filtro de categoria
      if (activeFilter === 'com-tac') return p.hasTac;
      if (activeFilter === 'com-tnvri') return p.hasTnvri;
      if (activeFilter === 'sem-aplicacao') return p.totalApplications === 0;

      return true;
    });
  }, [enrichedPatients, searchQuery, activeFilter]);

  // Dados do usuário para a barra lateral
  const userFullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Arlindo Neto';
  const initials = userFullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || 'AN';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'stretch',
      background: '#f4f6f0',
      color: '#28352c',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      fontSize: '16px',
      lineHeight: '24px'
    }}>
      {/* 1. BARRA LATERAL (ASIDE) */}
      <aside style={{
        flex: '1 1 264px',
        maxWidth: '100%',
        boxSizing: 'border-box',
        background: '#e9ede3',
        borderRight: '1px solid #d6dccd',
        padding: '28px 16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px'
      }}>
        <Link href="/dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 12px', textDecoration: 'none', color: '#28352c' }}>
          <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '28px', lineHeight: '32px', fontWeight: 560, letterSpacing: '-0.01em' }}>
            AVN
          </span>
          <span style={{ fontSize: '12px', lineHeight: '16px', color: '#566152' }}>
            Painel clínico de avaliação
          </span>
        </Link>

        <nav aria-label="Principal" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Link
            href="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0 12px',
              minHeight: '44px',
              borderRadius: '8px',
              color: '#28352c',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none'
            }}
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1"></rect>
              <rect x="14" y="3" width="7" height="5" rx="1"></rect>
              <rect x="14" y="12" width="7" height="9" rx="1"></rect>
              <rect x="3" y="16" width="7" height="5" rx="1"></rect>
            </svg>
            Painel
          </Link>
          <Link
            href="/dashboard/pacientes"
            aria-current="page"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0 12px',
              minHeight: '44px',
              borderRadius: '8px',
              background: '#dafeaa',
              color: '#22512a',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Pacientes
          </Link>
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0 12px',
            fontSize: '12px',
            lineHeight: '16px',
            color: isSupabaseConfigured ? '#2f6b31' : '#b45309',
            fontWeight: 600
          }}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"></circle>
              <polyline points="8 12.5 11 15.5 16 9.5"></polyline>
            </svg>
            {isSupabaseConfigured ? 'Banco de dados conectado' : 'Modo Local (Demo)'}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#ffffff', border: '1px solid #d6dccd', borderRadius: '14px' }}>
            <span aria-hidden="true" style={{ width: '36px', height: '36px', flexShrink: 0, borderRadius: '50%', background: '#dafeaa', color: '#22512a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '13px' }}>
              {initials}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userFullName}
              </span>
              <span style={{ fontSize: '12px', color: '#566152' }}>Avaliador</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sair"
              style={{
                width: '44px',
                height: '44px',
                flexShrink: 0,
                borderRadius: '8px',
                border: '1px solid #7d8775',
                background: '#ffffff',
                color: '#28352c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Encerrar sessão"
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* 2. ÁREA PRINCIPAL (MAIN) */}
      <main style={{ flex: '999 1 560px', minWidth: 0, boxSizing: 'border-box', padding: '48px 48px 64px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* Cabeçalho */}
          <section style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '640px' }}>
              <h1 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontSize: '32px', lineHeight: '38px', fontWeight: 560, letterSpacing: '-0.01em' }}>
                Pacientes
              </h1>
              <p style={{ margin: 0, color: '#566152' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", color: '#28352c', fontWeight: 600 }}>
                  {patients.length}
                </span> pacientes cadastrados. Abra a ficha para ver o histórico ou aplique um teste.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsPatientModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 16px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 0,
                background: '#2f6b31',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                cursor: 'pointer'
              }}
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Novo paciente
            </button>
          </section>

          {/* Busca e Filtros */}
          <section aria-label="Busca e filtros" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 12px',
              minHeight: '44px',
              borderRadius: '8px',
              border: '1px solid #7d8775',
              background: '#e9ede3',
              color: '#566152',
              flex: '1 1 320px',
              maxWidth: '460px',
              boxSizing: 'border-box'
            }}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                Buscar paciente
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome"
                style={{
                  border: 0,
                  outline: 'none',
                  background: 'transparent',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  color: '#28352c',
                  flex: 1,
                  minWidth: 0
                }}
              />
            </label>

            <div role="group" aria-label="Filtrar pacientes" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveFilter('todos')}
                aria-pressed={activeFilter === 'todos'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 14px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: activeFilter === 'todos' ? '1px solid #2f6b31' : '1px solid #7d8775',
                  background: activeFilter === 'todos' ? '#dafeaa' : '#ffffff',
                  color: activeFilter === 'todos' ? '#22512a' : '#28352c',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  cursor: 'pointer'
                }}
              >
                Todos <span style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontWeight: 500 }}>{countAll}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('com-tac')}
                aria-pressed={activeFilter === 'com-tac'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 14px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: activeFilter === 'com-tac' ? '1px solid #2f6b31' : '1px solid #7d8775',
                  background: activeFilter === 'com-tac' ? '#dafeaa' : '#ffffff',
                  color: activeFilter === 'com-tac' ? '#22512a' : '#28352c',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  cursor: 'pointer'
                }}
              >
                Com TAC <span style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontWeight: 500, color: activeFilter === 'com-tac' ? '#22512a' : '#566152' }}>{countWithTac}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('com-tnvri')}
                aria-pressed={activeFilter === 'com-tnvri'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 14px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: activeFilter === 'com-tnvri' ? '1px solid #2f6b31' : '1px solid #7d8775',
                  background: activeFilter === 'com-tnvri' ? '#dafeaa' : '#ffffff',
                  color: activeFilter === 'com-tnvri' ? '#22512a' : '#28352c',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  cursor: 'pointer'
                }}
              >
                Com TNVRI <span style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontWeight: 500, color: activeFilter === 'com-tnvri' ? '#22512a' : '#566152' }}>{countWithTnvri}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('sem-aplicacao')}
                aria-pressed={activeFilter === 'sem-aplicacao'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 14px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: activeFilter === 'sem-aplicacao' ? '1px solid #2f6b31' : '1px solid #7d8775',
                  background: activeFilter === 'sem-aplicacao' ? '#dafeaa' : '#ffffff',
                  color: activeFilter === 'sem-aplicacao' ? '#22512a' : '#28352c',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  cursor: 'pointer'
                }}
              >
                Sem aplicação <span style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontWeight: 500, color: activeFilter === 'sem-aplicacao' ? '#22512a' : '#566152' }}>{countWithoutApp}</span>
              </button>
            </div>
          </section>

          {/* Tabela de Pacientes */}
          <section aria-label="Lista de pacientes" style={{ background: '#ffffff', border: '1px solid #d6dccd', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(27, 38, 28, 0.06), 0 2px 8px rgba(27, 38, 28, 0.05)' }}>
            <div style={{ overflowX: 'auto' }}>
              {filteredPatients.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: '#566152' }}>
                  <p style={{ margin: 0, fontSize: '15px' }}>
                    {searchQuery ? `Nenhum paciente encontrado para "${searchQuery}".` : 'Nenhum paciente nesta categoria.'}
                  </p>
                </div>
              ) : (
                <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f4f6f0' }}>
                      <th scope="col" style={{ textAlign: 'left', padding: '12px 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: '#566152', letterSpacing: '0.02em' }}>Paciente</th>
                      <th scope="col" style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: '#566152', letterSpacing: '0.02em' }}>Testes</th>
                      <th scope="col" style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: '#566152', letterSpacing: '0.02em' }}>Última aplicação</th>
                      <th scope="col" style={{ textAlign: 'right', padding: '12px 16px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: '#566152', letterSpacing: '0.02em' }}>Último escore</th>
                      <th scope="col" style={{ textAlign: 'right', padding: '12px 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: '#566152', letterSpacing: '0.02em' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((patient) => {
                      const patientName = patient.full_name || 'Paciente';
                      const initial = patientName.charAt(0).toUpperCase() || 'P';

                      return (
                        <tr key={patient.id} style={{ borderTop: '1px solid #d6dccd' }}>
                          <td style={{ padding: '16px 24px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span aria-hidden="true" style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '50%', background: '#e9ede3', color: '#28352c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '15px' }}>
                                {initial}
                              </span>
                              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                                <button
                                  type="button"
                                  onClick={() => setViewingPatient(patient)}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    padding: 0,
                                    margin: 0,
                                    textAlign: 'left',
                                    fontWeight: 600,
                                    fontSize: '15px',
                                    color: '#28352c',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {patientName}
                                </button>
                                <span style={{ fontSize: '12px', color: '#566152' }}>
                                  {patient.totalApplications === 0
                                    ? 'Nenhuma aplicação'
                                    : `${patient.totalApplications} ${patient.totalApplications === 1 ? 'aplicação' : 'aplicações'}`}
                                </span>
                              </span>
                            </span>
                          </td>

                          <td style={{ padding: '16px' }}>
                            <span style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {patient.hasTac ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '4px', background: '#e4eaf2', color: '#2e4c78', fontSize: '12px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em' }}>
                                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                  TAC
                                </span>
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '4px', border: '1px dashed #7d8775', color: '#566152', fontSize: '12px', lineHeight: '14px', fontWeight: 600, letterSpacing: '0.02em' }}>
                                  TAC pendente
                                </span>
                              )}

                              {patient.hasTnvri ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '4px', background: '#efe7f0', color: '#6a4870', fontSize: '12px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em' }}>
                                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                  TNVRI
                                </span>
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '4px', border: '1px dashed #7d8775', color: '#566152', fontSize: '12px', lineHeight: '14px', fontWeight: 600, letterSpacing: '0.02em' }}>
                                  TNVRI pendente
                                </span>
                              )}
                            </span>
                          </td>

                          <td style={{ padding: '16px', fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: '14px', color: patient.lastDate !== '—' ? '#28352c' : '#566152' }}>
                            {patient.lastDate}
                          </td>

                          <td style={{ padding: '16px', textAlign: 'right', fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                            {patient.lastScoreText !== '—' ? (
                              <span style={{ fontSize: '15px', fontWeight: 600, color: '#28352c' }}>
                                {patient.lastScoreText}
                              </span>
                            ) : (
                              <span style={{ color: '#566152' }}>—</span>
                            )}
                          </td>

                          <td style={{ padding: '16px 24px' }}>
                            <span style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => setViewingPatient(patient)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '0 14px',
                                  minHeight: '44px',
                                  borderRadius: '8px',
                                  border: '1px solid #7d8775',
                                  background: '#ffffff',
                                  color: '#28352c',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  letterSpacing: '0.02em',
                                  cursor: 'pointer'
                                }}
                              >
                                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                  <rect x="8" y="2" width="8" height="4" rx="1"></rect>
                                  <line x1="8" y1="12" x2="16" y2="12"></line>
                                  <line x1="8" y1="16" x2="13" y2="16"></line>
                                </svg>
                                Abrir ficha
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedPatientForTest(patient)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '0 14px',
                                  minHeight: '44px',
                                  borderRadius: '8px',
                                  border: 0,
                                  background: '#2f6b31',
                                  color: '#ffffff',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  letterSpacing: '0.02em',
                                  cursor: 'pointer'
                                }}
                              >
                                Aplicar teste
                              </button>

                              <button
                                type="button"
                                onClick={() => setPatientToDelete(patient)}
                                aria-label={`Excluir paciente ${patientName}`}
                                style={{
                                  width: '44px',
                                  height: '44px',
                                  borderRadius: '8px',
                                  border: '1px solid #7d8775',
                                  background: '#ffffff',
                                  color: '#a8261d',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                                title="Excluir paciente"
                              >
                                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                                  <path d="M10 11v6"></path>
                                  <path d="M14 11v6"></path>
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                                </svg>
                              </button>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 24px', borderTop: '1px solid #d6dccd', background: '#f4f6f0' }}>
              <span style={{ fontSize: '12px', lineHeight: '16px', color: '#566152' }}>
                Mostrando <span style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", color: '#28352c', fontWeight: 600 }}>{filteredPatients.length}</span> de <span style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", color: '#28352c', fontWeight: 600 }}>{patients.length}</span> pacientes
              </span>
            </div>
          </section>

        </div>
      </main>

      {/* MODAL: SELECIONAR TESTE PARA O PACIENTE */}
      {selectedPatientForTest && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(40, 53, 44, 0.45)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '32px',
            boxShadow: '0 20px 30px rgba(27, 38, 28, 0.15)',
            border: '1px solid #d6dccd'
          }}>
            <h2 style={{ margin: '0 0 8px 0', fontFamily: "'Fraunces', Georgia, serif", fontSize: '24px', lineHeight: '30px', fontWeight: 560 }}>
              Aplicar Teste
            </h2>
            <p style={{ margin: '0 0 20px 0', color: '#566152', fontSize: '14px', lineHeight: '20px' }}>
              Escolha qual avaliação neuropsicológica deseja aplicar para <strong>{selectedPatientForTest.full_name}</strong>:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              {/* Opção TAC */}
              <button
                type="button"
                onClick={() => setSelectedTestType('TAC')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: selectedTestType === 'TAC' ? '2px solid #2f6b31' : '1px solid #d6dccd',
                  background: selectedTestType === 'TAC' ? '#dafeaa' : '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <span style={{ display: 'block', fontWeight: 600, fontSize: '15px', color: '#28352c', marginBottom: '4px' }}>
                  TAC
                </span>
                <span style={{ fontSize: '12px', color: '#566152', lineHeight: 1.3 }}>
                  Atenção por Cancelamento
                </span>
              </button>

              {/* Opção TNVRI */}
              <button
                type="button"
                onClick={() => setSelectedTestType('TNVRI')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: selectedTestType === 'TNVRI' ? '2px solid #2f6b31' : '1px solid #d6dccd',
                  background: selectedTestType === 'TNVRI' ? '#dafeaa' : '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <span style={{ display: 'block', fontWeight: 600, fontSize: '15px', color: '#28352c', marginBottom: '4px' }}>
                  TNVRI
                </span>
                <span style={{ fontSize: '12px', color: '#566152', lineHeight: 1.3 }}>
                  Raciocínio Não-Verbal
                </span>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setSelectedPatientForTest(null)}
                style={{
                  padding: '0 16px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: '1px solid #7d8775',
                  background: '#ffffff',
                  color: '#28352c',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleStartTestForPatient(selectedPatientForTest.id, selectedTestType)}
                style={{
                  padding: '0 20px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: 0,
                  background: '#2f6b31',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Iniciar Aplicação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FICHA DO PACIENTE */}
      {viewingPatient && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(40, 53, 44, 0.45)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            padding: '32px',
            boxShadow: '0 20px 30px rgba(27, 38, 28, 0.15)',
            border: '1px solid #d6dccd'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <span aria-hidden="true" style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e9ede3', color: '#28352c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '18px' }}>
                {viewingPatient.full_name?.charAt(0).toUpperCase() || 'P'}
              </span>
              <div>
                <h2 style={{ margin: '0 0 2px 0', fontFamily: "'Fraunces', Georgia, serif", fontSize: '22px', lineHeight: '28px', fontWeight: 560 }}>
                  {viewingPatient.full_name}
                </h2>
                <span style={{ fontSize: '13px', color: '#566152' }}>
                  Ficha Cadastral e Psicométrica
                </span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '14px',
              padding: '16px',
              background: '#f4f6f0',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '13px'
            }}>
              <div>
                <span style={{ color: '#566152', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Idade Cronológica</span>
                <strong>{calculateAge(viewingPatient.birth_date).formatted}</strong>
              </div>
              <div>
                <span style={{ color: '#566152', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Escolaridade / Tipo</span>
                <strong>{viewingPatient.education_level || 'Não informada'} ({viewingPatient.school_type || 'Geral'})</strong>
              </div>
              <div>
                <span style={{ color: '#566152', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Data de Nascimento</span>
                <strong>{viewingPatient.birth_date ? new Date(viewingPatient.birth_date).toLocaleDateString('pt-BR') : '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#566152', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lateralidade / Sexo</span>
                <strong>{viewingPatient.handedness || 'Destro'} · {viewingPatient.gender === 'F' ? 'Feminino' : viewingPatient.gender === 'M' ? 'Masculino' : 'Outro'}</strong>
              </div>
            </div>

            {viewingPatient.clinical_notes && (
              <div style={{ marginBottom: '20px' }}>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#566152', marginBottom: '4px' }}>Observações Clínicas</span>
                <p style={{ margin: 0, fontSize: '13px', color: '#28352c', background: '#ffffff', padding: '10px', border: '1px solid #d6dccd', borderRadius: '8px' }}>
                  {viewingPatient.clinical_notes}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setViewingPatient(null)}
                style={{
                  padding: '0 16px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: '1px solid #7d8775',
                  background: '#ffffff',
                  color: '#28352c',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Fechar Ficha
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = viewingPatient;
                  setViewingPatient(null);
                  setSelectedPatientForTest(p);
                }}
                style={{
                  padding: '0 18px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: 0,
                  background: '#2f6b31',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Aplicar Teste Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO DE PACIENTE */}
      {patientToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(40, 53, 44, 0.45)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '440px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 30px rgba(27, 38, 28, 0.15)',
            border: '1px solid #d6dccd'
          }}>
            <h3 style={{ margin: '0 0 10px 0', fontFamily: "'Fraunces', Georgia, serif", fontSize: '20px', color: '#28352c' }}>
              Excluir Paciente?
            </h3>
            <p style={{ margin: '0 0 24px 0', color: '#566152', fontSize: '14px', lineHeight: 1.5 }}>
              Tem certeza que deseja excluir <strong>{patientToDelete.full_name}</strong>? Todas as sessões e relatórios deste paciente também serão removidos.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setPatientToDelete(null)}
                style={{
                  padding: '0 16px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: '1px solid #7d8775',
                  background: '#ffffff',
                  color: '#28352c',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeletePatient}
                disabled={isDeleting}
                style={{
                  padding: '0 18px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: 0,
                  background: '#a8261d',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.7 : 1
                }}
              >
                {isDeleting ? 'Excluindo...' : 'Excluir Paciente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Cadastrar Novo Paciente */}
      <PatientModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onPatientSaved={() => {
          loadData();
          setToastMessage('Paciente cadastrado com sucesso!');
          setTimeout(() => setToastMessage(null), 3500);
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#22512a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 10000,
          fontSize: '14px',
          fontWeight: 500
        }}>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
