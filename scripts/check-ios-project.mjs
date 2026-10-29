// Confere o projeto iOS gerado por "expo prebuild --platform ios" e diz QUAL checagem falhou, com o
// que era esperado. Roda no ios.yml (macOS) e no job ios-prebuild do ci.yml (ubuntu), e no Windows
// nos testes. Só Node: não depende de grep, PlistBuddy nem plutil.
//
// Por que existe: a checagem antiga era um "grep -q 'PRODUCT_BUNDLE_IDENTIFIER = com.duofitness.app'".
// O Expo grava o valor ENTRE ASPAS (PRODUCT_BUNDLE_IDENTIFIER = "com.duofitness.app";), o grep não
// casava e, com "set -e", o passo morria com exit 1 e nenhuma mensagem.
//
// Checagens (todas rodam; no fim, uma lista de tudo que falhou):
//   1. a pasta ios/ existe;
//   2. há exatamente um *.xcodeproj (o nome vem do prebuild: campo "name" do app.json sem espaços);
//   3. o project.pbxproj tem PRODUCT_BUNDLE_IDENTIFIER igual ao bundle id (com ou sem aspas);
//   4. o Info.plist tem ITSAppUsesNonExemptEncryption = false (valor na linha seguinte, como o Expo grava);
//   5. o Podfile existe e usa os módulos do Expo (use_expo_modules!);
//   6. com FIREBASE_ENABLED=true (ou --require-google): o Info.plist tem em CFBundleURLSchemes o REVERSED_CLIENT_ID (esquema
//      com.googleusercontent.apps.*), sem o qual o retorno do login com Google não volta ao app. Só passa/falha: nunca imprime o valor.
//
// Uso: node scripts/check-ios-project.mjs [--root <pasta do app>] [--bundle-id com.duofitness.app]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const root = path.resolve(arg('--root') ?? process.cwd());
const bundleId = arg('--bundle-id') ?? 'com.duofitness.app';
const onGithub = process.env.GITHUB_ACTIONS === 'true';

const errors = [];
const fail = (msg) => {
  errors.push(msg);
  console.log(onGithub ? `::error::${msg}` : `ERRO   ${msg}`);
};
const warn = (msg) => console.log(onGithub ? `::warning::${msg}` : `AVISO  ${msg}`);
const ok = (msg) => console.log(`ok     ${msg}`);
const rel = (p) => path.relative(root, p).split(path.sep).join('/');

const iosDir = path.join(root, 'ios');

// 1) pasta ios/
if (!existsSync(iosDir) || !statSync(iosDir).isDirectory()) {
  fail('[ios/] Esperado: a pasta ios/ gerada pelo "expo prebuild --platform ios". Ela não existe.');
  process.exit(1);
}
ok('ios/ existe');

// 2) *.xcodeproj (nome descoberto, não fixado)
const entries = readdirSync(iosDir);
const xcodeprojs = entries.filter((n) => n.endsWith('.xcodeproj'));
let projDir = null;
if (xcodeprojs.length === 0) {
  fail(`[xcodeproj] Esperado: um ios/<Nome>.xcodeproj. Não há nenhum. Conteúdo de ios/: ${entries.join(', ') || '(vazio)'}.`);
} else if (xcodeprojs.length > 1) {
  fail(`[xcodeproj] Esperado: exatamente um .xcodeproj em ios/. Achei ${xcodeprojs.length}: ${xcodeprojs.join(', ')}.`);
} else {
  projDir = path.join(iosDir, xcodeprojs[0]);
  const projName = xcodeprojs[0].replace(/\.xcodeproj$/, '');
  ok(`projeto: ${rel(projDir)} (nome real: ${projName})`);
  // O prebuild deriva o nome do campo "name" do app.json sem espaços/símbolos. Só informativo.
  try {
    const appName = JSON.parse(readFileSync(path.join(root, 'app.json'), 'utf8')).expo?.name;
    const derived = typeof appName === 'string' ? appName.replace(/[^A-Za-z0-9]+/g, '') : '';
    if (derived && derived !== projName) {
      warn(`[xcodeproj] O nome do projeto (${projName}) difere do derivado do app.json (${derived}). Os passos seguintes usam o nome real, então não há problema.`);
    }
  } catch {
    // sem app.json (ex.: fixtures de teste): nada a comparar
  }
}

