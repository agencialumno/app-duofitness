// Modelo de visão da tela Saúde (puro, testável): transforma as amostras em "cartões" por categoria com valor atual,
// tendência de 7 e 30 dias, origem, estado "sem dados" com a ação certa e um texto alternativo para leitor de tela.
// Linguagem neutra: a tendência descreve ("subindo", "estável", "caindo"), não julga (não diz "bom" nem "ruim").
import { dayKey } from './health';
import {
  CATEGORIES, METRICS, dailyValues, formatDuration, formatMetric, getCategory, latest, makeSample, originOf, parseClock, seriesStats, trendOf, windowSeries,
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

// Registro mais recente entre as categorias com dados: { date, label, text, sub } ou null (cartão Saúde do Perfil).
export function mostRecentNote(views, samples) {
  let best = null;
  for (const v of views || []) {
    if (!v || !v.hasData || !v.current) continue;
    const l = latest(samples || [], v.primaryMetric);
    if (l && (!best || l.date > best.date)) best = { date: l.date, label: v.label, text: v.current.text, sub: v.current.sub };
  }
  return best;
}

// ---------- Apresentação da tela Saúde (só texto e agrupamento; nenhuma conta nem regra nova) ----------

// Frase curta sob o Duo Score do cabeçalho. Neutra: só hábitos, sem promessa nem julgamento.
export function scorePhrase(score, { missing = 0 } = {}) {
  if (score === null || score === undefined) return 'Registre treinos, água ou sono para ver o seu Duo Score.';
  const base = score >= 85 ? 'Seus hábitos da semana estão em dia.'
    : score >= 70 ? 'Bom ritmo de hábitos nesta semana.'
      : score >= 50 ? 'Dá para ajustar um hábito de cada vez.'
        : 'Comece por um hábito pequeno hoje.';
  const extra = missing > 0 ? ` ${missing === 1 ? 'Falta 1 categoria' : `Faltam ${missing} categorias`} com dados.` : '';
  return `${base}${extra}`;
}

// Variação compacta do cartão: { icon, text, window }. "subindo 1.180 passos" / "estável" / "sem tendência ainda".
const VARIATION_ICON = { up: 'trending-up', down: 'trending-down', stable: 'remove-outline' };
export function compactVariation(view) {
  const d7 = view && view.trends ? view.trends.d7 : null;
  if (!d7) return { icon: 'help-circle-outline', text: 'Sem tendência ainda', window: '7 dias' };
  const raw = String(d7.text).replace(/^\d+ dias: /, '');
  const text = raw.charAt(0).toUpperCase() + raw.slice(1);
  const dir = d7.trend ? d7.trend.direction : null;
  return { icon: VARIATION_ICON[dir] || 'help-circle-outline', text: dir ? text : 'Sem tendência ainda', window: '7 dias' };
}

// Valor falado pelo leitor de tela: "6 horas e 24 minutos" em vez de "6h24".
export function spokenValue(metric, value, fallback) {
  const m = METRICS[metric];
  if (m && m.unit === 'min' && (metric === 'sleep_duration')) {
    const total = Math.round(value);
    const h = Math.floor(total / 60);
    const min = total % 60;
    const hs = `${h} ${h === 1 ? 'hora' : 'horas'}`;
    return min ? `${hs} e ${min} ${min === 1 ? 'minuto' : 'minutos'}` : hs;
  }
  return fallback;
}

// Rótulo do cartão para o VoiceOver, lido como UM item: "Sono, 6 horas e 24 minutos, abaixo da sua média de 7 dias,
// atualizado hoje. Origem: Dados de exemplo. Toque para ver o detalhe."
export function cardA11y(view) {
  if (!view) return '';
  if (!view.hasData) return `${view.label}: sem dados. ${view.empty.action.label}. Toque para abrir.`;
  const parts = [view.label];
  const present = (view.series.d30 || []).filter((p) => p.value !== null && p.value !== undefined);
  const lastPoint = present.length ? present[present.length - 1] : null;
  if (view.current) parts.push(lastPoint ? spokenValue(view.primaryMetric, lastPoint.value, view.current.text) : view.current.text);
  const st = seriesStats((view.series.d7 || []));
  if (lastPoint && st && st.count >= 2) {
    const tol = METRICS[view.primaryMetric] ? METRICS[view.primaryMetric].tol : 0;
    const diff = lastPoint.value - st.avg;
    parts.push(Math.abs(diff) <= tol ? 'na sua média de 7 dias' : diff > 0 ? 'acima da sua média de 7 dias' : 'abaixo da sua média de 7 dias');
  }
  if (view.current) {
    const sub = String(view.current.sub);
    parts.push(/^Hoje/.test(sub) ? 'atualizado hoje' : `atualizado ${sub.replace(/^Último registro em /, 'em ').replace(/^Em /, 'em ')}`);
  }
  const origin = view.origin ? ` Origem: ${view.origin}.` : '';
  return `${parts.join(', ')}.${origin} Toque para ver o detalhe.`;
}

// Cartões com dados (na ordem da tela) e categorias sem dados (agrupadas e recolhidas em "Sem dados ainda").
export function splitViews(views) {
  const list = (views || []).filter(Boolean);
  return { withData: list.filter((v) => v.hasData), noData: list.filter((v) => !v.hasData) };
}

export { shortDate };

// ---------- Formulário de registro manual (por categoria) ----------


// Campos por categoria: kind "number" (aceita vírgula), "duration" (7:30, 7h30, 7,5 ou 450 min) ou "clock" (23:30).
export const FORM_FIELDS = {
  body: [
    { metric: 'weight', label: 'Peso (kg)', placeholder: 'Ex.: 78,5', kind: 'number' },
    { metric: 'body_fat', label: '% de gordura', placeholder: 'Ex.: 18,5', kind: 'number' },
    { metric: 'lean_mass', label: 'Massa magra (kg)', placeholder: 'Ex.: 60,2', kind: 'number' },
  ],
  activity: [
    { metric: 'steps', label: 'Passos de hoje', placeholder: 'Ex.: 8420', kind: 'number' },
    { metric: 'distance', label: 'Distância (km)', placeholder: 'Ex.: 5,2', kind: 'number' },
    { metric: 'exercise_minutes', label: 'Minutos de exercício', placeholder: 'Ex.: 45', kind: 'number' },
  ],
  sleep: [
    { metric: 'sleep_duration', label: 'Duração do sono (h:min)', placeholder: 'Ex.: 7:30', kind: 'duration' },
    { metric: 'bedtime', label: 'Hora de dormir', placeholder: 'Ex.: 23:30', kind: 'clock' },
    { metric: 'wake_time', label: 'Hora de acordar', placeholder: 'Ex.: 06:45', kind: 'clock' },
  ],
  heart: [
    { metric: 'resting_hr', label: 'FC em repouso (bpm)', placeholder: 'Ex.: 58', kind: 'number' },
    { metric: 'hrv', label: 'Variabilidade da FC (ms)', placeholder: 'Ex.: 45', kind: 'number' },
  ],
};

// "7:30", "7h30", "7,5" (horas) ou "450 min" -> minutos; ou null.
export function parseDuration(text) {
  const t = String(text ?? '').trim().toLowerCase();
  if (!t) return null;
  const min = /^(\d{1,4})\s*min$/.exec(t);
  if (min) return Number(min[1]);
  const clock = parseClock(t);
  if (clock !== null) return clock;
  const hours = /^(\d{1,2})(?:[.,](\d{1,2}))?\s*h?$/.exec(t);
  if (hours) return Math.round(Number(`${hours[1]}.${hours[2] ?? '0'}`) * 60);
  return null;
}

// Converte o texto de UM campo em valor da métrica, validando a faixa. { ok: true, value } | { ok: false, error }.
export function parseFormEntry(field, text) {
  const m = METRICS[field.metric];
  const raw = String(text ?? '').trim();
  const fail = (extra) => ({ ok: false, error: `${field.label}: ${extra}` });
  let value;
  if (field.kind === 'clock') value = parseClock(raw);
  else if (field.kind === 'duration') value = parseDuration(raw);
  else if (/^\d+(?:[.,]\d+)?\s*(kg|km|min|bpm|ms|%)?$/i.test(raw)) value = Number(raw.replace(/[^\d.,]/g, '').replace(',', '.'));
  else value = null;
  if (value === null || value === undefined || !Number.isFinite(value)) return fail(field.kind === 'clock' ? 'use o formato 23:30.' : field.kind === 'duration' ? 'use o formato 7:30 (horas e minutos).' : 'informe um número, pode usar vírgula.');
  const probe = makeSample({ metric: field.metric, value, date: '2026-01-01', source: 'manual' });
  if (!probe) {
    const range = field.kind === 'clock' || field.kind === 'duration' ? 'valor fora do possível.' : `use um valor entre ${m.min} e ${m.max}.`;
    return fail(range);
  }
  return { ok: true, value: probe.value };
}

// Lê vários campos de uma vez: campos vazios são ignorados; qualquer campo preenchido e inválido impede o registro.
// { entries: [{ metric, value }], errors: [texto] }
export function parseForm(fields, texts) {
  const entries = [];
  const errors = [];
  for (const f of fields) {
    const raw = String(texts[f.metric] ?? '').trim();
    if (!raw) continue;
    const r = parseFormEntry(f, raw);
    if (r.ok) entries.push({ metric: f.metric, value: r.value });
    else errors.push(r.error);
  }
  return { entries, errors };
}
