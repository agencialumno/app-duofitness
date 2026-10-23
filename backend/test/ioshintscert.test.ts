// ios-log-hints: limite de certificados da conta Apple (a dica antiga "use uma chave Admin" estava errada nesse caso).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = path.resolve(__dirname, '../../scripts/ios-log-hints.mjs');
let dir: string;
beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), 'ios-cert-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function run(log: string) {
  const f = path.join(dir, 'archive.log');
  writeFileSync(f, log);
  const r = spawnSync(process.execPath, [SCRIPT, f], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true', GITHUB_STEP_SUMMARY: '' } });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const LOG_REAL = [
  'error: Choose a certificate to revoke. Your account has reached the maximum number of certificates. (in target \'DuoFitness\' from project \'DuoFitness\')',
  "error: No profiles for 'com.duofitness.app' were found: Xcode couldn't find any iOS App Development provisioning profiles matching 'com.duofitness.app'. (in target 'DuoFitness' from project 'DuoFitness')",
  '** ARCHIVE FAILED **',
].join('\n');

describe('limite de certificados', () => {
  it('classifica com a causa (um certificado de desenvolvimento novo por execução) e a ação segura', () => {
    const r = run(LOG_REAL);
    expect(r.code).toBe(0);
    expect(r.out).toContain('CAUSA: a conta Apple atingiu o limite de certificados');
    expect(r.out).toContain('Cada execução do CI roda num runner novo');
    expect(r.out).toContain('certificado de DESENVOLVIMENTO novo ("Created via API") por execução');
    expect(r.out).toContain('AÇÃO: revogue manualmente');
    expect(r.out).toContain('developer.apple.com > Certificates');
    expect(r.out).toContain('SÓ os certificados de tipo Development "Created via API"');
    expect(r.out).toContain('sem tocar nos Distribution nem no "Distribution Managed"');
    expect(r.out).toContain('confira antes se outro pipeline da conta os usa');
    expect(r.out).toContain('sign_archive=true');
  });

  it('NÃO sugere trocar o papel da chave (e suprime a dica antiga do perfil e a do cloud signing)', () => {
    const r = run(LOG_REAL);
    expect(r.out).toContain('NÃO adianta trocar o papel da chave');
    expect(r.out).not.toContain('use uma chave com papel Admin');
    expect(r.out).not.toContain('Não foi possível obter o perfil de provisionamento'); // consequência, suprimida
    expect(r.out).not.toContain('A chave da API não tem permissão para o cloud signing');
    expect(r.out.match(/::error::/g)).toHaveLength(1);
  });

  it('reconhece cada frase sozinha', () => {
    for (const l of ['Choose a certificate to revoke.', 'Your account has reached the maximum number of certificates.', 'reached the maximum number of development certificates']) {
      expect(run(`error: ${l}`).out, l).toContain('CAUSA: a conta Apple atingiu o limite de certificados');
    }
  });

  it('o erro de perfil SOZINHO continua com a dica, mas sem empurrar a troca de papel para quem já é Admin', () => {
    const r = run("error: No profiles for 'com.duofitness.app' were found");
    expect(r.out).toContain('Não foi possível obter o perfil de provisionamento');
    expect(r.out).toContain('Se a chave da API JÁ tem papel Admin, não troque o papel');
  });

  it('nunca imprime linhas cruas do log (nomes de certificados da conta)', () => {
    const r = run(`${LOG_REAL}\nerror: Apple Development: Fulano de Tal (ABCD1234) is not valid`);
    expect(r.out).not.toContain('Fulano de Tal');
    expect(r.out).not.toContain('ABCD1234');
  });
});
