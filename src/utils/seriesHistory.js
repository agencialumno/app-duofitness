// Histórico de séries (puro: o armazenamento entra por parâmetro). Cada GERAÇÃO de série (A, B e C geradas juntas) vira um REGISTRO em "@duo_series_v2":
//   { version: 1, migrated: true, items: [registro, ...] }   (do mais antigo para o mais novo; o último é a "série atual")
//   registro: { id, createdAt, goals|null, level|null, combo|null, source, workoutIds: [ids dos treinos], weights: [{ date, kg }], migrated? }
// Os treinos continuam em "@duo_workouts" (formato intocado); o registro só REFERENCIA os ids. Treinos concluídos e sequência de dias NÃO são gravados aqui: são
// calculados na hora de exibir a partir de "@duo_sessions" (seriesView.js). Peso: só de maiores de 18 (nunca se grava peso de menor ou de idade desconhecida).
// Os dados ficam só no aparelho; a chave começa com "@duo_", então entra no snapshot por conta e na exclusão de conta sem código extra.
import { isPlainObject, readJsonKey } from './safeStorage';
import { dayKeySP } from './saoPauloDay';

export const SERIES_KEY = '@duo_series_v2';
export const SERIES_VERSION = 1;
export const MAX_SERIES = 50;
export const MAX_WEIGHT_POINTS = 200;
export const SERIE_LETTERS = ['A', 'B', 'C'];

export const EMPTY_STORE = Object.freeze({ version: SERIES_VERSION, migrated: true, items: Object.freeze([]) });

// Só maior de 18 tem peso no histórico: 'under18' e idade desconhecida (undefined/null) NÃO.
export const isAdultAge = (ageGroup) => typeof ageGroup === 'string' && ageGroup !== '' && ageGroup !== 'under18';

// Treino de série gerada: tem serie A, B ou C (os criados à mão não têm o campo `serie`).
export const isGeneratedWorkout = (w) => isPlainObject(w) && SERIE_LETTERS.includes(w.serie) && w.id !== undefined && w.id !== null;

// Geração de um treino: addWorkouts grava os ids como "<timestamp>_<índice>", então o prefixo é igual para A, B e C da mesma geração.
// Treino sem esse formato fica sozinho no seu grupo.
export function generationKey(w) {
  const m = /^(\d+)_\d+$/.exec(String(w.id));
  return m ? m[1] : `solo:${w.id}`;
}

const text = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const roundKg = (kg) => Math.round(Number(kg) * 10) / 10;

function sanitizeRecord(r) {
  if (!isPlainObject(r) || typeof r.id !== 'string' || !r.id) return null;
  if (typeof r.createdAt !== 'string' || !Number.isFinite(new Date(r.createdAt).getTime())) return null;
  const ids = Array.isArray(r.workoutIds) ? r.workoutIds.map(String).filter(Boolean) : [];
  if (ids.length === 0) return null;
  const weights = Array.isArray(r.weights)
    ? r.weights.filter((p) => isPlainObject(p) && /^\d{4}-\d{2}-\d{2}$/.test(String(p.date)) && Number.isFinite(Number(p.kg)) && Number(p.kg) > 0)
      .map((p) => ({ date: String(p.date), kg: roundKg(p.kg) })).slice(-MAX_WEIGHT_POINTS)
    : [];
  return {
    id: r.id,
    createdAt: r.createdAt,
    goals: Array.isArray(r.goals) && r.goals.length ? r.goals.map(String) : null,
    level: text(r.level),
    combo: text(r.combo),
    source: text(r.source) || 'local',
    workoutIds: ids,
    weights,
    ...(r.migrated === true ? { migrated: true } : {}),
  };
}

// Valida o que veio do armazenamento. Fora do formato (ou de outra versão) = undefined (tratado como ausente, sem apagar a chave).
export function sanitizeStore(v) {
  if (!isPlainObject(v) || v.version !== SERIES_VERSION || !Array.isArray(v.items)) return undefined;
  const items = [];
  const seen = new Set();
  for (const raw of v.items) {
    const r = sanitizeRecord(raw);
    if (r && !seen.has(r.id)) { seen.add(r.id); items.push(r); }
  }
  items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return { version: SERIES_VERSION, migrated: v.migrated === true, items };
}

// Migração: cada geração de treinos A/B/C já salvos vira um registro "migrado" (objetivo, nível e combo desconhecidos; sem peso).
export function migrateWorkouts(workouts) {
  const groups = new Map();
  for (const w of Array.isArray(workouts) ? workouts : []) {
    if (!isGeneratedWorkout(w)) continue;
    const k = generationKey(w);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(w);
  }
  const items = [];
  for (const [k, list] of groups) {
    const stamps = list.map((w) => new Date(w.createdAt).getTime()).filter(Number.isFinite);
    const fromId = /^\d+$/.test(k) ? Number(k) : NaN;
    const t = stamps.length ? Math.min(...stamps) : Number.isFinite(fromId) ? fromId : null;
    if (t === null) continue; // sem data confiável não se inventa: o treino segue em "Outros treinos"
    items.push({
      id: `s_${k}`,
      createdAt: new Date(t).toISOString(),
      goals: null, level: null, combo: null,
      source: 'migrated',
      workoutIds: list.map((w) => String(w.id)),
      weights: [],
      migrated: true,
    });
  }
  items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return items;
}

