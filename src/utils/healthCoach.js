// Coach de hábitos da Saúde (puro, por REGRAS; não é IA). Usa os objetivos do perfil (um ou mais), as notas por categoria e as
// tendências. No máximo 3 sugestões por vez, cada uma com o MOTIVO (com o número da pessoa) e uma AÇÃO pequena e concreta.
//
// Nunca fala de peso, gordura, composição, dieta, calorias, déficit, metas, prazos, suplementos, doses, diagnóstico nem alerta
// clínico. Os textos ficam em src/data/healthCoachTexts.js. Menores de 18: só hábitos (sono na faixa de 8 a 10 h) e nada de
// peso, composição nem metas (que este coach não usa em nenhum caso).
import { COACH_TEXTS, fill } from '../data/healthCoachTexts';
import { countTrainingDays, isMinor } from './health';
import { formatDuration, windowSeries } from './healthModel';
import { bedtimeSpread, hydrationNote, sleepNote } from './healthScores';

export const MAX_SUGGESTIONS = 3;
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pt = (n) => Math.round(n).toLocaleString('pt-BR');

// Quanto cada objetivo pesa na ordem das sugestões (sem nunca falar de peso). "Emagrecer" é tratado como hábitos gerais.
const GOAL_BOOST = {
  gain_muscle: { sleep: 1.3, training: 1.3 },
  maintain: { hydration: 1.2, activity: 1.2 },
  health: { hydration: 1.2, activity: 1.2, sleep: 1.1 },
  lose_weight: { hydration: 1.2, activity: 1.2 },
};

function boostFor(goals, category) {
  const list = Array.isArray(goals) ? goals : [];
  const boosts = list.map((g) => GOAL_BOOST[g]?.[category] ?? 1);
  return boosts.length ? Math.max(...boosts) : 1;
}

function avgOf(series) {
  const present = series.filter((p) => p.value !== null);
  return present.length ? mean(present.map((p) => p.value)) : null;
}

// Média da FC em repouso da semana mais recente x da anterior (cada uma com 3 dias ou mais de dado).
function heartRateShift(samples, now) {
  const last14 = windowSeries(samples, 'resting_hr', { days: 14, now });
  const prev = last14.slice(0, 7).filter((p) => p.value !== null);
  const cur = last14.slice(7).filter((p) => p.value !== null);
  if (prev.length < 3 || cur.length < 3) return null;
  return mean(cur.map((p) => p.value)) - mean(prev.map((p) => p.value));
}

// samples: amostras (healthModel). sessions: treinos concluídos. goals: objetivos do perfil. Devolve:
//   { suggestions: [{ id, category, reason, action }], insufficient, message }
export function buildCoachSuggestions({ samples = [], sessions = [], goals = [], ageGroup, waterGoal = 8, now = new Date() } = {}) {
  const minor = isMinor(ageGroup);
  const candidates = [];
  const push = (id, category, need, texts, vars) => {
    candidates.push({ id, category, priority: need * boostFor(goals, category), reason: fill(texts.reason, vars), action: fill(texts.action, vars) });
  };

  // ---- Sono ----
  const sleep = sleepNote(samples, { now, minor });
  if (sleep.present) {
    const nights = windowSeries(samples, 'sleep_duration', { days: 7, now }).filter((p) => p.value !== null);
    const avg = mean(nights.map((p) => p.value));
    const target = minor ? 480 : 420;
    if (avg < target) {
      push('sleep_short', 'sleep', (target - avg) / target, minor ? COACH_TEXTS.sleepShortTeen : COACH_TEXTS.sleepShort, { avg: formatDuration(avg), nights: nights.length });
    }
    const spread = bedtimeSpread(samples, now);
    if (spread && spread.minutes >= 60) {
      push('sleep_irregular', 'sleep', Math.min((spread.minutes - 30) / 90, 1) * 0.8, COACH_TEXTS.sleepIrregular, { spread: formatDuration(spread.minutes) });
    }
  }

  // ---- Hidratação ----
  const hyd = hydrationNote(samples, { waterGoal, now });
  if (hyd.present && hyd.value < 70) {
    const logged = windowSeries(samples, 'water', { days: 7, now }).filter((p) => p.value !== null);
    push('hydration_low', 'hydration', (70 - hyd.value) / 70, COACH_TEXTS.hydrationLow, { avg: String(Math.round(mean(logged.map((p) => p.value)) * 10) / 10).replace('.', ','), goal: waterGoal });
  }

  // ---- Atividade ----
  const steps = windowSeries(samples, 'steps', { days: 7, now }).filter((p) => p.value !== null);
  if (steps.length >= 3) {
    const avg = avgOf(steps);
    if (avg < 6000) push('steps_low', 'activity', (6000 - avg) / 6000, COACH_TEXTS.stepsLow, { avg: pt(avg), days: steps.length });
  }
  const mins = windowSeries(samples, 'exercise_minutes', { days: 7, now }).filter((p) => p.value !== null);
  if (mins.length >= 3) {
    const week = avgOf(mins) * 7;
    if (week < 100) push('exercise_low', 'activity', (100 - week) / 100, COACH_TEXTS.exerciseLow, { week: formatDuration(week) });
  }

  // ---- Treinos concluídos no app ----
  const days7 = countTrainingDays(sessions, { now });
  if (Array.isArray(sessions) && sessions.length > 0 && days7 < 3) {
    const texts = (Array.isArray(goals) && goals.includes('gain_muscle')) ? COACH_TEXTS.trainingLowMuscle : COACH_TEXTS.trainingLow;
    push('training_low', 'training', (3 - days7) / 3, texts, { days: days7, dayWord: days7 === 1 ? 'dia' : 'dias' });
  }

  // ---- Recuperação (sem alerta: só um motivo e uma ação leve) ----
  const shift = heartRateShift(samples, now);
  if (shift !== null && shift >= 5) {
    push('recovery_hr', 'heart', 0.5, COACH_TEXTS.recoveryHeartRate, { delta: Math.round(shift) });
  }

  // Há dados suficientes? (alguma categoria com nota/medida utilizável, ou treinos no app)
  const hasAnything = sleep.present || hyd.present || steps.length >= 3 || mins.length >= 3 || (Array.isArray(sessions) && sessions.length > 0) || heartRateShift(samples, now) !== null;
  if (!hasAnything) return { suggestions: [], insufficient: true, message: COACH_TEXTS.insufficient };

  // Uma sugestão por categoria (a de maior prioridade), no máximo 3, da mais necessária à menos.
  const best = new Map();
  for (const c of candidates.sort((a, b) => b.priority - a.priority)) if (!best.has(c.category)) best.set(c.category, c);
  const suggestions = [...best.values()]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_SUGGESTIONS)
    .map(({ id, category, reason, action }) => ({ id, category, reason, action }));

  if (suggestions.length === 0) {
    return { suggestions: [{ id: 'keep_going', category: 'general', reason: COACH_TEXTS.keepGoing.reason, action: COACH_TEXTS.keepGoing.action }], insufficient: false, message: null };
  }
  return { suggestions, insufficient: false, message: null };
}

