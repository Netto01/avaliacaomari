/**
 * PROTOCOLO PSICOMÉTRICO OFICIAL DO TESTE DE ATENÇÃO POR CANCELAMENTO (TAC)
 * Matriz padronizada de 300 figuras (15 linhas x 20 colunas)
 * Utiliza SOMENTE os arquivos de imagem das pastas (Pocoyo, Duo, Fred, etc.)
 */

export const TAC_STIMULI_CONFIG = {
  parte1: {
    title: 'Parte 1: Atenção Seletiva',
    subtitle: 'Alvo Simples (50 alvos em 300 figuras)',
    instruction: 'Risque rapidamente toda vez que encontrar a figura indicada como ALVO. São 50 alvos distribuídos aleatoriamente nas 15 linhas. Você tem 1 minuto.',
    targetSample: '/api/estimulos/parte1/pocoyo1.png?v=clean2',
    targetName: 'Pocoyo',
    durationSeconds: 60,
    treinoRows: 3,
    treinoCols: 10,
    testRows: 15,
    testCols: 20,
    totalTargets: 50,
    totalItems: 300,
    defaultImages: {
      target: '/api/estimulos/parte1/pocoyo1.png?v=clean2',
      distractors: [
        '/api/estimulos/parte3/Fred_Pulpo_2025.webp?v=clean2',
        '/api/estimulos/parte3/artpoin-pocoyo12.png?v=clean2',
        '/api/estimulos/parte3/artpoin-pocoyo18.png?v=clean2',
        '/api/estimulos/parte3/e67735e20862e796117eb10b68aaa0b0-removebg-preview.png?v=clean2',
        '/api/estimulos/parte3/png-clipart-child-pocoyo-pocoyo-graphy-drawing-child-child-photography.png?v=clean2'
      ]
    }
  },
  parte2: {
    title: 'Parte 2: Atenção Seletiva (Maior Dificuldade)',
    subtitle: 'Sequência Par Alvo (7 pares alvos em 300 figuras)',
    instruction: 'Risque o par exato de figuras juntas (nesta mesma ordem). Existem apenas 7 pares alvos em toda a folha de 300 figuras. Você tem 1 minuto.',
    targetSample: '/api/estimulos/parte3/pocoyo.png',
    targetPair: [
      '/api/estimulos/parte3/pocoyo.png',
      '/api/estimulos/parte3/Fred_Pulpo_2025.webp'
    ],
    targetName: 'Par Alvo (Pocoyo + Fred)',
    durationSeconds: 60,
    treinoRows: 3,
    treinoCols: 10,
    testRows: 15,
    testCols: 20,
    totalTargets: 7,
    totalItems: 300,
    defaultImages: {
      target: '/api/estimulos/parte3/pocoyo.png',
      target2: '/api/estimulos/parte3/Fred_Pulpo_2025.webp'
    }
  },
  parte3: {
    title: 'Parte 3: Atenção Alternada',
    subtitle: 'Alvo Muda a Cada Linha (52 alvos no total, 2 a 6 por linha)',
    instruction: 'O estímulo alvo muda a cada linha. Em cada uma das 15 linhas, encontre e marque os alvos indicados para aquela linha (variam de 2 a 6 alvos por linha). Você tem 1 minuto.',
    targetSample: '/api/estimulos/parte3/Fred_Pulpo_2025.webp?v=clean2',
    targetName: 'Alvo alternado por linha',
    durationSeconds: 60,
    treinoRows: 3,
    treinoCols: 10,
    testRows: 15,
    testCols: 20,
    totalTargets: 52,
    totalItems: 300,
    // Frequência de alvos por linha (15 linhas somando exatamente 52 alvos do protocolo oficial)
    targetsPerRow: [6, 4, 3, 4, 3, 5, 2, 4, 2, 4, 2, 3, 3, 5, 2],
    defaultImages: {
      target: '/api/estimulos/parte3/Fred_Pulpo_2025.webp',
      distractors: [
        '/api/estimulos/parte3/artpoin-pocoyo12.png',
        '/api/estimulos/parte3/artpoin-pocoyo18.png',
        '/api/estimulos/parte3/pocoyo.png',
        '/api/estimulos/parte3/e67735e20862e796117eb10b68aaa0b0-removebg-preview.png',
        '/api/estimulos/parte3/png-clipart-child-pocoyo-pocoyo-graphy-drawing-child-child-photography.png'
      ]
    }
  }
};

