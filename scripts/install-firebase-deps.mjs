// Instala os módulos nativos de conta (Firebase, Google Sign-In, Apple) SÓ quando FIREBASE_ENABLED=true.
// Sem a flag, não faz nada: o build normal não tem esses módulos (idêntico ao de antes).
// Versões exatas em firebase/native-deps.json. Usa --no-save: package.json e package-lock.json não mudam.
// Uso: node scripts/install-firebase-deps.mjs [--dry-run]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const enabled = String(process.env.FIREBASE_ENABLED || '').trim().toLowerCase() === 'true';
const dry = process.argv.includes('--dry-run');

export function readDeps(file = path.join(root, 'firebase/native-deps.json')) {
  const { dependencies } = JSON.parse(readFileSync(file, 'utf8'));
  const specs = Object.entries(dependencies).map(([name, version]) => {
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`versão não fixada para ${name}: ${version}`);
    return `${name}@${version}`;
  });
  return specs;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!enabled) {
    console.log('FIREBASE_ENABLED desligada: nenhum módulo de conta será instalado.');
  } else {
    const specs = readDeps();
    console.log(`Instalando (sem alterar package.json): ${specs.join(' ')}`);
    if (!dry) {
      const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      execFileSync(npm, ['install', '--no-save', '--no-audit', '--no-fund', '--ignore-scripts', ...specs], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
    }
  }
}
