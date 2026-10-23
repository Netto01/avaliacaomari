/**
 * NORMAS PSICOMÉTRICAS E TABELAS DE PERCENTIS DO TAC
 * Base para interpretação clínica de crianças e adolescentes
 */

export function calculateAge(birthDateStr) {
  if (!birthDateStr) return { years: 0, months: 0, formatted: 'Idade não informada' };
  
  const birth = new Date(birthDateStr);
  const now = new Date();
  
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  
  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    years--;
    months += 12;
  }
  
  return {
    years,
    months,
    formatted: `${years} anos e ${months} meses`
  };
}

// Normas de referência para escore líquido total do TAC
export const TAC_NORMATIVE_TABLES = [
  {
    minAge: 6,
    maxAge: 7,
    p5: 12,
    p10: 16,
    p25: 22,
    p50: 29,
    p75: 38,
    p90: 46,
    p95: 52,
    mean: 30.2,
    stdDev: 9.8
  },
  {
    minAge: 8,
    maxAge: 9,
    p5: 18,
    p10: 24,
    p25: 32,
    p50: 42,
    p75: 52,
    p90: 62,
    p95: 68,
    mean: 42.5,
    stdDev: 11.4
  },
  {
    minAge: 10,
    maxAge: 11,
    p5: 25,
    p10: 32,
    p25: 43,
    p50: 55,
    p75: 67,
    p90: 78,
    p95: 84,
    mean: 55.1,
    stdDev: 13.0
  },
  {
    minAge: 12,
    maxAge: 14,
    p5: 32,
    p10: 40,
    p25: 54,
    p50: 68,
    p75: 80,
    p90: 92,
    p95: 98,
    mean: 67.8,
    stdDev: 14.5
  },
  {
    minAge: 15,
    maxAge: 99,
    p5: 40,
    p10: 48,
    p25: 62,
    p50: 76,
    p75: 90,
    p90: 102,
    p95: 110,
    mean: 76.4,
    stdDev: 15.2
  }
];

export function getNormativeInterpretation(netScore, ageYears) {
  const norm = TAC_NORMATIVE_TABLES.find(n => ageYears >= n.minAge && ageYears <= n.maxAge) 
               || TAC_NORMATIVE_TABLES[TAC_NORMATIVE_TABLES.length - 1];

  let percentile = 50;
  if (netScore < norm.p5) percentile = 3;
  else if (netScore < norm.p10) percentile = 5;
  else if (netScore < norm.p25) percentile = 15;
  else if (netScore < norm.p50) percentile = 35;
  else if (netScore < norm.p75) percentile = 60;
  else if (netScore < norm.p90) percentile = 80;
  else if (netScore < norm.p95) percentile = 92;
  else percentile = 98;

  let classification = 'Médio';
  let badgeColor = '#3b82f6'; // Azul

  if (percentile >= 90) {
    classification = 'Superior';
    badgeColor = '#10b981'; // Verde esmeralda
  } else if (percentile >= 75) {
    classification = 'Médio Superior';
    badgeColor = '#06b6d4'; // Ciano
  } else if (percentile >= 25) {
    classification = 'Médio';
    badgeColor = '#3b82f6'; // Azul
  } else if (percentile >= 10) {
    classification = 'Médio Inferior';
    badgeColor = '#f59e0b'; // Âmbar
  } else {
    classification = 'Inferior / Alerta';
    badgeColor = '#ef4444'; // Vermelho
  }

  return {
    percentile,
    classification,
    badgeColor,
    normativeGroup: `${norm.minAge} a ${norm.maxAge === 99 ? '18+' : norm.maxAge} anos`,
    expectedMean: norm.mean,
    stdDev: norm.stdDev
  };
}
