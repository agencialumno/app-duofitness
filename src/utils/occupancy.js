// Lotação da academia ("Academia agora"). Módulo puro (sem React Native), testável em Node.
//
// Só números AGREGADOS (quantas pessoas, capacidade): nunca dados de pessoas.
//
// Interface OccupancyProvider:
//   getOccupancy(gymId) -> Promise<{ count, capacity, updatedAt, source } | null>
//   getHourlyForecast(gymId) -> Promise<Array<{ hour, count, capacity }> | null>   (opcional, p/ "melhor horário")
// `null` = sem dados no momento (a tela mostra "Sem dados no momento").

export const DEFAULT_GYM_ID = 'demo';
export const DEFAULT_CAPACITY = 20;

export const OCCUPANCY_STATES = {
  quiet: { id: 'quiet', label: 'Tranquila' },
  moderate: { id: 'moderate', label: 'Moderada' },
  full: { id: 'full', label: 'Cheia' },
};

// Faixas pela proporção count/capacity: < 40% tranquila, < 75% moderada, a partir de 75% cheia.
export const QUIET_BELOW = 0.4;
export const MODERATE_BELOW = 0.75;

export function getOccupancyRatio(count, capacity) {
  const c = Number(count);
  const cap = Number(capacity);
  if (!Number.isFinite(c) || !Number.isFinite(cap) || cap <= 0 || c < 0) return null;
  return Math.min(c / cap, 1);
}

export function getOccupancyState(count, capacity) {
  const ratio = getOccupancyRatio(count, capacity);
  if (ratio === null) return null;
  if (ratio < QUIET_BELOW) return OCCUPANCY_STATES.quiet;
  if (ratio < MODERATE_BELOW) return OCCUPANCY_STATES.moderate;
  return OCCUPANCY_STATES.full;
}

// "agora", "há 1 min", "há 12 min", "há 2 h", "há 3 dias". Data inválida ou futura vira "agora".
export function formatUpdatedAgo(updatedAt, now = new Date()) {
  const t = new Date(updatedAt).getTime();
  const n = new Date(now).getTime();
  if (!Number.isFinite(t) || !Number.isFinite(n)) return null;
  const min = Math.floor((n - t) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
}

// ---------- Mock (dados de exemplo) ----------

// Proporção de ocupação por hora do dia (0 a 23): pico de manhã cedo, almoço e fim da tarde/noite.
const MOCK_CURVE = [
  0.0, 0.0, 0.0, 0.0, 0.0, 0.1, // 0h-5h
  0.35, 0.6, 0.55, 0.4, 0.25, 0.25, // 6h-11h
  0.45, 0.4, 0.25, 0.2, 0.3, 0.55, // 12h-17h
  0.85, 0.9, 0.7, 0.45, 0.15, 0.0, // 18h-23h
];

export function mockCountForHour(hour, capacity = DEFAULT_CAPACITY) {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  return Math.round(MOCK_CURVE[h] * capacity);
}

// Determinístico: depende só da hora do dia (e do relógio injetado). Atualizado "há 0 a 4 min".
export function createMockProvider({ now = () => new Date(), capacity = DEFAULT_CAPACITY } = {}) {
  return {
    source: 'mock',
    async getOccupancy() {
      const d = new Date(now());
      return {
        count: mockCountForHour(d.getHours(), capacity),
        capacity,
        updatedAt: new Date(d.getTime() - (d.getMinutes() % 5) * 60000).toISOString(),
        source: 'mock',
      };
    },
    async getHourlyForecast() {
      return MOCK_CURVE.map((_, hour) => ({ hour, count: mockCountForHour(hour, capacity), capacity }));
    },
  };
}

// ---------- Remote ----------

function isValidReading(data) {
  return (
    !!data &&
    Number.isFinite(data.count) && data.count >= 0 &&
    Number.isFinite(data.capacity) && data.capacity > 0 &&
    typeof data.updatedAt === 'string' && Number.isFinite(new Date(data.updatedAt).getTime())
  );
}

function isValidForecast(data) {
  return (
    !!data && Array.isArray(data.hours) && data.hours.length > 0 &&
    data.hours.every((h) => Number.isInteger(h.hour) && h.hour >= 0 && h.hour <= 23 && Number.isFinite(h.count) && h.count >= 0) &&
    Number.isFinite(data.capacity) && data.capacity > 0
  );
}

// GET <baseUrl>/occupancy/<gymId> -> { count, capacity, updatedAt }  (ver docs/catraca.md).
// Qualquer falha (rede, timeout, HTTP != 200, JSON inválido) devolve null: a tela mostra
// "Sem dados no momento" e NUNCA troca por números de exemplo.
export function createRemoteProvider({ baseUrl, fetchImpl = globalThis.fetch, timeoutMs = 4000 } = {}) {
  const root = String(baseUrl || '').replace(/\/+$/, '');

  async function getJson(path) {
    if (!root || typeof fetchImpl !== 'function') return null;
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => {
        controller?.abort();
        resolve(null);
      }, timeoutMs);
    });
    try {
      const request = fetchImpl(`${root}${path}`, { method: 'GET', headers: { Accept: 'application/json' }, signal: controller?.signal })
        .then(async (res) => (res && res.ok ? await res.json() : null))
        .catch(() => null);
      return await Promise.race([request, timeout]);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    source: 'remote',
    async getOccupancy(gymId = DEFAULT_GYM_ID) {
      const data = await getJson(`/occupancy/${encodeURIComponent(gymId)}`);
      if (!isValidReading(data)) return null;
      return { count: data.count, capacity: data.capacity, updatedAt: data.updatedAt, source: 'remote' };
    },
    // Opcional: GET <baseUrl>/occupancy/<gymId>/forecast -> { capacity, hours: [{ hour, count }] }
    async getHourlyForecast(gymId = DEFAULT_GYM_ID) {
      const data = await getJson(`/occupancy/${encodeURIComponent(gymId)}/forecast`);
      if (!isValidForecast(data)) return null;
      return data.hours.map((h) => ({ hour: h.hour, count: h.count, capacity: data.capacity }));
    },
  };
}

