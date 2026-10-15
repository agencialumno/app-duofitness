// scripts/ios-upload.sh (envio do .ipa verificado com altool) rodado com um xcrun FALSO.
// Cobre: validar antes de enviar, a chave só durante o script (API_PRIVATE_KEYS_DIR e
// ~/.appstoreconnect/private_keys), exit code não confiável do altool (Xcode 26), saída filtrada
// (nunca JWT nem chave), classificação dos erros e o fallback para o iTMSTransporter.
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO = path.resolve(__dirname, '../..');
const SCRIPT = path.join(REPO, 'scripts/ios-upload.sh');
const hasBash = spawnSync('bash', ['--version']).status === 0;
const px = (p: string) => p.split(path.sep).join('/');

const SECRET_KEY = '-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgSEGREDO\n-----END PRIVATE KEY-----\n';

// xcrun falso: "xcrun altool ..." e "xcrun iTMSTransporter ...". O comportamento vem de FAKE_*.
const FAKE_XCRUN = `#!/usr/bin/env bash
echo "$*" >> "$FAKE_CALLS"
tool="$1"; shift
if [ "$tool" = "altool" ]; then
  if [ "$1" = "--help" ]; then
    if [ "$FAKE_HELP" = "sem-upload-app" ]; then
      echo "usage: altool --upload-package --validate-app --notarize-app"
    else
      echo "usage: altool --validate-app --upload-app --upload-package --notarize-app"
    fi
    exit 0
  fi
  mode="$1"
  # no momento da chamada a chave precisa estar nos dois diretórios que o altool lê
  keyfile="AuthKey_$FAKE_EXPECT_KEYID.p8"
  [ -f "$API_PRIVATE_KEYS_DIR/$keyfile" ] && echo "API_PRIVATE_KEYS_DIR tem a chave" >> "$FAKE_CALLS"
  [ -f "$HOME/.appstoreconnect/private_keys/$keyfile" ] && echo "default dir tem a chave" >> "$FAKE_CALLS"
  case "$mode" in
    --validate-app) out="$FAKE_VALIDATE_OUT"; rc="\${FAKE_VALIDATE_RC:-0}" ;;
    --upload-app) out="$FAKE_UPLOAD_OUT"; rc="\${FAKE_UPLOAD_RC:-0}" ;;
  esac
  printf '%b\\n' "$out"
  exit "$rc"
fi
if [ "$tool" = "iTMSTransporter" ]; then
  printf '%b\\n' "\${FAKE_TRANSPORTER_OUT:-Transporter ok}"
  exit "\${FAKE_TRANSPORTER_RC:-0}"
fi
exit 1
`;

let work: string;
let home: string;
beforeEach(() => {
  work = mkdtempSync(path.join(tmpdir(), 'ios-upload-'));
  home = path.join(work, 'home');
  mkdirSync(home, { recursive: true });
  mkdirSync(path.join(work, 'tmp'), { recursive: true });
  writeFileSync(path.join(work, 'xcrun'), FAKE_XCRUN);
  chmodSync(path.join(work, 'xcrun'), 0o755);
  writeFileSync(path.join(work, 'AuthKey_SRC.p8'), SECRET_KEY);
  writeFileSync(path.join(work, 'app.ipa'), 'ipa');
  writeFileSync(path.join(work, 'calls.txt'), '');
  writeFileSync(path.join(work, 'summary.md'), '');
});
afterEach(() => rmSync(work, { recursive: true, force: true }));

