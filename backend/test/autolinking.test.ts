// scripts/check-autolinking.mjs (na raiz do app) rodado como processo externo, com a saída do
// "expo-modules-autolinking resolve" simulada por arquivos temporários.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = path.resolve(__dirname, '../../scripts/check-autolinking.mjs');
const REPO_ROOT = path.resolve(__dirname, '../..');

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'check-autolinking-'));
  // babel-preset-expo no topo de node_modules (o caso normal)
  mkdirSync(path.join(dir, 'node_modules', 'babel-preset-expo'), { recursive: true });
  writeFileSync(path.join(dir, 'node_modules', 'babel-preset-expo', 'package.json'), '{"name":"babel-preset-expo","version":"0.0.0"}');
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function run(modules: string[], extraArgs: string[] = [], env: Record<string, string> = {}) {
  const file = path.join(dir, 'resolve.json');
  writeFileSync(file, JSON.stringify({ modules: modules.map((packageName) => ({ packageName })) }));
  const r = spawnSync(process.execPath, [SCRIPT, '--root', dir, '--from-json', file, ...extraArgs], {
    encoding: 'utf8',
    env: { ...process.env, GITHUB_ACTIONS: 'true', ...env },
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const ALL = ['expo', 'expo-asset', 'expo-constants', 'expo-file-system', 'expo-font', 'expo-keep-awake', 'expo-modules-core'];

describe('check-autolinking.mjs', () => {
  it('passa quando os 4 módulos obrigatórios estão no autolinking', () => {
    const r = run(ALL);
    expect(r.code).toBe(0);
    expect(r.out).toContain('Módulos obrigatórios presentes: expo-file-system, expo-asset, expo-font, expo-keep-awake');
    expect(r.out).not.toContain('::error');
  });

  it.each(['expo-file-system', 'expo-asset', 'expo-font', 'expo-keep-awake'])('falha quando falta %s e diz como corrigir', (missing) => {
    const r = run(ALL.filter((m) => m !== missing));
    expect(r.code).toBe(1);
    expect(r.out).toContain(`::error::${missing} não está no autolinking`);
    expect(r.out).toContain(`npx expo install ${missing}`);
  });

  it('lista todos os módulos que faltam, não só o primeiro', () => {
    const r = run(['expo', 'expo-font']);
    expect(r.code).toBe(1);
    for (const m of ['expo-file-system', 'expo-asset', 'expo-keep-awake']) expect(r.out).toContain(`::error::${m} `);
    expect(r.out).not.toContain('::error::expo-font ');
  });

  it('reconhece o caso real do SDK 52: módulo aninhado em node_modules/expo/node_modules', () => {
    mkdirSync(path.join(dir, 'node_modules', 'expo', 'node_modules', 'expo-file-system'), { recursive: true });
    const r = run(ALL.filter((m) => m !== 'expo-file-system'));
    expect(r.code).toBe(1);
    expect(r.out).toContain('expo-file-system não está no autolinking: está aninhado em node_modules/expo/node_modules');
  });

  it('falha quando babel-preset-expo não está no topo de node_modules (aninhado no expo)', () => {
    rmSync(path.join(dir, 'node_modules', 'babel-preset-expo'), { recursive: true, force: true });
    mkdirSync(path.join(dir, 'node_modules', 'expo', 'node_modules', 'babel-preset-expo'), { recursive: true });
    const r = run(ALL);
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::babel-preset-expo está aninhado em node_modules/expo/node_modules');
    expect(r.out).toContain('npx expo install babel-preset-expo');
  });

  it('falha quando babel-preset-expo não está instalado', () => {
    rmSync(path.join(dir, 'node_modules', 'babel-preset-expo'), { recursive: true, force: true });
    const r = run(ALL);
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::babel-preset-expo não está instalado');
  });

  it('fora do GitHub a saída é legível (ERRO) e o código de saída continua valendo', () => {
    const r = run(['expo'], [], { GITHUB_ACTIONS: '' });
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/ERRO\s+expo-file-system não está no autolinking/);
  });

  it('JSON inválido: falha com mensagem clara', () => {
    writeFileSync(path.join(dir, 'ruim.json'), 'isto não é json');
    const r = spawnSync(process.execPath, [SCRIPT, '--root', dir, '--from-json', path.join(dir, 'ruim.json')], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true' } });
    expect(r.status).toBe(1);
    expect(`${r.stdout}${r.stderr}`).toContain('não consegui obter a lista do autolinking');
  });

  // O projeto real só tem node_modules na raiz depois de "npm ci" no app (o job backend do CI não faz).
  it.skipIf(!existsSync(path.join(REPO_ROOT, 'node_modules', 'expo-modules-autolinking')))('o projeto real passa (autolinking de verdade)', () => {
    const r = spawnSync(process.execPath, [SCRIPT, '--root', REPO_ROOT], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true' } });
    expect(`${r.stdout}${r.stderr}`).not.toContain('::error');
    expect(r.status).toBe(0);
  });
});
