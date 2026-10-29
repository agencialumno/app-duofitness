// Armazenamento da Saúde v2 (puro: o AsyncStorage entra por parâmetro). Chaves NOVAS, sem tocar em @duo_health:
//   @duo_health_v2       { version: 2, samples: [...], waterGoal, migratedFromV1, clearedAt? }
//   @duo_health_connect  estado da conexão com Apple Saúde / Health Connect (consentimento por categoria)
// Os dados de saúde ficam SÓ no aparelho: este módulo nunca usa rede, nunca grava em log e nada daqui vai para o
// marketplace, o backend ou a conta.
import { DEFAULT_WATER_GOAL, HEALTH_KEY, normalizeHealth } from './health';
import { APPLE_SOURCES, CATEGORIES, METRICS, deviceTz, makeSample, normalizeSamples } from './healthModel';
import { readJsonKey, sanitizeObject } from './safeStorage';

export const HEALTH_V2_KEY = '@duo_health_v2';
export const HEALTH_CONNECT_KEY = '@duo_health_connect';

export function emptyHealthV2() {
  return { version: 2, samples: [], waterGoal: DEFAULT_WATER_GOAL, migratedFromV1: false };
}

// Aceita lixo (JSON antigo, corrompido) e devolve sempre um objeto válido.
export function normalizeHealthV2(raw) {
  const base = emptyHealthV2();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const goal = Number.isFinite(raw.waterGoal) ? Math.min(Math.max(Math.round(raw.waterGoal), 1), 20) : DEFAULT_WATER_GOAL;
  return {
    version: 2,
    samples: normalizeSamples(raw.samples),
    waterGoal: goal,
    migratedFromV1: raw.migratedFromV1 === true,
    ...(typeof raw.clearedAt === 'string' ? { clearedAt: raw.clearedAt } : {}),
  };
}

// ---------- Migração do @duo_health (v1) ----------
// Peso e água do v1 viram amostras "manual". O v1 NÃO é alterado nem apagado (outras versões do app ainda o leem).
export function migrateFromV1(rawV1) {
  const v1 = normalizeHealth(rawV1);
  const tz = deviceTz();
  const samples = [];
  for (const w of v1.weights) samples.push({ metric: 'weight', value: w.kg, date: w.date, source: 'manual', tz });
  for (const [date, glasses] of Object.entries(v1.water)) samples.push({ metric: 'water', value: glasses, date, source: 'manual', tz });
  return { version: 2, samples: normalizeSamples(samples), waterGoal: v1.waterGoal, migratedFromV1: true };
}

// ---------- Leitura e gravação ----------

export async function saveHealthV2(storage, health) {
  await storage.setItem(HEALTH_V2_KEY, JSON.stringify(normalizeHealthV2(health)));
}

// Devolve { health, isExample, migrated }.
//  1) existe @duo_health_v2: usa (valor corrompido vira "ausente", sem apagar nada);
//  2) senão, existe @duo_health (v1): migra, grava o v2 e deixa o v1 como está;
//  3) senão: vazio.
export async function loadHealthV2(storage) {
  const v2 = await readJsonKey(storage, HEALTH_V2_KEY, sanitizeObject);
  if (v2) return { health: normalizeHealthV2(v2), isExample: false, migrated: false };
  const v1 = await readJsonKey(storage, HEALTH_KEY, sanitizeObject);
  if (v1) {
    const migrated = migrateFromV1(v1);
    try { await saveHealthV2(storage, migrated); } catch { /* sem gravar agora: migra de novo na próxima abertura */ }
    return { health: migrated, isExample: false, migrated: true };
  }
  return { health: emptyHealthV2(), isExample: false, migrated: false };
}

// ---------- Mudanças (funções puras; a tela chama e depois grava) ----------

// Adiciona/substitui uma amostra (mesma métrica, dia, origem e horário: a última vence). Inválida: ignora.
export function addSample(health, input) {
  const s = makeSample(input);
  if (!s) return normalizeHealthV2(health);
  const h = normalizeHealthV2(health);
  return { ...h, samples: normalizeSamples([...h.samples, s]) };
}

export function addSamples(health, inputs) {
  const h = normalizeHealthV2(health);
  return { ...h, samples: normalizeSamples([...h.samples, ...(Array.isArray(inputs) ? inputs : [])]) };
}

export function removeSample(health, { metric, date, source }) {
  const h = normalizeHealthV2(health);
  return { ...h, samples: h.samples.filter((s) => !(s.metric === metric && s.date === date && (!source || s.source === source))) };
}

// "apple_saude" remove também "apple_watch" (os dois vêm do HealthKit).
export function removeBySource(health, source) {
  const h = normalizeHealthV2(health);
  const gone = source === 'apple_saude' || source === 'apple_watch' ? APPLE_SOURCES : [source];
  return { ...h, samples: h.samples.filter((s) => !gone.includes(s.source)) };
}

