// Confere que o autolinking do Expo (Android) liga os módulos nativos que o app precisa.
//
// O autolinking só enxerga node_modules do TOPO. No SDK 52 o npm deixou expo-file-system e
// expo-keep-awake aninhados em node_modules/expo/node_modules: eles ficaram de fora do app,
// o expo-asset não conseguiu gravar a fonte no cache e os ícones sumiram. Esta checagem
// falha em segundos se isso se repetir (por exemplo, depois de um salto de SDK).
//
// Também confere que pacotes que o Babel/Metro resolvem a partir da RAIZ do projeto (hoje só
// babel-preset-expo, citado no babel.config.js) estão no topo de node_modules. No SDK 54 ele
// ficou aninhado em node_modules/expo/node_modules e o "expo export" quebrou com
// "Cannot find module 'babel-preset-expo'".
//
// Uso:  node scripts/check-autolinking.mjs [--platform android|ios] [--root <pasta do app>] [--from-json <arquivo>]
//                                          [--rn-config-json <arquivo>]
//   --platform   plataforma do autolinking a conferir (padrão: android). O ios.yml usa --platform ios.
//   --from-json  lê a saída do "expo-modules-autolinking resolve --json" de um arquivo
//                (usado nos testes) em vez de executar o comando.
//   --rn-config-json  idem para "expo-modules-autolinking react-native-config --json" (módulos do React Native CLI).
//
// Com FIREBASE_ENABLED=true também exige os módulos de conta. ATENÇÃO: o autolinking só enxerga o que está em
// dependencies do package.json da RAIZ; por isso scripts/install-firebase-deps.mjs grava lá (no workspace do CI).
// Ordem esperada no workflow: npm ci -> firebase-prepare -> install-firebase-deps -> expo prebuild -> check-autolinking.
// Sem a flag, nada de conta é exigido e esta checagem é a de sempre.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

// Módulos de conta (Firebase, Google e Apple): NÃO fazem parte do package.json do repositório. O workflow os instala com
// scripts/install-firebase-deps.mjs só quando FIREBASE_ENABLED=true; nesse caso esta checagem os exige.
const FIREBASE_ON = String(process.env.FIREBASE_ENABLED || '').trim().toLowerCase() === 'true';
// Módulos do Expo por plataforma (o expo-apple-authentication só existe no iOS: o autolinking do Android nunca o lista).
const FIREBASE_EXPO_MODULES = { android: ['expo-crypto'], ios: ['expo-apple-authentication', 'expo-crypto'] };
// Módulos do React Native CLI (autolinking de react-native-config) nas duas plataformas.
const FIREBASE_RN_MODULES = ['@react-native-firebase/app', '@react-native-firebase/auth', '@react-native-google-signin/google-signin'];
// Config plugins (resolvidos a partir da raiz).
const FIREBASE_ROOT_PACKAGES = [...FIREBASE_RN_MODULES, 'expo-apple-authentication', 'expo-crypto', 'expo-build-properties'];
const ORDER = 'npm ci -> firebase-prepare -> install-firebase-deps -> expo prebuild -> check-autolinking';

const BASE_REQUIRED = ['expo-file-system', 'expo-asset', 'expo-font', 'expo-keep-awake', 'expo-video'];
// Resolvidos pelo Babel/Metro a partir da raiz do projeto.
const RESOLVABLE_FROM_ROOT = ['babel-preset-expo', ...(FIREBASE_ON ? FIREBASE_ROOT_PACKAGES : [])];

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const root = path.resolve(arg('--root') ?? process.cwd());
const platform = arg('--platform') ?? 'android';
if (!['android', 'ios'].includes(platform)) {
  console.log(`ERRO  --platform deve ser android ou ios (recebi "${platform}")`);
  process.exit(1);
}
const REQUIRED = [...BASE_REQUIRED, ...(FIREBASE_ON ? FIREBASE_EXPO_MODULES[platform] : [])];
const PLATFORM_LABEL = platform === 'ios' ? 'iOS' : 'Android';
const onGithub = process.env.GITHUB_ACTIONS === 'true';
const error = (msg) => console.log(onGithub ? `::error::${msg}` : `ERRO  ${msg}`);

