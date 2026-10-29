// Chaves do app no AsyncStorage: todas começam com @duo_. O armazenamento entra por parâmetro (testável em Node).
// Nenhuma chave @duo_* é renomeada aqui; só se listam e removem as que o app já usa.

export const DUO_PREFIX = '@duo_';

export function isDuoKey(key) {
  return typeof key === 'string' && key.startsWith(DUO_PREFIX);
}

// Remove TODAS as chaves @duo_* (inclusive @duo_health e @duo_onboarded). Devolve as que removeu.
// Não toca nas chaves de snapshot (@duoacct:...), que não começam com @duo_.
export async function clearAllDuoData(storage) {
  const keys = (await storage.getAllKeys()).filter(isDuoKey);
  if (keys.length > 0) await storage.multiRemove(keys);
  return keys;
}
