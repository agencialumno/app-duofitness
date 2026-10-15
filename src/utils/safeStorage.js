// Leitura segura do AsyncStorage: valor corrompido é tratado como AUSENTE (undefined), sem derrubar o app e
// sem apagar nenhuma chave (nem a corrompida: ela só é sobrescrita quando o app gravar de novo).
// Módulo puro (o armazenamento entra por parâmetro), testável em Node.

export const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Lista de objetos: descarta itens que não são objetos (null, números, texto) em vez de rejeitar tudo.
export const sanitizeObjectList = (v) => (Array.isArray(v) ? v.filter(isPlainObject) : undefined);
export const sanitizeObject = (v) => (isPlainObject(v) ? v : undefined);

// JSON.parse que nunca lança. `sanitize` valida/limpa o valor e devolve undefined para rejeitar.
export function parseJsonSafe(raw, sanitize = (v) => v) {
  if (raw === null || raw === undefined || raw === '') return undefined;
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

// Inteiro não negativo ("450", "8") ou undefined. "abc", "", "NaN", "-3" e "1e999" são tratados como ausentes.
export function parseCountSafe(raw) {
  if (raw === null || raw === undefined) return undefined;
  const t = String(raw).trim();
  if (!/^\d{1,9}$/.test(t)) return undefined;
  return parseInt(t, 10);
}

// Lê uma chave (falha de leitura também vira "ausente").
export async function readJsonKey(storage, key, sanitize) {
  try {
    return parseJsonSafe(await storage.getItem(key), sanitize);
  } catch {
    return undefined;
  }
}

export async function readCountKey(storage, key) {
  try {
    return parseCountSafe(await storage.getItem(key));
  } catch {
    return undefined;
  }
}

// Lê os dados do app. Cada chave é independente: uma corrompida não impede as outras.
// Devolve só o que existe e é válido: { user, workouts, sessions, xp, streak, achievements }.
export async function readAppData(storage) {
  const [user, workouts, sessions, xp, streak, achievements] = await Promise.all([
    readJsonKey(storage, '@duo_user', sanitizeObject),
    readJsonKey(storage, '@duo_workouts', sanitizeObjectList),
    readJsonKey(storage, '@duo_sessions', sanitizeObjectList),
    readCountKey(storage, '@duo_xp'),
    readCountKey(storage, '@duo_streak'),
    readJsonKey(storage, '@duo_achievements', sanitizeObjectList),
  ]);
  const out = {};
  if (user !== undefined) out.user = user;
  if (workouts !== undefined) out.workouts = workouts;
  if (sessions !== undefined) out.sessions = sessions;
  if (xp !== undefined) out.xp = xp;
  if (streak !== undefined) out.streak = streak;
  if (achievements !== undefined) out.achievements = achievements;
  return out;
}
