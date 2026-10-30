// Health Connect (Android) -> amostras do healthModel. MÓDULO PURO: nada de Health Connect, rede, log nem armazenamento aqui; recebe os
// registros que a biblioteca devolveu e devolve amostras { metric, value, date, tz, source } (valores de saúde nunca são impressos). Só leitura.
// Reaproveita a lógica já testada do HealthKit (healthKitMapping.js: dia local, sono por noite sem contar sobreposição, minutos de treino,
// último valor do dia); aqui só se converte o formato dos registros do Health Connect para o que aquela lógica espera.
//
// Regras:
//  - dia = dia LOCAL do aparelho (dayKey), sem "pular" dia na virada nem no horário de verão;
//  - origem: "health_connect_watch" (rótulo "Relógio") quando o metadata do registro diz que o dispositivo é um relógio (device.type === 1,
//    TYPE_WATCH), senão "health_connect". O nome do dispositivo e o pacote do app de origem NUNCA são guardados nem devolvidos: o pacote só
//    serve, na memória, para não somar o mesmo passo vindo de duas fontes;
//  - somas (passos, energia, água): vários apps podem gravar o mesmo passo (celular e relógio). Por dia, vale a fonte com o MAIOR total (não soma
//    fontes diferentes), como o Health Connect recomenda para evitar contagem em dobro;
//  - sono: sessões de duas fontes que se sobrepõem contam uma vez só (união dos intervalos);
//  - valores fora da faixa do modelo são descartados em silêncio, um a um.
import { dayKey } from './health';
import { deviceTz } from './healthModel';
import {
  convertEnergy, convertPercent, convertSteps, convertWater, mapDailyStats, mapLastPerDay, mapSleep, mapWorkouts, windowFor, WINDOW_DAYS,
} from './healthKitMapping';

export { windowFor, WINDOW_DAYS };
export const HC_ORIGINS = { watch: 'health_connect_watch', plain: 'health_connect' };

// Tipos pedidos por categoria (autorização e leitura usam a MESMA lista).
export const HC = {
  steps: 'Steps',
  activeEnergy: 'ActiveCaloriesBurned',
  exercise: 'ExerciseSession',
  heartRate: 'HeartRate',
  restingHeartRate: 'RestingHeartRate',
  hrv: 'HeartRateVariabilityRmssd',
  vo2max: 'Vo2Max',
  sleep: 'SleepSession',
  weight: 'Weight',
  bodyFat: 'BodyFat',
  hydration: 'Hydration',
};
export const CATEGORY_TYPES = {
  activity: [HC.steps, HC.activeEnergy, HC.exercise],
  sleep: [HC.sleep],
  heart: [HC.heartRate, HC.restingHeartRate, HC.hrv, HC.vo2max],
  body: [HC.weight, HC.bodyFat],
  hydration: [HC.hydration],
};

export function typesFor(categories) {
  const out = [];
  for (const c of categories || []) for (const t of CATEGORY_TYPES[c] || []) if (!out.includes(t)) out.push(t);
  return out;
}
// Permissão de LEITURA no formato da biblioteca. Não existe aqui nenhum accessType 'write'.
export const readPermission = (recordType) => ({ accessType: 'read', recordType });
export const permissionsFor = (categories) => typesFor(categories).map(readPermission);

// Tipos concedidos a partir do que getGrantedPermissions/requestPermission devolveu (só leitura conta).
export function grantedTypes(granted) {
  const out = [];
  for (const p of Array.isArray(granted) ? granted : []) {
    if (p && p.accessType === 'read' && typeof p.recordType === 'string' && !out.includes(p.recordType)) out.push(p.recordType);
  }
  return out;
}
// Categoria "ativa" = pelo menos um dos tipos dela foi concedido.
export function activeCategories(granted, categories = Object.keys(CATEGORY_TYPES)) {
  const types = grantedTypes(granted);
  return categories.filter((c) => (CATEGORY_TYPES[c] || []).some((t) => types.includes(t)));
}

// ---- utilidades ----
const WATCH_DEVICE_TYPE = 1; // Device.TYPE_WATCH do Health Connect (o enum da biblioteca não lista o 1)
export const isWatchRecord = (r) => r?.metadata?.device?.type === WATCH_DEVICE_TYPE;
const originKey = (r) => (typeof r?.metadata?.dataOrigin === 'string' ? r.metadata.dataOrigin : ''); // só em memória
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const dateOf = (d) => { const x = d instanceof Date ? d : new Date(d); return Number.isFinite(x.getTime()) ? x : null; };
const dayStart = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 0, 0, 0, 0); };

// ---- somas por dia (passos, energia, água): maior fonte do dia ----
function dailySums(records, valueOf, timeOf = (r) => r.startTime) {
  const days = new Map(); // dia -> Map(origem -> { total, watch })
  for (const r of Array.isArray(records) ? records : []) {
    if (!r) continue;
    const t = dateOf(timeOf(r));
    const v = num(valueOf(r));
    if (!t || v === null || v < 0) continue;
    const day = dayKey(t);
    const perOrigin = days.get(day) || new Map();
    const key = originKey(r);
    const cur = perOrigin.get(key) || { total: 0, watch: false };
    cur.total += v;
    cur.watch = cur.watch || isWatchRecord(r);
    perOrigin.set(key, cur);
    days.set(day, perOrigin);
  }
  const stats = [];
  for (const [day, perOrigin] of days) {
    let best = null;
    for (const o of perOrigin.values()) if (!best || o.total > best.total) best = o;
    stats.push({ startDate: dayStart(day), sumQuantity: { quantity: best.total }, sources: [{ watch: best.watch }] });
  }
  return stats;
}

