// Modelo de dados de saúde por categoria (puro, sem React Native). Estende a área Saúde sem mexer em health.js.
//
// Amostra: { metric, value, unit, date, tz, source, at? }
//   metric  uma das chaves de METRICS (passos, sono, FC em repouso, peso, água...)
//   unit    sempre a unidade da métrica (METRICS[metric].unit)
//   date    dia LOCAL "AAAA-MM-DD" (o dia em que a pessoa viveu aquele dado, no fuso `tz`)
//   tz      fuso IANA do aparelho quando a amostra foi criada (ex.: "America/Sao_Paulo")
//   source  "manual" | "apple_saude" | "health_connect" | "exemplo"
//   at      horário ISO opcional (distingue várias leituras no mesmo dia)
//
// REGRA DE OURO: dado ausente é AUSENTE, nunca zero. Dia sem amostra não entra na média, não vira 0 e não penaliza.
// Zero só existe quando a pessoa (ou o aparelho) registrou 0.
import { addDays, dayKey } from './health';

export const SOURCES = ['manual', 'apple_saude', 'apple_watch', 'health_connect', 'exemplo'];
// Origens que vêm do aparelho de saúde (HealthKit): apagadas juntas ao desconectar. O rótulo "Apple Watch" só é usado quando o dado veio de um
// relógio; o nome do dispositivo nunca é guardado.
export const APPLE_SOURCES = ['apple_saude', 'apple_watch'];
export const SOURCE_LABELS = {
  manual: 'Registro manual',
  apple_saude: 'Apple Saúde',
  apple_watch: 'Apple Watch',
  health_connect: 'Health Connect',
  exemplo: 'Dados de exemplo',
};
// Se há mais de uma origem no mesmo dia, vale a de maior prioridade (aparelho > manual > exemplo): evita contar duas vezes.
export const SOURCE_PRIORITY = { apple_watch: 4, apple_saude: 3, health_connect: 3, manual: 2, exemplo: 1 };

// agg: como juntar as amostras do MESMO dia numa só: soma, média, última ou horário do relógio (média circular).
// tol: variação mínima para uma tendência deixar de ser "estável".
export const METRICS = {
  steps: { category: 'activity', label: 'Passos', unit: 'passos', agg: 'sum', min: 0, max: 100000, decimals: 0, tol: 500 },
  distance: { category: 'activity', label: 'Distância', unit: 'km', agg: 'sum', min: 0, max: 200, decimals: 2, tol: 0.5 },
  active_energy: { category: 'activity', label: 'Energia ativa', unit: 'kcal', agg: 'sum', min: 0, max: 20000, decimals: 0, tol: 50 },
  exercise_minutes: { category: 'activity', label: 'Minutos de exercício', unit: 'min', agg: 'sum', min: 0, max: 1440, decimals: 0, tol: 5 },
  sleep_duration: { category: 'sleep', label: 'Duração do sono', unit: 'min', agg: 'sum', min: 0, max: 1440, decimals: 0, tol: 15 },
  bedtime: { category: 'sleep', label: 'Hora de dormir', unit: 'min do dia', agg: 'clock_bed', min: 0, max: 1439, decimals: 0, tol: 15 },
  wake_time: { category: 'sleep', label: 'Hora de acordar', unit: 'min do dia', agg: 'clock', min: 0, max: 1439, decimals: 0, tol: 15 },
  resting_hr: { category: 'heart', label: 'FC em repouso', unit: 'bpm', agg: 'avg', min: 20, max: 220, decimals: 0, tol: 2 },
  heart_rate: { category: 'heart', label: 'Frequência cardíaca', unit: 'bpm', agg: 'avg', min: 20, max: 250, decimals: 0, tol: 3 },
  vo2max: { category: 'heart', label: 'VO₂ máx.', unit: 'ml/kg/min', agg: 'last', min: 5, max: 90, decimals: 1, tol: 1 },
  hrv: { category: 'heart', label: 'Variabilidade da FC', unit: 'ms', agg: 'avg', min: 1, max: 300, decimals: 0, tol: 3 },
  weight: { category: 'body', label: 'Peso', unit: 'kg', agg: 'last', min: 30, max: 300, decimals: 1, tol: 0.3 },
  body_fat: { category: 'body', label: '% de gordura', unit: '%', agg: 'last', min: 3, max: 60, decimals: 1, tol: 0.5 },
  lean_mass: { category: 'body', label: 'Massa magra', unit: 'kg', agg: 'last', min: 10, max: 200, decimals: 1, tol: 0.3 },
  water: { category: 'hydration', label: 'Água', unit: 'copos', agg: 'sum', min: 0, max: 60, decimals: 0, tol: 1 },
};

