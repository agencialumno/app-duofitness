// Notas por categoria e Duo Score V2 (puro). ESTENDE o Duo Score sem alterar health.js: reaproveita as notas de
// treino (consistência e sequência) de lá e acrescenta atividade, sono, hidratação e composição corporal.
// O Duo Score mede HÁBITOS. Não é uma avaliação médica. Fórmulas documentadas em docs/saude.md.
//
// REGRA: categoria sem dados NÃO entra na conta e NÃO penaliza; o resultado diz o que falta.
//        Dia sem dado dentro de uma janela não vira zero: só os dias COM dado entram nas médias.
import { computeDuoScore, emptyHealth, isMinor, scoreBand } from './health';
import { windowSeries } from './healthModel';

// Pesos do Duo Score V2 (somam 100).
export const SCORE_WEIGHTS_V2 = { consistency: 30, streak: 10, activity: 15, sleep: 20, hydration: 15, composition: 10 };
export const MIN_DAYS = 3; // dias (ou noites) com dado na janela de 7 para uma nota de atividade ou de sono valer
export const STEPS_FULL = 7000; // passos por dia que valem nota máxima
export const EXERCISE_WEEK_FULL = 150; // minutos de exercício por semana que valem nota máxima
export const SLEEP_RANGE = { adult: { min: 420, max: 540, floor: 240, ceil: 660 }, teen: { min: 480, max: 600, floor: 300, ceil: 720 } };

const clamp = (v, lo = 0, hi = 100) => Math.min(Math.max(v, lo), hi);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pt = (n, d = 0) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

