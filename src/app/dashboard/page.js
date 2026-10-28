'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PatientModal from '@/components/PatientModal';
import DeleteSessionModal from '@/components/DeleteSessionModal';
import { dbService, isSupabaseConfigured } from '@/lib/supabaseClient';

export default function DashboardPage() {
  const router = useRouter();

  // Estados de dados
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de busca e filtros
  const [searchQuery, setSearchQuery] = useState('');

  // Modais
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isSelectPatientOpen, setIsSelectPatientOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedTestType, setSelectedTestType] = useState('TAC');

  // Estado de exclusão e notificações
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // 1. Carrega dados do sistema
  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await dbService.getCurrentUser();
      setUser(currentUser);

      const { data: pats } = await dbService.getPatients();
      const { data: sess } = await dbService.getRecentSessions();

      setPatients(pats || []);
      setRecentSessions(sess || []);

      if (pats && pats.length > 0 && !selectedPatientId) {
        setSelectedPatientId(pats[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 2. Ações de navegação e teste
  const handleStartTest = async (patientId, testType = selectedTestType) => {
    const pId = patientId || selectedPatientId;
    if (!pId) {
      setIsPatientModalOpen(true);
      return;
    }
    const { data: session, error } = await dbService.createSession(pId, testType);
    if (error) {
      alert('Erro ao iniciar sessão: ' + error.message);
      return;
    }
    if (testType === 'TNVRI') {
      router.push(`/teste/tnvri/${session.id}`);
    } else {
      router.push(`/teste/tac/${session.id}`);
    }
  };

  const handleOpenStartModal = (testType) => {
    setSelectedTestType(testType);
    setIsSelectPatientOpen(true);
  };

  const handleLogout = async () => {
    await dbService.logout();
    router.push('/login');
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await dbService.deleteSession(sessionToDelete.id);
      if (error) {
        alert('Erro ao excluir teste: ' + error.message);
      } else {
        setSessionToDelete(null);
        await loadData();
        setToastMessage('Teste excluído com sucesso.');
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (err) {
      alert('Erro ao excluir teste: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // 3. Cálculos e métricas do painel
  const totalPatients = patients.length;
  const completedTacTests = recentSessions.filter(s => s.test_type !== 'TNVRI' && s.status === 'concluido').length;
  const completedTnvriTests = recentSessions.filter(s => s.test_type === 'TNVRI' && s.status === 'concluido').length;

  const avgScoreTac = recentSessions.length > 0
    ? Math.round(
        recentSessions
          .filter(s => s.test_type !== 'TNVRI')
          .reduce((acc, s) => acc + (s.tac_results?.[0]?.total_net_score || 0), 0) /
        Math.max(1, completedTacTests)
      )
    : 0;

  // Últimas datas de aplicação
  const lastTacSession = recentSessions.find(s => s.test_type !== 'TNVRI');
  const lastTacDate = lastTacSession
    ? new Date(lastTacSession.applied_at || lastTacSession.created_at).toLocaleDateString('pt-BR')
    : null;

  const lastTnvriSession = recentSessions.find(s => s.test_type === 'TNVRI');
  const lastTnvriDate = lastTnvriSession
    ? new Date(lastTnvriSession.applied_at || lastTnvriSession.created_at).toLocaleDateString('pt-BR')
    : null;

  // Saudação e data atual formatada em português
  const now = new Date();
  const rawDateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const formattedDate = rawDateStr.charAt(0).toUpperCase() + rawDateStr.slice(1);

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const userFullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Arlindo Neto';
  const userFirstName = userFullName.split(' ')[0] || 'Arlindo';

  const initials = userFullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || 'AN';

  // Filtro de sessões pela busca de paciente
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return recentSessions;
    const q = searchQuery.toLowerCase().trim();
    return recentSessions.filter(s => {
      const pName = (s.patients?.full_name || '').toLowerCase();
      return pName.includes(q);
    });
  }, [recentSessions, searchQuery]);

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
        {/* Marca / Identidade */}
        <Link href="/dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 12px', textDecoration: 'none', color: '#28352c' }}>
          <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '28px', lineHeight: '32px', fontWeight: 560, letterSpacing: '-0.01em' }}>
            AVN
          </span>
          <span style={{ fontSize: '12px', lineHeight: '16px', color: '#566152' }}>
            Painel clínico de avaliação
          </span>
        </Link>

        {/* Navegação Principal */}
        <nav aria-label="Principal" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Link
            href="/dashboard"
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
              <rect x="3" y="3" width="7" height="9" rx="1"></rect>
              <rect x="14" y="3" width="7" height="5" rx="1"></rect>
              <rect x="14" y="12" width="7" height="9" rx="1"></rect>
              <rect x="3" y="16" width="7" height="5" rx="1"></rect>
            </svg>
            Painel
          </Link>
          <Link
            href="/dashboard/pacientes"
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Pacientes
          </Link>
        </nav>

        {/* Rodapé da Sidebar */}
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
              <span style={{ fontSize: '12px', lineHeight: '16px', color: '#566152' }}>
                {formattedDate}
              </span>
              <h1 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontSize: '32px', lineHeight: '38px', fontWeight: 560, letterSpacing: '-0.01em' }}>
                {greeting}, {userFirstName}
              </h1>
              <p style={{ margin: 0, color: '#566152' }}>
                Acompanhe seus pacientes e aplique o Teste de Atenção por Cancelamento (TAC) e o Teste Não-Verbal de Raciocínio Infantil (TNVRI).
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                minWidth: '240px',
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
                  placeholder="Buscar paciente"
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
            </div>
          </section>

          {/* Resumo Psicométrico */}
          <section aria-label="Resumo" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #d6dccd', borderRadius: '14px', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 2px rgba(27, 38, 28, 0.06), 0 2px 8px rgba(27, 38, 28, 0.05)' }}>
              <span style={{ fontSize: '13px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em', color: '#566152' }}>
                Pacientes cadastrados
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: '30px', lineHeight: '36px', fontWeight: 500 }}>
                {totalPatients}
              </span>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #d6dccd', borderRadius: '14px', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 2px rgba(27, 38, 28, 0.06), 0 2px 8px rgba(27, 38, 28, 0.05)' }}>
              <span style={{ fontSize: '13px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em', color: '#566152' }}>
                TAC concluídos
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: '30px', lineHeight: '36px', fontWeight: 500, color: '#2e4c78' }}>
                {completedTacTests}
              </span>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #d6dccd', borderRadius: '14px', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 2px rgba(27, 38, 28, 0.06), 0 2px 8px rgba(27, 38, 28, 0.05)' }}>
              <span style={{ fontSize: '13px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em', color: '#566152' }}>
                TNVRI concluídos
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: '30px', lineHeight: '36px', fontWeight: 500, color: '#6a4870' }}>
                {completedTnvriTests}
              </span>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #d6dccd', borderRadius: '14px', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 2px rgba(27, 38, 28, 0.06), 0 2px 8px rgba(27, 38, 28, 0.05)' }}>
              <span style={{ fontSize: '13px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em', color: '#566152' }}>
                Média de escore TAC
              </span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                <span style={{ fontSize: '30px', lineHeight: '36px', fontWeight: 500 }}>
                  {avgScoreTac > 0 ? avgScoreTac : '--'}
                </span>
                <span style={{ fontSize: '14px', color: '#566152' }}>pts</span>
              </span>
            </div>
          </section>

          {/* Cards: Aplicar Teste */}
          <section aria-labelledby="testes" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 id="testes" style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontSize: '22px', lineHeight: '28px', fontWeight: 560 }}>
              Aplicar teste
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
              {/* Card TAC */}
              <article style={{ background: '#ffffff', border: '1px solid #d6dccd', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 1px 2px rgba(27, 38, 28, 0.06), 0 2px 8px rgba(27, 38, 28, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <span aria-hidden="true" style={{ width: '48px', height: '48px', flexShrink: 0, borderRadius: '8px', background: '#e4eaf2', color: '#2e4c78', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <span style={{ alignSelf: 'flex-start', padding: '2px 8px', borderRadius: '4px', background: '#e4eaf2', color: '#2e4c78', fontSize: '12px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em' }}>
                      Atenção
                    </span>
                    <h3 style={{ margin: 0, fontSize: '17px', lineHeight: '24px', fontWeight: 600 }}>
                      TAC — Teste de Atenção por Cancelamento
                    </h3>
                    <p style={{ margin: 0, color: '#566152', fontSize: '14px', lineHeight: '21px' }}>
                      Atenção seletiva e sustentada: o paciente localiza e marca os estímulos-alvo em cada folha.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyConent: 'space-between', justifyContent: 'space-between', gap: '12px', paddingTop: '16px', borderTop: '1px solid #d6dccd' }}>
                  <span style={{ fontSize: '12px', lineHeight: '16px', color: '#566152' }}>
                    {lastTacDate ? (
                      <>Última aplicação · <span style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", color: '#28352c' }}>{lastTacDate}</span></>
                    ) : (
                      'Nenhuma aplicação ainda'
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenStartModal('TAC')}
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
                    Iniciar TAC
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </button>
                </div>
              </article>

              {/* Card TNVRI */}
              <article style={{ background: '#ffffff', border: '1px solid #d6dccd', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 1px 2px rgba(27, 38, 28, 0.06), 0 2px 8px rgba(27, 38, 28, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <span aria-hidden="true" style={{ width: '48px', height: '48px', flexShrink: 0, borderRadius: '8px', background: '#efe7f0', color: '#6a4870', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="7" cy="7" r="4"></circle>
                      <rect x="13" y="3" width="8" height="8" rx="1"></rect>
                      <path d="M7 13l4 8H3z"></path>
                      <rect x="13" y="13" width="8" height="8" rx="1" strokeDasharray="2 2"></rect>
                    </svg>
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <span style={{ alignSelf: 'flex-start', padding: '2px 8px', borderRadius: '4px', background: '#efe7f0', color: '#6a4870', fontSize: '12px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em' }}>
                      Raciocínio
                    </span>
                    <h3 style={{ margin: 0, fontSize: '17px', lineHeight: '24px', fontWeight: 600 }}>
                      TNVRI — Raciocínio Não-Verbal
                    </h3>
                    <p style={{ margin: 0, color: '#566152', fontSize: '14px', lineHeight: '21px' }}>
                      Raciocínio por analogia com figuras: o paciente escolhe a peça que completa cada quadro.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '16px', borderTop: '1px solid #d6dccd' }}>
                  <span style={{ fontSize: '12px', lineHeight: '16px', color: '#566152' }}>
                    {lastTnvriDate ? (
                      <>Última aplicação · <span style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", color: '#28352c' }}>{lastTnvriDate}</span></>
                    ) : (
                      'Nenhuma aplicação ainda'
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenStartModal('TNVRI')}
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
                    Iniciar TNVRI
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </button>
                </div>
              </article>
            </div>
          </section>

          {/* Tabela: Aplicações Recentes */}
          <section aria-labelledby="recentes" style={{ background: '#ffffff', border: '1px solid #d6dccd', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(27, 38, 28, 0.06), 0 2px 8px rgba(27, 38, 28, 0.05)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '20px 24px', borderBottom: '1px solid #d6dccd' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h2 id="recentes" style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontSize: '22px', lineHeight: '28px', fontWeight: 560 }}>
                  Aplicações recentes
                </h2>
                <span style={{ fontSize: '12px', lineHeight: '16px', color: '#566152' }}>
                  Últimos testes aplicados aos seus pacientes
                </span>
              </div>
              <Link href="/dashboard/pacientes" style={{ display: 'flex', alignItems: 'center', gap: '6px', minHeight: '44px', fontSize: '13px', fontWeight: 600, letterSpacing: '0.02em', textDecoration: 'none', color: '#2f6b31' }}>
                Ver todos os pacientes
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </Link>
            </div>

            <div style={{ overflowX: 'auto' }}>
              {filteredSessions.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: '#566152' }}>
                  <p style={{ margin: 0, fontSize: '15px' }}>
                    {searchQuery ? `Nenhum resultado encontrado para "${searchQuery}".` : 'Nenhum teste aplicado ainda.'}
                  </p>
                </div>
              ) : (
                <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f4f6f0' }}>
                      <th scope="col" style={{ textAlign: 'left', padding: '12px 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: '#566152', letterSpacing: '0.02em' }}>Paciente</th>
                      <th scope="col" style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: '#566152', letterSpacing: '0.02em' }}>Teste</th>
                      <th scope="col" style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: '#566152', letterSpacing: '0.02em' }}>Aplicado em</th>
                      <th scope="col" style={{ textAlign: 'left', padding: '12px 16px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: '#566152', letterSpacing: '0.02em' }}>Status</th>
                      <th scope="col" style={{ textAlign: 'right', padding: '12px 16px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: '#566152', letterSpacing: '0.02em' }}>Escore</th>
                      <th scope="col" style={{ textAlign: 'right', padding: '12px 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: '#566152', letterSpacing: '0.02em' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((session) => {
                      const isTnvri = session.test_type === 'TNVRI';
                      const tacRes = session.tac_results?.[0];
                      const tnvriRes = session.tnvri_results?.[0];
                      const isDone = session.status === 'concluido';
                      const patientName = session.patients?.full_name || 'Paciente';
                      const patientInitial = patientName.charAt(0).toUpperCase() || 'P';
                      const appliedDate = new Date(session.applied_at || session.created_at).toLocaleDateString('pt-BR');

                      const reportUrl = isTnvri
                        ? `/dashboard/relatorios/tnvri/${session.id}`
                        : `/dashboard/relatorios/${session.id}`;

                      const testUrl = isTnvri
                        ? `/teste/tnvri/${session.id}`
                        : `/teste/tac/${session.id}`;

                      return (
                        <tr key={session.id} style={{ borderTop: '1px solid #d6dccd' }}>
                          <td style={{ padding: '16px 24px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span aria-hidden="true" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e9ede3', color: '#28352c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '14px' }}>
                                {patientInitial}
                              </span>
                              <span style={{ fontWeight: 600, fontSize: '15px' }}>{patientName}</span>
                            </span>
                          </td>
                          <td style={{ padding: '16px' }}>
                            {isTnvri ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '4px', background: '#efe7f0', color: '#6a4870', fontSize: '12px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em' }}>
                                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="7" cy="7" r="4"></circle>
                                  <rect x="13" y="3" width="8" height="8" rx="1"></rect>
                                  <path d="M7 13l4 8H3z"></path>
                                  <rect x="13" y="13" width="8" height="8" rx="1" strokeDasharray="2 2"></rect>
                                </svg>
                                TNVRI
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '4px', background: '#e4eaf2', color: '#2e4c78', fontSize: '12px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em' }}>
                                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                TAC
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '16px', fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: '14px', color: '#28352c' }}>
                            {appliedDate}
                          </td>
                          <td style={{ padding: '16px' }}>
                            {isDone ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '4px', background: '#dafeaa', color: '#22512a', fontSize: '12px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em' }}>
                                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Concluído
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#b45309', fontSize: '12px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em' }}>
                                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="9"></circle>
                                  <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                Em andamento
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right', fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                            {isTnvri ? (
                              tnvriRes ? (
                                <><span style={{ fontSize: '16px', fontWeight: 600 }}>{tnvriRes.total_hits}</span> <span style={{ color: '#566152', fontSize: '13px' }}>/ {tnvriRes.total_items}</span></>
                              ) : '--'
                            ) : (
                              tacRes ? (
                                <><span style={{ fontSize: '16px', fontWeight: 600 }}>{tacRes.total_net_score}</span> <span style={{ color: '#566152', fontSize: '13px' }}>pts</span></>
                              ) : '--'
                            )}
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            <span style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              {isDone ? (
                                <button
                                  type="button"
                                  onClick={() => router.push(reportUrl)}
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
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="8" y1="13" x2="16" y2="13"></line>
                                    <line x1="8" y1="17" x2="13" y2="17"></line>
                                  </svg>
                                  Abrir relatório
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => router.push(testUrl)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '0 14px',
                                    minHeight: '44px',
                                    borderRadius: '8px',
                                    border: '1px solid #2f6b31',
                                    background: '#2f6b31',
                                    color: '#ffffff',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    letterSpacing: '0.02em',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Continuar teste
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setSessionToDelete(session)}
                                aria-label={`Excluir aplicação de ${patientName}`}
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
                                title="Excluir este teste"
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
          </section>

        </div>
      </main>

      {/* MODAL: SELECIONAR PACIENTE PARA INICIAR TESTE */}
      {isSelectPatientOpen && (
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
              Iniciar {selectedTestType === 'TNVRI' ? 'TNVRI (Raciocínio)' : 'TAC (Atenção)'}
            </h2>
            <p style={{ margin: '0 0 20px 0', color: '#566152', fontSize: '14px', lineHeight: '20px' }}>
              Selecione o paciente que realizará a avaliação:
            </p>

            {patients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ color: '#566152', marginBottom: '16px', fontSize: '14px' }}>
                  Nenhum paciente cadastrado no momento.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectPatientOpen(false);
                    setIsPatientModalOpen(true);
                  }}
                  style={{
                    padding: '0 16px',
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
                  Cadastrar Paciente Primeiro
                </button>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#28352c', marginBottom: '8px' }}>
                    Paciente
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '44px',
                      borderRadius: '8px',
                      border: '1px solid #7d8775',
                      background: '#ffffff',
                      padding: '0 12px',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      color: '#28352c',
                      outline: 'none'
                    }}
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.education_level || 'Sem escolaridade informada'})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setIsSelectPatientOpen(false)}
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
                    onClick={() => handleStartTest(selectedPatientId, selectedTestType)}
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
            )}
          </div>
        </div>
      )}

      {/* Modal para Cadastrar Paciente */}
      <PatientModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onPatientSaved={(newPat) => {
          loadData();
          setSelectedPatientId(newPat.id);
        }}
      />

      {/* Modal de Confirmação para Excluir Teste */}
      <DeleteSessionModal
        isOpen={Boolean(sessionToDelete)}
        onClose={() => setSessionToDelete(null)}
        onConfirm={handleDeleteSession}
        session={sessionToDelete}
        isDeleting={isDeleting}
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
