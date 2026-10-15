// scripts/ios-log-hints.mjs (na raiz do app) rodado como processo externo contra logs de exemplo.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = path.resolve(__dirname, '../../scripts/ios-log-hints.mjs');

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'ios-hints-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function hints(log: string) {
  const file = path.join(dir, 'x.log');
  writeFileSync(file, log);
  const r = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true' } });
  return { code: r.status, out: r.stdout };
}

describe('ios-log-hints.mjs', () => {
  it('cloud signing sem permissão: manda gerar chave com papel ADMIN', () => {
    const r = hints('error: Cloud signing permission error\n');
    expect(r.code).toBe(0);
    expect(r.out).toContain('papel ADMIN');
    expect(r.out).toContain('APPSTORE_KEY_ID');
  });

  it('time sem dispositivos', () => {
    const r = hints('error: Communication with Apple failed\nYour team has no devices from which to generate a provisioning profile.\n');
    expect(r.code).toBe(0);
    expect(r.out).toContain('não tem dispositivos registrados');
  });

  it('falha de autenticação da chave', () => {
    const r = hints('error: Invalid authentication key credential specified (CryptoKit.CryptoKitASN1Error.invalidPEMDocument)\n');
    expect(r.code).toBe(0);
    expect(r.out).toContain('não conseguiu autenticar com a chave da API');
  });

  it('perfil não encontrado', () => {
    const r = hints("error: No profiles for 'com.duofitness.app' were found\n");
    expect(r.code).toBe(0);
    expect(r.out).toContain('perfil de provisionamento');
  });

  it('SDK antigo (ITMS-90725): explica a regra do Xcode 26 e repete o código ITMS', () => {
    const r = hints('ITMS-90725: SDK Version Issue - This app was built with the iOS 18 SDK.\n');
    expect(r.code).toBe(0);
    expect(r.out).toContain('Xcode 26+');
    expect(r.out).toContain('::error::Apple: ITMS-90725');
  });

  it('build number repetido', () => {
    const r = hints('ITMS-90189: Redundant Binary Upload. You have already uploaded a build with build number 3\n');
    expect(r.code).toBe(0);
    expect(r.out).toContain('run_number');
  });

  it('não imprime linhas cruas do log nem segredos', () => {
    const r = hints('error: Cloud signing permission error\nkey path /Users/runner/work/_temp/AuthKey_ABCDE12345.p8 issuer 69a6de70-0000-0000-0000-000000000000\n');
    expect(r.out).not.toContain('AuthKey_ABCDE12345');
    expect(r.out).not.toContain('69a6de70');
  });

  it('log sem causa conhecida: exit 1 e orientação para o artifact', () => {
    const r = hints('nada conhecido aqui\n');
    expect(r.code).toBe(1);
    expect(r.out).toContain('xcodebuild-logs');
  });

  it('arquivo inexistente: erro, sem quebrar', () => {
    const r = spawnSync(process.execPath, [SCRIPT, path.join(dir, 'nao-existe.log')], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true' } });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('Não consegui ler o log');
  });
});
