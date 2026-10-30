// Instala o módulo nativo do Health Connect (Android) SÓ quando HEALTH_INTEGRATION_ENABLED=true.
// Sem a flag, não faz nada: o build normal não tem o módulo (package.json e lockfile do repositório não mudam).
// Mesmo mecanismo de install-healthkit-deps.mjs (leia lá por que a instalação grava no package.json do workspace do CI e não usa --no-save).
// Ordem esperada no android.yml: npm ci -> (firebase) -> ESTE script -> expo prebuild -> check-autolinking.
// Uso: node scripts/install-healthconnect-deps.mjs [--dry-run] [--root <pasta>]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSpecs, verifyInstalled } from './install-healthkit-deps.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : undefined; };
const root = path.resolve(arg('--root') ?? path.join(here, '..'));
const enabled = String(process.env.HEALTH_INTEGRATION_ENABLED || '').trim().toLowerCase() === 'true';
const dry = process.argv.includes('--dry-run');

export const ORDER = 'npm ci -> install-healthconnect-deps -> expo prebuild -> check-autolinking';
export { resolveSpecs, verifyInstalled };

export function readConfig(file = path.join(root, 'healthconnect/native-deps.json')) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function main() {
  if (!enabled) {
    console.log('HEALTH_INTEGRATION_ENABLED desligada: nenhum módulo do Health Connect será instalado.');
    return;
  }
  const config = readConfig();
  let bundled = {};
  try { bundled = JSON.parse(readFileSync(path.join(root, 'node_modules/expo/bundledNativeModules.json'), 'utf8')); } catch { /* resolveSpecs explica */ }
  const specs = resolveSpecs(config, bundled);
  console.log('Módulos do Health Connect (gravados no package.json DESTE workspace, para o autolinking enxergar):');
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
  console.log('Instalação conferida: o módulo está no package.json do workspace e resolvível.');
  console.log('Localmente, desfaça com: git checkout package.json package-lock.json && npm prune');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
