// HealthKitProvider (iOS, SÓ LEITURA): implementa a interface HealthProvider de healthProviders.js sobre a biblioteca
// @kingstinct/react-native-healthkit, que entra por injeção (`loadLib` devolve o módulo ou null), então tudo é testável com um falso.
//
// Regras duras:
//  - nenhuma escrita: só requestAuthorization({ toRead }) e consultas; nunca toShare nem save*;
//  - nenhum valor de saúde em log, console, rede ou analytics (este arquivo não usa console nem fetch);
//  - falha de uma categoria não derruba as outras (cada uma roda isolada);
//  - o iOS NÃO informa se a leitura foi negada: uma consulta sem permissão volta VAZIA. Vazio é "sem dados ainda", nunca "negado" nem erro;
//  - antes de consultar qualquer tipo, ele foi incluído na autorização (consultar um tipo não pedido derruba o app, diz o README da biblioteca).
import { CATEGORIES } from './healthModel';
import {
  CATEGORY_TYPES, HK, ML_PER_GLASS, convertEnergy, convertPercent, convertSteps, convertWater, mapDailyStats, mapLastPerDay, mapSleep, mapWorkouts, typesFor, windowFor,
} from './healthKitMapping';

const ALL = CATEGORIES.map((c) => c.id);
const statusFor = (status, cats = ALL) => Object.fromEntries(cats.map((id) => [id, status]));
const DAY = { day: 1 };

