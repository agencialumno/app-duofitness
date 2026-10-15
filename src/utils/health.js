// Saúde: dados, Duo Score e relatório semanal. Módulo puro (sem React Native), testável em Node.
//
// O Duo Score mede HÁBITOS (treino, sequência, hidratação, tendência de peso). Não é avaliação médica.
// Nada aqui sugere dieta, déficit calórico ou dosagens. Todos os dados ficam no aparelho (@duo_health).

export const HEALTH_KEY = '@duo_health';
export const DEFAULT_WATER_GOAL = 8;
export const MIN_KG = 30;
export const MAX_KG = 300;
export const MAX_WEIGHTS = 730; // ~2 anos de registros diários
export const MAX_WATER_GLASSES = 30;
export const SCORE_DISCLAIMER = 'O Duo Score mede hábitos. Não é uma avaliação médica.';
export const PRIVACY_NOTE = 'Seus dados de saúde ficam só neste aparelho.';

// Pesos de cada componente do Duo Score (somam 100). Ver docs/saude.md.
export const SCORE_WEIGHTS = { consistency: 50, streak: 20, hydration: 15, weight: 15 };
export const TARGET_TRAINING_DAYS = 3; // dias de treino por semana que valem nota máxima
export const STREAK_FULL_DAYS = 7; // dias seguidos que valem nota máxima

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- Datas (sempre dia LOCAL, "AAAA-MM-DD") ----------

export function dayKey(date = new Date()) {
  const d = new Date(date);
  if (!Number.isFinite(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function addDays(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + delta, 12));
}

function isDayKey(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && dayKey(new Date(`${v}T12:00:00`)) === v;
}

// ---------- Dados ----------

export function emptyHealth() {
  return { version: 1, weights: [], water: {}, waterGoal: DEFAULT_WATER_GOAL };
}

// Aceita lixo (JSON antigo, corrompido) e devolve sempre um objeto válido.
export function normalizeHealth(raw) {
  const base = emptyHealth();
  if (!raw || typeof raw !== 'object') return base;
  const weights = Array.isArray(raw.weights)
    ? raw.weights.filter((w) => w && isDayKey(w.date) && Number.isFinite(w.kg) && w.kg >= MIN_KG && w.kg <= MAX_KG)
    : [];
  const byDate = new Map();
  for (const w of weights) byDate.set(w.date, { date: w.date, kg: Math.round(w.kg * 10) / 10 });
  const water = {};
  if (raw.water && typeof raw.water === 'object') {
    for (const [k, v] of Object.entries(raw.water)) {
      if (isDayKey(k) && Number.isFinite(v) && v >= 0) water[k] = Math.min(Math.floor(v), MAX_WATER_GLASSES);
    }
  }
  const goal = Number.isFinite(raw.waterGoal) ? Math.min(Math.max(Math.round(raw.waterGoal), 1), 20) : DEFAULT_WATER_GOAL;
  return {
    version: 1,
    weights: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_WEIGHTS),
    water,
    waterGoal: goal,
  };
}

// "78", "78,5", "78.5", " 78,5 kg " -> número; fora de faixa ou ambíguo -> null.
export function parseWeightInput(text) {
  if (typeof text === 'number') return Number.isFinite(text) && text >= MIN_KG && text <= MAX_KG ? Math.round(text * 10) / 10 : null;
  const t = String(text ?? '').trim().toLowerCase().replace(/\s*kg$/, '').replace(/\s+/g, '');
  if (!/^\d{2,3}([.,]\d{1,2})?$/.test(t)) return null;
  const n = parseFloat(t.replace(',', '.'));
  return n >= MIN_KG && n <= MAX_KG ? Math.round(n * 10) / 10 : null;
}

export function formatKg(kg) {
  return `${(Math.round(kg * 10) / 10).toString().replace('.', ',')} kg`;
}

// Um registro por dia: gravar de novo no mesmo dia substitui. Devolve um objeto novo.
export function addWeight(health, kg, date = new Date()) {
  const h = normalizeHealth(health);
  const key = typeof date === 'string' ? date : dayKey(date);
  const value = parseWeightInput(kg);
  if (!key || !isDayKey(key) || value === null) return h;
  const rest = h.weights.filter((w) => w.date !== key);
  return { ...h, weights: [...rest, { date: key, kg: value }].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_WEIGHTS) };
}

export function removeWeight(health, key) {
  const h = normalizeHealth(health);
  return { ...h, weights: h.weights.filter((w) => w.date !== key) };
}

export function setWater(health, glasses, date = new Date()) {
  const h = normalizeHealth(health);
  const key = typeof date === 'string' ? date : dayKey(date);
  if (!key || !isDayKey(key) || !Number.isFinite(glasses)) return h;
  const v = Math.min(Math.max(Math.floor(glasses), 0), MAX_WATER_GLASSES);
  return { ...h, water: { ...h.water, [key]: v } };
}

