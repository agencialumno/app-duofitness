// Armazenamento da Saúde v2 (puro: o AsyncStorage entra por parâmetro). Chaves NOVAS, sem tocar em @duo_health:
//   @duo_health_v2       { version: 2, samples: [...], waterGoal, migratedFromV1, clearedAt? }
//   @duo_health_connect  estado da conexão com Apple Saúde / Health Connect (consentimento por categoria)
// Os dados de saúde ficam SÓ no aparelho: este módulo nunca usa rede, nunca grava em log e nada daqui vai para o
// marketplace, o backend ou a conta.
import { DEFAULT_WATER_GOAL, HEALTH_KEY, addDays, dayKey, normalizeHealth } from './health';
import { CATEGORIES, deviceTz, makeSample, normalizeSamples } from './healthModel';
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
//  3) senão, no Modo Demo: histórico de EXEMPLO (não é gravado enquanto ninguém registrar nada); fora dele: vazio.
export async function loadHealthV2(storage, { isDemo = false, now = new Date() } = {}) {
  const v2 = await readJsonKey(storage, HEALTH_V2_KEY, sanitizeObject);
  if (v2) return { health: normalizeHealthV2(v2), isExample: false, migrated: false };
  const v1 = await readJsonKey(storage, HEALTH_KEY, sanitizeObject);
  if (v1) {
    const migrated = migrateFromV1(v1);
    try { await saveHealthV2(storage, migrated); } catch { /* sem gravar agora: migra de novo na próxima abertura */ }
    return { health: migrated, isExample: false, migrated: true };
  }
  if (isDemo) return { health: buildDemoHealthV2(now), isExample: true, migrated: false };
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

export function removeBySource(health, source) {
  const h = normalizeHealthV2(health);
  return { ...h, samples: h.samples.filter((s) => s.source !== source) };
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
  const provider = raw.provider === 'apple_saude' || raw.provider === 'health_connect' ? raw.provider : null;
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
// "Resetar tudo" e "Sair do demo" já apagam tudo por prefixo @duo_ (demoSession.clearAllDuoData).
export async function clearHealthData(storage, now = new Date()) {
  await storage.removeItem(HEALTH_CONNECT_KEY);
  await storage.setItem(HEALTH_V2_KEY, JSON.stringify({ version: 2, samples: [], waterGoal: DEFAULT_WATER_GOAL, migratedFromV1: true, clearedAt: new Date(now).toISOString() }));
}

// ---------- Modo Demo: dados de EXEMPLO em todas as categorias ----------

// Tudo com origem "exemplo", relativo a "agora", determinístico (sem números aleatórios).
export function buildDemoHealthV2(now = new Date()) {
  const today = dayKey(now);
  const tz = deviceTz();
  const samples = [];
  const add = (metric, value, off) => samples.push({ metric, value, date: addDays(today, off), source: 'exemplo', tz });

  // Composição corporal: ~5 semanas de peso (mesmos valores do exemplo antigo) e algumas medidas de composição
  [75.2, 75.4, 75.5, 75.7, 75.8, 76.0].forEach((kg, i) => add('weight', kg, [-35, -28, -21, -14, -7, -1][i]));
  [18.9, 18.7, 18.6, 18.4].forEach((v, i) => add('body_fat', v, [-28, -21, -14, -7][i]));
  [60.4, 60.6, 60.9, 61.1].forEach((v, i) => add('lean_mass', v, [-28, -21, -14, -7][i]));

  // Atividade, sono e coração: 14 dias, do mais antigo (-13) ao mais recente (0)
  const steps = [7800, 9100, 4200, 10300, 8800, 6100, 7400, 8200, 9600, 5300, 11200, 8900, 7000, 8420];
  const distance = [5.6, 6.6, 3.0, 7.5, 6.4, 4.4, 5.3, 5.9, 7.0, 3.8, 8.2, 6.5, 5.0, 6.1];
  const exercise = [35, 50, 0, 60, 40, 20, 30, 45, 55, 15, 65, 40, 25, 45];
  const sleep = [400, 380, 340, 410, 450, 470, 360, 330, 400, 420, 390, 350, 380, 420];
  const bed = [1395, 1410, 1440 + 20, 1400, 1385, 1380, 1425, 1440 + 35, 1400, 1390, 1405, 1430, 1410, 1395];
  const rhr = [60, 59, 61, 60, 58, 58, 59, 61, 60, 59, 58, 59, 58, 57];
  const hrv = [44, 46, 40, 45, 49, 51, 47, 41, 44, 48, 50, 46, 47, 52];
  for (let i = 0; i < 14; i++) {
    const off = i - 13;
    add('steps', steps[i], off);
    add('distance', distance[i], off);
    add('exercise_minutes', exercise[i], off);
    add('sleep_duration', sleep[i], off);
    add('bedtime', bed[i] % 1440, off);
    add('wake_time', (bed[i] + sleep[i]) % 1440, off);
    add('resting_hr', rhr[i], off);
    add('hrv', hrv[i], off);
  }
  // Hidratação: 7 dias (mesmos valores do exemplo antigo)
  [6, 8, 7, 5, 8, 8, 4].forEach((g, i) => add('water', g, -(6 - i)));
  return { version: 2, samples: normalizeSamples(samples), waterGoal: DEFAULT_WATER_GOAL, migratedFromV1: false };
}