// ---- médias por dia (FC, FC em repouso, HRV) ----
function dailyAverages(points) {
  const days = new Map();
  for (const p of points) {
    const t = dateOf(p.time);
    const v = num(p.value);
    if (!t || v === null) continue;
    const day = dayKey(t);
    const cur = days.get(day) || { sum: 0, n: 0, watch: false };
    cur.sum += v; cur.n += 1; cur.watch = cur.watch || p.watch === true;
    days.set(day, cur);
  }
  return [...days].map(([day, c]) => ({ startDate: dayStart(day), averageQuantity: { quantity: c.sum / c.n }, sources: [{ watch: c.watch }] }));
}

const opts = { origins: HC_ORIGINS };

// ---- categorias ----
export function mapSteps(records, { tz = deviceTz() } = {}) {
  return mapDailyStats('steps', dailySums(records, (r) => r.count), { pick: 'sum', convert: convertSteps, tz, ...opts });
}
export function mapActiveEnergy(records, { tz = deviceTz() } = {}) {
  return mapDailyStats('active_energy', dailySums(records, (r) => r.energy?.inKilocalories), { pick: 'sum', convert: convertEnergy, tz, ...opts });
}
export function mapExercise(records, { tz = deviceTz() } = {}) {
  const seen = new Set();
  const workouts = [];
  for (const r of Array.isArray(records) ? records : []) {
    const a = dateOf(r?.startTime);
    const b = dateOf(r?.endTime);
    if (!a || !b || b <= a) continue;
    const key = `${a.getTime()}-${b.getTime()}`; // a mesma sessão gravada por dois apps conta uma vez
    if (seen.has(key)) continue;
    seen.add(key);
    workouts.push({ startDate: a, duration: { quantity: (b - a) / 60000, unit: 'min' }, watch: isWatchRecord(r) });
  }
  return mapWorkouts(workouts, { tz, ...opts });
}
export function mapHeartRate(records, { tz = deviceTz() } = {}) {
  const points = [];
  for (const r of Array.isArray(records) ? records : []) {
    const watch = isWatchRecord(r);
    for (const s of Array.isArray(r?.samples) ? r.samples : []) points.push({ time: s?.time, value: s?.beatsPerMinute, watch });
  }
  return mapDailyStats('heart_rate', dailyAverages(points), { pick: 'avg', tz, ...opts });
}
export function mapRestingHeartRate(records, { tz = deviceTz() } = {}) {
  const points = (Array.isArray(records) ? records : []).map((r) => ({ time: r?.time, value: r?.beatsPerMinute, watch: isWatchRecord(r) }));
  return mapDailyStats('resting_hr', dailyAverages(points), { pick: 'avg', tz, ...opts });
}
// O Health Connect só tem a variabilidade em RMSSD (o HealthKit usa SDNN): o app mostra o valor em ms como vier.
export function mapHrv(records, { tz = deviceTz() } = {}) {
  const points = (Array.isArray(records) ? records : []).map((r) => ({ time: r?.time, value: r?.heartRateVariabilityMillis, watch: isWatchRecord(r) }));
  return mapDailyStats('hrv', dailyAverages(points), { pick: 'avg', tz, ...opts });
}
export function mapVo2Max(records, { tz = deviceTz() } = {}) {
  const neutral = (Array.isArray(records) ? records : []).map((r) => ({ endDate: r?.time, quantity: r?.vo2MillilitersPerMinuteKilogram, watch: isWatchRecord(r) }));
  return mapLastPerDay('vo2max', neutral, { tz, ...opts });
}
export function mapWeight(records, { tz = deviceTz() } = {}) {
  const neutral = (Array.isArray(records) ? records : []).map((r) => ({ endDate: r?.time, quantity: r?.weight?.inKilograms, watch: isWatchRecord(r) }));
  return mapLastPerDay('weight', neutral, { tz, ...opts });
}
export function mapBodyFat(records, { tz = deviceTz() } = {}) {
  const neutral = (Array.isArray(records) ? records : []).map((r) => ({ endDate: r?.time, quantity: r?.percentage, watch: isWatchRecord(r) }));
  return mapLastPerDay('body_fat', neutral, { convert: convertPercent, tz, ...opts });
}
export function mapHydration(records, { tz = deviceTz() } = {}) {
  return mapDailyStats('water', dailySums(records, (r) => r.volume?.inMilliliters), { pick: 'sum', convert: convertWater, tz, ...opts });
}

// ---- sono ----
// SleepStageType do Health Connect -> valores que o mapSleep do HealthKit entende (1 dormindo, 2 acordado, 3 núcleo, 4 profundo, 5 REM).
const STAGE_TO_VALUE = { 1: 2, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
const ASLEEP_STAGES = [2, 4, 5, 6];
export function mapSleepSessions(records, { tz = deviceTz() } = {}) {
  const neutral = [];
  for (const r of Array.isArray(records) ? records : []) {
    const watch = isWatchRecord(r);
    const start = dateOf(r?.startTime);
    const end = dateOf(r?.endTime);
    if (!start || !end || end <= start) continue;
    const stages = (Array.isArray(r.stages) ? r.stages : []).filter((s) => dateOf(s?.startTime) && dateOf(s?.endTime) && ASLEEP_STAGES.includes(s.stage));
    if (stages.length === 0) {
      neutral.push({ startDate: start, endDate: end, value: 1, watch }); // sessão sem fases (ou sem fase de sono): a sessão inteira é sono
      continue;
    }
    for (const s of r.stages) {
      const v = STAGE_TO_VALUE[s?.stage];
      if (v === undefined || !dateOf(s?.startTime) || !dateOf(s?.endTime)) continue;
      neutral.push({ startDate: dateOf(s.startTime), endDate: dateOf(s.endTime), value: v, watch });
    }
  }
  return mapSleep(neutral, { tz, ...opts });
}

export { convertWater };