export function addGlass(health, delta = 1, date = new Date()) {
  const h = normalizeHealth(health);
  const key = typeof date === 'string' ? date : dayKey(date);
  return setWater(h, (h.water[key] || 0) + delta, key);
}

export function setWaterGoal(health, goal) {
  const h = normalizeHealth(health);
  if (!Number.isFinite(goal)) return h;
  return { ...h, waterGoal: Math.min(Math.max(Math.round(goal), 1), 20) };
}

export function getWater(health, date = new Date()) {
  const h = normalizeHealth(health);
  return h.water[typeof date === 'string' ? date : dayKey(date)] || 0;
}

export function getWeightSeries(health, { days = 30, now = new Date() } = {}) {
  const h = normalizeHealth(health);
  const from = addDays(dayKey(now), -(days - 1));
  return h.weights.filter((w) => w.date >= from && w.date <= dayKey(now));
}

// { first, last, delta, days, perWeek, count } com pelo menos 2 registros em dias diferentes.
export function getWeightTrend(health, { days = 30, now = new Date() } = {}) {
  const s = getWeightSeries(health, { days, now });
  if (s.length < 2) return null;
  const first = s[0];
  const last = s[s.length - 1];
  const span = Math.round((new Date(`${last.date}T12:00:00`) - new Date(`${first.date}T12:00:00`)) / DAY_MS);
  if (span < 1) return null;
  const delta = Math.round((last.kg - first.kg) * 10) / 10;
  return { first, last, delta, days: span, perWeek: Math.round(((delta / span) * 7) * 100) / 100, count: s.length };
}

// Pontos do gráfico em 0..1 (x pelo tempo, y pelo peso com folga), para desenhar só com Views.
export function getChartPoints(series) {
  if (!Array.isArray(series) || series.length === 0) return [];
  const t0 = new Date(`${series[0].date}T12:00:00`).getTime();
  const t1 = new Date(`${series[series.length - 1].date}T12:00:00`).getTime();
  const kgs = series.map((p) => p.kg);
  let lo = Math.min(...kgs);
  let hi = Math.max(...kgs);
  if (hi - lo < 1) { const mid = (hi + lo) / 2; lo = mid - 0.5; hi = mid + 0.5; } // série quase reta
  return series.map((p, i) => ({
    ...p,
    x: t1 === t0 ? (series.length === 1 ? 0.5 : i / (series.length - 1)) : (new Date(`${p.date}T12:00:00`).getTime() - t0) / (t1 - t0),
    y: (p.kg - lo) / (hi - lo),
  }));
}

// ---------- Sessões de treino ----------

function sessionDays(sessions) {
  const set = new Set();
  for (const s of Array.isArray(sessions) ? sessions : []) {
    const k = s?.completedAt ? dayKey(s.completedAt) : null;
    if (k) set.add(k);
  }
  return set;
}

export function countTrainingDays(sessions, { days = 7, now = new Date() } = {}) {
  const today = dayKey(now);
  const from = addDays(today, -(days - 1));
  return [...sessionDays(sessions)].filter((k) => k >= from && k <= today).length;
}

// Dias seguidos com treino, contando de hoje (ou de ontem, se hoje ainda não treinou).
export function computeStreak(sessions, now = new Date()) {
  const days = sessionDays(sessions);
  let key = dayKey(now);
  if (!days.has(key)) key = addDays(key, -1);
  let n = 0;
  while (days.has(key)) { n++; key = addDays(key, -1); }
  return n;
}

// ---------- Duo Score ----------

const clamp = (n, lo = 0, hi = 100) => Math.min(Math.max(n, lo), hi);

export function isMinor(ageGroup) {
  return ageGroup === 'under18';
}

// Qual direção de peso faz sentido para os objetivos. Menores de 18: nenhuma (só hábitos).
export function getWeightDirection(goals, ageGroup) {
  if (isMinor(ageGroup)) return null;
  const g = Array.isArray(goals) ? goals : [];
  if (g.includes('lose_weight')) return 'down';
  if (g.includes('gain_muscle')) return 'up';
  return 'stable';
}

