'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { dbService } from '@/lib/supabaseClient';
import { calculateAge } from '@/lib/norms';
import {
  FileText,
  Printer,
  ArrowLeft,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Brain,
  Trash2,
  Award
} from 'lucide-react';
import Link from 'next/link';
import DeleteSessionModal from '@/components/DeleteSessionModal';

export default function RelatorioTnvriPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const sessionId = resolvedParams.sessionId;

  const [session, setSession] = useState(null);
  const [patient, setPatient] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data, error } = await dbService.getSession(sessionId);
      if (error || !data) {
        alert('Sessão não encontrada.');
        router.push('/dashboard');
        return;
      }
      setSession(data);
      setPatient(data.patients);
      setResults(data.tnvri_results?.[0] || null);
      setLoading(false);
    }
    loadData();
  }, [sessionId, router]);

  const handleDeleteTest = async () => {
    setIsDeleting(true);
    try {
      const { error } = await dbService.deleteSession(sessionId);
      if (error) {
        alert('Erro ao excluir teste: ' + error.message);
        setIsDeleting(false);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      alert('Erro inesperado ao excluir teste: ' + err.message);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="app-container" style={{ textAlign: 'center', padding: '60px' }}>
          <p>Carregando relatório do TNVRI...</p>
        </main>
      </>
    );
  }

  if (!results) {
    return (
      <>
        <Navbar />
        <main className="app-container" style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Resultados ainda não computados para esta sessão do TNVRI.</h2>
          <Link href={`/teste/tnvri/${sessionId}`} className="btn btn-primary" style={{ marginTop: '16px' }}>
            Continuar Aplicação do TNVRI
          </Link>
        </main>
      </>
    );
  }

  const ageInfo = calculateAge(patient?.birth_date);
  const appliedDate = new Date(session.applied_at || session.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const totalItems = results.total_items || 60;
  const totalHits = results.total_hits || 0;
  const totalErrors = results.total_errors || 0;
  const accuracyPct = Math.round((totalHits / totalItems) * 100);

  const totalTimeMinutes = Math.floor((results.total_time_seconds || 0) / 60);
  const totalTimeRemainderSecs = (results.total_time_seconds || 0) % 60;
  const formattedTotalTime = `${totalTimeMinutes}m ${totalTimeRemainderSecs.toString().padStart(2, '0')}s`;

  const avgSecondsPerItem = totalItems > 0 ? ((results.total_time_seconds || 0) / totalItems).toFixed(1) : 0;

  const itemsDetail = results.items_detail || [];

  return (
    <>
      <Navbar />

      <main className="app-container">
        {/* Barra Superior de Ações */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <Link href="/dashboard" className="btn btn-secondary btn-sm">
            <ArrowLeft size={16} /> Voltar ao Painel
          </Link>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{
                color: 'var(--accent-rose)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Excluir este teste permanentemente"
            >
              <Trash2 size={16} /> Excluir Teste
            </button>
            <button onClick={() => window.print()} className="btn btn-primary">
              <Printer size={18} /> Imprimir / Salvar em PDF
            </button>
          </div>
        </div>

        {/* Folha Oficial do Laudo/Relatório */}
        <div className="card" style={{ padding: '40px', maxWidth: '960px', margin: '0 auto', background: '#ffffff' }}>
          {/* Cabeçalho do Relatório */}
          <div style={{ borderBottom: '2px solid var(--border-subtle)', paddingBottom: '24px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="brand-icon" style={{ width: '42px', height: '42px', fontSize: '1.1rem' }}>AVN</div>
                <div>
                  <h1 style={{ fontSize: '1.45rem', margin: 0 }}>Relatório Neuropsicológico</h1>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Teste Não-Verbal de Raciocínio Infantil (TNVRI)
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-emerald" style={{ fontSize: '0.85rem' }}>
                  Aplicação Concluída
                </span>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Data: {appliedDate}
                </div>
              </div>
            </div>

            {/* Ficha do Paciente */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '0.9rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Paciente:</span>
                <strong>{patient?.full_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Idade Cronológica:</span>
                <strong>{ageInfo.formatted}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Escolaridade / Escola:</span>
                <strong>{patient?.education_level || 'Não inf.'} ({patient?.school_type || 'Geral'})</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Lateralidade:</span>
                <strong>{patient?.handedness || 'Destro'}</strong>
              </div>
            </div>
          </div>

          {/* Destaque Psicométrico Principal */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px'
          }}>
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>Escore Bruto Total</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#15803d', margin: '4px 0' }}>
                {totalHits} <span style={{ fontSize: '1rem', fontWeight: 500 }}>/ {totalItems}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#166534' }}>Total de acertos nos itens do teste</div>
            </div>

            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 600 }}>Acurácia Geral</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1d4ed8', margin: '4px 0' }}>
                {accuracyPct}%
              </div>
              <div style={{ fontSize: '0.78rem', color: '#1e40af' }}>Erros: {totalErrors} ({100 - accuracyPct}%)</div>
            </div>

            <div style={{
              background: '#faf5ff',
              border: '1px solid #e9d5ff',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#6b21a8', fontWeight: 600 }}>Tempo Total de Aplicação</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#7e22ce', margin: '4px 0' }}>
                {formattedTotalTime}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b21a8' }}>Média de {avgSecondsPerItem}s por item</div>
            </div>
          </div>

          {/* Síntese Qualitativa e Parecer */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '32px'
          }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '8px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Brain size={18} color="var(--primary)" /> Síntese do Raciocínio Não-Verbal
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, marginBottom: '8px' }}>
              O <strong>Teste Não-Verbal de Raciocínio Infantil (TNVRI)</strong> avalia a capacidade de raciocínio indutivo, identificação de regras lógicas subjacentes, relações espaciais e pensamento analítico por meio de matrizes gráficas sem interferência da linguagem verbal.
            </p>
            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6 }}>
              O paciente obteve um total de <strong>{totalHits} acertos</strong> em <strong>{totalItems} itens aplicados</strong> ({accuracyPct}% de precisão), completando a avaliação em um tempo total de <strong>{formattedTotalTime}</strong>. A tabela abaixo detalha o padrão de respostas fornecidas ao longo dos itens de complexidade progressiva.
            </p>
          </div>

          {/* Tabela de Desempenho Discriminada Item a Item */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.15rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color="var(--primary)" /> Análise Item a Item do Teste
            </h2>

            <div style={{
              maxHeight: '480px',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.9rem' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9', zIndex: 1 }}>
                  <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Item</th>
                    <th style={{ padding: '10px 14px' }}>Resposta Escolhida</th>
                    <th style={{ padding: '10px 14px' }}>Gabarito Oficial</th>
                    <th style={{ padding: '10px 14px' }}>Resultado</th>
                    <th style={{ padding: '10px 14px' }}>Tempo Gasto</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsDetail.map((item, idx) => (
                    <tr
                      key={item.pageId || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: item.isCorrect ? '#ffffff' : '#fef2f2'
                      }}
                    >
                      <td style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>
                        Item {item.itemNumber || idx + 1}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                        <span style={{
                          display: 'inline-block',
                          width: '28px',
                          height: '28px',
                          lineHeight: '28px',
                          borderRadius: '50%',
                          background: item.isCorrect ? '#dcfce7' : '#fee2e2',
                          color: item.isCorrect ? '#166534' : '#991b1b'
                        }}>
                          {item.chosen}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#475569' }}>
                        {item.correct}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {item.isCorrect ? (
                          <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <CheckCircle2 size={16} /> Acerto (+1)
                          </span>
                        ) : (
                          <span style={{ color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <XCircle size={16} /> Erro (0)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>
                        {item.timeSeconds ? `${item.timeSeconds}s` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Campo de Assinatura do Profissional */}
          <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              AVN • Sistema de Avaliação Neuropsicológica Online
            </div>

            <div style={{ textAlign: 'center', minWidth: '240px' }}>
              <div style={{ borderTop: '1px solid #64748b', marginBottom: '6px' }} />
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Assinatura do(a) Avaliador(a)</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Psicólogo(a) / Neuropsicólogo(a)</div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Confirmação para Excluir Teste */}
      <DeleteSessionModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteTest}
        session={session}
        isDeleting={isDeleting}
      />
    </>
  );
}
