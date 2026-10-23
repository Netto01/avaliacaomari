'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import TacCanvasGrid from '@/components/TacCanvasGrid';
import TimerBar from '@/components/TimerBar';
import { dbService } from '@/lib/supabaseClient';
import { getGridForPart, TAC_STIMULI_CONFIG } from '@/lib/tacProtocol';
import { calculatePartScore, calculateTotalScore } from '@/lib/tacScoring';
import { getNormativeInterpretation, calculateAge } from '@/lib/norms';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Maximize2,
  Info,
  Clock,
  User
} from 'lucide-react';

export default function TacTestPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const sessionId = resolvedParams.sessionId;

  // Estados principais
  const [session, setSession] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  // Etapa atual: partNumber (1, 2 ou 3) e modo (treino vs oficial)
  const [currentPart, setCurrentPart] = useState(1);
  const [isTreino, setIsTreino] = useState(true);

  // Estado do Teste Oficial
  const [grid, setGrid] = useState(null);
  const [markedIds, setMarkedIds] = useState([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef(null);

  // Log de cliques com timestamp
  const [interactionsLog, setInteractionsLog] = useState([]);

  // Armazenamento dos resultados de cada parte
  const [scores, setScores] = useState({
    p1: null,
    p2: null,
    p3: null
  });

  // Modal de transição entre partes
  const [transitionModal, setTransitionModal] = useState(null);

  // Modo folha de papel: controle de visibilidade da barra do examinador (recolhido por padrão no tablet)
  const [isDockHidden, setIsDockHidden] = useState(true);
  const [showClinicalDetails, setShowClinicalDetails] = useState(false);

  // Carrega a sessão e o paciente
  useEffect(() => {
    async function loadSession() {
      setLoading(true);
      const { data, error } = await dbService.getSession(sessionId);
      if (error || !data) {
        alert('Sessão não encontrada.');
        router.push('/dashboard');
        return;
      }
      setSession(data);
      setPatient(data.patients);
      setLoading(false);
    }
    loadSession();
  }, [sessionId, router]);

  // Estímulos customizados da pasta estimulos/
  const [customStimuli, setCustomStimuli] = useState(null);

  useEffect(() => {
    async function checkCustomStimuli() {
      try {
        const res = await fetch('/api/estimulos');
        if (res.ok) {
          const data = await res.json();
          setCustomStimuli(data);
        }
      } catch (e) {}
    }
    checkCustomStimuli();
  }, []);

  // Carrega a grade quando a parte, modo ou estímulos mudam
  useEffect(() => {
    const partKey = `parte${currentPart}`;
    const files = customStimuli?.[partKey] || [];
    let customImages = null;

    if (currentPart === 1) {
      // Parte 1: Alvo Pocoyo1 e distratores com as outras figuras de personagens
      if (files.length > 0) {
        customImages = {
          target: files[0].url,
          distractors: customStimuli?.characterDistractors || null
        };
      }
    } else if (currentPart === 2) {
      // Parte 2: Alvo par com figuras de personagens (Pocoyo + Fred) sem pocoyo2
      customImages = {
        target: '/api/estimulos/parte3/pocoyo.png',
        target2: '/api/estimulos/parte3/Fred_Pulpo_2025.webp',
        characterDistractors: customStimuli?.characterDistractors || null
      };
    } else if (currentPart === 3) {
      // Parte 3: Figuras de personagens alternando por linha
      if (files.length > 0) {
        customImages = {
          target: files[0].url,
          targetsList: files.map(f => f.url)
        };
      }
    }

    const newGrid = getGridForPart(currentPart, isTreino, customImages);
    setGrid(newGrid);
    setMarkedIds([]);
    setTimeLeft(60);
    if (isTreino) {
      setIsTimerRunning(false);
      clearInterval(timerRef.current);
    }
  }, [currentPart, isTreino, customStimuli]);

  // Cronômetro de 60 segundos para o Teste Oficial
  useEffect(() => {
    if (!isTreino && isTimerRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleTimeExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timerRef.current);
  }, [isTreino, isTimerRunning, timeLeft]);

  // Alterna marcação do estímulo ao clicar
  const handleToggleMark = (item) => {
    const now = Date.now();
    const alreadyMarked = markedIds.includes(item.id);

    // Na Parte 2 (Opção A), se o item pertence a um par alvo, seleciona/deseleciona ambos juntos
    let idsToToggle = [item.id];
    if (item.pairGroupId && grid?.items) {
      idsToToggle = grid.items
        .filter(it => it.pairGroupId === item.pairGroupId)
        .map(it => it.id);
    }

    // Registra interação
    setInteractionsLog((prev) => [
      ...prev,
      {
        part: currentPart,
        isTreino,
        itemId: item.id,
        row: item.row,
        col: item.col,
        isTarget: item.isTarget,
        pairGroupId: item.pairGroupId || null,
        action: alreadyMarked ? 'unmark' : 'mark',
        timestamp: now
      }
    ]);

    if (alreadyMarked) {
      setMarkedIds(prev => prev.filter(id => !idsToToggle.includes(id)));
    } else {
      setMarkedIds(prev => [...prev, ...idsToToggle.filter(id => !prev.includes(id))]);
    }
  };

  // Avaliador clica para iniciar o teste oficial: tempo começa a contar imediatamente!
  const handleStartOfficialTest = () => {
    setIsTreino(false);
    setTimeLeft(60);
    setMarkedIds([]);
    setIsTimerRunning(true);
    setIsDockHidden(true);
  };

  // Tempo de 60 segundos esgotado ou avaliador concluiu a etapa
  const handleTimeExpired = () => {
    setIsTimerRunning(false);
    clearInterval(timerRef.current);

    // Calcula escore da parte atual
    const partScore = calculatePartScore(grid, markedIds, 60 - timeLeft);
    const updatedScores = {
      ...scores,
      [`p${currentPart}`]: partScore
    };
    setScores(updatedScores);

    // Exibe o Pocoyo dando parabéns e falando o próximo desafio
    setTransitionModal({
      finishedPart: currentPart,
      nextPart: currentPart < 3 ? currentPart + 1 : null,
      partScore,
      allScores: updatedScores
    });
  };

  const handleAdvanceToNextPart = () => {
    if (transitionModal?.nextPart) {
      const nextPart = transitionModal.nextPart;
      setTransitionModal(null);
      setCurrentPart(nextPart);
      setIsTreino(true);
      setTimeLeft(60);
      setIsTimerRunning(false);
    } else {
      // Concluiu as 3 etapas! Salva no banco de dados e abre relatório clínico
      setTransitionModal(null);
      handleFinishAllParts(transitionModal?.allScores || scores);
    }
  };

  // Salva no banco de dados e abre relatório
  const handleFinishAllParts = async (finalScores) => {
    setLoading(true);
    const total = calculateTotalScore(finalScores.p1, finalScores.p2, finalScores.p3);
    const patientAge = calculateAge(patient?.birth_date).years;
    const norm = getNormativeInterpretation(total.totalNetScore, patientAge);

    const payload = {
      p1_hits: finalScores.p1?.hits || 0,
      p1_errors: finalScores.p1?.errors || 0,
      p1_omissions: finalScores.p1?.omissions || 0,
      p1_net_score: finalScores.p1?.netScore || 0,

      p2_hits: finalScores.p2?.hits || 0,
      p2_errors: finalScores.p2?.errors || 0,
      p2_omissions: finalScores.p2?.omissions || 0,
      p2_net_score: finalScores.p2?.netScore || 0,

      p3_hits: finalScores.p3?.hits || 0,
      p3_errors: finalScores.p3?.errors || 0,
      p3_omissions: finalScores.p3?.omissions || 0,
      p3_net_score: finalScores.p3?.netScore || 0,

      total_hits: total.totalHits,
      total_errors: total.totalErrors,
      total_omissions: total.totalOmissions,
      total_net_score: total.totalNetScore,

      total_percentile: norm.percentile,
      classification: norm.classification,
      raw_interactions: interactionsLog
    };

    await dbService.saveResults(sessionId, payload);
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    router.push('/dashboard');
  };

  const config = TAC_STIMULI_CONFIG[`parte${currentPart}`];

  if (loading) {
    return (
      <div className="tac-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p>Preparando aplicação do teste...</p>
      </div>
    );
  }

  const toggleFullscreen = () => {
    if (typeof document !== 'undefined') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Obtém o URL do estímulo alvo isolado para o topo da folha
  const getTargetHeroUrl = () => {
    const partFiles = customStimuli?.[`parte${currentPart}`] || [];
    const customTarget = partFiles.find(f => f.filename.toLowerCase().includes('alvo')) || partFiles[0];
    return customTarget ? customTarget.url : config.targetSample;
  };

  return (
    <div className="tac-container">
      {/* Topo da Folha de Papel: ESTÍMULO ALVO E CONTROLES SUPERIORES */}
      <header className="tac-paper-top-zone">
        {/* Esquerda: Botão Tela Cheia */}
        <div className="tac-top-action-left">
          <button
            onClick={toggleFullscreen}
            className="tac-top-btn"
            title="Alternar Modo Tela Cheia"
          >
            <Maximize2 size={13} />
            <span className="tac-btn-text">Tela Cheia</span>
          </button>
        </div>

        {/* Centro: Estímulo Alvo */}
        <div className="tac-paper-target-wrapper">
          {currentPart === 3 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#f8fafc',
              border: isTreino ? '2px solid #86efac' : '2px solid #cbd5e1',
              borderRadius: '10px',
              padding: isTreino ? '4px 14px' : '3px 12px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
            }}>
              <span style={{
                fontSize: isTreino ? '0.78rem' : '0.72rem',
                fontWeight: 800,
                color: isTreino ? '#15803d' : '#334155',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                {isTreino ? '🎯 Treino Parte 3: Atenção Alternada' : '🎯 Parte 3: Atenção Alternada'}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                (Alvo indicado no início de cada linha à esquerda)
              </span>
            </div>
          ) : currentPart === 2 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#f8fafc',
              border: isTreino ? '2px solid #86efac' : '2px solid #cbd5e1',
              borderRadius: '10px',
              padding: isTreino ? '4px 12px' : '3px 10px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
            }}>
              <span style={{
                fontSize: isTreino ? '0.78rem' : '0.72rem',
                fontWeight: 800,
                color: isTreino ? '#15803d' : '#334155',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                {isTreino ? '🎯 Par Alvo:' : '🎯 Par Alvo (Sequência):'}
              </span>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0px',
                background: '#ffffff',
                border: '1.5px solid #94a3b8',
                borderRadius: '8px',
                padding: '2px 6px',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
              }}>
                <img
                  src="/api/estimulos/parte3/pocoyo.png"
                  alt="Alvo 1"
                  className="tac-paper-target-img"
                  style={{
                    height: isTreino ? '48px' : '40px',
                    maxHeight: isTreino ? '48px' : '40px',
                    maxWidth: '42px',
                    objectFit: 'contain',
                    marginRight: '-2px'
                  }}
                />
                <img
                  src="/api/estimulos/parte3/Fred_Pulpo_2025.webp"
                  alt="Alvo 2"
                  className="tac-paper-target-img"
                  style={{
                    height: isTreino ? '48px' : '40px',
                    maxHeight: isTreino ? '48px' : '40px',
                    maxWidth: '42px',
                    objectFit: 'contain',
                    marginLeft: '-2px'
                  }}
                />
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#f8fafc',
              border: isTreino ? '2px solid #86efac' : '2px solid #cbd5e1',
              borderRadius: '10px',
              padding: isTreino ? '4px 14px' : '3px 12px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
            }}>
              <span style={{
                fontSize: isTreino ? '0.78rem' : '0.72rem',
                fontWeight: 800,
                color: isTreino ? '#15803d' : '#334155',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                {isTreino ? '🎯 Alvo do Treino:' : '🎯 Estímulo Alvo:'}
              </span>
              <img
                src={getTargetHeroUrl()}
                alt="Estímulo Alvo"
                className="tac-paper-target-img"
                style={{
                  height: isTreino ? '50px' : '42px',
                  maxHeight: isTreino ? '50px' : '42px',
                  maxWidth: isTreino ? '80px' : '65px'
                }}
              />
            </div>
          )}
        </div>

        {/* Direita: Botão Painel do Avaliador */}
        <div className="tac-top-action-right">
          <button
            onClick={() => setIsDockHidden(!isDockHidden)}
            className={`tac-top-btn ${!isDockHidden ? 'is-active' : ''}`}
            title="Abrir ou fechar painel do examinador"
          >
            <span>{isDockHidden ? '▲ Painel do Avaliador' : '▼ Fechar Painel'}</span>
          </button>
        </div>
      </header>

      {/* Painel do Avaliador no Topo (Retrátil, sem obstruir a folha de papel) */}
      {!isDockHidden && (
        <section className="tac-examiner-top-dock">
          {/* Esquerda: Identificação do Paciente e Fase */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: '#334155' }}>
              <User size={14} color="#2563eb" />
              <span>{patient?.full_name?.split(' ')[0] || 'Paciente'}</span>
            </div>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span style={{ fontWeight: 600, color: isTreino ? '#16a34a' : '#2563eb', fontSize: '0.78rem' }}>
              {config.title.split(':')[0]} • {isTreino ? 'TREINO' : 'OFICIAL'}
            </span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
              Marcados: <strong>{markedIds.length}</strong>
            </span>
          </div>

          {/* Centro: Cronômetro Discreto para o Avaliador */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!isTreino && (
              <TimerBar
                timeLeft={timeLeft}
                totalTime={60}
                isRunning={isTimerRunning}
              />
            )}
          </div>

          {/* Direita: Ações de Aplicação, Ocultação e Sair */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isTreino ? (
              <>
                <button
                  onClick={() => setMarkedIds([])}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                  title="Limpar marcações do treino"
                >
                  <RotateCcw size={12} /> Limpar
                </button>
                <button
                  onClick={handleStartOfficialTest}
                  className="btn btn-primary btn-sm"
                  style={{ background: '#16a34a', borderColor: '#16a34a', padding: '4px 12px', fontWeight: 600, fontSize: '0.78rem' }}
                >
                  <Play size={13} /> Iniciar Teste Oficial (1 Minuto)
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                >
                  {isTimerRunning ? <><Pause size={12} /> Pausar</> : <><Play size={12} /> Retomar</>}
                </button>
                <button
                  onClick={handleTimeExpired}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                >
                  <CheckCircle size={12} /> Concluir Etapa
                </button>
              </>
            )}

            <button
              onClick={() => setIsDockHidden(true)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
              title="Ocultar Painel"
            >
              Ocultar
            </button>

            <button
              onClick={() => {
                if (confirm('Deseja interromper e voltar ao painel? Os dados não salvos serão descartados.')) {
                  if (typeof document !== 'undefined' && document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                  }
                  router.push('/dashboard');
                }
              }}
              className="btn btn-secondary btn-sm"
              style={{ padding: '3px 8px', fontSize: '0.75rem', color: '#dc2626' }}
              title="Sair do teste"
            >
              Sair
            </button>
          </div>
        </section>
      )}

      {/* Área da Folha de Papel Pura com os Estímulos Soltos (100% livre na base) */}
      <main className="tac-board-wrapper">
        <TacCanvasGrid
          grid={grid}
          markedIds={markedIds}
          onToggleMark={handleToggleMark}
          isPair={currentPart === 2}
          disabled={!isTreino && !isTimerRunning && timeLeft === 0}
        />
      </main>

      {/* Modal de Parabéns Simplificado */}
      {transitionModal && (
        <div className="modal-backdrop">
          <div className="pocoyo-modal-card" style={{ maxWidth: '440px', padding: '36px 28px', textAlign: 'center' }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#1e293b',
              marginBottom: '20px',
              letterSpacing: '-0.02em'
            }}>
              🎉 Parabéns!
            </h2>

            {/* Imagem do Personagem Comemorando Centralizada */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
              <img
                src={customStimuli?.parte1?.[0]?.url || getTargetHeroUrl()}
                alt="Personagem Comemorando"
                style={{
                  height: '140px',
                  maxHeight: '140px',
                  objectFit: 'contain',
                  filter: 'grayscale(100%) contrast(110%)'
                }}
              />
            </div>

            {/* Botão de Avanço Limpo e Direto */}
            <button
              onClick={handleAdvanceToNextPart}
              className="pocoyo-btn-next"
              style={{
                width: '100%',
                padding: '16px 24px',
                fontSize: '1.15rem',
                fontWeight: 700,
                borderRadius: '16px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.15s'
              }}
            >
              {transitionModal.finishedPart === 1
                ? 'Ir para a Segunda Parte'
                : transitionModal.finishedPart === 2
                ? 'Ir para a Terceira Parte'
                : 'Concluir e Voltar ao Painel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
