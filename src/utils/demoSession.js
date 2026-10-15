// Sessão do Modo Demo: limpar tudo, reiniciar com datas de hoje e decidir se o demo pode ser oferecido.
// Módulo puro: o armazenamento (AsyncStorage) entra por parâmetro, então dá para testar em Node.
// Nenhuma chave @duo_* nova é criada aqui; só se lê, grava e remove as que o app já usa.

export const DUO_PREFIX = '@duo_';

export function isDuoKey(key) {
  return typeof key === 'string' && key.startsWith(DUO_PREFIX);
}

// Remove TODAS as chaves @duo_* (inclusive @duo_health e @duo_onboarded). Devolve as que removeu.
export async function clearAllDuoData(storage) {
  const keys = (await storage.getAllKeys()).filter(isDuoKey);
  if (keys.length > 0) await storage.multiRemove(keys);
  return keys;
}

// O demo só pode ser oferecido (e gravado) se NÃO houver perfil real salvo.
// Sem perfil, ou com o perfil do próprio demo: pode. Perfil real ou dado ilegível: não (não sobrescreve).
export function canOfferDemo(storedUserJson) {
  if (!storedUserJson) return true;
  try {
    return JSON.parse(storedUserJson)?.isDemo === true;
  } catch {
    return false;
  }
}

// Grava os dados de exemplo nas mesmas chaves de sempre (@duo_user, @duo_workouts, ...).
export async function writeDemoData(storage, data) {
  await storage.setItem('@duo_user', JSON.stringify(data.user));
  await storage.setItem('@duo_workouts', JSON.stringify(data.workouts));
  await storage.setItem('@duo_sessions', JSON.stringify(data.sessions));
  await storage.setItem('@duo_xp', String(data.xp));
  await storage.setItem('@duo_streak', String(data.streak));
  await storage.setItem('@duo_achievements', JSON.stringify(data.achievements));
  await storage.setItem('@duo_onboarded', 'true');
}

// Reinicia o demo: apaga tudo o que for @duo_* (inclusive o que o vendedor criou na demo, como
// séries e @duo_health) e grava de novo os dados de exemplo com as datas de hoje.
export async function restartDemoData(storage, freshData) {
  const stored = await storage.getItem('@duo_user');
  if (!canOfferDemo(stored)) return false; // nunca apaga dados reais
  await clearAllDuoData(storage);
  await writeDemoData(storage, freshData);
  return true;
}
