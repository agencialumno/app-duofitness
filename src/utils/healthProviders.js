// Integração com dados de saúde do aparelho (passos, sono, frequência cardíaca por intervalo...).
// Módulo puro. HOJE só existem o ManualProvider (em uso) e o MockProvider (só Modo Demo e testes, rotulado "dados de
// exemplo"); HealthKit e Health Connect são STUBS documentados, desligados pela flag EXPO_PUBLIC_HEALTH_INTEGRATION
// (padrão: false). Ver docs/saude.md.
//
// Interface HealthProvider:
//   source        'manual' | 'healthkit' | 'healthconnect' | 'mock'   (identificador do provedor, como antes)
//   sampleSource  origem das amostras no modelo: 'manual' | 'apple_saude' | 'health_connect' | 'exemplo'
//   isAvailable()                        -> Promise<boolean>
//   getPermissions()                     -> Promise<{ [categoria]: 'granted' | 'denied' | 'undetermined' | 'unavailable' }>
//   requestPermissions(categorias)       -> Promise<{ granted: string[], denied: string[], unavailable: boolean }>
//   readSamples({ categories, from, to}) -> Promise<Amostra[] | null>   (ver healthModel.js; null = sem dados)
//   getSteps / getSleep / getHeartRate({ from, to })                    (forma antiga, mantida)
// Nenhum método pode lançar: falha vira null/negado. Só dados do próprio usuário, lidos no aparelho e NUNCA enviados.
// Os stubs nativos NÃO pedem permissão nem leem nada: continuam desligados.
import { CATEGORIES, dailyValues } from './healthModel';
import { buildDemoHealthV2 } from './healthStore';

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
const statusFor = (status, categories = CATEGORY_IDS) => Object.fromEntries(categories.map((id) => [id, status]));

// Manual: o app não coleta passos, sono nem batimentos sozinho; o morador registra à mão (ver healthStore.js).
// Não há permissão a pedir: o registro manual é sempre permitido.
export function createManualProvider() {
  return {
    source: 'manual',
    sampleSource: 'manual',
    label: 'Registro manual',
    async isAvailable() { return true; },
    async getPermissions() { return statusFor('granted'); },
    async requestPermissions(categories = CATEGORY_IDS) { return { granted: [...categories], denied: [], unavailable: false }; },
    async readSamples() { return null; },
    async getSteps() { return null; },
    async getSleep() { return null; },
    async getHeartRate() { return null; },
  };
}

function createStub(source, sampleSource, label) {
  return {
    source,
    sampleSource,
    label,
    async isAvailable() { return false; },
    async getPermissions() { return statusFor('unavailable'); },
    // NÃO pede nada ao sistema: a integração está desligada.
    async requestPermissions(categories = CATEGORY_IDS) { return { granted: [], denied: [...categories], unavailable: true }; },
    async readSamples() { return null; },
    async getSteps() { return null; },
    async getSleep() { return null; },
    async getHeartRate() { return null; },
  };
}

// STUB (iOS). Para implementar: biblioteca de HealthKit com módulo nativo (requer dev build/prebuild),
// capability "HealthKit" no projeto iOS, NSHealthShareUsageDescription no app.json, consentimento
// no app e política de privacidade. Enquanto isso: indisponível, sem dados.
export function createHealthKitProvider() {
  return createStub('healthkit', 'apple_saude', 'Apple Saúde');
}

// STUB (Android). Para implementar: Health Connect (módulo nativo, prebuild), permissões
// android.permission.health.READ_* no manifesto, declaração de uso na Play Console, consentimento e
// política de privacidade. Enquanto isso: indisponível, sem dados.
export function createHealthConnectProvider() {
  return createStub('healthconnect', 'health_connect', 'Health Connect');
}

// MockProvider: SÓ para o Modo Demo e testes. Devolve amostras de EXEMPLO (origem "exemplo") em todas as categorias,
// sempre rotuladas "dados de exemplo". Nunca é usado fora do demo.
export function createMockProvider({ now = new Date() } = {}) {
  const all = () => buildDemoHealthV2(now).samples;
  const inRange = (s, from, to) => (!from || s.date >= from) && (!to || s.date <= to);
  return {
    source: 'mock',
    sampleSource: 'exemplo',
    label: 'Dados de exemplo',
    isExample: true,
    async isAvailable() { return true; },
    async getPermissions() { return statusFor('granted'); },
    async requestPermissions(categories = CATEGORY_IDS) { return { granted: [...categories], denied: [], unavailable: false }; },
    async readSamples({ categories, from, to } = {}) {
      const metrics = new Set(CATEGORIES.filter((c) => !categories || categories.includes(c.id)).flatMap((c) => c.metrics));
      const out = all().filter((s) => metrics.has(s.metric) && inRange(s, from, to));
      return out.length ? out : null;
    },
    async getSteps({ from, to } = {}) {
      const byDay = dailyValues(all().filter((s) => inRange(s, from, to)), 'steps').map((d) => ({ date: d.date, steps: d.value }));
      return byDay.length ? { total: byDay.reduce((a, d) => a + d.steps, 0), byDay } : null;
    },
    async getSleep({ from, to } = {}) {
      const byNight = dailyValues(all().filter((s) => inRange(s, from, to)), 'sleep_duration').map((d) => ({ date: d.date, minutes: d.value }));
      return byNight.length ? { byNight } : null;
    },
    async getHeartRate({ from, to } = {}) {
      const samples = dailyValues(all().filter((s) => inRange(s, from, to)), 'resting_hr').map((d) => ({ at: `${d.date}T07:00:00`, bpm: d.value }));
      return samples.length ? { samples } : null;
    },
  };
}

export function isIntegrationEnabled(flag) {
  const v = String(flag ?? '').trim().toLowerCase();
  return v === 'true' || v === '1';
}

// Manual por padrão. Com a flag ligada e fora do Modo Demo, escolhe o stub da plataforma
// (que ainda não devolve dados). Plataforma desconhecida volta para o manual.
export function selectHealthProvider({ flag, platform, isDemo = false } = {}) {
  if (isDemo || !isIntegrationEnabled(flag)) return createManualProvider();
  if (platform === 'ios') return createHealthKitProvider();
  if (platform === 'android') return createHealthConnectProvider();
  return createManualProvider();
}

// Como selectHealthProvider, mas o Modo Demo usa o MockProvider ("dados de exemplo"). É o que o app usa.
export function selectProvider({ flag, platform, isDemo = false, now } = {}) {
  if (isDemo) return createMockProvider({ now });
  return selectHealthProvider({ flag, platform, isDemo: false });
}

// Texto do cartão desabilitado. A conexão ainda não existe, com ou sem a flag.
export const CONNECT_CARD = {
  title: 'Conectar Apple Saúde / Health Connect',
  status: 'em breve',
  enabled: false,
};

