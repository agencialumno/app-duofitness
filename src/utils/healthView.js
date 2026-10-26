// Modelo de visão da tela Saúde (puro, testável): transforma as amostras em "cartões" por categoria com valor atual,
// tendência de 7 e 30 dias, origem, estado "sem dados" com a ação certa e um texto alternativo para leitor de tela.
// Linguagem neutra: a tendência descreve ("subindo", "estável", "caindo"), não julga (não diz "bom" nem "ruim").
import { dayKey } from './health';
import {
  CATEGORIES, METRICS, dailyValues, formatDuration, formatMetric, getCategory, latest, originOf, seriesStats, trendOf, windowSeries,
} from './healthModel';

export const CATEGORY_ICONS = { body: 'body-outline', activity: 'walk-outline', sleep: 'moon-outline', heart: 'pulse-outline', hydration: 'water-outline' };

const DIRECTION_WORD = { up: 'subindo', down: 'caindo', stable: 'estável' };
const pt = (n, d = 0) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

function shortDate(key) {
  const [, m, d] = key.split('-');
  return `${d}/${m}`;
}

// Variação (sempre positiva) formatada na unidade da métrica: 420 -> "420 passos", 25 (sono) -> "25 min".
export function formatDelta(metric, delta) {
  const v = Math.abs(delta);
  switch (metric) {
    case 'steps': return `${pt(Math.round(v))} passos`;
    case 'distance': return `${pt(v, 1)} km`;
    case 'exercise_minutes':
    case 'sleep_duration': return formatDuration(v);
    case 'bedtime':
    case 'wake_time': return formatDuration(v);
    case 'resting_hr': return `${Math.round(v)} bpm`;
    case 'hrv': return `${Math.round(v)} ms`;
    case 'weight':
    case 'lean_mass': return `${pt(v, 1)} kg`;
    case 'body_fat': return `${pt(v, 1)} ponto percentual`;
    case 'water': return `${pt(Math.round(v * 10) / 10, 1)} copos`;
    default: return pt(v, 1);
  }
}

// "7 dias: subindo 420 passos" | "30 dias: estável" | "7 dias: sem tendência ainda (faltam dias com registro)"
export function trendText(days, trend, metric) {
  if (!trend) return `${days} dias: sem tendência ainda (faltam dias com registro)`;
  if (trend.direction === 'stable') return `${days} dias: estável`;
  return `${days} dias: ${DIRECTION_WORD[trend.direction]} ${formatDelta(metric, trend.delta)}`;
}

// Texto alternativo do gráfico para leitor de tela (o gráfico é só visual).
export function describeSeries(series, metric) {
  const m = METRICS[metric];
  const st = seriesStats(series);
  const n = series.length;
  if (!st) return `Gráfico de ${m.label.toLowerCase()} dos últimos ${n} dias: sem registros.`;
  const sem = n - st.count;
  return [
    `Gráfico de ${m.label.toLowerCase()} dos últimos ${n} dias:`,
    `${st.count} ${st.count === 1 ? 'dia com registro' : 'dias com registro'},`,
    `média ${formatMetric(metric, st.avg)},`,
    `mínimo ${formatMetric(metric, st.min)},`,
    `máximo ${formatMetric(metric, st.max)}.`,
    sem > 0 ? `${sem} ${sem === 1 ? 'dia' : 'dias'} sem registro.` : '',
  ].filter(Boolean).join(' ');
}

// O que fazer quando a categoria não tem dado: conectar (se a integração existir e estiver ligada) ou registrar à mão.
export function emptyAction({ category, integrationEnabled = false, platform }) {
  const canConnect = integrationEnabled && (platform === 'ios' || platform === 'android');
  const manual = { type: 'register', label: 'Registrar' };
  if (canConnect && category !== 'hydration') return { type: 'connect', label: platform === 'ios' ? 'Conectar Apple Saúde' : 'Conectar Health Connect' };
  return manual;
}

const EMPTY_MESSAGES = {
  body: 'Sem dados de composição corporal. Registre o seu peso (e, se quiser, % de gordura e massa magra) para acompanhar.',
  activity: 'Sem dados de atividade. Registre passos, distância ou minutos de exercício do dia.',
  sleep: 'Sem dados de sono. Registre quanto você dormiu (e, se quiser, a hora de dormir e de acordar).',
  heart: 'Sem dados de coração e recuperação. Registre a sua frequência cardíaca em repouso (e, se quiser, a variabilidade).',
  hydration: 'Sem registro de água hoje. Toque em "+" a cada copo para acompanhar.',
};

