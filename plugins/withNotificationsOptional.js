// Config plugin local: notificações LOCAIS (lembretes) OPCIONAIS no prebuild. Sem NOTIFICATIONS_ENABLED=true devolve o config INTACTO (mesma referência):
// o Android e o iOS gerados ficam idênticos aos de antes.
//
// NÃO usamos o app.plugin.js do pacote expo-notifications: ele grava o entitlement `aps-environment` (push) no iOS e pode ligar o modo de fundo de push.
// Lembrete local não precisa de nenhum dos dois, e nenhum token push é pedido. Com a flag este plugin:
//   Android: declara POST_NOTIFICATIONS (Android 13+) e RECEIVE_BOOT_COMPLETED (reagendar depois de reiniciar o aparelho) e REMOVE, por tools:node="remove",
//            SCHEDULE_EXACT_ALARM e USE_EXACT_ALARM (nada de alarmes exatos, mesmo que alguma biblioteca os declare);
//   iOS:     garante que NÃO exista `aps-environment` nos entitlements nem `remote-notification` em UIBackgroundModes.
const { withAndroidManifest, withEntitlementsPlist, withInfoPlist } = require('expo/config-plugins');

const isEnabled = (env = process.env) => String(env.NOTIFICATIONS_ENABLED || '').trim().toLowerCase() === 'true';

const KEEP = ['android.permission.POST_NOTIFICATIONS', 'android.permission.RECEIVE_BOOT_COMPLETED'];
const REMOVE = ['android.permission.SCHEDULE_EXACT_ALARM', 'android.permission.USE_EXACT_ALARM'];
const TOOLS_NS = 'http://schemas.android.com/tools';

const nameOf = (el) => el && el.$ && el.$['android:name'];

// Puro (testável sem o Expo): recebe o objeto do manifest (formato do xml2js do Expo) e devolve o novo. Idempotente.
function applyManifest(manifest) {
  const m = manifest.manifest;
  m.$ = m.$ || {};
  if (!m.$['xmlns:tools']) m.$['xmlns:tools'] = TOOLS_NS;
  const current = m['uses-permission'] || [];
  // tira qualquer declaração anterior dessas permissões e recoloca do jeito certo
  const rest = current.filter((x) => !KEEP.includes(nameOf(x)) && !REMOVE.includes(nameOf(x)));
  m['uses-permission'] = [
    ...rest,
    ...KEEP.map((n) => ({ $: { 'android:name': n } })),
    ...REMOVE.map((n) => ({ $: { 'android:name': n, 'tools:node': 'remove' } })),
  ];
  return manifest;
}

// Puro: entitlements do iOS sem push.
function applyEntitlements(ent) {
  const out = { ...ent };
  delete out['aps-environment'];
  return out;
}

// Puro: Info.plist do iOS sem o modo de fundo de push.
function applyInfoPlist(plist) {
  const out = { ...plist };
  if (Array.isArray(out.UIBackgroundModes)) {
    out.UIBackgroundModes = out.UIBackgroundModes.filter((x) => x !== 'remote-notification');
    if (out.UIBackgroundModes.length === 0) delete out.UIBackgroundModes;
  }
  return out;
}

const withNotificationsOptional = (config) => {
  if (!isEnabled()) return config;
  let next = withAndroidManifest(config, (cfg) => { cfg.modResults = applyManifest(cfg.modResults); return cfg; });
  next = withEntitlementsPlist(next, (cfg) => { cfg.modResults = applyEntitlements(cfg.modResults); return cfg; });
  next = withInfoPlist(next, (cfg) => { cfg.modResults = applyInfoPlist(cfg.modResults); return cfg; });
  return next;
};

module.exports = withNotificationsOptional;
module.exports.isEnabled = isEnabled;
module.exports.applyManifest = applyManifest;
module.exports.applyEntitlements = applyEntitlements;
module.exports.applyInfoPlist = applyInfoPlist;
module.exports.KEEP = KEEP;
module.exports.REMOVE = REMOVE;