// 3) PRODUCT_BUNDLE_IDENTIFIER no project.pbxproj (com ou sem aspas)
if (projDir) {
  const pbxPath = path.join(projDir, 'project.pbxproj');
  if (!existsSync(pbxPath)) {
    fail(`[pbxproj] Esperado: ${rel(pbxPath)}. O arquivo não existe.`);
  } else {
    const lines = readFileSync(pbxPath, 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.includes('PRODUCT_BUNDLE_IDENTIFIER'))
      .map((l) => l.trim());
    const valueOf = (l) => /PRODUCT_BUNDLE_IDENTIFIER\s*=\s*"?([^";\s]+)"?\s*;/.exec(l)?.[1];
    const values = lines.map(valueOf);
    const allMatch = lines.length > 0 && values.every((v) => v === bundleId);
    if (!allMatch) {
      fail(
        `[pbxproj] Esperado: toda linha PRODUCT_BUNDLE_IDENTIFIER = ${bundleId} (com ou sem aspas) em ${rel(pbxPath)}. ` +
          (lines.length === 0 ? 'Não há nenhuma linha PRODUCT_BUNDLE_IDENTIFIER.' : `Linhas que existem: ${lines.join(' | ')}`),
      );
    } else {
      ok(`bundle id ${bundleId} em ${lines.length} configuração(ões) do projeto`);
    }
  }
}

// 4) Info.plist: ITSAppUsesNonExemptEncryption = false
const plistCandidates = entries
  .map((n) => path.join(iosDir, n, 'Info.plist'))
  .filter((p) => existsSync(p));
const preferred = projDir ? path.join(iosDir, path.basename(projDir, '.xcodeproj'), 'Info.plist') : null;
const plistPath = preferred && existsSync(preferred) ? preferred : plistCandidates[0];
if (!plistPath) {
  fail(`[Info.plist] Esperado: ios/<Nome>/Info.plist. Não encontrei nenhum em ios/*/. Pastas em ios/: ${entries.join(', ') || '(vazio)'}.`);
} else {
  const xml = readFileSync(plistPath, 'utf8');
  // O Expo grava a chave e o valor em linhas separadas: <key>...</key>\n\t<false/>
  const its = /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<(true|false)\s*\/>/.exec(xml);
  if (!its) {
    fail(`[Info.plist] Esperado: <key>ITSAppUsesNonExemptEncryption</key> seguido de <false/> em ${rel(plistPath)}. A chave está ausente (ou não é booleana).`);
  } else if (its[1] !== 'false') {
    fail(`[Info.plist] Esperado: ITSAppUsesNonExemptEncryption = false em ${rel(plistPath)}. Veio: ${its[1]}. Confira ios.infoPlist no app.json.`);
  } else {
    ok(`ITSAppUsesNonExemptEncryption = false (${rel(plistPath)})`);
  }
}

// 5) Podfile
const podfile = path.join(iosDir, 'Podfile');
if (!existsSync(podfile)) {
  fail('[Podfile] Esperado: ios/Podfile. O arquivo não existe.');
} else {
  const text = readFileSync(podfile, 'utf8');
  if (text.trim().length === 0) {
    fail('[Podfile] Esperado: ios/Podfile com conteúdo. O arquivo está vazio.');
  } else if (!text.includes('use_expo_modules!')) {
    fail('[Podfile] Esperado: uma linha "use_expo_modules!" (autolinking dos módulos Expo) em ios/Podfile. Não encontrei.');
  } else {
    ok('Podfile com use_expo_modules!');
  }
}

