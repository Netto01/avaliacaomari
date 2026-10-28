'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { dbService } from '@/lib/supabaseClient';

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

  // Cronômetros e pausa
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [itemSeconds, setItemSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
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
          router.push('/dashboard/pacientes');
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

  // 2. Cronômetro contínuo (pausável)
  useEffect(() => {
    if (loading || saving || pages.length === 0 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTotalSeconds((prev) => prev + 1);
      setItemSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [loading, saving, pages.length, isPaused]);

  const currentPage = pages[currentPageIndex];
  const isTreino = currentPage?.isTreino ?? false;
  const isLastPage = currentPageIndex === pages.length - 1;
  const totalPages = pages.length || 62;
  const progressPercent = Math.max(1.6, ((currentPageIndex + 1) / totalPages) * 100);

  // Formatação de tempo mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 3. Ação: Selecionar alternativa
  const handleSelectOption = (letra) => {
    if (treinoFeedback) return;
    setSelectedOption(letra);
  };

  // 4. Ação: Voltar para página anterior
  const handlePrevious = () => {
    if (currentPageIndex > 0 && !saving) {
      setCurrentPageIndex((prev) => prev - 1);
      setSelectedOption(null);
      setTreinoFeedback(null);
      setItemSeconds(0);
    }
  };

  // 5. Ação: Confirmar resposta e avançar
  const handleConfirmAnswer = async () => {
    if (!selectedOption || saving) return;

    if (isTreino) {
      // Se ainda não mostrou feedback, valida e exibe o feedback
      if (!treinoFeedback) {
        const isCorrect = selectedOption.toUpperCase() === currentPage.correta.toUpperCase();
        setTreinoFeedback({
          isCorrect,
          correta: currentPage.correta.toUpperCase()
        });
        return;
      }

      // Se já mostrou feedback, avança para o próximo exemplo ou item
      setTreinoFeedback(null);
      setSelectedOption(null);
      setItemSeconds(0);
      setCurrentPageIndex((prev) => prev + 1);
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
      setCurrentPageIndex((prev) => prev + 1);
    }
  };

  // 6. Finalizar teste e salvar resultados
  const finishTest = async (finalResponses) => {
    setSaving(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const totalHits = finalResponses.filter((r) => r.isCorrect).length;
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

  // 7. Atalhos de teclado (A-F para marcar, Enter para confirmar)
  useEffect(() => {
    function handleKeyDown(e) {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      const k = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D', 'E', 'F'].includes(k) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleSelectOption(k);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedOption) {
          handleConfirmAnswer();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOption, treinoFeedback, currentPageIndex, isTreino, pages, testResponses, itemSeconds, totalSeconds, isLastPage]);

  if (loading || !currentPage) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f4f6f0',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '4px solid #d6dccd',
          borderTopColor: '#2f6b31',
          animation: 'spin 1s linear infinite'
        }} />
        <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '20px', color: '#28352c', fontWeight: 560 }}>
          Carregando caderno do TNVRI...
        </h2>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
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
        background: '#f4f6f0',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '4px solid #d6dccd',
          borderTopColor: '#2f6b31',
          animation: 'spin 1s linear infinite'
        }} />
        <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '22px', color: '#28352c', fontWeight: 560 }}>
          Processando e gerando relatório do TNVRI...
        </h2>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const patientName = patient?.full_name || 'Mariana';

  return (
    <div style={{
      minHeight: '100vh',
      height: '100vh',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      background: '#f4f6f0',
      color: '#28352c',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      fontSize: '16px',
      lineHeight: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>{`
        #confirmar:disabled{opacity:.45;cursor:default}
        .opcao[aria-checked=true]{border:2px solid #2f6b31!important;background:#dafeaa!important;padding:9px!important}
        .opcao[aria-checked=true] .badge{background:#2f6b31!important;color:#fff!important}
        .opcao[aria-checked=true] .check{display:flex!important}
        .opcao:hover{border-color:#2f6b31!important}
        .opcao.correta-treino{border:2px solid #2f6b31!important;background:#dafeaa!important;padding:9px!important}
        .opcao.correta-treino .badge{background:#2f6b31!important;color:#fff!important}
        .opcao.correta-treino .check{display:flex!important}
        .opcao.errada-treino{border:2px solid #a8261d!important;background:#fde8e8!important;padding:9px!important}
        .opcao.errada-treino .badge{background:#a8261d!important;color:#fff!important}
        @media (max-width:900px){main{flex-direction:column!important;overflow:auto}}
        a:focus-visible,button:focus-visible{outline:2px solid #9a5d12;outline-offset:2px}
      `}</style>

      {/* CABEÇALHO */}
      {isHeaderCollapsed ? (
        <header style={{
          background: '#ffffff',
          borderBottom: '1px solid #d6dccd',
          padding: '8px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            <span style={{
              padding: '2px 8px',
              borderRadius: '4px',
              background: '#efe7f0',
              color: '#6a4870',
              fontSize: '12px',
              lineHeight: '16px',
              fontWeight: 600,
              letterSpacing: '0.02em'
            }}>
              TNVRI
            </span>
            <span style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: '18px',
              fontWeight: 560,
              color: '#28352c'
            }}>
              {currentPage.titulo || (isTreino ? `Exemplo ${currentPageIndex + 1}` : `Item ${currentPageIndex - 1}`)}
            </span>
            {isTreino ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '4px',
                background: '#dafeaa',
                color: '#22512a',
                fontSize: '12px',
                fontWeight: 600
              }}>
                Treino · não pontua
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '4px',
                background: '#e9ede3',
                color: '#28352c',
                fontSize: '12px',
                fontWeight: 600
              }}>
                Teste oficial
              </span>
            )}
            <span aria-hidden="true" style={{ width: '1px', height: '20px', background: '#d6dccd' }}></span>
            <span style={{ fontSize: '13px', color: '#566152' }}>
              Paciente: <strong style={{ color: '#28352c', fontWeight: 600 }}>{patientName}</strong>
            </span>
            <div style={{
              flex: 1,
              maxWidth: '220px',
              height: '6px',
              borderRadius: '999px',
              background: '#e9ede3',
              overflow: 'hidden',
              marginLeft: '8px'
            }}>
              <div style={{
                width: `${progressPercent}%`,
                height: '100%',
                borderRadius: '999px',
                background: '#488b49',
                transition: 'width 250ms ease-out'
              }} />
            </div>
            <span style={{
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              fontSize: '12px',
              color: '#566152'
            }}>
              {currentPageIndex + 1} / {totalPages}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsHeaderCollapsed(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 12px',
                minHeight: '36px',
                borderRadius: '8px',
                border: '1px solid #7d8775',
                background: '#ffffff',
                color: '#28352c',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              Expandir barra (cronômetro)
            </button>
            <button
              type="button"
              onClick={() => setShowExitModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 10px',
                minHeight: '36px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: '#a8261d',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Encerrar
            </button>
          </div>
        </header>
      ) : (
        <header style={{ background: '#ffffff', borderBottom: '1px solid #d6dccd' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '12px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
              <span style={{
                padding: '2px 8px',
                borderRadius: '4px',
                background: '#efe7f0',
                color: '#6a4870',
                fontSize: '12px',
                lineHeight: '16px',
                fontWeight: 600,
                letterSpacing: '0.02em'
              }}>
                TNVRI
              </span>
              <h1 style={{
                margin: 0,
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: '22px',
                lineHeight: '28px',
                fontWeight: 560
              }}>
                {currentPage.titulo || (isTreino ? `Exemplo ${currentPageIndex + 1}` : `Item ${currentPageIndex - 1}`)}
              </h1>

              {isTreino ? (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: '#dafeaa',
                  color: '#22512a',
                  fontSize: '12px',
                  lineHeight: '16px',
                  fontWeight: 600,
                  letterSpacing: '0.02em'
                }}>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path>
                  </svg>
                  Treino · não pontua
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: '#e9ede3',
                  color: '#28352c',
                  fontSize: '12px',
                  lineHeight: '16px',
                  fontWeight: 600,
                  letterSpacing: '0.02em'
                }}>
                  Teste oficial
                </span>
              )}

              <span aria-hidden="true" style={{ width: '1px', height: '24px', background: '#d6dccd' }}></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#566152' }}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Paciente: <strong style={{ color: '#28352c', fontWeight: 600 }}>{patientName}</strong></span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                role="timer"
                aria-label={`Tempo decorrido ${formatTime(totalSeconds)}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 12px',
                  minHeight: '44px',
                  boxSizing: 'border-box',
                  borderRadius: '8px',
                  background: '#e9ede3',
                  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                  fontSize: '15px',
                  fontWeight: 500,
                  color: isPaused ? '#a8261d' : '#28352c'
                }}
              >
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9"></circle>
                  <polyline points="12 7 12 12 15 14"></polyline>
                </svg>
                {isPaused ? 'Pausado' : formatTime(totalSeconds)}
              </span>

              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 14px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: '1px solid #7d8775',
                  background: isPaused ? '#dafeaa' : '#ffffff',
                  color: '#28352c',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  cursor: 'pointer'
                }}
              >
                {isPaused ? (
                  <>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    Retomar
                  </>
                ) : (
                  <>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="5" width="4" height="14" rx="1"></rect>
                      <rect x="14" y="5" width="4" height="14" rx="1"></rect>
                    </svg>
                    Pausar
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsHeaderCollapsed(true)}
                title="Retrair barra superior (esconder cronômetro)"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 12px',
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
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
                Retrair
              </button>

              <button
                type="button"
                onClick={() => setShowExitModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 14px',
                  minHeight: '44px',
                  boxSizing: 'border-box',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: '#a8261d',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  textDecoration: 'none'
                }}
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Encerrar aplicação
              </button>
            </div>
          </div>

          {/* BARRA DE PROGRESSO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 32px 12px' }}>
            <div
              role="progressbar"
              aria-label="Progresso do teste"
              aria-valuemin={1}
              aria-valuemax={totalPages}
              aria-valuenow={currentPageIndex + 1}
              style={{
                flex: 1,
                height: '6px',
                borderRadius: '999px',
                background: '#e9ede3',
                overflow: 'hidden'
              }}
            >
              <div style={{
                width: `${progressPercent}%`,
                height: '100%',
                borderRadius: '999px',
                background: '#488b49',
                transition: 'width 250ms ease-out'
              }} />
            </div>
            <span style={{
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              fontSize: '12px',
              lineHeight: '16px',
              color: '#566152'
            }}>
              {currentPageIndex + 1} / {totalPages}
            </span>
          </div>
        </header>
      )}

      {/* ÁREA PRINCIPAL DIVIDIDA */}
      <main style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        gap: '32px',
        padding: '24px 32px',
        alignItems: 'stretch'
      }}>
        {/* ESTÍMULO (COLUNA ESQUERDA) */}
        <section
          aria-label="Estímulo"
          style={{
            flex: 1.15,
            minWidth: 0,
            background: '#ffffff',
            border: '1px solid #d6dccd',
            borderRadius: '14px',
            boxShadow: '0 1px 2px rgba(27, 38, 28, 0.06), 0 2px 8px rgba(27, 38, 28, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '28px'
          }}
        >
          {currentPage.principalUrl ? (
            <img
              src={currentPage.principalUrl}
              alt={`Estímulo do ${currentPage.titulo}: desenho com uma parte faltando, marcada por um retângulo vazio`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
            />
          ) : (
            <p style={{ color: '#566152' }}>Imagem do estímulo não disponível.</p>
          )}
        </section>

        {/* ALTERNATIVAS (COLUNA DIREITA CENTRALIZADA) */}
        <section
          aria-labelledby="pergunta"
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center', width: '100%', maxWidth: '580px' }}>
            <h2
              id="pergunta"
              style={{
                margin: 0,
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: '26px',
                lineHeight: '32px',
                fontWeight: 560
              }}
            >
              Qual peça completa o desenho?
            </h2>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: '20px', color: '#566152' }}>
              {treinoFeedback ? (
                treinoFeedback.isCorrect ? (
                  <span style={{ color: '#22512a', fontWeight: 600 }}>
                    Muito bem! A alternativa {treinoFeedback.correta} completa o desenho perfeitamente.
                  </span>
                ) : (
                  <span style={{ color: '#a8261d', fontWeight: 600 }}>
                    A alternativa correta é a letra {treinoFeedback.correta}. Mostre ao paciente antes de avançar.
                  </span>
                )
              ) : (
                'Toque em uma alternativa. Dá para trocar antes de confirmar.'
              )}
            </p>
          </div>

          <div
            role="radiogroup"
            aria-labelledby="pergunta"
            style={{
              flex: 1,
              width: '100%',
              maxWidth: '580px',
              minHeight: 0,
              maxHeight: '520px',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
              gap: '12px'
            }}
          >
            {currentPage.opcoes && currentPage.opcoes.map((opcao) => {
              const isSelected = selectedOption === opcao.letra;
              const isCorretaNoFeedback = treinoFeedback && opcao.letra === treinoFeedback.correta;
              const isErradaNoFeedback = treinoFeedback && !treinoFeedback.isCorrect && isSelected;

              let extraClass = '';
              if (isCorretaNoFeedback) extraClass = 'correta-treino';
              else if (isErradaNoFeedback) extraClass = 'errada-treino';

              return (
                <button
                  key={opcao.letra}
                  type="button"
                  className={`opcao ${extraClass}`}
                  role="radio"
                  aria-checked={isSelected ? 'true' : 'false'}
                  aria-label={`Alternativa ${opcao.letra}`}
                  data-letra={opcao.letra}
                  onClick={() => handleSelectOption(opcao.letra)}
                  disabled={Boolean(treinoFeedback) || isPaused}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '8px 10px',
                    minHeight: 0,
                    borderRadius: '14px',
                    textAlign: 'left',
                    transition: 'border-color 120ms, background-color 120ms',
                    border: '1px solid #7d8775',
                    background: '#ffffff',
                    cursor: treinoFeedback || isPaused ? 'default' : 'pointer',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <span
                    className="badge"
                    aria-hidden="true"
                    style={{
                      alignSelf: 'flex-start',
                      minWidth: '28px',
                      height: '28px',
                      padding: '0 6px',
                      boxSizing: 'border-box',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 600,
                      background: '#e9ede3',
                      color: '#28352c',
                      transition: 'background 120ms, color 120ms'
                    }}
                  >
                    {opcao.letra}
                  </span>

                  <span
                    className="check"
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: isErradaNoFeedback ? '#a8261d' : '#2f6b31',
                      color: '#ffffff',
                      display: isSelected || isCorretaNoFeedback ? 'flex' : 'none',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isErradaNoFeedback ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </span>

                  <span style={{
                    flex: 1,
                    minHeight: 0,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                    borderRadius: '8px',
                    padding: '6px'
                  }}>
                    {opcao.url ? (
                      <img
                        src={opcao.url}
                        alt={`Alternativa ${opcao.letra}`}
                        style={{
                          maxWidth: '90%',
                          maxHeight: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '13px', color: '#566152' }}>Peça {opcao.letra}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      {/* RODAPÉ */}
      <footer style={{ background: '#ffffff', borderTop: '1px solid #d6dccd' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 32px' }}>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: 1,
            fontSize: '13px',
            lineHeight: '18px',
            color: '#566152'
          }}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"></circle>
              <line x1="12" y1="11" x2="12" y2="16"></line>
              <line x1="12" y1="8" x2="12" y2="8"></line>
            </svg>
            {isTreino
              ? 'Os exemplos de treino não contam pontos. Se o paciente errar, mostre a resposta certa antes de seguir.'
              : 'Itens oficiais da avaliação TNVRI. Selecione a alternativa e confirme para registrar.'}
          </span>

          <span id="sel-label" style={{ fontSize: '13px', color: '#566152' }}>
            {selectedOption ? `Resposta marcada: ${selectedOption}` : 'Nenhuma alternativa marcada'}
          </span>

          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentPageIndex === 0 || Boolean(treinoFeedback) || saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 16px',
              minHeight: '48px',
              borderRadius: '8px',
              border: '1px solid #d6dccd',
              background: '#ffffff',
              color: '#566152',
              fontSize: '14px',
              fontWeight: 600,
              cursor: currentPageIndex === 0 ? 'default' : 'pointer',
              opacity: currentPageIndex === 0 ? 0.45 : 1
            }}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Anterior
          </button>

          <button
            type="button"
            id="confirmar"
            onClick={handleConfirmAnswer}
            disabled={!selectedOption || saving || isPaused}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 20px',
              minHeight: '48px',
              borderRadius: '8px',
              border: 0,
              background: '#2f6b31',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              letterSpacing: '0.02em',
              cursor: !selectedOption || saving ? 'default' : 'pointer'
            }}
          >
            {treinoFeedback ? 'Avançar para o próximo' : (isLastPage ? 'Concluir teste' : 'Confirmar e avançar')}
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      </footer>

      {/* OVERLAY DE PAUSA */}
      {isPaused && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(244, 246, 240, 0.92)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 80,
          gap: '16px'
        }}>
          <div style={{
            padding: '8px 16px',
            borderRadius: '999px',
            background: '#dafeaa',
            color: '#22512a',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="5" width="4" height="14" rx="1"></rect>
              <rect x="14" y="5" width="4" height="14" rx="1"></rect>
            </svg>
            Aplicação pausada
          </div>
          <h2 style={{
            margin: 0,
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: '28px',
            color: '#28352c',
            fontWeight: 560
          }}>
            O cronômetro está congelado
          </h2>
          <p style={{ margin: 0, fontSize: '15px', color: '#566152' }}>
            Clique abaixo para retomar a aplicação com o paciente.
          </p>
          <button
            type="button"
            onClick={() => setIsPaused(false)}
            style={{
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 24px',
              minHeight: '48px',
              borderRadius: '8px',
              border: 0,
              background: '#2f6b31',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Retomar aplicação
          </button>
        </div>
      )}

      {/* MODAL DE ENCERRAMENTO PREMATURO */}
      {showExitModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(40, 53, 44, 0.45)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            padding: '28px',
            border: '1px solid #d6dccd',
            boxShadow: '0 20px 25px -5px rgba(27, 38, 28, 0.15)'
          }}>
            <h3 style={{
              margin: '0 0 10px',
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: '22px',
              lineHeight: '28px',
              color: '#28352c',
              fontWeight: 560
            }}>
              Encerrar aplicação do TNVRI?
            </h3>
            <p style={{
              margin: '0 0 24px',
              fontSize: '14px',
              lineHeight: '20px',
              color: '#566152'
            }}>
              Se você encerrar agora, os dados parciais desta sessão não serão contabilizados no relatório final. Tem certeza?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                style={{
                  padding: '0 16px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: '1px solid #7d8775',
                  background: '#ffffff',
                  color: '#28352c',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Continuar teste
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/pacientes')}
                style={{
                  padding: '0 18px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: 0,
                  background: '#a8261d',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Sim, encerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
