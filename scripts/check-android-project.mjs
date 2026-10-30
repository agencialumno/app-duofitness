// Confere o projeto Android gerado por "expo prebuild --platform android" quanto ao Health Connect (SÓ LEITURA). Roda no android.yml, no job
// android-prebuild-healthconnect do ci.yml (Linux) e nos testes. Só Node (usa xml2js, que já vem com o Expo).
//
// Modos:
//   --expect off   (padrão quando HEALTH_INTEGRATION_ENABLED não é "true"): NENHUMA permissão android.permission.health.*, nenhum filtro/alias do
//                  Health Connect, nenhum <queries> do pacote do Health Connect e minSdk NÃO elevado pelo plugin. É o Android de hoje.
//   --expect on    (padrão com a flag): exatamente as permissões READ_* da lista fechada de plugins/withHealthConnectOptional.js; NENHUMA WRITE_*, nenhuma
//                  de segundo plano (READ_HEALTH_DATA_IN_BACKGROUND) nem de histórico (READ_HEALTH_DATA_HISTORY); o intent filter
//                  androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE na activity principal; o activity-alias com VIEW_PERMISSION_USAGE + categoria
//                  HEALTH_PERMISSIONS e a permissão START_VIEW_PERMISSION_USAGE; o <queries> do pacote; android.minSdkVersion=26.
//   --baseline <pasta de outro projeto android gerado SEM a flag>: no modo "on", tira do manifest as adições acima e exige que o resto seja
//                  IGUAL ao do baseline (a flag só acrescenta o Health Connect; nada mais muda).
// Uso: node scripts/check-android-project.mjs [--root <pasta do app>] [--expect on|off] [--baseline <pasta>]
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : undefined; };
const root = path.resolve(arg('--root') ?? process.cwd());
const flag = String(process.env.HEALTH_INTEGRATION_ENABLED || '').trim().toLowerCase() === 'true';
const expect = arg('--expect') ?? (flag ? 'on' : 'off');
const baselineDir = arg('--baseline');
if (!['on', 'off'].includes(expect)) { console.log('ERRO  --expect deve ser on ou off'); process.exit(1); }

export const READ_ALLOWED = [
  'STEPS', 'ACTIVE_CALORIES_BURNED', 'EXERCISE', 'HEART_RATE', 'RESTING_HEART_RATE', 'HEART_RATE_VARIABILITY', 'VO2_MAX', 'SLEEP', 'WEIGHT', 'BODY_FAT', 'HYDRATION',
].map((t) => `android.permission.health.READ_${t}`);
const PKG = 'com.google.android.apps.healthdata';
const RATIONALE = 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE';
const VIEW_USAGE = 'android.intent.action.VIEW_PERMISSION_USAGE';
const HEALTH_CAT = 'android.intent.category.HEALTH_PERMISSIONS';
const ALIAS = 'ViewPermissionUsageActivity';

const nameOf = (e) => e && e.$ && e.$['android:name'];
const errors = [];
const fail = (msg) => errors.push(msg);

async function parseManifest(dir) {
  const file = path.join(dir, 'android/app/src/main/AndroidManifest.xml');
  if (!existsSync(file)) { fail(`não achei ${path.relative(dir, file)} (rode o expo prebuild --platform android antes)`); return null; }
  const { parseStringPromise } = require('xml2js');
  return parseStringPromise(readFileSync(file, 'utf8'));
}
function gradleProps(dir) {
  const file = path.join(dir, 'android/gradle.properties');
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}
const mainActivity = (m) => (m.manifest.application[0].activity || []).find((a) => (a['intent-filter'] || []).some((f) => (f.action || []).some((x) => nameOf(x) === 'android.intent.action.MAIN')));
const healthPerms = (m) => (m.manifest['uses-permission'] || []).map(nameOf).filter((n) => /^android\.permission\.health\./.test(n || ''));

// Remove do manifest tudo o que o plugin acrescenta (para comparar com o baseline).
function stripHealth(m) {
  const c = JSON.parse(JSON.stringify(m));
  c.manifest['uses-permission'] = (c.manifest['uses-permission'] || []).filter((p) => !READ_ALLOWED.includes(nameOf(p)));
  c.manifest.queries = (c.manifest.queries || []).filter((q) => !(q.package || []).some((x) => nameOf(x) === PKG));
  if (c.manifest.queries.length === 0) delete c.manifest.queries;
  const app = c.manifest.application[0];
  const main = mainActivity(c);
  if (main) main['intent-filter'] = (main['intent-filter'] || []).filter((f) => !(f.action || []).some((x) => nameOf(x) === RATIONALE));
  if (app['activity-alias']) { app['activity-alias'] = app['activity-alias'].filter((a) => nameOf(a) !== ALIAS); if (app['activity-alias'].length === 0) delete app['activity-alias']; }
  if (c.manifest['uses-permission'] && c.manifest['uses-permission'].length === 0) delete c.manifest['uses-permission'];
  return c;
}
const norm = (m) => JSON.stringify(m, (k, v) => (Array.isArray(v) || typeof v !== 'object' || v === null ? v : Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))));

