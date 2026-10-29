// Config plugin local: HealthKit (iOS) OPCIONAL no prebuild, SÓ LEITURA. Sem HEALTH_INTEGRATION_ENABLED=true devolve o config INTACTO
// (mesma referência): o iOS gerado fica idêntico ao de antes. Android não muda (estes mods são só de iOS).
//
// Com a flag escreve APENAS:
//   - o entitlement com.apple.developer.healthkit (true);
//   - NSHealthShareUsageDescription (leitura, texto em português, abaixo);
//   - NSHealthUpdateUsageDescription com um texto que diz que o app NÃO grava ("Esta permissão não é usada"). Ela existe só porque a Apple exige
//     (validação ITMS-90683 / 90683 do altool): a biblioteca do HealthKit referencia as APIs de escrita, e a App Store Connect pede a "purpose
//     string" mesmo que o app nunca grave. O app continua sem pedir nenhuma permissão de escrita (toShare vazio; um teste varre o código).
// NÃO escreve: background delivery (com.apple.developer.healthkit.background-delivery) nem registros clínicos
// (com.apple.developer.healthkit.access / health-records). Não usamos o plugin da biblioteca (liga o background delivery por padrão).
const { withEntitlementsPlist, withInfoPlist } = require('expo/config-plugins');

const HEALTHKIT_ENTITLEMENT = 'com.apple.developer.healthkit';
const USAGE_DESCRIPTION = 'O Duo Fitness lê seus dados de atividade, sono e batimentos do app Saúde para mostrar sua evolução. Os dados ficam no seu aparelho.';

const UPDATE_USAGE_DESCRIPTION = 'O Duo Fitness não grava dados no app Saúde. Ele apenas lê os dados que você autorizar. Esta permissão não é usada.';

const isEnabled = (env = process.env) => String(env.HEALTH_INTEGRATION_ENABLED || '').trim().toLowerCase() === 'true';

// Puros, para os testes: recebem o plist/entitlements e devolvem o novo, sem mexer em nada além das chaves acima.
function applyEntitlements(entitlements) {
  return { ...entitlements, [HEALTHKIT_ENTITLEMENT]: true };
}
function applyInfoPlist(infoPlist) {
  return { ...infoPlist, NSHealthShareUsageDescription: USAGE_DESCRIPTION, NSHealthUpdateUsageDescription: UPDATE_USAGE_DESCRIPTION };
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
module.exports.UPDATE_USAGE_DESCRIPTION = UPDATE_USAGE_DESCRIPTION;
module.exports.HEALTHKIT_ENTITLEMENT = HEALTHKIT_ENTITLEMENT;