// Ordem das categorias na tela (o "Resumo" com o Duo Score vem antes, fora desta lista).
export const CATEGORIES = [
  { id: 'body', label: 'Composição corporal', metrics: ['weight', 'body_fat', 'lean_mass'], primary: 'weight' },
  { id: 'activity', label: 'Atividade', metrics: ['steps', 'distance', 'exercise_minutes', 'active_energy'], primary: 'steps' },
  { id: 'sleep', label: 'Sono', metrics: ['sleep_duration', 'bedtime', 'wake_time'], primary: 'sleep_duration' },
  { id: 'heart', label: 'Coração e recuperação', metrics: ['resting_hr', 'hrv', 'heart_rate', 'vo2max'], primary: 'resting_hr' },
  { id: 'hydration', label: 'Hidratação', metrics: ['water'], primary: 'water' },
];

export const MAX_SAMPLES = 20000;

export const isMetric = (m) => Object.prototype.hasOwnProperty.call(METRICS, m);
export const categoryOf = (metric) => METRICS[metric]?.category ?? null;
export const getCategory = (id) => CATEGORIES.find((c) => c.id === id) ?? null;

export function deviceTz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function isDayKey(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && dayKey(new Date(`${v}T12:00:00`)) === v;
}

const round = (v, decimals) => {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
};

// Valida e normaliza uma amostra. Devolve null se for inválida (métrica desconhecida, valor fora da faixa, origem ou data ruins).
export function makeSample(input) {
  if (!input || typeof input !== 'object') return null;
  const m = METRICS[input.metric];
  if (!m) return null;
  const value = typeof input.value === 'number' ? input.value : (typeof input.value === 'string' && input.value.trim() !== '' ? Number(input.value.replace(',', '.')) : NaN);
  if (!Number.isFinite(value) || value < m.min || value > m.max) return null;
  if (!SOURCES.includes(input.source)) return null;
  if (!isDayKey(input.date)) return null;
  if (input.unit !== undefined && input.unit !== m.unit) return null;
  const tz = typeof input.tz === 'string' && input.tz.length > 0 && input.tz.length <= 64 ? input.tz : deviceTz();
  const at = typeof input.at === 'string' && Number.isFinite(new Date(input.at).getTime()) ? input.at : undefined;
  return { metric: input.metric, value: round(value, m.decimals), unit: m.unit, date: input.date, tz, source: input.source, ...(at ? { at } : {}) };
}

const sampleKey = (s) => `${s.metric}|${s.date}|${s.source}|${s.at || ''}`;

// Aceita lixo e devolve uma lista válida, sem duplicatas (a última vence), ordenada por data e limitada.
export function normalizeSamples(list) {
  if (!Array.isArray(list)) return [];
  const byKey = new Map();
  for (const raw of list) {
    const s = makeSample(raw);
    if (s) byKey.set(sampleKey(s), s);
  }
  return [...byKey.values()]
    .sort((a, b) => a.date.localeCompare(b.date) || a.metric.localeCompare(b.metric))
    .slice(-MAX_SAMPLES);
}

// ---------- Agregação ----------

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