function fmtDuration(minutes) {
  const t = Math.round(minutes);
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

const absent = (id, label, missing) => ({ id, label, weight: SCORE_WEIGHTS_V2[id], present: false, value: null, detail: missing, missing });

// ---------- Atividade (últimos 7 dias) ----------
// passos: média/dia dos dias com dado ÷ 7.000 (máx. 100); exercício: média/dia dos dias com dado × 7 ÷ 150 min (máx. 100).
// Cada parte só conta se houver MIN_DAYS dias com dado. Nota = média das partes disponíveis.
export function activityNote(samples, now = new Date()) {
  const steps = windowSeries(samples, 'steps', { days: 7, now }).filter((p) => p.value !== null);
  const mins = windowSeries(samples, 'exercise_minutes', { days: 7, now }).filter((p) => p.value !== null);
  const parts = [];
  const details = [];
  if (steps.length >= MIN_DAYS) {
    const avg = mean(steps.map((p) => p.value));
    parts.push(clamp((avg / STEPS_FULL) * 100));
    details.push(`média de ${pt(Math.round(avg))} passos por dia em ${steps.length} dias`);
  }
  if (mins.length >= MIN_DAYS) {
    const week = mean(mins.map((p) => p.value)) * 7;
    parts.push(clamp((week / EXERCISE_WEEK_FULL) * 100));
    details.push(`cerca de ${fmtDuration(week)} de exercício por semana (${mins.length} dias com registro)`);
  }
  if (parts.length === 0) return absent('activity', 'Atividade', `falta registrar passos ou minutos de exercício (${MIN_DAYS} dias ou mais nos últimos 7)`);
  return { id: 'activity', label: 'Atividade', weight: SCORE_WEIGHTS_V2.activity, present: true, value: Math.round(mean(parts)), detail: details.join('; ') };
}

// ---------- Sono (últimos 7 dias) ----------
// Duração: por noite, 100 dentro da faixa (adultos 7 a 9 h; menores de 18, 8 a 10 h), cai em linha reta até 0 em 4 h
// (menores, 5 h) e até 70 em 11 h (menores, 12 h). Regularidade (se houver hora de dormir em MIN_DAYS noites):
// desvio-padrão do horário de dormir ≤ 30 min = 100, ≥ 120 min = 40. Nota = 70% duração + 30% regularidade (ou só duração).
export function nightScore(minutes, minor = false) {
  const r = minor ? SLEEP_RANGE.teen : SLEEP_RANGE.adult;
  if (minutes >= r.min && minutes <= r.max) return 100;
  if (minutes < r.min) return clamp(((minutes - r.floor) / (r.min - r.floor)) * 100);
  return clamp(100 - ((minutes - r.max) / (r.ceil - r.max)) * 30, 70, 100);
}

export function bedtimeSpread(samples, now = new Date()) {
  const bed = windowSeries(samples, 'bedtime', { days: 7, now }).filter((p) => p.value !== null).map((p) => (p.value + 720) % 1440);
  if (bed.length < MIN_DAYS) return null;
  const m = mean(bed);
  return { minutes: Math.sqrt(mean(bed.map((v) => (v - m) ** 2))), nights: bed.length };
}

export function sleepNote(samples, { now = new Date(), minor = false } = {}) {
  const nights = windowSeries(samples, 'sleep_duration', { days: 7, now }).filter((p) => p.value !== null);
  if (nights.length < MIN_DAYS) return absent('sleep', 'Sono', `falta registrar seu sono (${MIN_DAYS} noites ou mais nos últimos 7 dias)`);
  const avg = mean(nights.map((p) => p.value));
  const duration = mean(nights.map((p) => nightScore(p.value, minor)));
  const spread = bedtimeSpread(samples, now);
  let value = duration;
  let detail = `média de ${fmtDuration(avg)} por noite em ${nights.length} noites`;
  if (spread) {
    const regularity = clamp(100 - ((spread.minutes - 30) / 90) * 60, 40, 100);
    value = duration * 0.7 + regularity * 0.3;
    detail += `; horário de dormir variou cerca de ${Math.round(spread.minutes)} min`;
  }
  return { id: 'sleep', label: 'Sono', weight: SCORE_WEIGHTS_V2.sleep, present: true, value: Math.round(clamp(value)), detail };
}

// ---------- Hidratação (últimos 7 dias) ----------
// média de min(copos ÷ meta, 1) dos dias COM registro (um 0 registrado conta 0; dia sem registro não entra).
export function hydrationNote(samples, { waterGoal = 8, now = new Date() } = {}) {
  const days = windowSeries(samples, 'water', { days: 7, now }).filter((p) => p.value !== null);
  if (days.length === 0) return absent('hydration', 'Hidratação', 'falta registrar seus copos de água');
  const goal = Math.max(Number(waterGoal) || 8, 1);
  const value = Math.round(clamp(mean(days.map((p) => Math.min(p.value / goal, 1))) * 100));
  return { id: 'hydration', label: 'Hidratação', weight: SCORE_WEIGHTS_V2.hydration, present: true, value, detail: `média de ${value}% da meta em ${days.length} ${days.length === 1 ? 'dia com registro' : 'dias com registro'}` };
}

// ---------- Composição corporal (últimos 30 dias; nunca para menores de 18) ----------
// Mede o HÁBITO de acompanhar e a estabilidade, sem meta de peso nem de gordura e sem olhar para os objetivos:
// 50% acompanhamento (dias com registro de peso em 30 ÷ 4, máx. 100) + 50% estabilidade (variação por semana entre o primeiro e
// o último registro: até 0,5 kg = 100; até 1 kg = 80; acima = 60). Precisa de 2 registros com 7 dias ou mais entre eles.
export function compositionNote(samples, now = new Date()) {
  const missing = 'falta registrar seu peso (2 registros com 7 dias ou mais entre eles)';
  const w = windowSeries(samples, 'weight', { days: 30, now }).filter((p) => p.value !== null);
  if (w.length < 2) return absent('composition', 'Composição corporal', missing);
  const span = (new Date(`${w[w.length - 1].date}T12:00:00`) - new Date(`${w[0].date}T12:00:00`)) / 86400000;
  if (span < 7) return absent('composition', 'Composição corporal', missing);
  const perWeek = ((w[w.length - 1].value - w[0].value) / span) * 7;
  const tracking = clamp((w.length / 4) * 100);
  const abs = Math.abs(perWeek);
  const stability = abs <= 0.5 ? 100 : abs <= 1 ? 80 : 60;
  return {
    id: 'composition', label: 'Composição corporal', weight: SCORE_WEIGHTS_V2.composition, present: true,
    value: Math.round(tracking * 0.5 + stability * 0.5),
    detail: `${w.length} ${w.length === 1 ? 'registro' : 'registros'} em 30 dias; variação de ${pt(Math.round(abs * 10) / 10, 1)} kg por semana`,
  };
}

// ---------- Duo Score V2 ----------

// Mesmo formato do Duo Score atual: { score, components[{ id, label, weight, present, value, detail, points, share, missing }], missing, minor }
// score = Σ(peso × nota) / Σ(pesos dos componentes presentes). Sem nenhum componente presente: score null.
export function computeDuoScoreV2({ sessions = [], samples = [], waterGoal = 8, ageGroup, now = new Date() } = {}) {
  const minor = isMinor(ageGroup);
  // consistência e sequência vêm do cálculo atual (health.js), sem alterá-lo
  const training = computeDuoScore({ sessions, health: emptyHealth(), goals: [], ageGroup, now }).components;
  const pick = (id) => {
    const c = training.find((x) => x.id === id);
    return { ...c, weight: SCORE_WEIGHTS_V2[id] };
  };
  const components = [
    pick('consistency'),
    pick('streak'),
    activityNote(samples, now),
    sleepNote(samples, { now, minor }),
    hydrationNote(samples, { waterGoal, now }),
  ];
  if (!minor) components.push(compositionNote(samples, now));

  const present = components.filter((c) => c.present);
  const totalWeight = present.reduce((s, c) => s + c.weight, 0);
  const score = totalWeight > 0 ? Math.round(clamp(present.reduce((s, c) => s + c.weight * c.value, 0) / totalWeight)) : null;
  return {
    version: 2,
    score,
    components: components.map((c) => ({
      ...c,
      points: c.present && totalWeight > 0 ? Math.round(((c.weight * c.value) / totalWeight) * 10) / 10 : null,
      share: c.present && totalWeight > 0 ? Math.round((c.weight / totalWeight) * 100) : null,
    })),
    missing: components.filter((c) => !c.present).map((c) => c.missing),
    minor,
  };
}

// Nota de cada categoria (para os cartões): { id, label, value | null, grade }. Coração e recuperação não tem nota
// (só valores e tendências); a composição some para menores de 18.
export function categoryNotes(result) {
  const by = Object.fromEntries(result.components.map((c) => [c.id, c]));
  const row = (id, label) => {
    const c = by[id];
    const value = c && c.present ? c.value : null;
    return { id, label, value, grade: value === null ? 'Sem dados' : scoreBand(value).label };
  };
  const out = [row('activity', 'Atividade'), row('sleep', 'Sono'), row('hydration', 'Hidratação')];
  if (!result.minor) out.unshift(row('composition', 'Composição corporal'));
  return out;
}

