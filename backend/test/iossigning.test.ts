// ios.yml: archive SEM assinatura por padrão (nenhum certificado de desenvolvimento por execução), caminho antigo atrás de
// sign_archive=true, assinatura de distribuição só no export, e nada de certificados criados/revogados/impressos pelo CI.
// Os passos são extraídos do próprio ios.yml e rodados com "bash -e" e um xcodebuild FALSO.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO = path.resolve(__dirname, '../..');
const req = createRequire(path.join(REPO, 'package.json'));
const yaml = req('js-yaml') as { load: (s: string) => { on: Record<string, unknown>; jobs: Record<string, { env: Record<string, string>; steps: Step[] }> } };
type Step = { name?: string; run?: string; if?: string; env?: Record<string, string> };
const IOS_YML = path.join(REPO, '.github/workflows/ios.yml');
const wf = () => yaml.load(readFileSync(IOS_YML, 'utf8'));
const steps = () => wf().jobs.build!.steps;
const stepRun = (prefix: string) => steps().find((s) => (s.name ?? '').startsWith(prefix))!.run!;

const hasBash = spawnSync('bash', ['--version']).status === 0;
const px = (p: string) => p.replace(/\\/g, '/');

const FAKE_XCODEBUILD = `
xcodebuild() {
  echo "$*" >> "$FAKE_CALLS"
  local archive_path="" prev=""
  for a in "$@"; do if [ "$prev" = "-archivePath" ]; then archive_path="$a"; fi; prev="$a"; done
  case "$FAKE_SCENARIO" in
    ok) echo "** ARCHIVE SUCCEEDED **"; [ -n "$archive_path" ] && mkdir -p "$archive_path"; return 0 ;;
    cert-limit)
      echo "error: Choose a certificate to revoke. Your account has reached the maximum number of certificates."
      echo "error: No profiles for 'com.duofitness.app' were found: iOS App Development provisioning profiles"
      return 65 ;;
    export-refuses) echo "error: exportArchive: The archive has no valid signing identity"; return 70 ;;
    *) echo "error: algo inesperado"; return 65 ;;
  esac
}
`;

let work: string;
beforeEach(() => {
  work = mkdtempSync(path.join(tmpdir(), 'ios-signing-'));
  mkdirSync(path.join(work, 'ios', 'DuoFitness.xcworkspace'), { recursive: true });
  mkdirSync(path.join(work, 'scripts'), { recursive: true });
  for (const f of ['ios-log-hints.mjs', 'ios-log-sanitize.mjs']) writeFileSync(path.join(work, 'scripts', f), readFileSync(path.join(REPO, 'scripts', f)));
  mkdirSync(path.join(work, 'tmp', 'logs'), { recursive: true });
  for (const f of ['calls.txt', 'github_env.txt', 'summary.md']) writeFileSync(path.join(work, f), '');
});
afterEach(() => rmSync(work, { recursive: true, force: true }));

function run(script: string, scenario: string, env: Record<string, string> = {}) {
  const file = path.join(work, 'step.sh');
  writeFileSync(file, `${FAKE_XCODEBUILD}\n${script}\n`);
  const r = spawnSync('bash', ['-e', px(file)], {
    cwd: work,
    encoding: 'utf8',
    env: {
      ...process.env, GITHUB_ACTIONS: 'true', RUNNER_TEMP: px(path.join(work, 'tmp')),
      GITHUB_ENV: px(path.join(work, 'github_env.txt')), GITHUB_STEP_SUMMARY: px(path.join(work, 'summary.md')),
      FAKE_CALLS: px(path.join(work, 'calls.txt')), FAKE_SCENARIO: scenario,
      APPLE_TEAM_ID: 'TEAM123456', APPSTORE_KEY_PATH: px(path.join(work, 'AuthKey_X.p8')), APPSTORE_KEY_ID: 'KEYID12345', APPSTORE_ISSUER_ID: 'issuer-uuid',
      APP_VERSION_NAME: '1.0.0', IOS_BUILD_NUMBER: '7',
      XC_ARCHIVE: px(path.join(work, 'tmp', 'DuoFitness.xcarchive')), XC_LOG_DIR: px(path.join(work, 'tmp', 'logs')), BUNDLE_ID: 'com.duofitness.app',
      ...env,
    },
  });
  return {
    code: r.status, out: `${r.stdout}${r.stderr}`,
    calls: readFileSync(path.join(work, 'calls.txt'), 'utf8').split('\n').filter(Boolean),
    env: readFileSync(path.join(work, 'github_env.txt'), 'utf8'),
    summary: readFileSync(path.join(work, 'summary.md'), 'utf8'),
  };
}