// Primeira leitura: sem registro salvo, migra e marca a versão (idempotente: com a marca, nunca migra de novo). Com registro salvo, só descarta registros cujos
// treinos sumiram TODOS (ids que sumiram são tolerados; os ids ficam no registro porque as sessões antigas se atribuem por eles).
export function ensureSeriesStore({ stored, workouts }) {
  if (!stored) return { store: { version: SERIES_VERSION, migrated: true, items: migrateWorkouts(workouts) }, changed: true };
  const present = new Set((Array.isArray(workouts) ? workouts : []).map((w) => String(w?.id)));
  const items = stored.items.filter((r) => r.workoutIds.some((id) => present.has(id)));
  const changed = items.length !== stored.items.length || stored.migrated !== true;
  return { store: changed ? { version: SERIES_VERSION, migrated: true, items } : stored, changed };
}

// Cria o registro de uma geração nova. `removed` traz os registros mais antigos que saíram pelo limite de MAX_SERIES (o chamador avisa e apaga os treinos deles).
export function registerSeries(store, { workoutIds, createdAt, goals, level, combo, source, weightKg, ageGroup, now = new Date() }) {
  const ids = (workoutIds || []).map(String).filter(Boolean);
  if (ids.length === 0) return { store, removed: [] };
  const created = createdAt && Number.isFinite(new Date(createdAt).getTime()) ? new Date(createdAt) : new Date(now);
  let id = `s_${generationKey({ id: ids[0] }).replace(/^solo:/, '')}`;
  const taken = new Set(store.items.map((r) => r.id));
  while (taken.has(id)) id += '_';
  const kg = Number(weightKg);
  const weights = isAdultAge(ageGroup) && Number.isFinite(kg) && kg > 0 ? [{ date: dayKeySP(now), kg: roundKg(kg) }] : [];
  const record = {
    id,
    createdAt: created.toISOString(),
    goals: Array.isArray(goals) && goals.length ? goals.map(String) : null,
    level: text(level),
    combo: text(combo),
    source: text(source) || 'local',
    workoutIds: ids,
    weights,
  };
  let items = [...store.items, record].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const removed = [];
  while (items.length > MAX_SERIES) removed.push(items.shift());
  return { store: { version: SERIES_VERSION, migrated: true, items }, removed };
}

// Peso novo no perfil: acrescenta um ponto à série ATUAL (a mais recente). Só maiores de 18; mesmo valor não duplica; no mesmo dia o ponto é atualizado.
export function appendWeight(store, kg, { ageGroup, now = new Date() } = {}) {
  const n = Number(kg);
  if (!isAdultAge(ageGroup) || !Number.isFinite(n) || n <= 0 || store.items.length === 0) return store;
  const items = store.items.slice();
  const cur = items[items.length - 1];
  const value = roundKg(n);
  const date = dayKeySP(now);
  const last = cur.weights[cur.weights.length - 1];
  if (last && last.kg === value) return store;
  const weights = last && last.date === date ? [...cur.weights.slice(0, -1), { date, kg: value }] : [...cur.weights, { date, kg: value }].slice(-MAX_WEIGHT_POINTS);
  items[items.length - 1] = { ...cur, weights };
  return { ...store, items };
}

// Exclui uma série: tira o registro e devolve os treinos que restam. As sessões (@duo_sessions) NÃO são tocadas.
export function removeSeries({ store, workouts, id }) {
  const rec = store.items.find((r) => r.id === id);
  if (!rec) return { store, workouts, removedWorkoutIds: [] };
  const gone = new Set(rec.workoutIds);
  return {
    store: { ...store, items: store.items.filter((r) => r.id !== id) },
    workouts: workouts.filter((w) => !gone.has(String(w.id))),
    removedWorkoutIds: rec.workoutIds,
  };
}

// Depois de apagar um treino solto: registros sem nenhum treino vivo saem.
export function dropDeadSeries(store, workouts) {
  return ensureSeriesStore({ stored: store, workouts }).store;
}

// ---- armazenamento ----

// Lê, migra/reconcilia e grava se mudou. NUNCA lança e NUNCA toca em @duo_workouts: falha de leitura/gravação deixa o histórico só em memória.
export async function loadSeries(storage, workouts) {
  let stored;
  try { stored = await readJsonKey(storage, SERIES_KEY, sanitizeStore); } catch { stored = undefined; }
  const { store, changed } = ensureSeriesStore({ stored, workouts });
  if (changed) await saveSeries(storage, store);
  return store;
}

export async function saveSeries(storage, store) {
  try {
    await storage.setItem(SERIES_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}