function run(env: Record<string, string> = {}, args: string[] = []) {
  const r = spawnSync('bash', [px(SCRIPT), px(path.join(work, 'app.ipa')), ...args], {
    cwd: work,
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_ACTIONS: 'true',
      HOME: px(home),
      RUNNER_TEMP: px(path.join(work, 'tmp')),
      GITHUB_STEP_SUMMARY: px(path.join(work, 'summary.md')),
      XCRUN: px(path.join(work, 'xcrun')),
      APPSTORE_KEY_ID: 'KEY1234567',
      APPSTORE_ISSUER_ID: 'issuer-uuid',
      APPSTORE_KEY_PATH: px(path.join(work, 'AuthKey_SRC.p8')),
      FAKE_CALLS: px(path.join(work, 'calls.txt')),
      FAKE_EXPECT_KEYID: 'KEY1234567',
      FAKE_VALIDATE_OUT: 'No errors validating archive at app.ipa',
      FAKE_UPLOAD_OUT: 'No errors uploading app.ipa\\nRequestUUID: 1234',
      ...env,
    },
  });
  const calls = readFileSync(path.join(work, 'calls.txt'), 'utf8').split('\n').filter(Boolean);
  return { code: r.status, out: `${r.stdout}${r.stderr}`, calls, summary: readFileSync(path.join(work, 'summary.md'), 'utf8') };
}
const keyLeft = () => [path.join(work, 'tmp', 'altool-private-keys', 'AuthKey_KEY1234567.p8'), path.join(home, '.appstoreconnect', 'private_keys', 'AuthKey_KEY1234567.p8')].filter(existsSync);