export function createHealthKitProvider({ loadLib, now = () => new Date() } = {}) {
  let lib = null;
  const getLib = () => {
    if (lib) return lib;
    try { lib = typeof loadLib === 'function' ? loadLib() : null; } catch { lib = null; }
    return lib;
  };
  const authorized = new Set(); // tipos já incluídos na autorização nesta sessão

  async function available() {
    const l = getLib();
    if (!l || typeof l.isHealthDataAvailable !== 'function') return false;
    try { return !!(await l.isHealthDataAvailable()); } catch { return false; }
  }

  // Inclui na autorização os tipos das categorias (idempotente: o sistema só mostra a folha se ainda não foi decidido).
  async function ensureAuthorized(categories) {
    const l = getLib();
    const toRead = typesFor(categories).filter((t) => !authorized.has(t));
    if (toRead.length === 0) return true;
    await l.requestAuthorization({ toRead }); // só leitura: nunca toShare
    for (const t of toRead) authorized.add(t);
    return true;
  }

  const dateFilter = (start, end) => ({ date: { startDate: start, endDate: end } });

  async function statsPerDay(identifier, option, unit, { startDate, endDate }) {
    const l = getLib();
    return l.queryStatisticsCollectionForQuantity(identifier, [option], startDate, DAY, { filter: dateFilter(startDate, endDate), unit });
  }

  // Leitores por categoria: cada um devolve amostras do modelo.
  const readers = {
    async activity(win) {
      const l = getLib();
      const steps = await statsPerDay(HK.steps, 'cumulativeSum', 'count', win);
      const energy = await statsPerDay(HK.activeEnergy, 'cumulativeSum', 'kcal', win);
      const workouts = await l.queryWorkoutSamples({ filter: dateFilter(win.startDate, win.endDate), limit: 0, ascending: true });
      return [
        ...mapDailyStats('steps', steps, { pick: 'sum', convert: convertSteps }),
        ...mapDailyStats('active_energy', energy, { pick: 'sum', convert: convertEnergy }),
        ...mapWorkouts(workouts),
      ];
    },
    async sleep(win) {
      const l = getLib();
      const start = new Date(win.startDate.getTime() - 24 * 3600 * 1000); // pega a noite que começou antes da janela
      const samples = await l.queryCategorySamples(HK.sleep, { filter: dateFilter(start, win.endDate), limit: 0, ascending: true });
      return mapSleep(samples).filter((s) => s.date >= win.from);
    },
    async heart(win) {
      const l = getLib();
      const [hr, rhr, hrv] = [
        await statsPerDay(HK.heartRate, 'discreteAverage', 'count/min', win),
        await statsPerDay(HK.restingHeartRate, 'discreteAverage', 'count/min', win),
        await statsPerDay(HK.hrv, 'discreteAverage', 'ms', win),
      ];
      const vo2 = await l.queryQuantitySamples(HK.vo2max, { filter: dateFilter(win.startDate, win.endDate), limit: 0, ascending: true, unit: 'ml/(kg*min)' });
      return [
        ...mapDailyStats('heart_rate', hr, { pick: 'avg' }),
        ...mapDailyStats('resting_hr', rhr, { pick: 'avg' }),
        ...mapDailyStats('hrv', hrv, { pick: 'avg' }),
        ...mapLastPerDay('vo2max', vo2),
      ];
    },
    async body(win) {
      const l = getLib();
      const opts = (unit) => ({ filter: dateFilter(win.startDate, win.endDate), limit: 0, ascending: true, unit });
      const mass = await l.queryQuantitySamples(HK.bodyMass, opts('kg'));
      const fat = await l.queryQuantitySamples(HK.bodyFat, opts('%'));
      return [...mapLastPerDay('weight', mass), ...mapLastPerDay('body_fat', fat, { convert: convertPercent })];
    },
    async hydration(win) {
      const water = await statsPerDay(HK.water, 'cumulativeSum', 'mL', win);
      return mapDailyStats('water', water, { pick: 'sum', convert: convertWater });
    },
  };

  // Lê as categorias, uma a uma e isoladas. Devolve { samples, report } com SÓ contagens por categoria (nunca valores).
  async function readDetailed({ categories = ALL, days } = {}) {
    const report = {};
    const samples = [];
    if (!(await available())) {
      for (const c of categories) report[c] = { ok: false, count: 0, unavailable: true };
      return { samples, report, window: null };
    }
    const win = windowFor(now(), days);
    let ready = true;
    try { await ensureAuthorized(categories); } catch { ready = false; }
    for (const c of categories) {
      if (!readers[c] || !CATEGORY_TYPES[c]) continue;
      if (!ready) { report[c] = { ok: false, count: 0 }; continue; }
      try {
        const got = await readers[c](win);
        samples.push(...got);
        report[c] = { ok: true, count: got.length }; // 0 = o iOS devolveu vazio: "sem dados ainda" (pode ser negação invisível)
      } catch {
        report[c] = { ok: false, count: 0 }; // falhou só esta categoria
      }
    }
    return { samples, report, window: { from: win.from, to: win.to } };
  }

  return {
    source: 'healthkit',
    sampleSource: 'apple_saude',
    label: 'Apple Saúde',
    isExample: false,
    async isAvailable() { return available(); },
    // O iOS não diz se a leitura foi negada. "granted" aqui = a autorização já foi pedida (não prova que há permissão).
    async getPermissions(categories = ALL) {
      if (!(await available())) return statusFor('unavailable', categories);
      try {
        const st = await getLib().getRequestStatusForAuthorization?.({ toRead: typesFor(categories) });
        return statusFor(st === 'shouldRequest' || st === 0 ? 'undetermined' : 'granted', categories);
      } catch { return statusFor('undetermined', categories); }
    },
    async requestPermissions(categories = ALL) {
      if (!(await available())) return { granted: [], denied: [...categories], unavailable: true };
      try {
        await ensureAuthorized(categories);
        return { granted: [...categories], denied: [], unavailable: false };
      } catch {
        return { granted: [], denied: [...categories], unavailable: true };
      }
    },
    readDetailed,
    async readSamples({ categories = ALL } = {}) {
      const { samples } = await readDetailed({ categories });
      return samples.length ? samples : null;
    },
    // forma antiga da interface (mantida): derivada das amostras do modelo
    async getSteps() { const { samples } = await readDetailed({ categories: ['activity'] }); const s = samples.filter((x) => x.metric === 'steps'); return s.length ? { total: s.reduce((a, x) => a + x.value, 0), byDay: s.map((x) => ({ date: x.date, steps: x.value })) } : null; },
    async getSleep() { const { samples } = await readDetailed({ categories: ['sleep'] }); const s = samples.filter((x) => x.metric === 'sleep_duration'); return s.length ? { byNight: s.map((x) => ({ date: x.date, minutes: x.value })) } : null; },
    async getHeartRate() { const { samples } = await readDetailed({ categories: ['heart'] }); const s = samples.filter((x) => x.metric === 'resting_hr'); return s.length ? { samples: s.map((x) => ({ at: `${x.date}T07:00:00`, bpm: x.value })) } : null; },
  };
}

export { ML_PER_GLASS };
