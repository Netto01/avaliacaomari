'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { dbService } from '@/lib/supabaseClient';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Clock,
  User,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Home
} from 'lucide-react';
import Link from 'next/link';

export default function TnvriTestPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const sessionId = resolvedParams.sessionId;

  // Estados principais
  const [session, setSession] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Páginas do teste carregadas da API
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Estado da resposta da página atual
  const [selectedOption, setSelectedOption] = useState(null);
  const [treinoFeedback, setTreinoFeedback] = useState(null); // { isCorrect, correta }

  // Respostas registradas dos itens de teste
  const [testResponses, setTestResponses] = useState([]);

  // Cronômetros
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [itemSeconds, setItemSeconds] = useState(0);
  const timerRef = useRef(null);

  // Modal de encerramento prematuro
  const [showExitModal, setShowExitModal] = useState(false);

  // 1. Carrega dados da sessão e páginas do teste
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const { data: sessionData, error: sessionErr } = await dbService.getSession(sessionId);
        if (sessionErr || !sessionData) {
          alert('Sessão não encontrada.');
          router.push('/dashboard');
          return;
        }
        setSession(sessionData);
        setPatient(sessionData.patients);

        // Carrega páginas da API TNVRI
        const res = await fetch('/api/tnvri');
        const tnvriData = await res.json();
        if (tnvriData.pages && tnvriData.pages.length > 0) {
          setPages(tnvriData.pages);
        } else {
          alert('Não foi possível carregar as páginas do TNVRI.');
        }
      } catch (err) {
        console.error('Erro na inicialização:', err);
        alert('Erro ao inicializar o teste.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [sessionId, router]);

  // 2. Cronômetro contínuo
  useEffect(() => {
    if (loading || saving || pages.length === 0) return;

    timerRef.current = setInterval(() => {
      setTotalSeconds(prev => prev + 1);
      setItemSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [loading, saving, pages.length]);

  const currentPage = pages[currentPageIndex];
  const isTreino = currentPage?.isTreino ?? false;
  const isLastPage = currentPageIndex === pages.length - 1;

  // Formatação de tempo mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 3. Ação: Selecionar alternativa
  const handleSelectOption = (letra) => {
    // Se estiver em feedback de treino, não muda
    if (treinoFeedback) return;
    setSelectedOption(letra);
  };

  // 4. Ação: Confirmar resposta
  const handleConfirmAnswer = async () => {
    if (!selectedOption) return;

    if (isTreino) {
      // Se ainda não mostrou feedback, mostra o feedback educativo
      if (!treinoFeedback) {
        const isCorrect = selectedOption.toUpperCase() === currentPage.correta.toUpperCase();
        setTreinoFeedback({
          isCorrect,
          correta: currentPage.correta.toUpperCase()
        });
        return;
      }

      // Se já mostrou feedback, avança para o próximo
      setTreinoFeedback(null);
      setSelectedOption(null);
      setItemSeconds(0);
      setCurrentPageIndex(prev => prev + 1);
      return;
    }

    // Item de teste oficial (pagina_03 em diante)
    const isCorrect = selectedOption.toUpperCase() === currentPage.correta.toUpperCase();
    const itemRecord = {
      pageId: currentPage.id,
      itemNumber: currentPage.pageNumber - 2, // Desconta os 2 treinos
      chosen: selectedOption,
      correct: currentPage.correta,
      isCorrect,
      timeSeconds: itemSeconds
    };

    const updatedResponses = [...testResponses, itemRecord];
    setTestResponses(updatedResponses);

    // Se for a última página, finaliza o teste
    if (isLastPage) {
      await finishTest(updatedResponses);
    } else {
      setSelectedOption(null);
      setItemSeconds(0);
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  // 5. Finalizar teste e salvar resultados
  const finishTest = async (finalResponses) => {
    setSaving(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const totalHits = finalResponses.filter(r => r.isCorrect).length;
    const totalErrors = finalResponses.length - totalHits;

    const payload = {
      total_items: finalResponses.length,
      total_hits: totalHits,
      total_errors: totalErrors,
      total_time_seconds: totalSeconds,
      items_detail: finalResponses
    };

    try {
      const { error } = await dbService.saveTnvriResults(sessionId, payload);
      if (error) {
        console.warn('Erro ao salvar no Supabase (usando local):', error.message);
      }
      router.push(`/dashboard/relatorios/tnvri/${sessionId}`);
    } catch (err) {
      console.error('Erro ao finalizar teste:', err);
      alert('Erro ao salvar resultados. Redirecionando para o painel.');
      router.push('/dashboard');
    }
  };

  if (loading || !currentPage) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        gap: '16px'
      }}>
        <div className="brand-icon" style={{ width: '56px', height: '56px', fontSize: '1.4rem', animation: 'spin 2s linear infinite' }}>
          AVN
        </div>
        <h2 style={{ fontSize: '1.2rem', color: '#334155' }}>Carregando Estímulos do TNVRI...</h2>
      </div>
    );
  }

  if (saving) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        gap: '16px'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: '4px solid #cbd5e1',
          borderTopColor: 'var(--primary)',
          animation: 'spin 1s linear infinite'
        }} />
        <h2 style={{ fontSize: '1.25rem', color: '#1e293b' }}>Calculando e salvando resultados...</h2>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none'
    }}>
      {/* Barra Superior do Avaliador (Clean e minimalista) */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: isTreino ? '#f59e0b' : '#3b82f6',
            color: '#ffffff',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {isTreino ? <Sparkles size={14} /> : null}
            {isTreino ? 'EXEMPLO DE TREINO' : 'TESTE OFICIAL'}
          </div>

          <div style={{ fontSize: '0.92rem', color: '#1e293b', fontWeight: 600 }}>
            {currentPage.titulo}
          </div>

          <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={15} />
            <span>{patient?.full_name || 'Paciente'}</span>
          </div>
        </div>

        {/* Indicador de Encerramento */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setShowExitModal(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Encerrar teste"
          >
            <Home size={16} /> Sair
          </button>
        </div>
      </header>

      {/* Área Central de Aplicação */}
      <main style={{
        flex: 1,
        maxWidth: '1100px',
        width: '100%',
        margin: '0 auto',
        padding: '20px 24px 32px 24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        {/* Banner de Feedback nos Exemplos de Treino */}
        {isTreino && treinoFeedback && (
          <div style={{
            padding: '14px 20px',
            borderRadius: '10px',
            background: treinoFeedback.isCorrect ? '#f0fdf4' : '#fffbeb',
            border: `1.5px solid ${treinoFeedback.isCorrect ? '#86efac' : '#fcd34d'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {treinoFeedback.isCorrect ? (
                <CheckCircle2 size={24} color="#16a34a" />
              ) : (
                <AlertTriangle size={24} color="#d97706" />
              )}
              <div>
                <strong style={{ color: treinoFeedback.isCorrect ? '#15803d' : '#b45309', display: 'block' }}>
                  {treinoFeedback.isCorrect ? 'Muito bem! Resposta correta!' : 'Atenção ao exemplo!'}
                </strong>
                <span style={{ fontSize: '0.88rem', color: '#475569' }}>
                  {treinoFeedback.isCorrect
                    ? 'A peça selecionada completa perfeitamente a lacuna do desenho.'
                    : `A alternativa correta é a letra ${treinoFeedback.correta}. Explique para a criança o porquê desta escolha antes de prosseguir.`}
                </span>
              </div>
            </div>

            <button
              onClick={handleConfirmAnswer}
              className="btn btn-primary"
              style={{
                background: treinoFeedback.isCorrect ? '#16a34a' : '#d97706',
                border: 'none',
                padding: '10px 20px',
                fontWeight: 700
              }}
            >
              Continuar <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* 1. Imagem Principal (Matriz com a lacuna) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '280px'
        }}>
          {currentPage.principalUrl ? (
            <img
              src={currentPage.principalUrl}
              alt="Matriz Principal"
              style={{
                maxHeight: '320px',
                maxWidth: '100%',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />
          ) : (
            <p style={{ color: '#94a3b8' }}>Imagem principal não disponível</p>
          )}
        </div>

        {/* 2. As 6 Opções de Resposta (Grade 2x3: 3 por linha) */}
        <div>
          <div style={{
            fontSize: '0.9rem',
            color: '#64748b',
            marginBottom: '12px',
            textAlign: 'center',
            fontWeight: 500
          }}>
            Escolha a alternativa que melhor completa o desenho acima:
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px'
          }}>
            {currentPage.opcoes.map((opcao) => {
              const isSelected = selectedOption === opcao.letra;
              const isCorretaNoFeedback = treinoFeedback && opcao.letra === treinoFeedback.correta;
              const isErradaNoFeedback = treinoFeedback && !treinoFeedback.isCorrect && isSelected;

              // Estilos de borda e fundo conforme seleção e feedback
              let borderColor = '#cbd5e1';
              let bgColor = '#ffffff';
              let shadow = '0 2px 4px rgba(0,0,0,0.02)';

              if (isSelected) {
                borderColor = 'var(--primary)';
                bgColor = '#eff6ff';
                shadow = '0 0 0 3px rgba(37, 99, 235, 0.25)';
              }

              if (isCorretaNoFeedback) {
                borderColor = '#16a34a';
                bgColor = '#f0fdf4';
                shadow = '0 0 0 3px rgba(22, 163, 74, 0.35)';
              } else if (isErradaNoFeedback) {
                borderColor = '#dc2626';
                bgColor = '#fef2f2';
                shadow = '0 0 0 3px rgba(220, 38, 38, 0.35)';
              }

              return (
                <button
                  key={opcao.letra}
                  type="button"
                  onClick={() => handleSelectOption(opcao.letra)}
                  disabled={Boolean(treinoFeedback)}
                  style={{
                    background: bgColor,
                    border: `2px solid ${borderColor}`,
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: treinoFeedback ? 'default' : 'pointer',
                    position: 'relative',
                    transition: 'all 0.15s ease-in-out',
                    boxShadow: shadow,
                    minHeight: '140px',
                    outline: 'none'
                  }}
                >
                  {/* Letra identificadora (Badge superior esquerdo) */}
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '12px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: isSelected ? 'var(--primary)' : (isCorretaNoFeedback ? '#16a34a' : '#f1f5f9'),
                    color: (isSelected || isCorretaNoFeedback) ? '#ffffff' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    transition: 'all 0.15s ease'
                  }}>
                    {opcao.letra}
                  </div>

                  {/* Imagem da alternativa */}
                  {opcao.url ? (
                    <img
                      src={opcao.url}
                      alt={`Opção ${opcao.letra}`}
                      style={{
                        maxHeight: '110px',
                        maxWidth: '85%',
                        objectFit: 'contain',
                        marginTop: '10px'
                      }}
                    />
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Opção {opcao.letra}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Rodapé com Botão de Confirmação */}
        {!treinoFeedback && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '8px'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {isTreino ? (
                <span>Os exemplos não contam pontos. Responda para avançar.</span>
              ) : (
                <span>Selecione a alternativa e clique em avançar.</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleConfirmAnswer}
              disabled={!selectedOption}
              className="btn btn-primary btn-lg"
              style={{
                opacity: selectedOption ? 1 : 0.5,
                cursor: selectedOption ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 32px',
                fontSize: '1.05rem',
                fontWeight: 700,
                borderRadius: '12px'
              }}
            >
              {isLastPage ? 'Concluir Teste' : 'Confirmar e Avançar'} <ArrowRight size={20} />
            </button>
          </div>
        )}
      </main>

      {/* Modal de Confirmação para Sair */}
      {showExitModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
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
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#1e293b' }}>
              Deseja interromper a aplicação?
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5, marginBottom: '24px' }}>
              Se sair agora, as respostas desta sessão não serão salvas como concluídas.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowExitModal(false)}
                className="btn btn-secondary"
              >
                Continuar Teste
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="btn btn-primary"
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
              >
                Sair do Teste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