// "Hora de dormir" cruza a meia-noite (23:30 e 00:30 estão a 1 h um do outro): a média usa a escala que começa ao meio-dia.
const shiftBed = (m) => (m + 720) % 1440;
const unshiftBed = (m) => (m + 720) % 1440;

function aggregate(m, list) {
  const values = list.map((s) => s.value);
  switch (m.agg) {
    case 'sum': return values.reduce((a, b) => a + b, 0);
    case 'avg':
    case 'clock': return mean(values);
    case 'clock_bed': return unshiftBed(mean(values.map(shiftBed)));
    case 'last': {
      const sorted = [...list].sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
      return sorted[sorted.length - 1].value;
    }
    default: return mean(values);
  }
}

// Um valor por DIA que tenha amostra: [{ date, value, source, n }]. Dia sem amostra NÃO aparece (não vira zero).
export function dailyValues(samples, metric, { sources } = {}) {
  const m = METRICS[metric];
  if (!m || !Array.isArray(samples)) return [];
  const byDate = new Map();
  for (const s of samples) {
    if (s.metric !== metric) continue;
    if (sources && !sources.includes(s.source)) continue;
    if (!byDate.has(s.date)) byDate.set(s.date, []);
    byDate.get(s.date).push(s);
  }
  const out = [];
  for (const date of [...byDate.keys()].sort()) {
    const list = byDate.get(date);
    const best = Math.max(...list.map((s) => SOURCE_PRIORITY[s.source] ?? 0));
    const chosen = list.filter((s) => (SOURCE_PRIORITY[s.source] ?? 0) === best);
    const firstSource = [...new Set(chosen.map((s) => s.source))].sort()[0];
    const used = chosen.filter((s) => s.source === firstSource);
    out.push({ date, value: round(aggregate(m, used), Math.max(m.decimals, m.agg === 'sum' ? m.decimals : 1)), source: firstSource, n: used.length });
  }
  return out;
}

// Segunda-feira (dia local) da semana de uma data "AAAA-MM-DD".
export function weekStart(key) {
  const [y, mo, d] = key.split('-').map(Number);
  const dow = new Date(y, mo - 1, d, 12).getDay(); // 0 = domingo
  return addDays(key, -((dow + 6) % 7));
}

// Por semana (segunda a domingo): média dos valores diários que existem e quantos dias têm dado.
export function weeklyValues(samples, metric, opts) {
  const byWeek = new Map();
  for (const d of dailyValues(samples, metric, opts)) {
    const w = weekStart(d.date);
    if (!byWeek.has(w)) byWeek.set(w, []);
    byWeek.get(w).push(d.value);
  }
  const m = METRICS[metric];
  return [...byWeek.keys()].sort().map((w) => {
    const vals = byWeek.get(w);
    return { weekStart: w, value: round(mean(vals), Math.max(m.decimals, 1)), total: round(vals.reduce((a, b) => a + b, 0), m.decimals), days: vals.length };
  });
}

// Janela dos últimos `days` dias (termina em `now`): UMA entrada por dia, com value null onde não há dado.
export function windowSeries(samples, metric, { days = 7, now = new Date() } = {}) {
  const daily = new Map(dailyValues(samples, metric).map((d) => [d.date, d]));
  const end = dayKey(now);
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(end, -i);
    const d = daily.get(date);
    out.push({ date, value: d ? d.value : null, source: d ? d.source : null });
  }
  return out;
}

// Estatísticas só dos dias COM dado. Sem nenhum: null (nunca zeros).
export function seriesStats(series) {
  const present = series.filter((p) => p.value !== null && p.value !== undefined);
  if (present.length === 0) return null;
  const values = present.map((p) => p.value);
  return {
    count: present.length,
    avg: mean(values),
    min: Math.min(...values),
    max: Math.max(...values),
    sum: values.reduce((a, b) => a + b, 0),
    first: present[0].value,
    last: present[present.length - 1].value,
    firstDate: present[0].date,
    lastDate: present[present.length - 1].date,
  };
}

