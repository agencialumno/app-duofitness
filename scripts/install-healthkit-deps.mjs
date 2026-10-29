// Instala os módulos nativos do HealthKit (iOS) SÓ quando HEALTH_INTEGRATION_ENABLED=true.
// Sem a flag, não faz nada: o build normal não tem esses módulos (package.json e lockfile do repositório não mudam).
// Mesmo mecanismo de install-firebase-deps.mjs (leia lá o porquê de gravar no package.json do workspace).
//
// IMPORTANTE: o autolinking (Expo e React Native CLI) só enxerga o que está em dependencies do package.json da RAIZ.
// Por isso a instalação GRAVA no package.json e no lockfile DO WORKSPACE (no CI, o runner é descartado; nada é commitado).
// --no-save NÃO serve: o módulo ficaria em node_modules, mas fora do autolinking e fora do app.
//
// Versões:
//  - todos com versão EXATA em healthkit/native-deps.json (a biblioteca, o core e o react-native-nitro-modules).
//
// Ordem esperada no workflow: npm ci -> (firebase) -> ESTE script -> expo prebuild -> check-autolinking.
// Uso: node scripts/install-healthkit-deps.mjs [--dry-run] [--root <pasta>]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : undefined; };
const root = path.resolve(arg('--root') ?? path.join(here, '..'));
const enabled = String(process.env.HEALTH_INTEGRATION_ENABLED || '').trim().toLowerCase() === 'true';
const dry = process.argv.includes('--dry-run');

export const ORDER = 'npm ci -> install-healthkit-deps -> expo prebuild -> check-autolinking';

export function readConfig(file = path.join(root, 'healthkit/native-deps.json')) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

// Devolve [{ name, spec }] sem chutar versão: Expo = bundledNativeModules do SDK; demais = versão exata do arquivo.
export function resolveSpecs(config, bundled) {
  const specs = [];
  for (const name of config.expo || []) {
    const v = bundled?.[name];
    if (!v) throw new Error(`${name} não está em bundledNativeModules.json do SDK instalado (rode npm ci antes deste passo)`);
    specs.push({ name, spec: `${name}@${v}`, from: 'SDK' });
  }
  for (const [name, version] of Object.entries(config.pinned || {})) {
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`versão não fixada para ${name}: ${version}`);
    specs.push({ name, spec: `${name}@${version}`, from: 'fixa' });
  }
  return specs;
}

// Depois de instalar: cada módulo precisa estar em dependencies do package.json da raiz E resolvível no topo de node_modules.
export function verifyInstalled(rootDir, names) {
  const pkg = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const req = createRequire(path.join(rootDir, 'package.json'));
  const problems = [];
  for (const name of names) {
    if (!pkg.dependencies?.[name]) problems.push(`${name} não está em dependencies do package.json (o autolinking não o veria)`);
    try { req.resolve(`${name}/package.json`); } catch { problems.push(`${name} não está resolvível em node_modules`); }
  }
  return problems;
}

function main() {
  if (!enabled) {
    console.log('HEALTH_INTEGRATION_ENABLED desligada: nenhum módulo do HealthKit será instalado.');
    return;
  }
  const config = readConfig();
  const bundledPath = path.join(root, 'node_modules/expo/bundledNativeModules.json');
  let bundled = {};
  try { bundled = JSON.parse(readFileSync(bundledPath, 'utf8')); } catch { /* resolveSpecs explica */ }
  const specs = resolveSpecs(config, bundled);
  console.log('Módulos do HealthKit (gravados no package.json DESTE workspace, para o autolinking enxergar):');
  for (const s of specs) console.log(`  - ${s.spec} (${s.from})`);
  if (dry) { console.log(`Simulação: nada instalado. Ordem esperada: ${ORDER}`); return; }
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  execFileSync(npm, ['install', '--save-exact', '--no-audit', '--no-fund', '--ignore-scripts', ...specs.map((s) => s.spec)], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  const problems = verifyInstalled(root, specs.map((s) => s.name));
  if (problems.length) {
    for (const p of problems) console.error(`ERRO ${p}`);
    console.error(`Ordem esperada: ${ORDER}`);
    process.exit(1);
  }
  console.log('Instalação conferida: todos os módulos estão no package.json do workspace e resolvíveis.');
  console.log('Localmente, desfaça com: git checkout package.json package-lock.json && npm prune');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
