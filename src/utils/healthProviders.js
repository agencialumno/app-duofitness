// Integração com dados de saúde do aparelho (passos, sono, frequência cardíaca por intervalo).
// Módulo puro. HOJE só existe o ManualProvider; HealthKit e Health Connect são STUBS documentados,
// desligados pela flag EXPO_PUBLIC_HEALTH_INTEGRATION (padrão: false). Ver docs/saude.md.
//
// Interface HealthProvider:
//   source: 'manual' | 'healthkit' | 'healthconnect'
//   isAvailable() -> Promise<boolean>
//   getSteps({ from, to })      -> Promise<{ total, byDay: [{ date, steps }] } | null>
//   getSleep({ from, to })      -> Promise<{ byNight: [{ date, minutes }] } | null>
//   getHeartRate({ from, to })  -> Promise<{ samples: [{ at, bpm }] } | null>
// `null` = sem dados. Nenhum método pode lançar: falha vira null. Só dados agregados do próprio usuário,
// lidos no aparelho e nunca enviados a servidor.

// Manual: o app não coleta passos, sono nem batimentos sozinho. Hoje o morador registra só peso e água
// (ver health.js), então estes métodos devolvem "sem dados".
export function createManualProvider() {
  return {
    source: 'manual',
    async isAvailable() { return true; },
    async getSteps() { return null; },
    async getSleep() { return null; },
    async getHeartRate() { return null; },
  };
}

// STUB (iOS). Para implementar: biblioteca de HealthKit com módulo nativo (requer dev build/prebuild),
// capability "HealthKit" no projeto iOS, NSHealthShareUsageDescription no app.json, consentimento
// no app e política de privacidade. Enquanto isso: indisponível, sem dados.
export function createHealthKitProvider() {
  return {
    source: 'healthkit',
    async isAvailable() { return false; },
    async getSteps() { return null; },
    async getSleep() { return null; },
    async getHeartRate() { return null; },
  };
}

// STUB (Android). Para implementar: Health Connect (módulo nativo, prebuild), permissões
// android.permission.health.READ_* no manifesto, declaração de uso na Play Console, consentimento e
// política de privacidade. Enquanto isso: indisponível, sem dados.
export function createHealthConnectProvider() {
  return {
    source: 'healthconnect',
    async isAvailable() { return false; },
    async getSteps() { return null; },
    async getSleep() { return null; },
    async getHeartRate() { return null; },
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

// Texto do cartão desabilitado. A conexão ainda não existe, com ou sem a flag.
export const CONNECT_CARD = {
  title: 'Conectar Apple Saúde / Health Connect',
  status: 'em breve',
  enabled: false,
};
