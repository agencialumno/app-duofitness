// Passo "Validar keystore" do android.yml sob "bash -e" (o shell dos passos do Actions) com um keytool
// FALSO. Garante que o erro do keytool é classificado em vez de encerrar o passo em silêncio.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const ANDROID_YML = path.resolve(__dirname, '../../.github/workflows/android.yml');
const hasBash = spawnSync('bash', ['--version']).status === 0;
const px = (p: string) => p.split(path.sep).join('/');

function extractRun(yml: string, stepName: string): string {
  const lines = yml.split(/\r?\n/);
  const start = lines.findIndex((l) => l.includes('- name: ') && l.includes(stepName));
  if (start < 0) throw new Error(`passo não encontrado: ${stepName}`);
  const runIdx = lines.findIndex((l, i) => i > start && /^\s+run: \|\s*$/.test(l));
  const indent = lines[runIdx]!.match(/^(\s+)run:/)![1]!.length + 2;
  const body: string[] = [];
  for (let i = runIdx + 1; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.trim() !== '' && l.search(/\S/) < indent) break;
    body.push(l.length >= indent ? l.slice(indent) : '');
  }
  return body.join('\n');
}

let work: string;
beforeEach(() => {
  work = mkdtempSync(path.join(tmpdir(), 'android-keystore-'));
  mkdirSync(path.join(work, 'tmp'), { recursive: true });
  writeFileSync(path.join(work, 'summary.md'), '');
  writeFileSync(path.join(work, 'release.keystore'), Buffer.from([0x30, 0x82, 0x01, 0x02])); // começa como PKCS12
});
afterEach(() => rmSync(work, { recursive: true, force: true }));

const FAKE_KEYTOOL = `
keytool() {
  case "$FAKE_KEYTOOL" in
    ok) return 0 ;;
    storepass) echo "keytool error: java.io.IOException: keystore password was incorrect"; return 1 ;;
    alias) echo "keytool error: java.lang.Exception: Alias <x> does not exist"; return 1 ;;
    keypass) echo "keytool error: java.security.UnrecoverableKeyException: Cannot recover key"; return 1 ;;
    format) echo "keytool error: java.security.KeyStoreException: Unrecognized keystore format"; return 1 ;;
  esac
}
`;

function run(scenario: string, keyPassword = 'senha') {
  const file = path.join(work, 'step.sh');
  writeFileSync(file, `${FAKE_KEYTOOL}\n${extractRun(readFileSync(ANDROID_YML, 'utf8'), 'Validar keystore')}\n`);
  // "bash -e {0}": o shell padrão dos passos "run" do GitHub Actions (errexit LIGADO)
  const r = spawnSync('bash', ['-e', px(file)], {
    cwd: work,
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_ACTIONS: 'true',
      RUNNER_TEMP: px(path.join(work, 'tmp')),
      GITHUB_STEP_SUMMARY: px(path.join(work, 'summary.md')),
      ANDROID_KEYSTORE_FILE: px(path.join(work, 'release.keystore')),
      ANDROID_KEY_ALIAS: 'duofitness',
      ANDROID_KEYSTORE_PASSWORD: 'senha',
      ANDROID_KEY_PASSWORD: keyPassword,
      FAKE_KEYTOOL: scenario,
    },
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

describe.skipIf(!hasBash)('android.yml: passo "Validar keystore" sob bash -e', () => {
  it('keystore válido passa', () => {
    const r = run('ok');
    expect(r.code).toBe(0);
    expect(r.out).toContain('Keystore válido (tipo PKCS12)');
  });

  it.each([
    ['storepass', 'ANDROID_KEYSTORE_PASSWORD'],
    ['alias', 'ANDROID_KEY_ALIAS'],
    ['keypass', 'ANDROID_KEY_PASSWORD'],
    ['format', 'ANDROID_KEYSTORE_BASE64'],
  ])('erro do keytool (%s) é classificado e aponta o secret %s', (scenario, secret) => {
    const r = run(scenario);
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::');
    expect(r.out).toContain(secret);
    expect(r.out).not.toContain('keystore password was incorrect'); // a saída crua do keytool nunca é impressa
  });

  it('PKCS12 com senhas diferentes: mensagem pedida, apontando ANDROID_KEY_PASSWORD', () => {
    const r = run('ok', 'outra-senha');
    expect(r.code).toBe(1);
    expect(r.out).toContain('Em keystore PKCS12 as senhas do keystore e da chave precisam ser iguais.');
  });
});
