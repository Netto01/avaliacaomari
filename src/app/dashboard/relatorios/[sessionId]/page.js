'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { dbService } from '@/lib/supabaseClient';
import { calculateAge, getNormativeInterpretation } from '@/lib/norms';
import {
  FileText,
  Printer,
  ArrowLeft,
  Calendar,
  User,
  GraduationCap,
  Award,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  EyeOff,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import DeleteSessionModal from '@/components/DeleteSessionModal';

export default function RelatorioTacPage({ params }) {
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
      setResults(data.tac_results?.[0] || null);
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
          <p>Carregando relatório do teste...</p>
        </main>
      </>
    );
  }

  if (!results) {
    return (
      <>
        <Navbar />
        <main className="app-container" style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Resultados ainda não computados para esta sessão.</h2>
          <Link href={`/teste/tac/${sessionId}`} className="btn btn-primary" style={{ marginTop: '16px' }}>
            Continuar Aplicação do TAC
          </Link>
        </main>
      </>
    );
  }

  const ageInfo = calculateAge(patient?.birth_date);
  const norm = getNormativeInterpretation(results.total_net_score, ageInfo.years);
  const appliedDate = new Date(session.applied_at || session.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

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
                    Teste de Atenção por Cancelamento (TAC)
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
              <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>Escore Líquido Total</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#15803d', margin: '4px 0' }}>
                {results.total_net_score} <span style={{ fontSize: '1rem', fontWeight: 500 }}>pts</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#166534' }}>Fórmula: Acertos - Erros</div>
            </div>

            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 600 }}>Percentil Normativo</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1d4ed8', margin: '4px 0' }}>
                P{norm.percentile}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#1e40af' }}>Faixa: {norm.normativeGroup}</div>
            </div>

            <div style={{
              background: '#faf5ff',
              border: '1px solid #e9d5ff',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#6b21a8', fontWeight: 600 }}>Classificação Neuropsicológica</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: norm.badgeColor, margin: '8px 0' }}>
                {norm.classification}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b21a8' }}>Média de referência: {norm.expectedMean}</div>
            </div>
          </div>

          {/* Tabela de Desempenho por Etapa */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.15rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color="var(--primary)" /> Desempenho Discriminado por Modalidade Atencional
            </h2>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.92rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left' }}>Etapa do Teste</th>
                  <th style={{ padding: '12px 14px' }}>Tempo</th>
                  <th style={{ padding: '12px 14px', color: '#16a34a' }}>Acertos (A)</th>
                  <th style={{ padding: '12px 14px', color: '#dc2626' }}>Erros (E)</th>
                  <th style={{ padding: '12px 14px', color: '#d97706' }}>Omissões (O)</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, color: '#2563eb' }}>Escore Líquido (A - E)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600 }}>
                    Parte 1: Atenção Seletiva (1 Alvo)
                  </td>
                  <td style={{ padding: '12px 14px' }}>60 s</td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#16a34a' }}>{results.p1_hits}</td>
                  <td style={{ padding: '12px 14px', color: '#dc2626' }}>{results.p1_errors}</td>
                  <td style={{ padding: '12px 14px', color: '#d97706' }}>{results.p1_omissions}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#2563eb' }}>{results.p1_net_score}</td>
                </tr>

                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600 }}>
                    Parte 2: Atenção Dividida (2 Alvos Juntos)
                  </td>
                  <td style={{ padding: '12px 14px' }}>60 s</td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#16a34a' }}>{results.p2_hits}</td>
                  <td style={{ padding: '12px 14px', color: '#dc2626' }}>{results.p2_errors}</td>
                  <td style={{ padding: '12px 14px', color: '#d97706' }}>{results.p2_omissions}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#2563eb' }}>{results.p2_net_score}</td>
                </tr>

                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600 }}>
                    Parte 3: Atenção Alternada (1 Alvo por Linha)
                  </td>
                  <td style={{ padding: '12px 14px' }}>60 s</td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#16a34a' }}>{results.p3_hits}</td>
                  <td style={{ padding: '12px 14px', color: '#dc2626' }}>{results.p3_errors}</td>
                  <td style={{ padding: '12px 14px', color: '#d97706' }}>{results.p3_omissions}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#2563eb' }}>{results.p3_net_score}</td>
                </tr>

                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td style={{ padding: '14px', textAlign: 'left' }}>TOTAL GERAL DO TAC</td>
                  <td style={{ padding: '14px' }}>180 s</td>
                  <td style={{ padding: '14px', color: '#16a34a' }}>{results.total_hits}</td>
                  <td style={{ padding: '14px', color: '#dc2626' }}>{results.total_errors}</td>
                  <td style={{ padding: '14px', color: '#d97706' }}>{results.total_omissions}</td>
                  <td style={{ padding: '14px', fontSize: '1.1rem', color: '#2563eb' }}>{results.total_net_score}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Síntese Qualitativa e Parecer */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '32px'
          }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '8px', color: '#1e293b' }}>
              Síntese Interpretativa do Desempenho Atencional
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, marginBottom: '8px' }}>
              O Teste de Atenção por Cancelamento (TAC) avalia a velocidade de processamento visual, capacidade de rastreamento seletivo, tolerância a distratores e controle inibitório.
            </p>
            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6 }}>
              O paciente obteve um escore líquido total de <strong>{results.total_net_score} pontos</strong>, posicionando-se no <strong>Percentil {norm.percentile}</strong> com classificação <strong>{norm.classification}</strong> para sua faixa etária ({norm.normativeGroup}). O total de erros de comissão ({results.total_errors}) e de omissões ({results.total_omissions}) reflete o balanço entre velocidade e precisão no rastreamento visual das três etapas.
            </p>
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