describe.skipIf(!hasBash)('ios-upload.sh (altool)', () => {
  it('valida e depois envia o .ipa, com --type ios, --apiKey e --apiIssuer', () => {
    const r = run();
    expect(r.code).toBe(0);
    const altool = r.calls.filter((c) => c.startsWith('altool --') && !c.includes('--help'));
    expect(altool).toHaveLength(2);
    expect(altool[0]).toContain('--validate-app --type ios -f');
    expect(altool[1]).toContain('--upload-app --type ios -f');
    for (const c of altool) {
      expect(c).toContain('app.ipa');
      expect(c).toContain('--apiKey KEY1234567');
      expect(c).toContain('--apiIssuer issuer-uuid');
    }
    // a validação vem ANTES do envio
    expect(r.calls.findIndex((c) => c.includes('--validate-app'))).toBeLessThan(r.calls.findIndex((c) => c.includes('--upload-app')));
    expect(r.out).toContain('Envio ao App Store Connect: ok.');
    expect(r.summary).toContain('Enviado ao TestFlight');
  });

  it('a chave existe nos dois diretórios que o altool lê durante a chamada e é apagada depois', () => {
    const r = run();
    expect(r.calls).toContain('API_PRIVATE_KEYS_DIR tem a chave');
    expect(r.calls).toContain('default dir tem a chave');
    expect(keyLeft()).toEqual([]);
  });

  it('a chave também é apagada quando o envio falha', () => {
    const r = run({ FAKE_UPLOAD_OUT: '*** Error: Unable to upload', FAKE_UPLOAD_RC: '1' });
    expect(r.code).toBe(1);
    expect(keyLeft()).toEqual([]);
  });

  it('--validate-only (upload=false): valida e NÃO envia', () => {
    const r = run({}, ['--validate-only']);
    expect(r.code).toBe(0);
    expect(r.calls.some((c) => c.includes('--upload-app'))).toBe(false);
    expect(r.out).toContain('Validação do .ipa no App Store Connect: ok.');
    expect(r.out).not.toContain('Envio ao App Store Connect');
  });

  it('validação falha: não envia, devolve o código e classifica (acordo pendente)', () => {
    const r = run({ FAKE_VALIDATE_OUT: '*** Error: Unable to validate: a required agreement is missing or has expired', FAKE_VALIDATE_RC: '1' });
    expect(r.code).toBe(1);
    expect(r.calls.some((c) => c.includes('--upload-app'))).toBe(false);
    expect(r.out).toContain('::error::A validação do .ipa no App Store Connect falhou');
    expect(r.out).toContain('acordo pendente');
    expect(r.out).toContain('Account Holder');
  });

  it('REGRESSÃO (Xcode 26): altool sai com 0 mas imprime erro na saída → conta como falha', () => {
    const r = run({ FAKE_UPLOAD_OUT: '*** Error: Unable to upload app. (-19208)', FAKE_UPLOAD_RC: '0' });
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::O envio do .ipa ao App Store Connect falhou');
  });

  it('exit 0 sem a confirmação "No errors uploading": não dá o envio como feito', () => {
    const r = run({ FAKE_UPLOAD_OUT: 'Uploading app.ipa...', FAKE_UPLOAD_RC: '0' });
    expect(r.code).toBe(1);
    expect(r.out).toContain("sem a confirmação 'No errors uploading'");
    expect(r.out).not.toContain('Envio ao App Store Connect: ok.');
  });

  it.each([
    ['autenticação', 'Error: No Accounts with App Store Connect Access', 'não conseguiu autenticar'],
    ['credenciais inválidas', '*** Error: Authentication credentials are missing or invalid.', 'não conseguiu autenticar'],
    ['acordo pendente', '*** Error: Unable to upload: required agreement is missing or has expired', 'acordo pendente'],
    ['build number repetido', 'ERROR ITMS-90189: Redundant Binary Upload. The bundle version 3 has already been used', 'número do build já foi usado'],
    ['ícone inválido', 'ERROR ITMS-90022: Missing required icon file', 'recusou o ícone'],
    ['Info.plist inválido', 'ERROR ITMS-90056: Invalid Info.plist', 'recusou o Info.plist'],
  ])('erro de envio classificado: %s', (_n, text, hint) => {
    const r = run({ FAKE_UPLOAD_OUT: text, FAKE_UPLOAD_RC: '1' });
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::');
    expect(r.out).toContain(hint);
  });

  it('nunca imprime o JWT nem a chave, mesmo que o altool os escreva', () => {
    const jwt = 'eyJhbGciOiJFUzI1NiIsImtpZCI6IktFWSJ9.eyJpc3MiOiJpc3N1ZXIifQ.c2lnbmF0dXJl';
    const r = run({ FAKE_UPLOAD_OUT: `Authorization: Bearer ${jwt}\\n-----BEGIN PRIVATE KEY-----\\nMIGTAgEAMBMGB\\n-----END PRIVATE KEY-----\\nNo errors uploading app.ipa` });
    expect(r.code).toBe(0);
    expect(r.out).not.toContain(jwt);
    expect(r.out).not.toContain('eyJhbGciOi');
    expect(r.out).not.toContain('BEGIN PRIVATE KEY');
    expect(r.out).not.toContain('MIGTAgEAMBMGB');
    expect(r.out).toContain('[JWT omitido]');
  });

  it('sem --upload-app no altool deste Xcode: usa o iTMSTransporter (verify e upload) e avisa', () => {
    const r = run({ FAKE_HELP: 'sem-upload-app' });
    expect(r.code).toBe(0);
    expect(r.calls.some((c) => c.startsWith('iTMSTransporter -m verify'))).toBe(true);
    expect(r.calls.some((c) => c.startsWith('iTMSTransporter -m upload'))).toBe(true);
    expect(r.calls.some((c) => c.includes('--upload-app'))).toBe(false);
    expect(r.out).toContain('::warning::O altool deste Xcode não tem --upload-app/--validate-app');
    expect(r.calls.find((c) => c.startsWith('iTMSTransporter -m upload'))).toContain('-apiKey KEY1234567 -apiIssuer issuer-uuid');
  });

  it('iTMSTransporter com erro: classifica e falha', () => {
    const r = run({ FAKE_HELP: 'sem-upload-app', FAKE_TRANSPORTER_OUT: 'ERROR ITMS-90725: SDK Version Issue', FAKE_TRANSPORTER_RC: '1' });
    expect(r.code).toBe(1);
    expect(r.out).toContain('Xcode 26+');
  });

  it('argumentos e variáveis: erro claro quando faltam', () => {
    expect(run({ APPSTORE_KEY_ID: '' }).out).toContain('Falta a variável APPSTORE_KEY_ID');
    const r = spawnSync('bash', [px(SCRIPT), px(path.join(work, 'nao-existe.ipa'))], {
      cwd: work,
      encoding: 'utf8',
      env: { ...process.env, GITHUB_ACTIONS: 'true', APPSTORE_KEY_ID: 'K', APPSTORE_ISSUER_ID: 'I', APPSTORE_KEY_PATH: px(path.join(work, 'AuthKey_SRC.p8')) },
    });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('O .ipa para enviar não existe');
  });
});
