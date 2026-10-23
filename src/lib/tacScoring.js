/**
 * MOTOR PSICOMÉTRICO DE CORREÇÃO DO TAC
 * Calcula Acertos (A), Erros de Comissão (E), Omissões (O) e Escore Líquido (A - E)
 */

export function calculatePartScore(grid, markedItemIds, durationSeconds = 60) {
  const markedSet = new Set(markedItemIds);
  let hits = 0;
  let errors = 0;

  // Encontra a última linha que o paciente alcançou para calcular omissões justas
  let maxRowReached = 0;
  grid.items.forEach(item => {
    if (markedSet.has(item.id)) {
      if (item.row > maxRowReached) {
        maxRowReached = item.row;
      }
    }
  });

  // Se nada foi marcado, o paciente não passou da linha 0
  let targetsTotal = 0;
  let targetsProcessed = 0;

  if (grid.isPairTest) {
    // Parte 2: Alvos são pares ordenados de figuras (7 pares no total oficial)
    const processedPairIds = new Set();
    const markedPairIds = new Set();
    const allPairIds = new Set();
    const markedDistractorPairs = new Set();

    grid.items.forEach(item => {
      if (item.isTarget && item.pairGroupId) {
        allPairIds.add(item.pairGroupId);
        if (item.row <= maxRowReached) {
          processedPairIds.add(item.pairGroupId);
        }
        if (markedSet.has(item.id)) {
          markedPairIds.add(item.pairGroupId);
        }
      } else if (markedSet.has(item.id) && !item.isTarget) {
        markedDistractorPairs.add(item.pairGroupId || item.id);
      }
    });

    hits = markedPairIds.size;
    errors = markedDistractorPairs.size;
    targetsTotal = allPairIds.size || 7;
    targetsProcessed = processedPairIds.size;
  } else {
    // Parte 1 e Parte 3: Alvos individuais
    grid.items.forEach(item => {
      if (item.isTarget) {
        targetsTotal++;
        if (item.row <= maxRowReached) {
          targetsProcessed++;
        }
      }

      if (markedSet.has(item.id)) {
        if (item.isTarget) {
          hits++;
        } else {
          errors++;
        }
      }
    });
  }

  // Omissões: alvos até a última linha alcançada que deixaram de ser marcados
  const omissions = Math.max(0, targetsProcessed - hits);
  const netScore = Math.max(0, hits - errors);

  return {
    hits,
    errors,
    omissions,
    netScore,
    targetsTotal,
    targetsProcessed,
    maxRowReached: maxRowReached + 1,
    totalRows: grid.rows,
    markedCount: markedItemIds.length,
    durationSeconds
  };
}

export function calculateTotalScore(p1Score, p2Score, p3Score) {
  const totalHits = (p1Score?.hits || 0) + (p2Score?.hits || 0) + (p3Score?.hits || 0);
  const totalErrors = (p1Score?.errors || 0) + (p2Score?.errors || 0) + (p3Score?.errors || 0);
  const totalOmissions = (p1Score?.omissions || 0) + (p2Score?.omissions || 0) + (p3Score?.omissions || 0);
  const totalNetScore = (p1Score?.netScore || 0) + (p2Score?.netScore || 0) + (p3Score?.netScore || 0);

  return {
    totalHits,
    totalErrors,
    totalOmissions,
    totalNetScore
  };
}