function scoreWeightTrend(perWeek, direction) {
  const r = perWeek;
  if (direction === 'down') {
    if (r <= -0.25 && r >= -1) return { value: 100, status: 'no rumo' };
    if (r < -1) return { value: 60, status: 'variação grande em pouco tempo' };
    if (r <= 0.25) return { value: 70, status: 'quase estável' };
    return { value: 40, status: 'fora do rumo' };
  }
  if (direction === 'up') {
    if (r >= 0.1 && r <= 0.5) return { value: 100, status: 'no rumo' };
    if (r > 0.5) return { value: 70, status: 'subindo rápido' };
    if (r >= -0.1) return { value: 70, status: 'quase estável' };
    return { value: 40, status: 'fora do rumo' };
  }
  if (Math.abs(r) <= 0.25) return { value: 100, status: 'estável' };
  if (Math.abs(r) <= 0.5) return { value: 70, status: 'variando um pouco' };
  return { value: 40, status: 'variando bastante' };
}

// Hidratação dos últimos 7 dias: média de min(copos/meta, 1) dos dias desde o primeiro registro da janela.
// Dias sem registro depois que a pessoa começou a registrar contam 0. Sem nenhum registro: ausente.
function scoreHydration(health, now) {
  const h = normalizeHealth(health);
  const today = dayKey(now);
  const from = addDays(today, -6);
  const logged = Object.keys(h.water).filter((k) => k >= from && k <= today && h.water[k] > 0).sort();
  if (logged.length === 0) return null;
  let sum = 0;
  let n = 0;
  for (let k = logged[0]; k <= today; k = addDays(k, 1)) {
    sum += Math.min((h.water[k] || 0) / h.waterGoal, 1);
    n++;
  }
  return { value: Math.round((sum / n) * 100), daysCounted: n, daysLogged: logged.length };
}

// Calcula o Duo Score só sobre os componentes que têm dados.
// score = Σ(peso × nota) / Σ(pesos dos componentes presentes). Ausente NÃO é zero.
export function computeDuoScore({ sessions = [], health, goals = [], ageGroup, now = new Date() } = {}) {
  const hasHistory = Array.isArray(sessions) && sessions.length > 0;
  const minor = isMinor(ageGroup);
  const components = [];

  // Consistência
  const days7 = countTrainingDays(sessions, { now });
  components.push(hasHistory
    ? { id: 'consistency', label: 'Consistência de treinos', weight: SCORE_WEIGHTS.consistency, present: true,
        value: Math.round(clamp((days7 / TARGET_TRAINING_DAYS) * 100)),
        detail: `${days7} ${days7 === 1 ? 'dia' : 'dias'} de treino nos últimos 7 (meta: ${TARGET_TRAINING_DAYS})` }
    : { id: 'consistency', label: 'Consistência de treinos', weight: SCORE_WEIGHTS.consistency, present: false, value: null,
        detail: 'falta concluir um treino', missing: 'falta concluir um treino' });

  // Sequência
  const streak = computeStreak(sessions, now);
  components.push(hasHistory
    ? { id: 'streak', label: 'Sequência', weight: SCORE_WEIGHTS.streak, present: true,
        value: Math.round(clamp((streak / STREAK_FULL_DAYS) * 100)),
        detail: `${streak} ${streak === 1 ? 'dia seguido' : 'dias seguidos'} (${STREAK_FULL_DAYS} valem nota máxima)` }
    : { id: 'streak', label: 'Sequência', weight: SCORE_WEIGHTS.streak, present: false, value: null,
        detail: 'falta concluir um treino', missing: 'falta concluir um treino' });

  // Hidratação
  const hyd = scoreHydration(health, now);
  components.push(hyd
    ? { id: 'hydration', label: 'Hidratação', weight: SCORE_WEIGHTS.hydration, present: true, value: hyd.value,
        detail: `média de ${hyd.value}% da meta em ${hyd.daysCounted} ${hyd.daysCounted === 1 ? 'dia' : 'dias'}` }
    : { id: 'hydration', label: 'Hidratação', weight: SCORE_WEIGHTS.hydration, present: false, value: null,
        detail: 'falta registrar seus copos de água', missing: 'falta registrar seus copos de água' });

  // Tendência de peso (nunca para menores de 18)
  if (!minor) {
    const direction = getWeightDirection(goals, ageGroup);
    const trend = getWeightTrend(health, { days: 30, now });
    components.push(trend && trend.days >= 7
      ? (() => {
          const r = scoreWeightTrend(trend.perWeek, direction);
          return { id: 'weight', label: 'Tendência de peso', weight: SCORE_WEIGHTS.weight, present: true, value: r.value,
            detail: `${r.status} (${trend.delta > 0 ? '+' : ''}${String(trend.delta).replace('.', ',')} kg em ${trend.days} dias)` };
        })()
      : { id: 'weight', label: 'Tendência de peso', weight: SCORE_WEIGHTS.weight, present: false, value: null,
          detail: 'falta registrar seu peso (2 registros com 7 dias ou mais entre eles)',
          missing: 'falta registrar seu peso (2 registros com 7 dias ou mais entre eles)' });
  }

  const present = components.filter((c) => c.present);
  const totalWeight = present.reduce((s, c) => s + c.weight, 0);
  const score = totalWeight > 0
    ? Math.round(clamp(present.reduce((s, c) => s + c.weight * c.value, 0) / totalWeight))
    : null;

  return {
    score,
    components: components.map((c) => ({
      ...c,
      // pontos que o componente soma ao score final (para "por que este número")
      points: c.present && totalWeight > 0 ? Math.round(((c.weight * c.value) / totalWeight) * 10) / 10 : null,
      share: c.present && totalWeight > 0 ? Math.round((c.weight / totalWeight) * 100) : null,
    })),
    missing: components.filter((c) => !c.present).map((c) => c.missing),
    minor,
  };
}

