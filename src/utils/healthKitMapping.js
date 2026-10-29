// HealthKit -> amostras do healthModel. MÓDULO PURO: nada de HealthKit, rede, log nem armazenamento aqui; recebe o que a biblioteca devolveu
// e devolve amostras { metric, value, date, tz, source } (valores de saúde nunca são impressos). Só leitura.
//
// Regras:
//  - dia = dia LOCAL do aparelho (dayKey), sem "pular" dia na virada nem no horário de verão;
//  - origem: "apple_watch" quando o dado veio de um relógio, senão "apple_saude". O nome do dispositivo/fonte só decide o rótulo
//    (nunca é guardado nem devolvido);
//  - sono: junta as fases em minutos dormidos por noite; "na cama" (inBed) é ignorado quando há fases detalhadas;
//  - valores que não passam pelo modelo (fora da faixa) são descartados em silêncio, um a um.
import { addDays, dayKey } from './health';
import { deviceTz, makeSample } from './healthModel';

const Q = 'HKQuantityTypeIdentifier';
export const HK = {
  steps: `${Q}StepCount`,
  activeEnergy: `${Q}ActiveEnergyBurned`,
  heartRate: `${Q}HeartRate`,
  restingHeartRate: `${Q}RestingHeartRate`,
  hrv: `${Q}HeartRateVariabilitySDNN`,
  bodyMass: `${Q}BodyMass`,
  bodyFat: `${Q}BodyFatPercentage`,
  vo2max: `${Q}VO2Max`,
  water: `${Q}DietaryWater`,
  sleep: 'HKCategoryTypeIdentifierSleepAnalysis',
  workout: 'HKWorkoutTypeIdentifier',
};

// Tipos pedidos por categoria (autorização e leitura usam a MESMA lista: pedir um tipo e consultar outro derruba o app).
export const CATEGORY_TYPES = {
  activity: [HK.steps, HK.activeEnergy, HK.workout],
  sleep: [HK.sleep],
  heart: [HK.heartRate, HK.restingHeartRate, HK.hrv, HK.vo2max],
  body: [HK.bodyMass, HK.bodyFat],
  hydration: [HK.water],
};

export function typesFor(categories) {
  const out = [];
  for (const c of categories || []) for (const t of CATEGORY_TYPES[c] || []) if (!out.includes(t)) out.push(t);
  return out;
}

export const ML_PER_GLASS = 250;

// ---- origem ----
// entrada: { name, productType, deviceName } (qualquer parte pode faltar). Só decide o rótulo.
export function isWatch(info) {
  const t = `${info?.name || ''} ${info?.deviceName || ''}`.toLowerCase();
  return /watch/.test(t) || /^watch\d/i.test(String(info?.productType || ''));
}
export function originFor(infos) {
  return (infos || []).some(isWatch) ? 'apple_watch' : 'apple_saude';
}
// Extrai só o necessário de um sample (device/sourceRevision): nada disso é guardado depois.
const infoOf = (s) => ({ name: s?.sourceRevision?.source?.name, productType: s?.sourceRevision?.productType, deviceName: s?.device?.name });

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const dateOf = (d) => { const x = d instanceof Date ? d : new Date(d); return Number.isFinite(x.getTime()) ? x : null; };

function push(out, metric, value, day, tz, source) {
  const s = makeSample({ metric, value, date: day, tz, source });
  if (s) out.push(s);
}

// ---- estatísticas por dia (passos, energia, FC, FC em repouso, HRV, água) ----
// stats: [{ startDate, sumQuantity|averageQuantity: { quantity }, sources: [{ name }] }] (um item por dia local)
export function mapDailyStats(metric, stats, { pick = 'sum', convert = (v) => v, tz = deviceTz() } = {}) {
  const out = [];
  for (const st of Array.isArray(stats) ? stats : []) {
    const start = dateOf(st?.startDate);
    const q = num(pick === 'avg' ? st?.averageQuantity?.quantity : st?.sumQuantity?.quantity);
    if (!start || q === null || q <= 0) continue; // dia sem dado nunca vira zero
    push(out, metric, convert(q), dayKey(start), tz, originFor((st.sources || []).map((x) => ({ name: x?.name }))));
  }
  return out;
}

export const convertWater = (ml) => Math.round(ml / ML_PER_GLASS);
export const convertSteps = (n) => Math.round(n);
export const convertEnergy = (kcal) => Math.round(kcal);

// ---- amostras avulsas, último valor do dia (peso, % de gordura, VO2 máx.) ----
export function mapLastPerDay(metric, samples, { convert = (v) => v, tz = deviceTz() } = {}) {
  const byDay = new Map();
  for (const s of Array.isArray(samples) ? samples : []) {
    const end = dateOf(s?.endDate) || dateOf(s?.startDate);
    const q = num(s?.quantity);
    if (!end || q === null) continue;
    const day = dayKey(end);
    const prev = byDay.get(day);
    if (!prev || end.getTime() >= prev.at) byDay.set(day, { at: end.getTime(), q, info: infoOf(s) });
  }
  const out = [];
  for (const [day, v] of byDay) push(out, metric, convert(v.q), day, tz, originFor([v.info]));
  return out;
}
// O HealthKit entrega percentual como fração (0,185 = 18,5%); aceita também o valor já em % (18,5).
export const convertPercent = (q) => (q <= 1 ? q * 100 : q);

