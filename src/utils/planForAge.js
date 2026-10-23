// Ponto central que prepara a série por faixa etária, ANTES de chegar ao gerador.
//
// Para ADULTOS (qualquer ageGroup diferente de 'under18') nada muda: os valores passam exatamente como vieram.
// Para MENORES DE 18 ANOS:
//  - a categoria de IMC de adulto é descartada (as faixas de adulto não valem para a idade): séries, descanso,
//    cardio e notas não dependem dela;
//  - o objetivo "Emagrecer" é tratado como "Saúde geral" (hábitos), igual à área Saúde: não ativa cardio no
//    início nem descanso curto.
// O ajuste próprio de menores (volume leve, sem impacto, nota de supervisão) continua em imc.js, intacto.
import { generateWorkoutPlan, hydratePlan } from './workoutGenerator';
import { getIMCRecommendations } from './imc';

export const isUnder18 = (ageGroup) => ageGroup === 'under18';

// "Emagrecer" vira "Saúde geral" para menores (sem duplicar). Lista ausente continua ausente.
function goalsForMinor(goals) {
  if (!Array.isArray(goals)) {
    return goals === 'lose_weight' ? ['health'] : goals;
  }
  const mapped = goals.map((g) => (g === 'lose_weight' ? 'health' : g));
  return mapped.filter((g, i) => mapped.indexOf(g) === i);
}

// Objetivos que valem de fato para a série (também usados nas razões do guiado).
export function effectiveGoals(goals, ageGroup) {
  return isUnder18(ageGroup) ? goalsForMinor(goals) : goals;
}

// { imcCategory, goals } que o gerador deve receber.
export function adjustForAge({ imcCategory, goals, ageGroup }) {
  if (!isUnder18(ageGroup)) return { imcCategory, goals };
  return { imcCategory: undefined, goals: goalsForMinor(goals) };
}

export function generatePlanForAge(params) {
  if (!isUnder18(params?.ageGroup)) return generateWorkoutPlan(params);
  const { imcCategory, goals, goal, ...rest } = params;
  const adjusted = adjustForAge({ imcCategory, goals: goals || goal, ageGroup: params.ageGroup });
  return generateWorkoutPlan({ ...rest, ...adjusted });
}

export function hydratePlanForAge(plan, options = {}) {
  if (!isUnder18(options.ageGroup)) return hydratePlan(plan, options);
  return hydratePlan(plan, { ...options, ...adjustForAge(options) });
}

export function recommendationsForAge(imcCategory, goals, gender, ageGroup) {
  const a = adjustForAge({ imcCategory, goals, ageGroup });
  return getIMCRecommendations(a.imcCategory, a.goals, gender, ageGroup);
}
