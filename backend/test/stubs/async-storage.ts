// AsyncStorage em memória para testes.
export const store = new Map<string, string>();
const AsyncStorage = {
  getAllKeys: async () => [...store.keys()],
  multiRemove: async (keys: string[]) => { keys.forEach((k) => store.delete(k)); },
  getItem: async (k: string) => (store.has(k) ? (store.get(k) as string) : null),
  setItem: async (k: string, v: string) => { store.set(k, v); },
};
export default AsyncStorage;