// ---- treinos: minutos por dia ----
export function durationMinutes(q) {
  const v = num(q?.quantity);
  if (v === null) return null;
  const u = String(q?.unit || 's').toLowerCase();
  if (u === 'min') return v;
  if (u === 'hr' || u === 'h') return v * 60;
  return v / 60; // segundos (padrão do HealthKit)
}
export function mapWorkouts(workouts, { tz = deviceTz() } = {}) {
  const byDay = new Map();
  for (const w of Array.isArray(workouts) ? workouts : []) {
    const start = dateOf(w?.startDate);
    const minutes = durationMinutes(w?.duration);
    if (!start || minutes === null || minutes <= 0) continue;
    const day = dayKey(start);
    const cur = byDay.get(day) || { minutes: 0, infos: [] };
    cur.minutes += minutes;
    cur.infos.push(infoOf(w));
    byDay.set(day, cur);
  }
  const out = [];
  for (const [day, v] of byDay) push(out, 'exercise_minutes', Math.round(v.minutes), day, tz, originFor(v.infos));
  return out;
}

// ---- sono ----
// valores de CategoryValueSleepAnalysis: 0 na cama, 1 dormindo (sem detalhe), 2 acordado, 3 núcleo, 4 profundo, 5 REM
const IN_BED = 0;
const DETAILED = [3, 4, 5];
const SESSION_GAP_MIN = 120; // pausas de até 2 h (acordado no meio da noite) continuam a MESMA noite
const MIN = 60000;

function mergeIntervals(list) {
  const sorted = [...list].sort((a, b) => a.start - b.start);
  const merged = [];
  for (const it of sorted) {
    const last = merged[merged.length - 1];
    if (last && it.start <= last.end) {
      last.end = Math.max(last.end, it.end);
      last.watch = last.watch || it.watch;
    } else merged.push({ ...it });
  }
  return merged;
}

function minuteOfDay(ms) {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

// samples: [{ startDate, endDate, value, sourceRevision?, device? }]. Devolve sono (minutos), hora de dormir e de acordar por noite.
export function mapSleep(samples, { tz = deviceTz() } = {}) {
  const items = [];
  for (const s of Array.isArray(samples) ? samples : []) {
    const a = dateOf(s?.startDate);
    const b = dateOf(s?.endDate);
    const v = num(s?.value);
    if (!a || !b || v === null || b <= a) continue;
    items.push({ start: a.getTime(), end: b.getTime(), value: v, watch: isWatch(infoOf(s)) });
  }
  const hasDetailed = items.some((i) => DETAILED.includes(i.value));
  let asleep = items.filter((i) => (hasDetailed ? DETAILED.includes(i.value) || i.value === 1 : i.value === 1));
  if (asleep.length === 0) asleep = items.filter((i) => i.value === IN_BED); // só "na cama" (dados antigos): melhor que nada
  const merged = mergeIntervals(asleep);
  // sessões: intervalos separados por menos de SESSION_GAP_MIN fazem parte da mesma noite
  const sessions = [];
  for (const it of merged) {
    const last = sessions[sessions.length - 1];
    if (last && it.start - last.end <= SESSION_GAP_MIN * MIN) {
      last.end = it.end;
      last.minutes += (it.end - it.start) / MIN;
      last.watch = last.watch || it.watch;
    } else sessions.push({ start: it.start, end: it.end, minutes: (it.end - it.start) / MIN, watch: it.watch });
  }
  // noite = dia local em que a sessão TERMINA (quem dorme às 23h e acorda às 7h tem a noite do dia seguinte)
  const nights = new Map();
  for (const s of sessions) {
    const day = dayKey(new Date(s.end));
    const cur = nights.get(day) || { total: 0, main: null, watch: false };
    cur.total += s.minutes;
    cur.watch = cur.watch || s.watch;
    if (!cur.main || s.minutes > cur.main.minutes) cur.main = s;
    nights.set(day, cur);
  }
  const out = [];
  for (const [day, n] of nights) {
    const source = n.watch ? 'apple_watch' : 'apple_saude';
    push(out, 'sleep_duration', Math.round(n.total), day, tz, source);
    push(out, 'bedtime', minuteOfDay(n.main.start), day, tz, source);
    push(out, 'wake_time', minuteOfDay(n.main.end), day, tz, source);
  }
  return out;
}

// ---- janela de leitura ----
export const WINDOW_DAYS = 30;
export function windowFor(now = new Date(), days = WINDOW_DAYS) {
  const today = dayKey(now);
  const fromKey = addDays(today, -(days - 1));
  const [y, m, d] = fromKey.split('-').map(Number);
  return { from: fromKey, to: today, startDate: new Date(y, m - 1, d, 0, 0, 0, 0), endDate: new Date(now) };
}
