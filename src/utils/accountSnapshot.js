// Dados por conta, só no aparelho. Cada conta tem um SNAPSHOT das chaves @duo_* em "@duoacct:<uid>:snapshot" (uid do Firebase).
// Ao sair: salva o snapshot e limpa as @duo_* ativas. Ao entrar: restaura o snapshot do uid (ou adota os dados de antes das contas,
// ou começa do zero). Contas diferentes no mesmo celular não veem dados uma da outra. Nada disto vai a servidor nem a log.
// Puro: o armazenamento entra por parâmetro. A chave do snapshot NÃO começa com "@duo_", então a limpeza das ativas não a apaga.
import { clearAllDuoData, isDuoKey } from './duoStorage';
import { isPlainObject, parseJsonSafe, readJsonKey } from './safeStorage';

export const OWNER_KEY = '@duo_owner'; // uid da conta dona dos dados ativos
export const snapshotKey = (uid) => `@duoacct:${uid}:snapshot`;
const SNAPSHOT_VERSION = 1;

// Só aceita { version: 1, data: { "@duo_x": "texto", ... } }; JSON corrompido ou fora do formato é IGNORADO (nunca apagado aqui).
const sanitizeSnapshot = (v) => {
  if (!isPlainObject(v) || v.version !== SNAPSHOT_VERSION || !isPlainObject(v.data)) return undefined;
  const data = {};
  for (const [k, val] of Object.entries(v.data)) if (isDuoKey(k) && typeof val === 'string') data[k] = val;
  return data;
};

export async function readSnapshot(storage, uid) {
  return readJsonKey(storage, snapshotKey(uid), sanitizeSnapshot);
}

export async function saveSnapshot(storage, uid, now = new Date()) {
  const keys = (await storage.getAllKeys()).filter(isDuoKey);
  const pairs = keys.length ? await storage.multiGet(keys) : [];
  const data = {};
  for (const [k, v] of pairs) if (typeof v === 'string') data[k] = v;
  await storage.setItem(snapshotKey(uid), JSON.stringify({ version: SNAPSHOT_VERSION, savedAt: now.toISOString(), data }));
  return Object.keys(data);
}

export async function deleteSnapshot(storage, uid) {
  await storage.removeItem(snapshotKey(uid));
}

// Restaura o snapshot do uid sobre as chaves ativas (limpa as ativas antes). Devolve false se não há snapshot válido.
export async function restoreSnapshot(storage, uid) {
  const data = await readSnapshot(storage, uid);
  if (!data) return false;
  await clearAllDuoData(storage);
  const entries = Object.entries(data);
  if (entries.length) await storage.multiSet(entries);
  await storage.setItem(OWNER_KEY, uid);
  await deleteSnapshot(storage, uid); // restaurado: as ativas são a fonte; ao sair o snapshot é salvo de novo
  return true;
}

// Antes de sair: salva o snapshot (só se as ativas são desta conta) e limpa as ativas.
export async function snapshotAndClear(storage, uid) {
  const owner = await storage.getItem(OWNER_KEY);
  if (owner === uid) await saveSnapshot(storage, uid);
  await clearAllDuoData(storage);
}

// Excluir a conta: apaga o snapshot do uid e as chaves ativas.
export async function deleteAccountLocalData(storage, uid) {
  if (uid) await deleteSnapshot(storage, uid);
  await clearAllDuoData(storage);
}

// Dados de antes das contas: onboarding concluído e que não sejam os dados de exemplo do antigo Modo Demo.
async function hasLegacyData(storage) {
  if ((await storage.getItem('@duo_onboarded')) !== 'true') return false;
  const user = parseJsonSafe(await storage.getItem('@duo_user'), (v) => (isPlainObject(v) ? v : undefined));
  return !(user && user.isDemo === true);
}

/**
 * Chamado quando uma conta (uid) fica ativa. Devolve o que aconteceu:
 *  'owner'    as chaves ativas já são desta conta (app reaberto com a sessão ativa);
 *  'restored' restaurou o snapshot do uid;
 *  'adopted'  adotou os dados locais de antes das contas (a etapa de idade ainda será exigida: não há @duo_age);
 *  'fresh'    conta nova: começa do zero (etapa de idade e onboarding).
 * Se as ativas eram de OUTRA conta (queda antes de sair), elas são salvas no snapshot dela antes de qualquer coisa.
 */
export async function bindAccount(storage, uid) {
  const owner = await storage.getItem(OWNER_KEY);
  if (owner === uid) return 'owner';
  if (owner) {
    await saveSnapshot(storage, owner);
    await clearAllDuoData(storage);
  }
  if (await restoreSnapshot(storage, uid)) return 'restored';
  if (!owner && (await hasLegacyData(storage))) {
    await storage.setItem(OWNER_KEY, uid);
    return 'adopted';
  }
  await clearAllDuoData(storage);
  await storage.setItem(OWNER_KEY, uid);
  return 'fresh';
}