describe.skipIf(!hasBash)('archive: PADRÃO sem assinatura', () => {
  const archive = () => stepRun('Archive (sem assinatura');

  it('uma única chamada SEM assinatura, SEM -allowProvisioningUpdates e SEM a chave da API (nada é criado na conta Apple)', () => {
    const r = run(archive(), 'ok', { SIGN_ARCHIVE: 'false' });
    expect(r.code).toBe(0);
    expect(r.calls).toHaveLength(1);
    const c = r.calls[0]!;
    expect(c).toContain('archive ');
    expect(c).toContain('CODE_SIGNING_ALLOWED=NO');
    expect(c).toContain('CODE_SIGNING_REQUIRED=NO');
    expect(c).toMatch(/CODE_SIGN_IDENTITY=(\s|$)/); // identidade vazia
    expect(c).not.toContain('-allowProvisioningUpdates');
    expect(c).not.toContain('-authenticationKey');
    expect(c).not.toContain('CODE_SIGN_STYLE=Automatic');
    expect(r.env).toContain('XC_ARCHIVE_MODE=unsigned');
    expect(r.env).not.toContain('XC_ARCHIVE_UNSIGNED'); // esse é só do caminho de repetição do modo antigo
    expect(r.summary).toContain('archive **sem assinatura** (padrão)');
    expect(existsSync(path.join(work, 'tmp', 'DuoFitness.xcarchive'))).toBe(true);
  });

  it('sem a variável (tag, input ausente) também é sem assinatura', () => {
    const r = run(archive(), 'ok', { SIGN_ARCHIVE: '' });
    expect(r.code).toBe(0);
    expect(r.calls[0]).toContain('CODE_SIGNING_ALLOWED=NO');
  });

  it('se falhar, NÃO repete assinando (nunca cria certificado) e roda as dicas', () => {
    const r = run(archive(), 'cert-limit', { SIGN_ARCHIVE: 'false' });
    expect(r.code).toBe(65);
    expect(r.calls).toHaveLength(1);
    expect(r.calls.join('\n')).not.toContain('-allowProvisioningUpdates');
    expect(r.out).toContain('CAUSA: a conta Apple atingiu o limite de certificados');
  });

  it('sign_archive=true: o caminho antigo continua (assinado automático) e o erro do limite mostra a dica certa', () => {
    const r = run(archive(), 'cert-limit', { SIGN_ARCHIVE: 'true' });
    expect(r.code).toBe(65);
    expect(r.calls[0]).toContain('-allowProvisioningUpdates');
    expect(r.calls[0]).toContain('-authenticationKeyPath');
    expect(r.env).toContain('XC_ARCHIVE_MODE=signed');
    expect(r.out).toContain('revogue manualmente');
    expect(r.out).not.toContain('use uma chave com papel Admin');
  });
});

