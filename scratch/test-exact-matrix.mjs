import { getGridForPart } from '../src/lib/tacProtocol.js';

console.log('=== VERIFICAÇÃO RIGOROSA DAS ESPECIFICAÇÕES DO TAC ===\n');

// 1. Parte 1
const p1 = getGridForPart(1, false);
console.log(`Parte 1:`);
console.log(`- Linhas x Colunas: ${p1.rows} x ${p1.cols} = ${p1.totalItems} figuras (Esperado: 300)`);
console.log(`- Total de Alvos: ${p1.totalTargets} (Esperado: 50)`);
console.log(`- Total de Distratores: ${p1.totalItems - p1.totalTargets} (Esperado: 250)`);

if (p1.totalItems !== 300 || p1.totalTargets !== 50) {
  console.error('❌ Falha na Parte 1!');
  process.exit(1);
}

// 2. Parte 2
const p2 = getGridForPart(2, false);
console.log(`\nParte 2:`);
console.log(`- Linhas x Colunas: ${p2.rows} x ${p2.cols} = ${p2.totalItems} figuras (Esperado: 300)`);
console.log(`- Total de Alvos: ${p2.totalTargets} (Esperado: 7)`);

if (p2.totalItems !== 300 || p2.totalTargets !== 7) {
  console.error('❌ Falha na Parte 2!');
  process.exit(1);
}

// 3. Parte 3
const p3 = getGridForPart(3, false);
console.log(`\nParte 3:`);
console.log(`- Linhas x Colunas: ${p3.rows} x ${p3.cols} = ${p3.totalItems} figuras (Esperado: 300)`);
console.log(`- Total de Alvos: ${p3.totalTargets} (Esperado: 52)`);

// Frequência por linha na Parte 3
const targetsByRow = [];
for (let r = 0; r < p3.rows; r++) {
  const rowTargets = p3.items.filter(it => it.row === r && it.isTarget).length;
  targetsByRow.push(rowTargets);
}
console.log(`- Frequência de alvos por linha (linhas 1 a 15): [${targetsByRow.join(', ')}]`);
const minRow = Math.min(...targetsByRow);
const maxRow = Math.max(...targetsByRow);
console.log(`- Mínimo por linha: ${minRow} (Esperado: >= 2) | Máximo por linha: ${maxRow} (Esperado: <= 6)`);

if (p3.totalItems !== 300 || p3.totalTargets !== 52 || minRow < 2 || maxRow > 6) {
  console.error('❌ Falha na Parte 3!');
  process.exit(1);
}

console.log('\n🎉 TODAS AS ESPECIFICAÇÕES DO DOCUMENTO FORAM 100% VALIDADAS E ATENDIDAS!');
