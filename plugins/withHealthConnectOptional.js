// Config plugin local: Health Connect (Android) OPCIONAL no prebuild, SÓ LEITURA. Sem HEALTH_INTEGRATION_ENABLED=true devolve o config
// INTACTO (mesma referência): o Android gerado (manifest e gradle) fica idêntico ao de antes. O iOS não muda (estes mods são só de Android).
//
// Com a flag escreve APENAS:
//   - as permissões android.permission.health.READ_* dos tipos lidos (lista fechada abaixo). NUNCA WRITE_*, nunca
//     READ_HEALTH_DATA_IN_BACKGROUND (leitura em segundo plano) nem READ_HEALTH_DATA_HISTORY (histórico além dos 30 dias padrão);
//   - <queries> do pacote do Health Connect (visibilidade de pacote no Android 11 a 13, para saber se está instalado e abrir a Play Store);
//   - as exigências da tela de justificativa de permissões do Health Connect: intent filter androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE
//     na activity principal (Android 13 e abaixo) e o activity-alias com android.intent.action.VIEW_PERMISSION_USAGE + categoria
//     android.intent.category.HEALTH_PERMISSIONS, protegido por START_VIEW_PERMISSION_USAGE (Android 14 e acima);
//   - android.minSdkVersion=26 em gradle.properties (o Health Connect exige API 26; o app tem 24 hoje).
// Não usamos o app.plugin.js do pacote: ele não declara permissões e o nosso precisa garantir que só existam READ_*.
const { withAndroidManifest, withGradleProperties } = require('expo/config-plugins');

const isEnabled = (env = process.env) => String(env.HEALTH_INTEGRATION_ENABLED || '').trim().toLowerCase() === 'true';

const PERM = 'android.permission.health.';
// Tipo do Health Connect -> permissão de LEITURA (a mesma lista que o provedor usa para pedir e para consultar).
const READ_PERMISSIONS = [
  `${PERM}READ_STEPS`,
  `${PERM}READ_ACTIVE_CALORIES_BURNED`,
  `${PERM}READ_EXERCISE`,
  `${PERM}READ_HEART_RATE`,
  `${PERM}READ_RESTING_HEART_RATE`,
  `${PERM}READ_HEART_RATE_VARIABILITY`,
  `${PERM}READ_VO2_MAX`,
  `${PERM}READ_SLEEP`,
  `${PERM}READ_WEIGHT`,
  `${PERM}READ_BODY_FAT`,
  `${PERM}READ_HYDRATION`,
];
const HEALTH_CONNECT_PACKAGE = 'com.google.android.apps.healthdata';
const RATIONALE_ACTION = 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE';
const VIEW_USAGE_ACTION = 'android.intent.action.VIEW_PERMISSION_USAGE';
const HEALTH_CATEGORY = 'android.intent.category.HEALTH_PERMISSIONS';
const ALIAS_NAME = 'ViewPermissionUsageActivity';
const MIN_SDK = '26';

const nameOf = (el) => el && el.$ && el.$['android:name'];

// Puro (testável sem o Expo): recebe o objeto do manifest (formato do xml2js do Expo) e devolve o novo. Idempotente.
function applyManifest(manifest) {
  const m = manifest.manifest;
  m['uses-permission'] = m['uses-permission'] || [];
  for (const p of READ_PERMISSIONS) {
    if (!m['uses-permission'].some((x) => nameOf(x) === p)) m['uses-permission'].push({ $: { 'android:name': p } });
  }
  m.queries = m.queries || [];
  const hasPkg = m.queries.some((q) => (q.package || []).some((x) => nameOf(x) === HEALTH_CONNECT_PACKAGE));
  if (!hasPkg) m.queries.push({ package: [{ $: { 'android:name': HEALTH_CONNECT_PACKAGE } }] });

  const app = m.application[0];
  const main = (app.activity || []).find((a) => (a['intent-filter'] || []).some((f) => (f.action || []).some((x) => nameOf(x) === 'android.intent.action.MAIN')));
  if (!main) throw new Error('withHealthConnectOptional: a activity principal não foi encontrada no manifest.');
  main['intent-filter'] = main['intent-filter'] || [];
  if (!main['intent-filter'].some((f) => (f.action || []).some((x) => nameOf(x) === RATIONALE_ACTION))) {
    main['intent-filter'].push({ action: [{ $: { 'android:name': RATIONALE_ACTION } }] });
  }
  app['activity-alias'] = app['activity-alias'] || [];
  if (!app['activity-alias'].some((a) => nameOf(a) === ALIAS_NAME)) {
    app['activity-alias'].push({
      $: {
        'android:name': ALIAS_NAME,
        'android:exported': 'true',
        'android:targetActivity': nameOf(main),
        'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
      },
      'intent-filter': [{
        action: [{ $: { 'android:name': VIEW_USAGE_ACTION } }],
        category: [{ $: { 'android:name': HEALTH_CATEGORY } }],
      }],
    });
  }
  return manifest;
}

// Puro: lista de propriedades do gradle.properties ([{ type: 'property', key, value }, ...]).
function applyGradleProperties(props) {
  const list = Array.isArray(props) ? props.filter((p) => !(p.type === 'property' && p.key === 'android.minSdkVersion')) : [];
  list.push({ type: 'property', key: 'android.minSdkVersion', value: MIN_SDK });
  return list;
}

const withHealthConnectOptional = (config) => {
  if (!isEnabled()) return config;
  let next = withAndroidManifest(config, (cfg) => { cfg.modResults = applyManifest(cfg.modResults); return cfg; });
  next = withGradleProperties(next, (cfg) => { cfg.modResults = applyGradleProperties(cfg.modResults); return cfg; });
  return next;
};

module.exports = withHealthConnectOptional;
module.exports.isEnabled = isEnabled;
module.exports.applyManifest = applyManifest;
module.exports.applyGradleProperties = applyGradleProperties;
module.exports.READ_PERMISSIONS = READ_PERMISSIONS;
module.exports.HEALTH_CONNECT_PACKAGE = HEALTH_CONNECT_PACKAGE;
module.exports.MIN_SDK = MIN_SDK;
