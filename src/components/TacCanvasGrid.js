'use client';

import React from 'react';

// Função utilitária para tocar som suave de toque/clique (simulando caneta/toque)
function playGentleClickSound() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {
    // Silencia se o navegador bloquear autoplay
  }
}

export default function TacCanvasGrid({
  grid,
  markedIds = [],
  onToggleMark,
  disabled = false,
  isPair = false
}) {
  if (!grid || !grid.items) return null;

  const markedSet = new Set(markedIds);

  // Agrupa os itens por linha para manter alinhamento estrito
  const rows = [];
  for (let r = 0; r < grid.rows; r++) {
    rows.push(grid.items.filter(it => it.row === r));
  }

  const handleCellClick = (item) => {
    if (disabled) return;
    playGentleClickSound();
    if (onToggleMark) {
      onToggleMark(item);
    }
  };

  const numCols = grid.cols || 20;

  return (
    <div
      className={`tac-grid-sheet ${grid.rows <= 5 ? 'tac-grid-sheet-treino' : ''}`}
      style={{ '--tac-cols': numCols }}
      data-rows={grid.rows}
    >
      {rows.map((rowItems, rIdx) => (
        <div key={`row-${rIdx}`} className="tac-grid-row">
          {grid.rowTargets && grid.rowTargets[rIdx] && (
            <div className="tac-row-target-guide" title={`Alvo da Linha ${rIdx + 1}`}>
              <span className="tac-row-target-label">L{rIdx + 1}</span>
              <img
                src={grid.rowTargets[rIdx]}
                alt={`Alvo L${rIdx + 1}`}
                className="tac-row-target-img"
                draggable={false}
              />
            </div>
          )}
          {rowItems.map((item) => {
            const isMarked = markedSet.has(item.id);
            return (
              <div
                key={item.id}
                className={`tac-cell ${item.pairGroupId ? (item.pairPosition === 'first' ? 'tac-pair-first' : 'tac-pair-second') : ''}`}
                style={{
                  flex: `1 1 calc(100% / ${numCols})`,
                  width: `calc(100% / ${numCols})`,
                  maxWidth: `calc(100% / ${numCols})`
                }}
                onClick={() => handleCellClick(item)}
                role="button"
                tabIndex={0}
                aria-pressed={isMarked}
                title={item.isTarget ? 'Alvo' : 'Estímulo'}
              >
                {/* Imagem do Estímulo (imagem única de dupla ou par composto de dois personagens) */}
                {item.images && item.images.length === 2 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', width: '100%', height: '100%' }}>
                    <img
                      src={item.images[0]}
                      alt="Personagem 1"
                      style={{ width: '48%', height: '90%', objectFit: 'contain' }}
                      draggable={false}
                    />
                    <img
                      src={item.images[1]}
                      alt="Personagem 2"
                      style={{ width: '48%', height: '90%', objectFit: 'contain' }}
                      draggable={false}
                    />
                  </div>
                ) : (
                  <img
                    src={item.imageUrl}
                    alt={item.isTarget ? 'Alvo' : 'Estímulo'}
                    className="tac-stimulus-img"
                    draggable={false}
                  />
                )}

                {/* Traço de Cancelamento Sobreposto */}
                {isMarked && (
                  item.pairGroupId ? (
                    item.pairPosition === 'first' ? (
                      <div className="tac-mark-overlay-duo">
                        <div className="tac-mark-line-duo" />
                      </div>
                    ) : null
                  ) : (
                    <div className="tac-mark-overlay">
                      <div className="tac-mark-line" />
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
