// Compara os entitlements REAIS do .ipa exportado (codesign -d --entitlements :-) com o .entitlements do projeto iOS
// gerado pelo prebuild. Um archive SEM assinatura pode perder entitlements; sem esta checagem o build do TestFlight poderia
// sair sem o Sign in with Apple. Só os NOMES das chaves são impressos (nunca certificados nem valores secretos).
//
// Uso: node scripts/check-ipa-entitlements.mjs --ipa <plist XML do .ipa> --project <.entitlements do projeto | none>
//                                              [--require-applesignin] [--require-healthkit]
// Regras:
//  - toda chave do projeto precisa existir no .ipa; se o valor do projeto não tiver variável "$(...)", precisa ser IGUAL;
//  - o .ipa pode ter chaves a mais (application-identifier, team-identifier, get-task-allow, beta-reports-active...);
//  - --require-applesignin: com.apple.developer.applesignin é obrigatório no .ipa (e no projeto, se o projeto existir);
//  - --require-healthkit: com.apple.developer.healthkit é obrigatório no .ipa e no projeto (o workflow passa a flag quando
//    HEALTH_INTEGRATION_ENABLED=true: sem o entitlement o HealthKit não funciona no aparelho).
// Saída: 0 se tudo certo; 1 com ::error:: para cada problema. Escreve um resumo em GITHUB_STEP_SUMMARY, se existir.
import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const APPLE_SIGN_IN = 'com.apple.developer.applesignin';
export const HEALTHKIT = 'com.apple.developer.healthkit';

// ---------- parser mínimo de plist XML (dict, array, string, true, false, integer, real, data, date) ----------
export function parsePlist(xml) {
  const text = String(xml).replace(/<\?xml[^>]*\?>/g, '').replace(/<!DOCTYPE[^>]*>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  const start = text.indexOf('<plist');
  if (start < 0) throw new Error('não é um plist XML');
  let i = text.indexOf('>', start) + 1;
  const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const skipWs = () => { while (i < text.length && /\s/.test(text[i])) i++; };

  function readTag() {
    skipWs();
    if (text[i] !== '<') throw new Error(`plist inválido perto de "${text.slice(i, i + 20)}"`);
    const end = text.indexOf('>', i);
    const raw = text.slice(i + 1, end);
    i = end + 1;
    const closing = raw.startsWith('/');
    const selfClosing = raw.endsWith('/');
    const name = raw.replace(/^\//, '').replace(/\/$/, '').trim().split(/\s+/)[0];
    return { name, closing, selfClosing };
  }
  function readText(until) {
    const end = text.indexOf(`</${until}>`, i);
    const s = text.slice(i, end);
    i = end + until.length + 3;
    return decode(s);
  }
  function readValue(tag) {
    switch (tag.name) {
      case 'true': return true;
      case 'false': return false;
      case 'string': return tag.selfClosing ? '' : readText('string');
      case 'integer': return Number(readText('integer'));
      case 'real': return Number(readText('real'));
      case 'date': return readText('date');
      case 'data': return readText('data').replace(/\s+/g, '');
      case 'array': {
        const out = [];
        for (;;) {
          const t = readTag();
          if (t.closing && t.name === 'array') return out;
          out.push(readValue(t));
        }
      }
      case 'dict': {
        const out = {};
        if (tag.selfClosing) return out;
        for (;;) {
          const k = readTag();
          if (k.closing && k.name === 'dict') return out;
          if (k.name !== 'key') throw new Error(`esperava <key>, achei <${k.name}>`);
          const key = readText('key');
          out[key] = readValue(readTag());
        }
      }
      default: throw new Error(`tag de plist não suportada: <${tag.name}>`);
    }
  }
  const root = readTag();
  return readValue(root);
}

const hasVariable = (v) => JSON.stringify(v).includes('$(');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Devolve { problems[], checked[] } com NOMES de chaves, sem valores.
export function compareEntitlements(ipa, project, { requireAppleSignIn = false, requireHealthKit = false } = {}) {
  const problems = [];
  const checked = [];
  for (const [key, want] of Object.entries(project || {})) {
    checked.push(key);
    if (!(key in ipa)) { problems.push(`Falta no .ipa o entitlement ${key} (o projeto iOS o declara)`); continue; }
    if (!hasVariable(want) && !same(ipa[key], want)) problems.push(`O entitlement ${key} do .ipa tem valor diferente do projeto`);
  }
  if (requireAppleSignIn) {
    if (!(APPLE_SIGN_IN in ipa)) problems.push(`Falta no .ipa o entitlement ${APPLE_SIGN_IN} (Sign in with Apple); com as contas e o Firebase ligados ele é obrigatório`);
    if (!(APPLE_SIGN_IN in (project || {}))) problems.push(`O projeto iOS gerado não declara ${APPLE_SIGN_IN} (usesAppleSignIn não foi aplicado)`);
  }
  if (requireHealthKit) {
    if (!(HEALTHKIT in ipa)) problems.push(`Falta no .ipa o entitlement ${HEALTHKIT} (HealthKit); com a integração de saúde ligada ele é obrigatório. Um archive SEM assinatura pode perdê-lo: gere este build com sign_archive=true (veja docs/testflight.md)`);
    if (!(HEALTHKIT in (project || {}))) problems.push(`O projeto iOS gerado não declara ${HEALTHKIT} (o plugin do HealthKit não foi aplicado)`);
  }
  return { problems: [...new Set(problems)], checked };
}

function main() {
  const args = process.argv.slice(2);
  const arg = (n) => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : undefined; };
  const ipaFile = arg('--ipa');
  const projFile = arg('--project');
  const requireAppleSignIn = args.includes('--require-applesignin');
  const requireHealthKit = args.includes('--require-healthkit');
  if (!ipaFile || !projFile) { console.log('::error::Uso: check-ipa-entitlements.mjs --ipa <arquivo> --project <arquivo|none>'); process.exit(2); }
  let ipa; let project;
  try { ipa = parsePlist(readFileSync(ipaFile, 'utf8')); } catch (e) { console.log(`::error::Não consegui ler os entitlements do .ipa: ${String(e.message).split('\n')[0]}`); process.exit(1); }
  try { project = projFile === 'none' ? {} : parsePlist(readFileSync(projFile, 'utf8')); } catch (e) { console.log(`::error::Não consegui ler o .entitlements do projeto: ${String(e.message).split('\n')[0]}`); process.exit(1); }
  const { problems, checked } = compareEntitlements(ipa, project, { requireAppleSignIn, requireHealthKit });
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (problems.length) {
    for (const p of problems) console.log(`::error::${p}`);
    if (summary) appendFileSync(summary, `- entitlements do .ipa: **falhou**: ${problems.join('; ')}\n`);
    process.exit(1);
  }
  const names = checked.length ? checked.join(', ') : '(o projeto não declara entitlements)';
  console.log(`Entitlements do .ipa conferidos com o projeto: ${names}. O .ipa tem ${Object.keys(ipa).length} chave(s) no total.`);
  if (summary) appendFileSync(summary, `- entitlements do .ipa conferidos com o projeto: ${names}${requireAppleSignIn ? ' (Sign in with Apple obrigatório: ok)' : ''}${requireHealthKit ? ' (HealthKit obrigatório: ok)' : ''}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