function resolveJson() {
  const file = arg('--from-json');
  if (file) return readFileSync(path.resolve(file), 'utf8');

  // O binário vem do pacote expo-modules-autolinking (dependência do expo).
  const fromRoot = createRequire(path.join(root, 'package.json'));
  let bin;
  try {
    bin = fromRoot.resolve('expo-modules-autolinking/bin/expo-modules-autolinking.js');
  } catch {
    const fromExpo = createRequire(path.join(root, 'node_modules', 'expo', 'package.json'));
    bin = fromExpo.resolve('expo-modules-autolinking/bin/expo-modules-autolinking.js');
  }
  return execFileSync(process.execPath, [bin, 'resolve', '--platform', platform, '--json'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

let linked;
try {
  const out = resolveJson();
  const parsed = JSON.parse(out.slice(out.indexOf('{')));
  linked = (parsed.modules ?? []).map((m) => m.packageName).sort();
} catch (e) {
  error(`não consegui obter a lista do autolinking: ${String(e.message).split('\n')[0]}`);
  process.exit(1);
}

const missing = REQUIRED.filter((name) => !linked.includes(name));
console.log(`Autolinking ${PLATFORM_LABEL}: ${linked.length} módulo(s): ${linked.join(', ')}`);

if (missing.length > 0) {
  for (const name of missing) {
    const nested = path.join(root, 'node_modules', 'expo', 'node_modules', name);
    let inPackageJson = false;
    try { inPackageJson = !!JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).dependencies?.[name]; } catch { /* sem package.json */ }
    const installed = existsSync(path.join(root, 'node_modules', name, 'package.json'));
    const isAccount = FIREBASE_ON && FIREBASE_EXPO_MODULES[platform].includes(name);
    const where = existsSync(nested)
      ? 'está aninhado em node_modules/expo/node_modules (o autolinking não vê)'
      : installed && !inPackageJson
        ? 'está em node_modules, mas NÃO em dependencies do package.json (o autolinking só enxerga o package.json da raiz)'
        : 'não está instalado';
    const fix = isAccount
      ? 'Rode node scripts/install-firebase-deps.mjs ANTES do prebuild e desta checagem.'
      : `Rode: npx expo install ${name}`;
    error(`${name} não está no autolinking${isAccount ? ` (${platform})` : ''}: ${where}. ${fix}`);
  }
  if (FIREBASE_ON) console.log(`Ordem esperada dos passos com Firebase: ${ORDER}`);
  process.exit(1);
}

console.log(`Módulos obrigatórios presentes: ${REQUIRED.join(', ')}`);

// Com Firebase: os módulos do React Native CLI (RN Firebase e Google Sign-In) também precisam estar ligados nesta plataforma.
if (FIREBASE_ON) {
  let rnDeps;
  try {
    const file = arg('--rn-config-json');
    let out;
    if (file) out = readFileSync(path.resolve(file), 'utf8');
    else {
      const fromRoot2 = createRequire(path.join(root, 'package.json'));
      let bin2;
      try { bin2 = fromRoot2.resolve('expo-modules-autolinking/bin/expo-modules-autolinking.js'); } catch {
        bin2 = createRequire(path.join(root, 'node_modules', 'expo', 'package.json')).resolve('expo-modules-autolinking/bin/expo-modules-autolinking.js');
      }
      out = execFileSync(process.execPath, [bin2, 'react-native-config', '--platform', platform, '--json'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    }
    rnDeps = JSON.parse(out.slice(out.indexOf('{'))).dependencies ?? {};
  } catch (e) {
    error(`não consegui obter o autolinking do React Native CLI (${platform}): ${String(e.message).split('\n')[0]}`);
    console.log(`Ordem esperada dos passos com Firebase: ${ORDER}`);
    process.exit(1);
  }
  const rnMissing = FIREBASE_RN_MODULES.filter((name) => !rnDeps[name]?.platforms?.[platform]);
  if (rnMissing.length > 0) {
    for (const name of rnMissing) {
      error(`${name} não está no autolinking do React Native CLI (${platform}). Rode node scripts/install-firebase-deps.mjs ANTES do prebuild e desta checagem (o autolinking só enxerga o package.json da raiz).`);
    }
    console.log(`Ordem esperada dos passos com Firebase: ${ORDER}`);
    process.exit(1);
  }
  console.log(`Módulos do React Native CLI presentes (${PLATFORM_LABEL}): ${FIREBASE_RN_MODULES.join(', ')}`);
}

// Pacotes resolvíveis a partir da raiz (não aninhados).
const fromRoot = createRequire(path.join(root, 'package.json'));
const unresolved = RESOLVABLE_FROM_ROOT.filter((name) => {
  try {
    fromRoot.resolve(`${name}/package.json`);
    return false;
  } catch {
    return true;
  }
});
if (unresolved.length > 0) {
  for (const name of unresolved) {
    const nested = path.join(root, 'node_modules', 'expo', 'node_modules', name);
    const where = existsSync(nested)
      ? 'está aninhado em node_modules/expo/node_modules (o Babel não encontra a partir da raiz)'
      : 'não está instalado';
    error(`${name} ${where}. Rode: npx expo install ${name}`);
  }
  process.exit(1);
}
console.log(`Resolvíveis a partir da raiz: ${RESOLVABLE_FROM_ROOT.join(', ')}`);