// 6) URL scheme do login com Google (só com Firebase): o esquema do Info.plist precisa ser o REVERSED_CLIENT_ID
const needGoogle = process.argv.includes('--require-google') || process.env.FIREBASE_ENABLED === 'true';
if (needGoogle) {
  if (!plistPath) {
    fail('[Google URL scheme] Esperado: o Info.plist com o URL scheme do Google; o Info.plist não foi encontrado.');
  } else {
    const xml = readFileSync(plistPath, 'utf8');
    // O Expo grava um <dict> por tipo de URL (o do app e o do Google): lê TODOS os arrays CFBundleURLSchemes, não só o primeiro.
    const schemes = [...xml.matchAll(/<key>CFBundleURLSchemes<\/key>\s*<array>([\s\S]*?)<\/array>/g)]
      .flatMap((m) => [...m[1].matchAll(/<string>([^<]+)<\/string>/g)].map((x) => x[1]));
    const google = schemes.filter((v) => v.startsWith('com.googleusercontent.apps.'));
    // o plist do Firebase é copiado para ios/<Nome>/ pelo prebuild; se estiver lá, o esquema precisa ser IGUAL ao REVERSED_CLIENT_ID
    const firebasePlist = path.join(path.dirname(plistPath), 'GoogleService-Info.plist');
    let reversed = '';
    if (existsSync(firebasePlist)) reversed = /<key>REVERSED_CLIENT_ID<\/key>\s*<string>([^<]+)<\/string>/.exec(readFileSync(firebasePlist, 'utf8'))?.[1] || '';
    if (google.length === 0) {
      fail(`[Google URL scheme] Esperado: um esquema com.googleusercontent.apps.* em CFBundleURLSchemes de ${rel(plistPath)} (o REVERSED_CLIENT_ID do GoogleService-Info.plist). Não há. Sem ele o login com Google não volta ao app. Confira se o plist tem REVERSED_CLIENT_ID (baixado depois de ativar o Google no Firebase) e docs/pendencias-usuario.md.`);
    } else if (reversed && !google.includes(reversed)) {
      fail(`[Google URL scheme] O esquema do Info.plist não é igual ao REVERSED_CLIENT_ID do GoogleService-Info.plist usado no build. Os valores não são impressos; rode o prebuild de novo com o plist certo.`);
    } else {
      ok(`URL scheme do Google presente em ${rel(plistPath)}${reversed ? ' (igual ao REVERSED_CLIENT_ID)' : ''}`);
    }
  }
}

// 7) HealthKit (só leitura). Com a flag: entitlement e texto de leitura presentes e nada de escrita, background delivery ou registros
//    clínicos. Sem a flag: nenhuma chave de saúde (o iOS gerado fica idêntico ao de antes).
{
  const hkOn = process.argv.includes('--require-healthkit') || process.env.HEALTH_INTEGRATION_ENABLED === 'true';
  const infoXml = plistPath ? readFileSync(plistPath, 'utf8') : '';
  const entPath = plistPath ? path.join(path.dirname(plistPath), path.basename(path.dirname(plistPath)) + '.entitlements') : null;
  const entXml = entPath && existsSync(entPath) ? readFileSync(entPath, 'utf8') : '';
  const hasKey = (xml, key) => new RegExp('<key>' + key.replace(/\./g, '\\.') + '</key>').test(xml);
  if (hkOn) {
    if (!hasKey(entXml, 'com.apple.developer.healthkit') || !/<key>com\.apple\.developer\.healthkit<\/key>\s*<true\s*\/>/.test(entXml)) {
      fail(`[HealthKit] Esperado: o entitlement com.apple.developer.healthkit = true em ${entPath ? rel(entPath) : 'ios/<Nome>/<Nome>.entitlements'}. Não há. Rode o prebuild com HEALTH_INTEGRATION_ENABLED=true (plugins/withHealthKitOptional.js).`);
    } else ok('entitlement com.apple.developer.healthkit presente');
    if (!/<key>NSHealthShareUsageDescription<\/key>\s*<string>[^<]{10,}<\/string>/.test(infoXml)) {
      fail(`[HealthKit] Esperado: NSHealthShareUsageDescription com texto em ${plistPath ? rel(plistPath) : 'Info.plist'}.`);
    } else ok('NSHealthShareUsageDescription presente');
    for (const [xml, key, why] of [
      [infoXml, 'NSHealthUpdateUsageDescription', 'o app só lê (nunca escreve no HealthKit)'],
      [entXml, 'com.apple.developer.healthkit.background-delivery', 'sem background delivery'],
      [entXml, 'com.apple.developer.healthkit.access', 'sem registros clínicos (health-records)'],
    ]) {
      if (hasKey(xml, key)) fail(`[HealthKit] ${key} não deveria existir: ${why}.`);
    }
  } else {
    for (const [xml, key] of [[entXml, 'com.apple.developer.healthkit'], [infoXml, 'NSHealthShareUsageDescription'], [infoXml, 'NSHealthUpdateUsageDescription']]) {
      if (hasKey(xml, key)) fail(`[HealthKit] ${key} existe, mas HEALTH_INTEGRATION_ENABLED não está ligada: o iOS gerado deveria ser idêntico ao de antes.`);
    }
  }
}

if (errors.length > 0) {
  console.log(`\n${errors.length} checagem(ns) do projeto iOS falharam.`);
  process.exit(1);
}
console.log('\nProjeto iOS conferido: todas as checagens passaram.');