// ---------- Escolha do provedor ----------

// Remote só com URL, flag ligada e fora do Modo Demo (o demo nunca chama a rede).
export function selectProvider({ apiUrl, remoteFlag, isDemo = false, fetchImpl, now, timeoutMs } = {}) {
  const on = String(remoteFlag || '').trim().toLowerCase();
  const remoteEnabled = !isDemo && !!String(apiUrl || '').trim() && (on === 'true' || on === '1');
  return remoteEnabled
    ? createRemoteProvider({ baseUrl: apiUrl, fetchImpl, timeoutMs })
    : createMockProvider({ now });
}

// ---------- Melhor horário ----------

// Procura, entre as horas de abertura (padrão 6h-21h), a mais tranquila a partir de agora
// (ou do dia seguinte se já passou). Devolve null se o provedor não tiver previsão.
export async function getBestTime(provider, gymId = DEFAULT_GYM_ID, { now = new Date(), openHour = 6, closeHour = 21 } = {}) {
  const forecast = typeof provider?.getHourlyForecast === 'function' ? await provider.getHourlyForecast(gymId) : null;
  if (!Array.isArray(forecast) || forecast.length === 0) return null;
  const hours = forecast.filter((f) => f.hour >= openHour && f.hour <= closeHour);
  if (hours.length === 0) return null;

  const currentHour = new Date(now).getHours();
  const upcoming = hours.filter((f) => f.hour > currentHour);
  const pool = upcoming.length > 0 ? upcoming : hours;
  // menor proporção; em empate, o horário mais cedo
  const best = pool.reduce((a, b) => {
    const ra = getOccupancyRatio(a.count, a.capacity);
    const rb = getOccupancyRatio(b.count, b.capacity);
    return rb < ra ? b : a;
  });
  return {
    hour: best.hour,
    tomorrow: upcoming.length === 0,
    state: getOccupancyState(best.count, best.capacity),
    source: provider.source,
  };
}

export function formatHour(hour) {
  return `${String(hour).padStart(2, '0')}h`;
}
