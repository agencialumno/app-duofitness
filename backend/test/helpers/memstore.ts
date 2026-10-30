// Armazenamento em memória (mesma forma do AsyncStorage) e constantes para os testes de integração. Sem rede, sem segredos.
export const SENHA = 'Corvo#Lilas2026';

export function memory(initial: Record<string, string> = {}) {
  const m = new Map<string, string>(Object.entries(initial));
  return {
    m,
    getAllKeys: async () => [...m.keys()],
    getItem: async (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: async (k: string, v: string) => { m.set(k, v); },
    removeItem: async (k: string) => { m.delete(k); },
    multiGet: async (keys: string[]) => keys.map((k) => [k, m.has(k) ? (m.get(k) as string) : null]),
    multiSet: async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => m.set(k, v)); },
    multiRemove: async (keys: string[]) => { keys.forEach((k) => m.delete(k)); },
    duoKeys: () => [...m.keys()].filter((k) => k.startsWith('@duo_')).sort(),
  };
}
export type Mem = ReturnType<typeof memory>;
