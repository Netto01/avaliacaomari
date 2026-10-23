import { calculatePartScore, calculateTotalScore } from '../src/lib/tacScoring.js';
import { getGridForPart } from '../src/lib/tacProtocol.js';
import { getNormativeInterpretation, calculateAge } from '../src/lib/norms.js';

console.log('--- TESTANDO MOTOR PSICOMÉTRICO DO TAC ---');

// 1. Testa Parte 1 Treino e Oficial
const gridP1Treino = getGridForPart(1, true);
console.log(`Grade P1 Treino: ${gridP1Treino.rows}x${gridP1Treino.cols}, total itens: ${gridP1Treino.totalItems}, alvos: ${gridP1Treino.totalTargets}`);

const gridP1Oficial = getGridForPart(1, false);
console.log(`Grade P1 Oficial: ${gridP1Oficial.rows}x${gridP1Oficial.cols}, total itens: ${gridP1Oficial.totalItems}, alvos: ${gridP1Oficial.totalTargets}`);

// Simula marcação de 10 alvos e 2 distratores na Parte 1
const targets = gridP1Oficial.items.filter(it => it.isTarget);
const distractors = gridP1Oficial.items.filter(it => !it.isTarget);

const markedIds = [
  ...targets.slice(0, 10).map(t => t.id),
  ...distractors.slice(0, 2).map(d => d.id)
];

const scoreP1 = calculatePartScore(gridP1Oficial, markedIds, 60);
console.log('Escore calculado P1:', scoreP1);

if (scoreP1.hits === 10 && scoreP1.errors === 2 && scoreP1.netScore === 8) {
  console.log('✅ Validação do cálculo de Acertos, Erros e Escore Líquido: PASSOU!');
} else {
  console.error('❌ Falha na validação do escore!');
  process.exit(1);
}

// 2. Testa idade e norma
const age = calculateAge('2016-04-15');
console.log('Idade calculada:', age);
const norm = getNormativeInterpretation(45, age.years);
console.log('Interpretação normativa para 45 pts:', norm);

if (norm.percentile && norm.classification) {
  console.log('✅ Validação de normas e percentis: PASSOU!');
}