describe.skipIf(!hasBash)('export: a assinatura de distribuição fica aqui, com a chave da API', () => {
  const exportStep = () => stepRun('Exportar o .ipa e validar a assinatura');

  it('exportArchive automático com a chave da API (cloud signing) e o método app-store-connect', () => {
    const r = run(exportStep(), 'export-refuses', { XC_ARCHIVE_MODE: 'unsigned' });
    expect(r.calls).toHaveLength(1);
    const c = r.calls[0]!;
    expect(c).toContain('-exportArchive');
    expect(c).toContain('-allowProvisioningUpdates');
    expect(c).toContain('-authenticationKeyPath');
    expect(c).toContain('-authenticationKeyID KEYID12345');
    const opts = readFileSync(path.join(work, 'tmp', 'ExportOptions-export.plist'), 'utf8');
    expect(opts).toContain('<key>method</key><string>app-store-connect</string>');
    expect(opts).toContain('<key>signingStyle</key><string>automatic</string>');
  });

  it('se o export recusar o archive sem assinatura: NÃO inventa alternativa; registra o erro e aponta o docs/testflight.md (.p12)', () => {
    const r = run(exportStep(), 'export-refuses', { XC_ARCHIVE_MODE: 'unsigned' });
    expect(r.code).toBe(70);
    expect(r.calls).toHaveLength(1); // não tentou outro caminho
    expect(r.out).toContain('O export falhou depois do archive SEM assinatura (padrão)');
    expect(r.out).toContain('NÃO improvise');
    expect(r.out).toContain('docs/testflight.md');
    expect(r.out).toContain('.p12');
    expect(r.out).toContain('sign_archive=true');
    expect(readFileSync(path.join(work, 'tmp', 'logs', 'export.log'), 'utf8')).toContain('The archive has no valid signing identity'); // erro registrado
  });
});

describe('ios.yml: estrutura', () => {
  it('sign_archive é input booleano obrigatório, padrão false, e SIGN_ARCHIVE só liga com true', () => {
    const y = wf();
    const input = (y.on.workflow_dispatch as { inputs: Record<string, { type: string; default: unknown; required: boolean }> }).inputs.sign_archive!;
    expect(input.type).toBe('boolean');
    expect(input.default).toBe(false);
    expect(wf().jobs.build!.env.SIGN_ARCHIVE).toBe("${{ inputs.sign_archive && 'true' || 'false' }}");
  });

  it('a conferência de entitlements roda depois do export e antes do envio, SEM condição (também com upload=false)', () => {
    const list = steps();
    const exp = list.findIndex((s) => (s.name ?? '').startsWith('Exportar o .ipa'));
    const ent = list.findIndex((s) => (s.name ?? '').startsWith('Conferir os entitlements do .ipa'));
    const up = list.findIndex((s) => (s.name ?? '').startsWith('Validar o .ipa e enviar'));
    expect(exp).toBeGreaterThan(-1);
    expect(ent).toBe(exp + 1);
    expect(up).toBeGreaterThan(ent);
    expect(list[ent]!.if).toBeUndefined();
    expect(list[ent]!.run).toContain('codesign -d --entitlements :-');
    expect(list[ent]!.run).toContain('check-ipa-entitlements.mjs');
    expect(list[ent]!.run).toContain('--require-applesignin');
    expect(list[ent]!.run).toMatch(/EXPO_PUBLIC_AUTH_ENABLED[\s\S]*FIREBASE_ENABLED/);
  });

  it('o CI NUNCA cria, revoga nem lista certificados, e nunca imprime nomes de certificados', () => {
    const y = readFileSync(IOS_YML, 'utf8');
    for (const proibido of ['/v1/certificates', 'api.appstoreconnect.apple.com', 'curl ', 'find-identity', 'security delete', 'DELETE ', 'revoke-cert']) expect(y, proibido).not.toContain(proibido);
    expect(y).not.toMatch(/echo[^\n]*\$\{?AUTHORITY/);
    expect(y).not.toMatch(/echo[^\n]*\$\{?SIGN_INFO/);
    expect(y).not.toContain('Assinado por:');
  });

  it('o android.yml não foi tocado por esta mudança', () => {
    const a = readFileSync(path.join(REPO, '.github/workflows/android.yml'), 'utf8');
    expect(a).not.toMatch(/sign_archive|SIGN_ARCHIVE|check-ipa-entitlements/);
  });
});
