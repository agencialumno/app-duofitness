// Config plugin local: HealthKit (iOS) OPCIONAL no prebuild, SÓ LEITURA. Sem HEALTH_INTEGRATION_ENABLED=true devolve o config INTACTO
// (mesma referência): o iOS gerado fica idêntico ao de antes. Android não muda (estes mods são só de iOS).
//
// Com a flag escreve APENAS:
//   - o entitlement com.apple.developer.healthkit (true);
//   - NSHealthShareUsageDescription (texto em português, abaixo).
// NÃO escreve: NSHealthUpdateUsageDescription (o app não grava no HealthKit), background delivery
// (com.apple.developer.healthkit.background-delivery) nem registros clínicos (com.apple.developer.healthkit.access / health-records).
// Por isso não usamos o plugin da biblioteca (ele liga o background delivery por padrão e pede o texto de escrita).
const { withEntitlementsPlist, withInfoPlist } = require('expo/config-plugins');

const HEALTHKIT_ENTITLEMENT = 'com.apple.developer.healthkit';
const USAGE_DESCRIPTION = 'O Duo Fitness lê seus dados de atividade, sono e batimentos do app Saúde para mostrar sua evolução. Os dados ficam no seu aparelho.';

const isEnabled = (env = process.env) => String(env.HEALTH_INTEGRATION_ENABLED || '').trim().toLowerCase() === 'true';

// Puros, para os testes: recebem o plist/entitlements e devolvem o novo, sem mexer em nada além das chaves acima.
function applyEntitlements(entitlements) {
  return { ...entitlements, [HEALTHKIT_ENTITLEMENT]: true };
}
function applyInfoPlist(infoPlist) {
  const next = { ...infoPlist, NSHealthShareUsageDescription: USAGE_DESCRIPTION };
  delete next.NSHealthUpdateUsageDescription; // só leitura: nunca pedimos a de escrita
  return next;
}

const withHealthKitOptional = (config) => {
  if (!isEnabled()) return config;
  let next = withEntitlementsPlist(config, (cfg) => { cfg.modResults = applyEntitlements(cfg.modResults); return cfg; });
  next = withInfoPlist(next, (cfg) => { cfg.modResults = applyInfoPlist(cfg.modResults); return cfg; });
  return next;
};

module.exports = withHealthKitOptional;
module.exports.isEnabled = isEnabled;
module.exports.applyEntitlements = applyEntitlements;
module.exports.applyInfoPlist = applyInfoPlist;
module.exports.USAGE_DESCRIPTION = USAGE_DESCRIPTION;
module.exports.HEALTHKIT_ENTITLEMENT = HEALTHKIT_ENTITLEMENT;
