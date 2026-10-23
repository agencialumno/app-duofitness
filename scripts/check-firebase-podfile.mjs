// Confere o projeto iOS GERADO pelo prebuild em relação ao Firebase. Nunca lê nem imprime o GoogleService-Info.plist.
//
// Modo padrão (FIREBASE_ENABLED=true): o Podfile.properties.json tem ios.useFrameworks=static e ios.forceStaticLinking com
//   RNFBApp e RNFBAuth (remédio documentado do RNFB #8657 / Expo #39607), e o Podfile tem UMA vez cada marcador de
//   plugins/withFirebaseIosFix.js ([withFirebaseIosFix] variável e post_install) e $RNFirebaseAsStaticFramework = true.
// Modo --expect-absent (build SEM Firebase): nada disso pode existir (o Podfile fica como o template do Expo).
//
// Uso: node scripts/check-firebase-podfile.mjs [--expect-absent] [--ios-dir <pasta ios>]
// Saída: 0 se tudo certo, 1 se algo faltar (com a lista do que falta). Escreve um resumo em GITHUB_STEP_SUMMARY, se existir.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MARK_VAR = '[withFirebaseIosFix] variável';
export const MARK_POST = '[withFirebaseIosFix] post_install';
export const REQUIRED_PODS = ['RNFBApp', 'RNFBAuth'];

const count = (text, needle) => text.split(needle).length - 1;

export function checkPresent(podfile, props) {
  const problems = [];
  if (props['ios.useFrameworks'] !== 'static') problems.push('Podfile.properties.json sem ios.useFrameworks=static');
  let forced = [];
  try { forced = JSON.parse(props['ios.forceStaticLinking'] ?? '[]'); } catch { problems.push('ios.forceStaticLinking não é um JSON válido'); }
  for (const pod of REQUIRED_PODS) if (!forced.includes(pod)) problems.push(`ios.forceStaticLinking sem ${pod}`);
  if (count(podfile, MARK_VAR) !== 1) problems.push(`Podfile com ${count(podfile, MARK_VAR)} marcador(es) "${MARK_VAR}" (esperado 1)`);
  if (count(podfile, MARK_POST) !== 1) problems.push(`Podfile com ${count(podfile, MARK_POST)} marcador(es) "${MARK_POST}" (esperado 1)`);
  if (count(podfile, '$RNFirebaseAsStaticFramework = true') !== 1) problems.push('Podfile sem exatamente um "$RNFirebaseAsStaticFramework = true"');
  if (!podfile.includes("start_with?('RNFB')")) problems.push('Podfile sem o ajuste do post_install restrito aos pods RNFB');
  return problems;
}

export function checkAbsent(podfile, props) {
  const problems = [];
  if (podfile.includes('withFirebaseIosFix')) problems.push('o Podfile tem marcador do Firebase, mas o build é SEM Firebase');
  if (podfile.includes('RNFirebaseAsStaticFramework')) problems.push('o Podfile tem RNFirebaseAsStaticFramework, mas o build é SEM Firebase');
  if (podfile.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) problems.push('o Podfile tem CLANG_ALLOW_NON_MODULAR_INCLUDES..., mas o build é SEM Firebase');
  if ('ios.forceStaticLinking' in props) problems.push('Podfile.properties.json tem ios.forceStaticLinking, mas o build é SEM Firebase');
  if ('ios.useFrameworks' in props) problems.push('Podfile.properties.json tem ios.useFrameworks, mas o build é SEM Firebase');
  return problems;
}

function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--ios-dir');
  const iosDir = path.resolve(i > -1 ? args[i + 1] : 'ios');
  const absent = args.includes('--expect-absent');
  const podPath = path.join(iosDir, 'Podfile');
  const propsPath = path.join(iosDir, 'Podfile.properties.json');
  if (!existsSync(podPath)) { console.log(`::error::Podfile não encontrado em ${iosDir} (o prebuild do iOS rodou?)`); process.exit(1); }
  const podfile = readFileSync(podPath, 'utf8');
  let props = {};
  if (existsSync(propsPath)) {
    try { props = JSON.parse(readFileSync(propsPath, 'utf8')); } catch { console.log('::error::Podfile.properties.json inválido'); process.exit(1); }
  }
  const problems = absent ? checkAbsent(podfile, props) : checkPresent(podfile, props);
  const label = absent ? 'SEM Firebase (Podfile como o template)' : 'COM Firebase (frameworks estáticos + forceStaticLinking)';
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (problems.length) {
    for (const p of problems) console.log(`::error::${p}`);
    if (summary) appendFileSync(summary, `- Podfile ${label}: **falhou**: ${problems.join('; ')}\n`);
    process.exit(1);
  }
  console.log(`Podfile ${label}: ok.`);
  if (summary) appendFileSync(summary, `- Podfile ${label}: **ok**${absent ? '' : ` (ios.useFrameworks=static, ios.forceStaticLinking=${props['ios.forceStaticLinking']})`}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
