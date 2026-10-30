// HealthConnectProvider (Android, SÓ LEITURA): implementa a interface HealthProvider de healthProviders.js sobre a biblioteca
// react-native-health-connect, que entra por injeção (`loadLib` devolve o módulo ou null), então tudo é testável com um falso.
//
// Regras duras:
//  - nenhuma escrita: só requestPermission com accessType 'read', getGrantedPermissions e readRecords; nunca insertRecords nem deleteRecords;
//    nada de leitura em segundo plano nem de histórico além dos 30 dias padrão (a janela é a de 30 dias);
//  - nenhum valor de saúde em log, console, rede ou analytics (este arquivo não usa console nem fetch);
//  - falha de uma categoria não derruba as outras (cada tipo roda isolado);
//  - AQUI o app sabe quais permissões foram concedidas: categoria sem nenhuma permissão fica "inativa" (não é erro) e categoria concedida sem
//    registros é "Sem dados ainda", nunca erro;
//  - disponibilidade: 'available' | 'update_required' (Health Connect a instalar/atualizar na Play Store) | 'unavailable'.
import { CATEGORIES } from './healthModel';
import {
  CATEGORY_TYPES, HC, activeCategories, grantedTypes, mapActiveEnergy, mapBodyFat, mapExercise, mapHeartRate, mapHrv, mapHydration, mapRestingHeartRate,
  mapSleepSessions, mapSteps, mapVo2Max, mapWeight, permissionsFor, windowFor,
} from './healthConnectMapping';

const ALL = CATEGORIES.map((c) => c.id);
const statusFor = (status, cats = ALL) => Object.fromEntries(cats.map((id) => [id, status]));

// SdkAvailabilityStatus da biblioteca (valores do Health Connect): 1 indisponível, 2 precisa instalar/atualizar, 3 disponível.
const SDK_UNAVAILABLE = 1;
const SDK_UPDATE_REQUIRED = 2;
const SDK_AVAILABLE = 3;

export const PAGE_SIZE = 1000;
export const MAX_PAGES = 30; // trava de segurança: 30 mil registros por tipo em 30 dias já é muito além do normal

// Mapeamento tipo -> função pura. Os tipos de uma categoria são lidos um a um.
const MAPPERS = {
  [HC.steps]: mapSteps,
  [HC.activeEnergy]: mapActiveEnergy,
  [HC.exercise]: mapExercise,
  [HC.heartRate]: mapHeartRate,
  [HC.restingHeartRate]: mapRestingHeartRate,
  [HC.hrv]: mapHrv,
  [HC.vo2max]: mapVo2Max,
  [HC.sleep]: mapSleepSessions,
  [HC.weight]: mapWeight,
  [HC.bodyFat]: mapBodyFat,
  [HC.hydration]: mapHydration,
};