// Tendência: média da metade mais antiga dos dias com dado x média da metade mais nova. Precisa de pelo menos
// 2 dias com dado em datas diferentes e 3 dias entre o primeiro e o último; senão null ("sem tendência ainda").
export function trendOf(series, metric) {
  const m = METRICS[metric];
  const present = series.filter((p) => p.value !== null && p.value !== undefined);
  if (!m || present.length < 2) return null;
  const span = (new Date(`${present[present.length - 1].date}T12:00:00`) - new Date(`${present[0].date}T12:00:00`)) / 86400000;
  if (span < 3) return null;
  const half = Math.floor(present.length / 2);
  const older = present.slice(0, half).map((p) => p.value);
  const newer = present.slice(half).map((p) => p.value);
  const from = mean(older);
  const to = mean(newer);
  const delta = to - from;
  const direction = Math.abs(delta) < m.tol ? 'stable' : delta > 0 ? 'up' : 'down';
  return { from, to, delta: round(delta, Math.max(m.decimals, 1)), direction, points: present.length };
}

// Valor mais recente (do último dia com dado): { value, date, source } ou null.
export function latest(samples, metric) {
  const d = dailyValues(samples, metric);
  return d.length ? d[d.length - 1] : null;
}

export function hasCategoryData(samples, categoryId) {
  const c = getCategory(categoryId);
  return !!c && Array.isArray(samples) && samples.some((s) => c.metrics.includes(s.metric));
}

// Origens (rótulos) presentes numa janela, para o cartão mostrar "Origem: ...". Sem dado: null.
export function originOf(samples, categoryId, { days = 30, now = new Date() } = {}) {
  const c = getCategory(categoryId);
  if (!c) return null;
  const end = dayKey(now);
  const from = addDays(end, -(days - 1));
  const set = new Set(samples.filter((s) => c.metrics.includes(s.metric) && s.date >= from && s.date <= end).map((s) => s.source));
  if (set.size === 0) return null;
  return [...set].sort((a, b) => (SOURCE_PRIORITY[b] ?? 0) - (SOURCE_PRIORITY[a] ?? 0)).map((s) => SOURCE_LABELS[s]).join(' e ');
}

// ---------- Formatação em português (vírgula decimal) ----------

const pt = (n, decimals) => n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// 340 -> "5h40", 60 -> "1h", 45 -> "45 min"
export function formatDuration(minutes) {
  const t = Math.round(minutes);
  const h = Math.floor(t / 60);
  const mm = t % 60;
  if (h === 0) return `${mm} min`;
  return mm === 0 ? `${h}h` : `${h}h${String(mm).padStart(2, '0')}`;
}

export function formatClock(minutes) {
  const t = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

export function formatMetric(metric, value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  switch (metric) {
    case 'steps': return `${pt(Math.round(value), 0)} passos`;
    case 'distance': return `${pt(value, 1)} km`;
    case 'exercise_minutes': return formatDuration(value);
    case 'sleep_duration': return formatDuration(value);
    case 'bedtime':
    case 'wake_time': return formatClock(value);
    case 'resting_hr': return `${Math.round(value)} bpm`;
    case 'hrv': return `${Math.round(value)} ms`;
    case 'heart_rate': return `${Math.round(value)} bpm`;
    case 'vo2max': return `${pt(value, 1)} ml/kg/min`;
    case 'active_energy': return `${pt(Math.round(value), 0)} kcal`;
    case 'weight':
    case 'lean_mass': return `${pt(value, 1)} kg`;
    case 'body_fat': return `${pt(value, 1)}%`;
    case 'water': return `${Math.round(value)} ${Math.round(value) === 1 ? 'copo' : 'copos'}`;
    default: return String(value);
  }
}

// "HH:MM" ou "H:MM" -> minutos do dia (0 a 1439), ou null.
export function parseClock(text) {
  const m = /^\s*(\d{1,2})\s*[:h]\s*(\d{2})\s*$/.exec(String(text ?? ''));
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  return h <= 23 && mm <= 59 ? h * 60 + mm : null;
}