// Importação do HealthKit. `incoming` = amostras lidas (origem apple_saude/apple_watch), `from` = primeiro dia lido ("AAAA-MM-DD").
//  - substitui as amostras do HealthKit a partir de `from` (reler a janela não duplica; o que é mais antigo fica);
//  - deduplicação com o registro manual: para métricas de "último valor do dia" (peso, % de gordura, massa magra, VO2), se já há um
//    registro MANUAL no mesmo dia com valor próximo (dentro da tolerância da métrica), a amostra do HealthKit é descartada (é o mesmo
//    registro); valor diferente no mesmo dia entra, e a agregação do dia usa a origem de maior prioridade (aparelho > manual).
//    Para somas (passos, minutos, energia, água) o aparelho tem prioridade sobre o manual do mesmo dia: não soma duas vezes.
export function mergeImported(health, incoming, { from, metrics } = {}) {
  const h = normalizeHealthV2(health);
  // `metrics` (opcional) limita a troca às métricas lidas agora: uma categoria que falhou não perde o que já tinha
  const keep = h.samples.filter((s) => !(APPLE_SOURCES.includes(s.source) && (!from || s.date >= from) && (!metrics || metrics.includes(s.metric))));
  const manual = keep.filter((s) => s.source === 'manual');
  const fresh = (Array.isArray(incoming) ? incoming : []).filter((s) => {
    const m = METRICS[s && s.metric];
    if (!m || m.agg !== 'last') return true;
    return !manual.some((x) => x.metric === s.metric && x.date === s.date && Math.abs(x.value - s.value) <= m.tol);
  });
  return { ...h, samples: normalizeSamples([...keep, ...fresh]) };
}

export function setWaterGoalV2(health, goal) {
  const h = normalizeHealthV2(health);
  const n = Number(goal);
  return { ...h, waterGoal: Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 1), 20) : h.waterGoal };
}

// ---------- Conexão com Apple Saúde / Health Connect (desligada hoje; o estado existe para quando ligar) ----------

export function emptyConnection() {
  return { version: 1, provider: null, consentAt: null, categories: {}, importedAt: null };
}

export function normalizeConnection(raw) {
  const base = emptyConnection();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const ids = CATEGORIES.map((c) => c.id);
  const categories = {};
  if (raw.categories && typeof raw.categories === 'object') for (const id of ids) if (raw.categories[id] === true) categories[id] = true;
  const provider = raw.provider === 'apple_saude' || raw.provider === 'health_connect' ? raw.provider : null; // 'apple_saude' cobre também o Apple Watch
  const iso = (v) => (typeof v === 'string' && Number.isFinite(new Date(v).getTime()) ? v : null);
  // sem consentimento registrado, nada vale
  if (!provider || !iso(raw.consentAt)) return base;
  return { version: 1, provider, consentAt: iso(raw.consentAt), categories, importedAt: iso(raw.importedAt) };
}

// Consentimento EXPLÍCITO por categoria. Sem pelo menos uma categoria marcada, não registra nada.
export function grantConsent(conn, { provider, categories, now = new Date() }) {
  const ids = CATEGORIES.map((c) => c.id);
  const picked = {};
  for (const id of Array.isArray(categories) ? categories : []) if (ids.includes(id)) picked[id] = true;
  if (!['apple_saude', 'health_connect'].includes(provider) || Object.keys(picked).length === 0) return normalizeConnection(conn);
  return { version: 1, provider, consentAt: new Date(now).toISOString(), categories: picked, importedAt: null };
}

export async function loadConnection(storage) {
  return normalizeConnection(await readJsonKey(storage, HEALTH_CONNECT_KEY, sanitizeObject));
}

export async function saveConnection(storage, conn) {
  await storage.setItem(HEALTH_CONNECT_KEY, JSON.stringify(normalizeConnection(conn)));
}

// Desconectar E apagar o que foi importado: remove as amostras da origem do aparelho e zera o estado da conexão.
// Registros manuais e dados de exemplo ficam.
export function disconnectAndErase(health, conn) {
  const provider = normalizeConnection(conn).provider;
  const next = provider ? removeBySource(health, provider) : normalizeHealthV2(health);
  return { health: next, connection: emptyConnection(), removed: normalizeHealthV2(health).samples.length - next.samples.length };
}

// ---------- Limpeza ----------

// "Excluir conta": limpa as chaves NOVAS de saúde. O v2 fica como um "marcador" vazio (migratedFromV1 = true) para que o
// @duo_health antigo, que este código não altera, não seja migrado de novo e traga os dados de volta.
// Sair da conta guarda tudo num snapshot e limpa por prefixo @duo_ (accountSnapshot.js).
export async function clearHealthData(storage, now = new Date()) {
  await storage.removeItem(HEALTH_CONNECT_KEY);
  await storage.setItem(HEALTH_V2_KEY, JSON.stringify({ version: 2, samples: [], waterGoal: DEFAULT_WATER_GOAL, migratedFromV1: true, clearedAt: new Date(now).toISOString() }));
}