export function createHealthConnectProvider({ loadLib, now = () => new Date() } = {}) {
  let lib = null;
  const getLib = () => {
    if (lib) return lib;
    try { lib = typeof loadLib === 'function' ? loadLib() : null; } catch { lib = null; }
    return lib;
  };
  let initialized = false;

  // 'available' | 'update_required' | 'unavailable'
  async function availability() {
    const l = getLib();
    if (!l || typeof l.getSdkStatus !== 'function') return 'unavailable';
    try {
      const st = await l.getSdkStatus();
      if (st === SDK_AVAILABLE) return 'available';
      if (st === SDK_UPDATE_REQUIRED) return 'update_required';
      return st === SDK_UNAVAILABLE ? 'unavailable' : 'unavailable';
    } catch { return 'unavailable'; }
  }

  async function ensureInit() {
    const l = getLib();
    if (initialized) return true;
    const ok = await l.initialize();
    initialized = ok !== false;
    return initialized;
  }

  async function grantedList() {
    const l = getLib();
    try { return await l.getGrantedPermissions(); } catch { return []; }
  }

  // Lê TODAS as páginas de um tipo na janela. Devolve os registros (só em memória).
  async function readAll(type, win) {
    const l = getLib();
    const out = [];
    let pageToken;
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await l.readRecords(type, {
        timeRangeFilter: { operator: 'between', startTime: win.startDate.toISOString(), endTime: win.endDate.toISOString() },
        ascendingOrder: true,
        pageSize: PAGE_SIZE,
        ...(pageToken ? { pageToken } : {}),
      });
      for (const r of (res && res.records) || []) out.push(r);
      pageToken = res && res.pageToken;
      if (!pageToken) break;
    }
    return out;
  }

  // Lê as categorias pedidas. Devolve { samples, report, window } com SÓ contagens por categoria (nunca valores).
  // report[cat] = { ok, count, inactive? }: `inactive` = nenhuma permissão da categoria foi concedida (o usuário não deu ou retirou).
  async function readDetailed({ categories = ALL, days } = {}) {
    const report = {};
    const samples = [];
    if ((await availability()) !== 'available') {
      for (const c of categories) report[c] = { ok: false, count: 0, unavailable: true };
      return { samples, report, window: null };
    }
    const win = windowFor(now(), days);
    let ready = true;
    try { ready = await ensureInit(); } catch { ready = false; }
    const granted = ready ? grantedTypes(await grantedList()) : [];
    for (const c of categories) {
      if (!CATEGORY_TYPES[c]) continue;
      if (!ready) { report[c] = { ok: false, count: 0 }; continue; }
      const types = CATEGORY_TYPES[c].filter((t) => granted.includes(t));
      if (types.length === 0) { report[c] = { ok: false, count: 0, inactive: true }; continue; }
      let ok = true;
      let count = 0;
      for (const t of types) {
        try {
          const got = MAPPERS[t](await readAll(t, win)).filter((s) => s.date >= win.from);
          samples.push(...got);
          count += got.length;
        } catch {
          ok = false; // falhou só este tipo: a categoria não é substituída (mantém o que já havia)
        }
      }
      report[c] = { ok, count };
    }
    return { samples, report, window: { from: win.from, to: win.to } };
  }

  return {
    source: 'healthconnect',
    sampleSource: 'health_connect',
    label: 'Health Connect',
    isExample: false,
    availability,
    async isAvailable() { return (await availability()) === 'available'; },
    // Categorias com pelo menos uma permissão concedida: 'granted'; as outras 'denied' (aqui o app sabe).
    async getPermissions(categories = ALL) {
      if ((await availability()) !== 'available') return statusFor((await availability()) === 'update_required' ? 'unavailable' : 'unavailable', categories);
      try { await ensureInit(); } catch { return statusFor('unavailable', categories); }
      const on = activeCategories(await grantedList(), categories);
      return Object.fromEntries(categories.map((c) => [c, on.includes(c) ? 'granted' : 'denied']));
    },
    // Abre a folha de permissões do Health Connect (só leitura). Devolve as categorias ativas: permissão parcial é normal.
    async requestPermissions(categories = ALL) {
      const av = await availability();
      if (av !== 'available') return { granted: [], denied: [...categories], unavailable: true, availability: av };
      try {
        await ensureInit();
        const l = getLib();
        const returned = await l.requestPermission(permissionsFor(categories));
        const all = [...(Array.isArray(returned) ? returned : []), ...(await grantedList())];
        const granted = activeCategories(all, categories);
        return { granted, denied: categories.filter((c) => !granted.includes(c)), unavailable: false, availability: 'available' };
      } catch {
        return { granted: [], denied: [...categories], unavailable: true, availability: 'available' };
      }
    },
    // Retira as permissões pelo método da biblioteca. A revogação só vale depois que o app reinicia (limite do Health Connect): quem chama
    // avisa a pessoa e leva às configurações do Health Connect. Nunca lança.
    async revokeAll() {
      const l = getLib();
      if (!l || typeof l.revokeAllPermissions !== 'function') return { revoked: false, supported: false };
      try { await l.revokeAllPermissions(); return { revoked: true, supported: true }; } catch { return { revoked: false, supported: true }; }
    },
    openSettings() {
      const l = getLib();
      try { if (l && typeof l.openHealthConnectSettings === 'function') { l.openHealthConnectSettings(); return true; } } catch { /* segue */ }
      return false;
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