const m = await parseManifest(root);
if (m) {
  const perms = healthPerms(m);
  const allPerms = (m.manifest['uses-permission'] || []).map(nameOf);
  const main = mainActivity(m);
  const alias = (m.manifest.application[0]['activity-alias'] || []).find((a) => nameOf(a) === ALIAS);
  const hasRationale = !!main && (main['intent-filter'] || []).some((f) => (f.action || []).some((x) => nameOf(x) === RATIONALE));
  const hasQueries = (m.manifest.queries || []).some((q) => (q.package || []).some((x) => nameOf(x) === PKG));
  const props = gradleProps(root);
  const minSdk = (props.match(/^android\.minSdkVersion=(\d+)/m) || [])[1];

  // regras que valem SEMPRE (com ou sem a flag): nada de escrita, segundo plano nem histórico
  for (const p of allPerms) {
    if (/^android\.permission\.health\.WRITE_/.test(p || '')) fail(`${p}: o app é SÓ LEITURA, nenhuma permissão WRITE_* é permitida`);
    if (/READ_HEALTH_DATA_IN_BACKGROUND|READ_HEALTH_DATA_HISTORY/.test(p || '')) fail(`${p}: leitura em segundo plano e histórico além de 30 dias não são usados`);
  }

  if (expect === 'off') {
    if (perms.length) fail(`sem a flag não pode haver permissão do Health Connect (achei ${perms.length})`);
    if (hasRationale) fail('sem a flag não pode haver o intent filter androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE');
    if (alias) fail(`sem a flag não pode haver o activity-alias ${ALIAS}`);
    if (hasQueries) fail('sem a flag não pode haver <queries> do Health Connect');
    if (minSdk === '26') fail('sem a flag o minSdk não é elevado para 26 pelo plugin');
  } else {
    for (const p of READ_ALLOWED) if (!perms.includes(p)) fail(`falta a permissão ${p}`);
    for (const p of perms) if (!READ_ALLOWED.includes(p)) fail(`${p} não está na lista de permissões de LEITURA permitidas`);
    if (new Set(perms).size !== perms.length) fail('há permissões do Health Connect duplicadas');
    if (!hasRationale) fail(`falta o intent filter ${RATIONALE} na activity principal (Android 13 e abaixo)`);
    if (!alias) fail(`falta o activity-alias ${ALIAS} (Android 14 e acima)`);
    else {
      if (alias.$['android:permission'] !== 'android.permission.START_VIEW_PERMISSION_USAGE') fail('o alias precisa da permissão android.permission.START_VIEW_PERMISSION_USAGE');
      if (alias.$['android:exported'] !== 'true') fail('o alias precisa de android:exported="true"');
      const f = (alias['intent-filter'] || [])[0] || {};
      if (!(f.action || []).some((x) => nameOf(x) === VIEW_USAGE)) fail(`o alias precisa da action ${VIEW_USAGE}`);
      if (!(f.category || []).some((x) => nameOf(x) === HEALTH_CAT)) fail(`o alias precisa da categoria ${HEALTH_CAT}`);
      if (main && alias.$['android:targetActivity'] !== nameOf(main)) fail('o alias precisa apontar para a activity principal');
    }
    if (!hasQueries) fail(`falta <queries><package android:name="${PKG}"/></queries>`);
    if (minSdk !== '26') fail(`android.minSdkVersion deveria ser 26 em gradle.properties (achei ${minSdk ?? 'nada'})`);
  }

  if (baselineDir) {
    const base = await parseManifest(path.resolve(baselineDir));
    if (base) {
      const left = expect === 'on' ? stripHealth(m) : m;
      if (norm(left) !== norm(base)) fail('o manifest difere do baseline (sem a flag) além das adições do Health Connect: a flag não pode mudar mais nada');
    }
  }
}

if (errors.length) {
  for (const e of errors) console.log(`${process.env.GITHUB_ACTIONS === 'true' ? '::error::' : 'ERRO  '}${e}`);
  console.log(`\ncheck-android-project: ${errors.length} problema(s).`);
  process.exit(1);
}
console.log(`check-android-project: manifest e gradle conferem (modo ${expect}${baselineDir ? ', igual ao baseline fora do Health Connect' : ''}).`);
