// Integração com dados de saúde do aparelho (passos, sono, frequência cardíaca por intervalo...).
// Módulo puro. HOJE só existe o ManualProvider (em uso); HealthKit e Health Connect são STUBS documentados, desligados pela flag
// EXPO_PUBLIC_HEALTH_INTEGRATION (padrão: false). Menores de 18 anos NUNCA recebem um provedor conectado (selectHealthProvider).
// Ver docs/saude.md.
//
// Interface HealthProvider:
//   source        'manual' | 'healthkit' | 'healthconnect'   (identificador do provedor, como antes)
//   sampleSource  origem das amostras no modelo: 'manual' | 'apple_saude' | 'health_connect' | 'exemplo'
//   isAvailable()                        -> Promise<boolean>
//   getPermissions()                     -> Promise<{ [categoria]: 'granted' | 'denied' | 'undetermined' | 'unavailable' }>
//   requestPermissions(categorias)       -> Promise<{ granted: string[], denied: string[], unavailable: boolean }>
//   readSamples({ categories, from, to}) -> Promise<Amostra[] | null>   (ver healthModel.js; null = sem dados)
//   getSteps / getSleep / getHeartRate({ from, to })                    (forma antiga, mantida)
// Nenhum método pode lançar: falha vira null/negado. Só dados do próprio usuário, lidos no aparelho e NUNCA enviados.
// Os stubs nativos NÃO pedem permissão nem leem nada: continuam desligados.
import { CATEGORIES } from './healthModel';
import { createHealthKitProvider as createRealHealthKitProvider } from './healthKitProvider';

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

// iOS. Com `loadLib` (a biblioteca do HealthKit, injetada) é o provedor real, SÓ LEITURA (healthKitProvider.js). Sem `loadLib` é o stub:
// indisponível, sem dados e sem pedir nada ao sistema (é o que acontece quando o módulo nativo não está no build).
export function createHealthKitProvider({ loadLib, now } = {}) {
  if (typeof loadLib === 'function') return createRealHealthKitProvider({ loadLib, now });
  return createStub('healthkit', 'apple_saude', 'Apple Saúde');
}

// STUB (Android). Para implementar: Health Connect (módulo nativo, prebuild), permissões
// android.permission.health.READ_* no manifesto, declaração de uso na Play Console, consentimento e
// política de privacidade. Enquanto isso: indisponível, sem dados.
export function createHealthConnectProvider() {
  return createStub('healthconnect', 'health_connect', 'Health Connect');
}

export function isIntegrationEnabled(flag) {
  const v = String(flag ?? '').trim().toLowerCase();
  return v === 'true' || v === '1';
}

// Manual por padrão. Com a flag ligada (e só para maiores de 18), escolhe o stub da plataforma (que ainda não devolve dados).
// Menor de 18 anos: SEMPRE o manual, com ou sem a flag (a conexão com Apple Saúde/Health Connect fica indisponível para `under18`).
// Plataforma desconhecida volta para o manual.
export function selectHealthProvider({ flag, platform, minor = false, loadLib } = {}) {
  if (minor || !isIntegrationEnabled(flag)) return createManualProvider();
  if (platform === 'ios') return createHealthKitProvider({ loadLib });
  if (platform === 'android') return createHealthConnectProvider();
  return createManualProvider();
}

// O que o app usa (mesma regra de selectHealthProvider).
export function selectProvider({ flag, platform, minor = false, loadLib } = {}) {
  return selectHealthProvider({ flag, platform, minor, loadLib });
}

// Texto do cartão desabilitado. A conexão ainda não existe, com ou sem a flag.
export const CONNECT_CARD = {
  title: 'Conectar Apple Saúde / Health Connect',
  status: 'em breve',
  enabled: false,
};