export function scoreBand(score) {
  if (score === null || score === undefined) return { id: 'none', label: 'Sem dados ainda' };
  if (score >= 80) return { id: 'great', label: 'Ótimo' };
  if (score >= 60) return { id: 'good', label: 'Bom' };
  if (score >= 40) return { id: 'fair', label: 'Regular' };
  return { id: 'low', label: 'Dá para melhorar' };
}

// ---------- Relatório semanal ----------

function grade(value) {
  if (value === null || value === undefined) return { value: null, label: 'Sem dados' };
  return { value, label: scoreBand(value).label };
}

// Nota por categoria (consistência, hidratação, progresso) e 2 a 3 recomendações por regras.
// Vocabulário seguro: só hábitos. Nada de dieta, déficit, caloria, dose ou emagrecimento.
export function buildWeeklyReport({ sessions = [], health, goals = [], ageGroup, now = new Date() } = {}) {
  const result = computeDuoScore({ sessions, health, goals, ageGroup, now });
  const by = Object.fromEntries(result.components.map((c) => [c.id, c]));
  const minor = result.minor;

  const progressParts = [by.streak, by.weight].filter((c) => c && c.present);
  const progressValue = progressParts.length ? Math.round(progressParts.reduce((s, c) => s + c.value, 0) / progressParts.length) : null;

  const categories = [
    { id: 'consistency', label: 'Consistência', ...grade(by.consistency.present ? by.consistency.value : null) },
    { id: 'hydration', label: 'Hidratação', ...grade(by.hydration.present ? by.hydration.value : null) },
    { id: 'progress', label: 'Progresso', ...grade(progressValue) },
  ];

  const days7 = countTrainingDays(sessions, { now });
  const streak = computeStreak(sessions, now);
  const recs = [];

  if (!by.consistency.present) {
    recs.push('Conclua seu primeiro treino para o Duo Score começar a contar.');
  } else if (days7 < TARGET_TRAINING_DAYS) {
    const falta = TARGET_TRAINING_DAYS - days7;
    recs.push(`Tente treinar mais ${falta} ${falta === 1 ? 'dia' : 'dias'} nesta semana. Uma série curta já conta.`);
  } else {
    recs.push('Você bateu a meta de treinos da semana. Mantenha o ritmo!');
  }

  if (!by.hydration.present) {
    recs.push('Registre seus copos de água para o Duo Score considerar a hidratação.');
  } else if (by.hydration.value < 70) {
    recs.push('Deixe uma garrafa de água por perto durante o dia para chegar mais perto da sua meta de copos.');
  } else if (streak >= 3) {
    recs.push(`Sequência de ${streak} dias: continue assim!`);
  }

  if (!minor && !by.weight.present && recs.length < 3) {
    recs.push('Registre seu peso uma vez por semana, sempre no mesmo horário, para acompanhar a tendência.');
  }
  if (recs.length < 3 && streak >= 3 && !recs.some((r) => r.startsWith('Sequência'))) {
    recs.push(`Sequência de ${streak} dias: continue assim!`);
  }
  if (recs.length < 2) recs.push('Combine dias de treino com bons momentos de descanso entre eles.');

  return { ...result, categories, recommendations: recs.slice(0, 3), trainingDays: days7, streak };
}

// ---------- Modo Demo ----------

// Histórico de exemplo (relativo a "agora"): ~5 semanas de peso e 7 dias de água. Tudo é "dado de exemplo".
export function buildDemoHealth(now = new Date()) {
  const today = dayKey(now);
  const weights = [];
  const kgs = [75.2, 75.4, 75.5, 75.7, 75.8, 76.0];
  [-35, -28, -21, -14, -7, -1].forEach((off, i) => weights.push({ date: addDays(today, off), kg: kgs[i] }));
  const glasses = [6, 8, 7, 5, 8, 8, 4];
  const water = {};
  glasses.forEach((g, i) => { water[addDays(today, -(6 - i))] = g; });
  return normalizeHealth({ version: 1, weights, water, waterGoal: DEFAULT_WATER_GOAL });
}
