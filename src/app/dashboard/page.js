'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import PatientModal from '@/components/PatientModal';
import DeleteSessionModal from '@/components/DeleteSessionModal';
import { dbService, isSupabaseConfigured } from '@/lib/supabaseClient';
import {
  Users,
  PlayCircle,
  FileCheck2,
  TrendingUp,
  Clock,
  ArrowRight,
  Database,
  PlusCircle,
  FileText,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [patients, setPatients] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isSelectPatientOpen, setIsSelectPatientOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [loading, setLoading] = useState(true);

  // Estado para exclusão de teste
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: pats } = await dbService.getPatients();
      const { data: sess } = await dbService.getRecentSessions();
      setPatients(pats || []);
      setRecentSessions(sess || []);
      if (pats && pats.length > 0) {
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

  const handleStartTest = async (patientId) => {
    const pId = patientId || selectedPatientId;
    if (!pId) {
      setIsPatientModalOpen(true);
      return;
    }
    const { data: session, error } = await dbService.createSession(pId);
    if (error) {
      alert('Erro ao iniciar sessão: ' + error.message);
      return;
    }
    router.push(`/teste/tac/${session.id}`);
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

  // Estatísticas
  const totalPatients = patients.length;
  const completedTests = recentSessions.filter(s => s.status === 'concluido').length;
  const avgScore = recentSessions.length > 0
    ? Math.round(
        recentSessions.reduce((acc, s) => acc + (s.tac_results?.[0]?.total_net_score || 0), 0) /
        Math.max(1, completedTests)
      )
    : 0;

  return (
    <>
      <Navbar />

      <main className="app-container">
        {/* Banner informativo do Supabase */}
        {!isSupabaseConfigured && (
          <div style={{
            background: 'linear-gradient(90deg, #eff6ff 0%, #f0fdfa 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#3b82f6', color: 'white', padding: '8px', borderRadius: '8px' }}>
                <Database size={20} />
              </div>
              <div>
                <strong style={{ color: '#1e3a8a', display: 'block', fontSize: '0.95rem' }}>
                  Conecte seu Banco de Dados Supabase
                </strong>
                <p style={{ color: '#3b82f6', fontSize: '0.85rem', margin: 0 }}>
                  O script SQL já foi gerado em <code>supabase/schema.sql</code>. Adicione suas credenciais no arquivo <code>.env.local</code>. Você já pode testar normalmente em modo local!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cabeçalho do Painel */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Painel Clínico de Avaliação</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Gestão de pacientes e aplicação do Teste de Atenção por Cancelamento (TAC)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setIsPatientModalOpen(true)} className="btn btn-secondary">
              <PlusCircle size={18} /> Novo Paciente
            </button>
            <button onClick={() => setIsSelectPatientOpen(true)} className="btn btn-primary btn-lg">
              <PlayCircle size={20} /> Iniciar Teste TAC
            </button>
          </div>
        </div>

        {/* Cards de Métricas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '36px' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Pacientes Cadastrados</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main)' }}>{totalPatients}</div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-emerald-light)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileCheck2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Testes TAC Concluídos</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main)' }}>{completedTests}</div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--secondary-light)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Média Escore Líquido</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {avgScore > 0 ? avgScore : '--'}
              </div>
            </div>
          </div>
        </div>

        {/* Seção: Sessões Recentes */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Aplicações Recentes de Testes</h2>
            <Link href="/dashboard/pacientes" className="btn btn-secondary btn-sm">
              Ver todos os pacientes <ArrowRight size={16} />
            </Link>
          </div>

          {recentSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Clock size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p>Nenhum teste aplicado ainda.</p>
              <button
                onClick={() => setIsSelectPatientOpen(true)}
                className="btn btn-primary btn-sm"
                style={{ marginTop: '12px' }}
              >
                Iniciar Primeiro Teste TAC
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '12px 16px' }}>Paciente</th>
                    <th style={{ padding: '12px 16px' }}>Data da Aplicação</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Escore Líquido</th>
                    <th style={{ padding: '12px 16px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map((session) => {
                    const res = session.tac_results?.[0];
                    const isDone = session.status === 'concluido';
                    const dateFormatted = new Date(session.applied_at || session.created_at).toLocaleDateString('pt-BR');

                    return (
                      <tr key={session.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                          {session.patients?.full_name || 'Paciente'}
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                          {dateFormatted}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {isDone ? (
                            <span className="badge badge-emerald">Concluído</span>
                          ) : (
                            <span className="badge badge-amber">Em Andamento</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                          {res ? `${res.total_net_score} pts` : '--'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isDone ? (
                              <Link href={`/dashboard/relatorios/${session.id}`} className="btn btn-secondary btn-sm">
                                <FileText size={14} /> Relatório Completo
                              </Link>
                            ) : (
                              <button onClick={() => router.push(`/teste/tac/${session.id}`)} className="btn btn-primary btn-sm">
                                Continuar Teste
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSessionToDelete(session)}
                              className="btn btn-secondary btn-sm"
                              style={{
                                color: 'var(--accent-rose)',
                                padding: '6px 8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Excluir este teste"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal para Selecionar Paciente e Iniciar Teste */}
      {isSelectPatientOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlayCircle size={22} color="var(--primary)" /> Selecionar Paciente para o TAC
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Escolha para qual paciente o Teste de Atenção por Cancelamento será aplicado:
            </p>

            {patients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Nenhum paciente cadastrado.</p>
                <button
                  onClick={() => {
                    setIsSelectPatientOpen(false);
                    setIsPatientModalOpen(true);
                  }}
                  className="btn btn-primary"
                >
                  <PlusCircle size={18} /> Cadastrar Paciente Primeiro
                </button>
              </div>
            ) : (
              <div>
                <div className="form-group">
                  <label className="form-label">Paciente</label>
                  <select
                    className="form-select"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.education_level || 'Sem escolaridade'})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button onClick={() => setIsSelectPatientOpen(false)} className="btn btn-secondary">
                    Cancelar
                  </button>
                  <button onClick={() => handleStartTest(selectedPatientId)} className="btn btn-primary">
                    <PlayCircle size={18} /> Iniciar Aplicação
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

      {/* Toast Notification de Sucesso */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#065f46',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 100,
          animation: 'modal-up 0.25s ease-out'
        }}>
          <CheckCircle2 size={18} color="#6ee7b7" />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