/**
 * Embaralhador determinístico com semente
 */
function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shuffleArray(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Gerador de Grade baseado exclusivamente nas imagens reais das pastas
 */
function createDeterministicGrid(partKey, isTreino = false, customImages = null) {
  const config = TAC_STIMULI_CONFIG[partKey];
  const rows = isTreino ? config.treinoRows : config.testRows;
  const cols = isTreino ? config.treinoCols : config.testCols;
  const rng = seededRandom(isTreino ? 104729 : 20260920);

  const targetImg = customImages?.target || config.defaultImages.target;
  const distractors = (customImages?.distractors && customImages.distractors.length > 0)
    ? customImages.distractors
    : (config.defaultImages.distractors || []);

  const items = [];
  let idCounter = 1;

  if (partKey === 'parte1') {
    const distPool = distractors.length > 0 ? distractors : [
      '/api/estimulos/parte3/Fred_Pulpo_2025.webp',
      '/api/estimulos/parte3/artpoin-pocoyo12.png',
      '/api/estimulos/parte3/artpoin-pocoyo18.png',
      '/api/estimulos/parte3/e67735e20862e796117eb10b68aaa0b0-removebg-preview.png',
      '/api/estimulos/parte3/png-clipart-child-pocoyo-pocoyo-graphy-drawing-child-child-photography.png'
    ];

    if (isTreino) {
      // Treino Parte 1: 30 itens, 5 alvos
      const targetIndices = new Set([2, 7, 14, 21, 28]);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const isTarget = targetIndices.has(idx);
          const distIdx = idx % distPool.length;
          items.push({
            id: `p1_tr_r${r}_c${c}_${idCounter++}`,
            row: r,
            col: c,
            isTarget,
            imageUrl: isTarget ? targetImg : distPool[distIdx],
            type: isTarget ? 'target' : 'distractor'
          });
        }
      }
    } else {
      // Teste Oficial Parte 1: Posições EXATAS dos 50 alvos da folha padrão (15 linhas x 20 colunas)
      // Fornecidas linha a linha pelo protocolo oficial
      const p1ExactTargetsByRow = [
        [2, 5, 14, 17],          // Linha 1: posições 3, 6, 15, 18 (4 alvos)
        [9, 15],                 // Linha 2: posições 10, 16 (2 alvos)
        [2, 6, 17],              // Linha 3: posições 3, 7, 18 (3 alvos)
        [4, 8, 10, 13, 18],      // Linha 4: posições 5, 9, 11, 14, 19 (5 alvos)
        [12, 15],                // Linha 5: posições 13, 16 (2 alvos)
        [1, 6, 8, 13, 19],       // Linha 6: posições 2, 7, 9, 14, 20 (5 alvos)
        [5, 10],                 // Linha 7: posições 6, 11 (2 alvos)
        [15, 18],                // Linha 8: posições 16, 19 (2 alvos)
        [1, 3, 9, 12],           // Linha 9: posições 2, 4, 10, 13 (4 alvos)
        [7, 14],                 // Linha 10: posições 8, 15 (2 alvos)
        [1, 5, 12, 17, 19],      // Linha 11: posições 2, 6, 13, 18, 20 (5 alvos)
        [7, 11, 14, 18],         // Linha 12: posições 8, 12, 15, 19 (4 alvos)
        [0, 3, 8],               // Linha 13: posições 1, 4, 9 (3 alvos)
        [6, 9, 14],              // Linha 14: posições 7, 10, 15 (3 alvos)
        [5, 8, 12, 18]           // Linha 15: posições 6, 9, 13, 19 (4 alvos)
      ];

      for (let r = 0; r < rows; r++) {
        const targetColsSet = new Set(p1ExactTargetsByRow[r] || []);
        for (let c = 0; c < cols; c++) {
          const isTarget = targetColsSet.has(c);
          const distIdx = (r * 7 + c * 3) % distPool.length;

          items.push({
            id: `p1_ts_r${r}_c${c}_${idCounter++}`,
            row: r,
            col: c,
            isTarget,
            imageUrl: isTarget ? targetImg : distPool[distIdx],
            type: isTarget ? 'target' : 'distractor'
          });
        }
      }
    }
  } else if (partKey === 'parte2') {
    // Alvo é o par ordenado: target1 seguido de target2
    const target1 = customImages?.target || config.defaultImages.target; // pocoyo2.png
    const target2 = customImages?.target2 || config.defaultImages.target2; // Fred_Pulpo_2025.webp

    // Pool de figuras dos arquivos soltos (parte 3 + pocoyo2)
    const characterList = (customImages?.characterDistractors && customImages.characterDistractors.length > 0)
      ? customImages.characterDistractors
      : [
          '/api/estimulos/parte3/Fred_Pulpo_2025.webp',
          '/api/estimulos/parte3/artpoin-pocoyo12.png',
          '/api/estimulos/parte3/artpoin-pocoyo18.png',
          '/api/estimulos/parte3/pocoyo.png',
          '/api/estimulos/parte3/e67735e20862e796117eb10b68aaa0b0-removebg-preview.png',
          '/api/estimulos/parte3/png-clipart-child-pocoyo-pocoyo-graphy-drawing-child-child-photography.png'
        ];

    // Distratores que não são target2 para usar com segurança após target1
    const nonTarget2Pool = characterList.filter(img => img !== target2);

    // Função auxiliar para emparelhar todas as colunas de cada linha em duplas
    function getRowPairs(r, totalCols, targetPairsList) {
      const rowTargets = targetPairsList.filter(tp => tp.row === r);
      const used = new Set();
      const pairs = [];

      rowTargets.forEach(tp => {
        used.add(tp.colA);
        used.add(tp.colB);
        pairs.push({
          colA: tp.colA,
          colB: tp.colB,
          pairId: tp.id,
          isTarget: true
        });
      });

      const rem = [];
      for (let c = 0; c < totalCols; c++) {
        if (!used.has(c)) rem.push(c);
      }

      for (let i = 0; i < rem.length; i += 2) {
        if (i + 1 < rem.length) {
          pairs.push({
            colA: rem[i],
            colB: rem[i + 1],
            pairId: `p2_dist_r${r}_c${rem[i]}`,
            isTarget: false
          });
        }
      }

      return pairs;
    }

    if (isTreino) {
      // Treino Parte 2: 3 linhas x 10 colunas = 30 figuras individuais = 15 pares no total
      // 2 pares alvos: Linha 1 (cols 3 e 4) e Linha 3 (cols 7 e 8)
      const treinoTargetPairs = [
        { row: 0, colA: 2, colB: 3, id: 'tr_p2_pair_0' },
        { row: 2, colA: 6, colB: 7, id: 'tr_p2_pair_1' }
      ];

      for (let r = 0; r < rows; r++) {
        const rowPairs = getRowPairs(r, cols, treinoTargetPairs);
        const pairLookup = new Map();
        rowPairs.forEach(p => {
          pairLookup.set(p.colA, { pairId: p.pairId, pos: 'first', isTarget: p.isTarget });
          pairLookup.set(p.colB, { pairId: p.pairId, pos: 'second', isTarget: p.isTarget });
        });

        for (let c = 0; c < cols; c++) {
          const pairInfo = pairLookup.get(c);
          let img;
          const isTarget = pairInfo?.isTarget || false;

          if (isTarget) {
            img = pairInfo.pos === 'first' ? target1 : target2;
          } else {
            const charIdx = (r * 7 + c * 3) % characterList.length;
            if (pairInfo?.pos === 'first') {
              img = characterList[charIdx];
            } else {
              const partnerCol = pairInfo?.pos === 'second' ? c - 1 : c + 1;
              const prevItem = items.find(it => it.row === r && it.col === partnerCol);
              const avoidTarget2 = prevItem?.imageUrl === target1;
              const pool = avoidTarget2 && nonTarget2Pool.length > 0 ? nonTarget2Pool : characterList;
              img = pool[(charIdx + 2) % pool.length];
            }
          }

          items.push({
            id: `p2_tr_r${r}_c${c}_${idCounter++}`,
            row: r,
            col: c,
            isTarget,
            pairGroupId: pairInfo?.pairId || `p2_tr_r${r}_c${c}`,
            pairPosition: pairInfo?.pos || 'first',
            imageUrl: img,
            type: isTarget ? 'target' : 'distractor'
          });
        }
      }
    } else {
      // Teste Oficial Parte 2: 15 linhas x 20 colunas = 300 figuras individuais = 150 pares no total
      // Exatamente 7 pares alvos mapeados pelo protocolo oficial:
      // Alvo 1: Linha 1, Colunas 3–4   (r=0, c=2, 3)
      // Alvo 2: Linha 3, Colunas 16–17 (r=2, c=15, 16)
      // Alvo 3: Linha 6, Colunas 14–15 (r=5, c=13, 14)
      // Alvo 4: Linha 7, Colunas 1–2   (r=6, c=0, 1)
      // Alvo 5: Linha 9, Colunas 19–20 (r=8, c=18, 19)
      // Alvo 6: Linha 12, Colunas 5–6  (r=11, c=4, 5)
      // Alvo 7: Linha 14, Colunas 16–17(r=13, c=15, 16)
      const officialTargetPairs = [
        { row: 0, colA: 2, colB: 3, id: 'p2_pair_0' },
        { row: 2, colA: 15, colB: 16, id: 'p2_pair_1' },
        { row: 5, colA: 13, colB: 14, id: 'p2_pair_2' },
        { row: 6, colA: 0, colB: 1, id: 'p2_pair_3' },
        { row: 8, colA: 18, colB: 19, id: 'p2_pair_4' },
        { row: 11, colA: 4, colB: 5, id: 'p2_pair_5' },
        { row: 13, colA: 15, colB: 16, id: 'p2_pair_6' }
      ];

      for (let r = 0; r < rows; r++) {
        const rowPairs = getRowPairs(r, cols, officialTargetPairs);
        const pairLookup = new Map();
        rowPairs.forEach(p => {
          pairLookup.set(p.colA, { pairId: p.pairId, pos: 'first', isTarget: p.isTarget });
          pairLookup.set(p.colB, { pairId: p.pairId, pos: 'second', isTarget: p.isTarget });
        });

        for (let c = 0; c < cols; c++) {
          const pairInfo = pairLookup.get(c);
          let img;
          const isTarget = pairInfo?.isTarget || false;

          if (isTarget) {
            img = pairInfo.pos === 'first' ? target1 : target2;
          } else {
            const charIdx = (r * 11 + c * 5) % characterList.length;
            if (pairInfo?.pos === 'first') {
              img = characterList[charIdx];
            } else {
              const partnerCol = pairInfo?.pos === 'second' ? c - 1 : c + 1;
              const prevItem = items.find(it => it.row === r && it.col === partnerCol);
              const avoidTarget2 = prevItem?.imageUrl === target1;
              const pool = avoidTarget2 && nonTarget2Pool.length > 0 ? nonTarget2Pool : characterList;
              img = pool[(charIdx + 3) % pool.length];
            }
          }

          items.push({
            id: `p2_ts_r${r}_c${c}_${idCounter++}`,
            row: r,
            col: c,
            isTarget,
            pairGroupId: pairInfo?.pairId || `p2_ts_r${r}_c${c}`,
            pairPosition: pairInfo?.pos || 'first',
            imageUrl: img,
            type: isTarget ? 'target' : 'distractor'
          });
        }
      }
    }
  } else if (partKey === 'parte3') {
    // Lista de figuras alvos das linhas (personagens de parte3)
    const targetsList = (customImages?.targetsList && customImages.targetsList.length > 0)
      ? customImages.targetsList
      : [
          '/api/estimulos/parte3/Fred_Pulpo_2025.webp',
          '/api/estimulos/parte3/artpoin-pocoyo12.png',
          '/api/estimulos/parte3/artpoin-pocoyo18.png',
          '/api/estimulos/parte3/e67735e20862e796117eb10b68aaa0b0-removebg-preview.png',
          '/api/estimulos/parte3/png-clipart-child-pocoyo-pocoyo-graphy-drawing-child-child-photography.png',
          '/api/estimulos/parte3/pocoyo.png'
        ];

    if (isTreino) {
      // Treino Parte 3: 3 linhas x 10 cols, 2 alvos por linha
      for (let r = 0; r < rows; r++) {
        const lineTarget = targetsList[r % targetsList.length];
        const rowDistractors = targetsList.filter(img => img !== lineTarget);
        const distPool = rowDistractors.length > 0 ? rowDistractors : targetsList;
        const lineTargetCols = new Set([(r * 3 + 2) % cols, (r * 3 + 6) % cols]);

        for (let c = 0; c < cols; c++) {
          const isTarget = lineTargetCols.has(c);
          const distIdx = (r * 7 + c) % distPool.length;
          items.push({
            id: `p3_tr_r${r}_c${c}_${idCounter++}`,
            row: r,
            col: c,
            isTarget,
            imageUrl: isTarget ? lineTarget : distPool[distIdx],
            type: isTarget ? 'target' : 'distractor'
          });
        }
      }
    } else {
      // Teste Oficial Parte 3: 15 linhas x 20 colunas = 300 figuras individuais
      // Posições EXATAS dos 52 alvos mapeados pelo protocolo oficial:
      const p3ExactTargetsByRow = [
        [0, 6, 9, 13, 15, 17],     // Linha 1: Colunas 1, 7, 10, 14, 16, 18 (6 alvos)
        [9, 14, 16, 18],           // Linha 2: Colunas 10, 15, 17, 19 (4 alvos)
        [0, 7, 9],                 // Linha 3: Colunas 1, 8, 10 (3 alvos)
        [2, 10, 14, 19],           // Linha 4: Colunas 3, 11, 15, 20 (4 alvos)
        [3, 14, 18],               // Linha 5: Colunas 4, 15, 19 (3 alvos)
        [0, 2, 6, 13, 18],         // Linha 6: Colunas 1, 3, 7, 14, 19 (5 alvos)
        [2, 13],                   // Linha 7: Colunas 3, 14 (2 alvos)
        [2, 8, 13, 16],            // Linha 8: Colunas 3, 9, 14, 17 (4 alvos)
        [1, 14],                   // Linha 9: Colunas 2, 15 (2 alvos)
        [6, 9, 14, 18],            // Linha 10: Colunas 7, 10, 15, 19 (4 alvos)
        [4, 13],                   // Linha 11: Colunas 5, 14 (2 alvos)
        [2, 10, 16],               // Linha 12: Colunas 3, 11, 17 (3 alvos)
        [4, 10, 15],               // Linha 13: Colunas 5, 11, 16 (3 alvos)
        [0, 2, 5, 7, 11],          // Linha 14: Colunas 1, 3, 6, 8, 12 (5 alvos)
        [1, 7]                     // Linha 15: Colunas 2, 8 (2 alvos)
      ];

      for (let r = 0; r < rows; r++) {
        const lineTarget = targetsList[r % targetsList.length];
        const rowDistractors = targetsList.filter(img => img !== lineTarget);
        const distPool = rowDistractors.length > 0 ? rowDistractors : targetsList;
        const targetColsSet = new Set(p3ExactTargetsByRow[r] || []);

        for (let c = 0; c < cols; c++) {
          const isTarget = targetColsSet.has(c);
          const distIdx = (r * 7 + c * 3) % distPool.length;

          items.push({
            id: `p3_ts_r${r}_c${c}_${idCounter++}`,
            row: r,
            col: c,
            isTarget,
            imageUrl: isTarget ? lineTarget : distPool[distIdx],
            type: isTarget ? 'target' : 'distractor'
          });
        }
      }
    }
  }

  const isPairTest = partKey === 'parte2';
  const totalTargetsCount = isPairTest
    ? new Set(items.filter(it => it.isTarget && it.pairGroupId).map(it => it.pairGroupId)).size
    : items.filter(it => it.isTarget).length;

  let rowTargets = null;
  if (partKey === 'parte3') {
    const targetsList = (customImages?.targetsList && customImages.targetsList.length > 0)
      ? customImages.targetsList
      : [
          '/api/estimulos/parte3/Fred_Pulpo_2025.webp',
          '/api/estimulos/parte3/artpoin-pocoyo12.png',
          '/api/estimulos/parte3/artpoin-pocoyo18.png',
          '/api/estimulos/parte3/e67735e20862e796117eb10b68aaa0b0-removebg-preview.png',
          '/api/estimulos/parte3/png-clipart-child-pocoyo-pocoyo-graphy-drawing-child-child-photography.png',
          '/api/estimulos/parte3/pocoyo.png'
        ];
    rowTargets = Array.from({ length: rows }, (_, r) => targetsList[r % targetsList.length]);
  }

  return {
    rows,
    cols,
    items,
    partKey,
    rowTargets,
    isPairTest,
    totalTargets: totalTargetsCount,
    totalItems: items.length
  };
}

export function getGridForPart(partNumber, isTreino = false, customImages = null) {
  const partKey = `parte${partNumber}`;
  return createDeterministicGrid(partKey, isTreino, customImages);
}
