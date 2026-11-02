// Confere o projeto nativo gerado por "expo prebuild" quanto às notificações LOCAIS. Roda no android.yml, no ios.yml, no ci.yml e nos testes. Só Node.
//
// Android (manifest do app):
//   --expect on   POST_NOTIFICATIONS e RECEIVE_BOOT_COMPLETED declaradas (este para reagendar depois de reiniciar); SCHEDULE_EXACT_ALARM e USE_EXACT_ALARM
//                 só aparecem com tools:node="remove" (nunca como permissão ativa).
//   --expect off  nenhuma das quatro (o Android de hoje).
// iOS (entitlements e Info.plist), nos DOIS modos: nenhum `aps-environment` (push) e nenhum `remote-notification` em UIBackgroundModes.
// Uso: node scripts/check-notifications-project.mjs --platform android|ios [--root <pasta do app>] [--expect on|off]
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : undefined; };
const root = path.resolve(arg('--root') ?? process.cwd());
const platform = arg('--platform');
const flag = String(process.env.NOTIFICATIONS_ENABLED || '').trim().toLowerCase() === 'true';
const expect = arg('--expect') ?? (flag ? 'on' : 'off');
if (!['android', 'ios'].includes(platform)) { console.log('ERRO  --platform deve ser android ou ios'); process.exit(1); }
if (!['on', 'off'].includes(expect)) { console.log('ERRO  --expect deve ser on ou off'); process.exit(1); }

export const KEEP = ['android.permission.POST_NOTIFICATIONS', 'android.permission.RECEIVE_BOOT_COMPLETED'];
export const EXACT = ['android.permission.SCHEDULE_EXACT_ALARM', 'android.permission.USE_EXACT_ALARM'];
const nameOf = (e) => e && e.$ && e.$['android:name'];
const errors = [];
const fail = (m) => errors.push(m);

async function checkAndroid() {
  const file = path.join(root, 'android/app/src/main/AndroidManifest.xml');
  if (!existsSync(file)) { fail('não achei android/app/src/main/AndroidManifest.xml (rode o expo prebuild --platform android antes)'); return; }
  const { parseStringPromise } = require('xml2js');
  const m = await parseStringPromise(readFileSync(file, 'utf8'));
  const perms = m.manifest['uses-permission'] || [];
  const active = (n) => perms.some((p) => nameOf(p) === n && p.$['tools:node'] !== 'remove');
  const removed = (n) => perms.some((p) => nameOf(p) === n && p.$['tools:node'] === 'remove');
  for (const n of EXACT) {
    if (active(n)) fail(`${n} está declarada como permissão ATIVA (alarme exato é proibido)`);
    if (expect === 'on' && !removed(n)) fail(`${n} deveria estar com tools:node="remove"`);
    if (expect === 'off' && removed(n)) fail(`${n} tem tools:node="remove" mas a flag está desligada (o manifest deveria ser o de antes)`);
  }
  for (const n of KEEP) {
    if (expect === 'on' && !active(n)) fail(`${n} não está declarada`);
    if (expect === 'off' && perms.some((p) => nameOf(p) === n)) fail(`${n} aparece com a flag desligada (o manifest deveria ser o de antes)`);
  }
}

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (n === 'Pods' || n === 'build' || n === 'node_modules') continue;
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

function checkIos() {
  const dir = path.join(root, 'ios');
  if (!existsSync(dir)) { fail('não achei a pasta ios (rode o expo prebuild --platform ios antes)'); return; }
  const files = walk(dir).filter((f) => /\.entitlements$|Info\.plist$/.test(f));
  if (files.length === 0) fail('nenhum Info.plist/.entitlements encontrado em ios/');
  for (const f of files) {
    const t = readFileSync(f, 'utf8');
    if (/aps-environment/.test(t)) fail(`${path.relative(root, f)} tem aps-environment (push); lembretes locais não precisam`);
    if (/<string>remote-notification<\/string>/.test(t)) fail(`${path.relative(root, f)} liga o modo de fundo de push (remote-notification)`);
  }
}

if (platform === 'android') await checkAndroid(); else checkIos();
if (errors.length) { for (const e of errors) console.log(`ERRO  ${e}`); console.log(`\ncheck-notifications-project (${platform}, ${expect}): ${errors.length} problema(s).`); process.exit(1); }
console.log(`check-notifications-project (${platform}, ${expect}): ok.`);
