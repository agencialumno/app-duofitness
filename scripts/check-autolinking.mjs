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
// Uso:  node scripts/check-autolinking.mjs [--root <pasta do app>] [--from-json <arquivo>]
//   --from-json  lê a saída do "expo-modules-autolinking resolve --json" de um arquivo
//                (usado nos testes) em vez de executar o comando.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const REQUIRED = ['expo-file-system', 'expo-asset', 'expo-font', 'expo-keep-awake', 'expo-video'];
// Resolvidos pelo Babel/Metro a partir da raiz do projeto.
const RESOLVABLE_FROM_ROOT = ['babel-preset-expo'];

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const root = path.resolve(arg('--root') ?? process.cwd());
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
  return execFileSync(process.execPath, [bin, 'resolve', '--platform', 'android', '--json'], {
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
console.log(`Autolinking Android: ${linked.length} módulo(s): ${linked.join(', ')}`);

if (missing.length > 0) {
  for (const name of missing) {
    const nested = path.join(root, 'node_modules', 'expo', 'node_modules', name);
    const where = existsSync(nested)
      ? 'está aninhado em node_modules/expo/node_modules (o autolinking não vê)'
      : 'não está instalado';
    error(`${name} não está no autolinking: ${where}. Rode: npx expo install ${name}`);
  }
  process.exit(1);
}

console.log(`Módulos obrigatórios presentes: ${REQUIRED.join(', ')}`);

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