// Para o cartão de uma categoria. Devolve:
//   { id, label, icon, hasData, current: { text, sub }, extra: [{ label, text }], trends: { d7, d30 }, series: { d7, d30 },
//     primaryMetric, origin, empty: { message, action } | null, a11y }
export function buildCategoryView({ category, samples = [], now = new Date(), waterGoal = 8, integrationEnabled = false, platform } = {}) {
  const cat = getCategory(category);
  if (!cat) return null;
  const primary = cat.primary;
  const today = dayKey(now);
  const series7 = windowSeries(samples, primary, { days: 7, now });
  const series30 = windowSeries(samples, primary, { days: 30, now });
  const last = latest(samples, primary);
  const any = cat.metrics.some((m) => latest(samples, m));
  const origin = originOf(samples, category, { days: 30, now });

  // categoria só com métricas secundárias (ex.: só % de gordura): conta como "tem dados", mas sem valor principal
  const base = { id: cat.id, label: cat.label, icon: CATEGORY_ICONS[cat.id], primaryMetric: primary, series: { d7: series7, d30: series30 }, origin };
  if (!any) {
    const action = emptyAction({ category, integrationEnabled, platform });
    return { ...base, hasData: false, current: null, extra: [], trends: { d7: null, d30: null }, empty: { message: EMPTY_MESSAGES[cat.id], action }, a11y: `${cat.label}: sem dados. ${EMPTY_MESSAGES[cat.id]} Toque para abrir.` };
  }

  let current = null;
  if (last) {
    const when = last.date === today ? 'Hoje' : `Em ${shortDate(last.date)}`;
    if (cat.id === 'hydration') current = { text: `${Math.round(last.value)} de ${waterGoal} copos`, sub: last.date === today ? 'Hoje' : `Último registro em ${shortDate(last.date)}` };
    else current = { text: formatMetric(primary, last.value), sub: when };
  }
  const extra = [];
  for (const m of cat.metrics) {
    if (m === primary) continue;
    const l = latest(samples, m);
    if (l) extra.push({ label: METRICS[m].label, text: formatMetric(m, l.value), when: l.date === today ? 'Hoje' : `Em ${shortDate(l.date)}` });
  }
  // sono: acrescenta a média das últimas noites
  if (cat.id === 'sleep') {
    const st = seriesStats(series7);
    if (st && st.count >= 2) extra.unshift({ label: 'Média de 7 dias', text: formatDuration(st.avg), when: `${st.count} noites` });
  }
  const d7 = trendOf(series7, primary);
  const d30 = trendOf(series30, primary);
  const trends = { d7: { trend: d7, text: trendText(7, d7, primary) }, d30: { trend: d30, text: trendText(30, d30, primary) } };
  const a11y = [
    `${cat.label}.`,
    current ? `${current.text}, ${current.sub.toLowerCase()}.` : 'Sem valor principal ainda.',
    `${trends.d7.text}.`,
    `${trends.d30.text}.`,
    origin ? `Origem: ${origin}.` : '',
    'Toque para ver o detalhe.',
  ].filter(Boolean).join(' ');
  return { ...base, hasData: true, current, extra, trends, empty: null, a11y };
}

// Os cartões na ordem da tela. Menores de 18: sem composição corporal.
export function buildCategoryViews({ samples = [], now = new Date(), waterGoal = 8, ageGroup, integrationEnabled = false, platform } = {}) {
  return CATEGORIES
    .filter((c) => !(c.id === 'body' && ageGroup === 'under18'))
    .map((c) => buildCategoryView({ category: c.id, samples, now, waterGoal, integrationEnabled, platform }));
}

// Histórico (mais recente primeiro) de UMA métrica: [{ date, text, source, removable }]
export function buildHistory(samples, metric, { limit = 30 } = {}) {
  return dailyValues(samples, metric)
    .slice(-limit)
    .reverse()
    .map((d) => ({ date: d.date, label: shortDate(d.date), text: formatMetric(metric, d.value), source: d.source, removable: d.source === 'manual' || d.source === 'exemplo' }));
}

export { shortDate };
