// Lógica de repetição do archive do ios.yml, testada com um xcodebuild FALSO e com o shell do
// Actions ("bash -e", errexit ligado). O passo é extraído do próprio ios.yml, então o teste quebra
// se alguém reintroduzir o erro: com errexit ligado, "archive | tee | show" falhava o pipeline e o
// script saía antes de ler PIPESTATUS, de repetir o archive e de rodar o ios-log-hints.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO = path.resolve(__dirname, '../..');
const IOS_YML = path.join(REPO, '.github/workflows/ios.yml');
const HINTS = path.join(REPO, 'scripts/ios-log-hints.mjs');

const hasBash = spawnSync('bash', ['--version']).status === 0;
const px = (p: string) => p.replace(/\\/g, '/');

/** Extrai o bloco "run: |" do passo cujo nome começa com `stepName`, sem depender de js-yaml. */
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

// O passo ANTIGO (commit f17c7c8), mantido só como prova do defeito.
const OLD_ARCHIVE_STEP = `set -uo pipefail
WORKSPACE="$(find ios -maxdepth 1 -name '*.xcworkspace' | head -1)"
SCHEME="$(basename "$WORKSPACE" .xcworkspace)"
ARCHIVE="$RUNNER_TEMP/$SCHEME.xcarchive"
LOG_DIR="$RUNNER_TEMP/xcodebuild-logs"
mkdir -p "$LOG_DIR"
archive() { xcodebuild archive -workspace "$WORKSPACE" -scheme "$SCHEME" -archivePath "$ARCHIVE" -allowProvisioningUpdates "$@"; }
show() { cat; }
archive 2>&1 | tee "$LOG_DIR/archive.log" | show
RC=\${PIPESTATUS[0]}
if [ "$RC" -ne 0 ] && grep -qiE "Your team has no devices" "$LOG_DIR/archive.log"; then
  rm -rf "$ARCHIVE"
  archive CODE_SIGNING_ALLOWED=NO 2>&1 | tee "$LOG_DIR/archive-retry.log" | show
  RC=\${PIPESTATUS[0]}
fi
if [ "$RC" -ne 0 ]; then
  node scripts/ios-log-hints.mjs "$LOG_DIR/archive.log" || true
  exit "$RC"
fi
`;

// xcodebuild falso: registra as chamadas e age conforme o cenário.
const FAKE_XCODEBUILD = `
xcodebuild() {
  echo "$*" >> "$FAKE_CALLS"
  local n; n=$(wc -l < "$FAKE_CALLS")
  local archive_path=""
  local prev=""
  for a in "$@"; do if [ "$prev" = "-archivePath" ]; then archive_path="$a"; fi; prev="$a"; done
  local ok=0
  case "$FAKE_SCENARIO" in
    ok-first) ok=1 ;;
    nodevices-then-ok) if [ "$n" -ge 2 ]; then ok=1; else ok=0; fi ;;
    *) ok=0 ;;
  esac
  if [ "$ok" -eq 1 ]; then
    echo "** ARCHIVE SUCCEEDED **"
    [ -n "$archive_path" ] && mkdir -p "$archive_path"
    return 0
  fi
  case "$FAKE_SCENARIO" in
    nodevices-then-ok|nodevices-then-fail)
      if [ "$n" -eq 1 ]; then
        echo "error: Communication with Apple failed"
        echo "error: Your team has no devices from which to generate a provisioning profile."
        echo "error: No profiles for 'com.duofitness.app' were found"
      else
        echo "error: exportArchive: Cloud signing permission error"
      fi ;;
    cloud-signing) echo "error: Cloud signing permission error" ;;
    *) echo "error: algo inesperado" ;;
  esac
  return 65
}
`;

let work: string;
beforeEach(() => {
  work = mkdtempSync(path.join(tmpdir(), 'ios-archive-'));
  mkdirSync(path.join(work, 'ios', 'DuoFitness.xcworkspace'), { recursive: true });
  mkdirSync(path.join(work, 'scripts'), { recursive: true });
  writeFileSync(path.join(work, 'scripts', 'ios-log-hints.mjs'), readFileSync(HINTS));
  mkdirSync(path.join(work, 'tmp'), { recursive: true });
  for (const f of ['calls.txt', 'github_env.txt', 'summary.md']) writeFileSync(path.join(work, f), '');
});
afterEach(() => rmSync(work, { recursive: true, force: true }));

function runStep(script: string, scenario: string, extraEnv: Record<string, string> = {}) {
  const file = path.join(work, 'step.sh');
  writeFileSync(file, `${FAKE_XCODEBUILD}\n${script}\n`);
  // "bash -e {0}": o shell padrão dos passos "run" do GitHub Actions (errexit LIGADO)
  const r = spawnSync('bash', ['-e', px(file)], {
    cwd: work,
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_ACTIONS: 'true',
      RUNNER_TEMP: px(path.join(work, 'tmp')),
      GITHUB_ENV: px(path.join(work, 'github_env.txt')),
      GITHUB_STEP_SUMMARY: px(path.join(work, 'summary.md')),
      FAKE_CALLS: px(path.join(work, 'calls.txt')),
      FAKE_SCENARIO: scenario,
      APPLE_TEAM_ID: 'KH97Q8M556',
      APPSTORE_KEY_PATH: px(path.join(work, 'AuthKey_X.p8')),
      APPSTORE_KEY_ID: 'KEYID12345',
      APPSTORE_ISSUER_ID: 'issuer-uuid',
      APP_VERSION_NAME: '1.0.0',
      IOS_BUILD_NUMBER: '7',
      ...extraEnv,
    },
  });
  const calls = readFileSync(path.join(work, 'calls.txt'), 'utf8').split('\n').filter(Boolean);
  return {
    code: r.status,
    out: `${r.stdout}${r.stderr}`,
    calls,
    env: readFileSync(path.join(work, 'github_env.txt'), 'utf8'),
    summary: readFileSync(path.join(work, 'summary.md'), 'utf8'),
  };
}

const archiveStep = () => extractRun(readFileSync(IOS_YML, 'utf8'), 'Archive (assinatura automática');
const exportStep = () => extractRun(readFileSync(IOS_YML, 'utf8'), 'Exportar o .ipa e validar a assinatura');

describe.skipIf(!hasBash)('ios.yml: passo do archive (bash -e, xcodebuild falso)', () => {
  it('o passo extraído tem errexit desligado antes de tratar o xcodebuild', () => {
    const s = archiveStep();
    expect(s.indexOf('set +e')).toBeGreaterThan(-1);
    expect(s.indexOf('set +e')).toBeLessThan(s.indexOf('archive_signed 2>&1'));
  });

  it('archive assinado funciona de primeira: uma chamada, sem repetição', () => {
    const r = runStep(archiveStep(), 'ok-first');
    expect(r.code).toBe(0);
    expect(r.calls).toHaveLength(1);
    expect(r.calls[0]).toContain('-allowProvisioningUpdates');
    expect(r.env).not.toContain('XC_ARCHIVE_UNSIGNED');
  });

  it('"no devices": repete o archive SEM assinar e conclui com sucesso (errexit ligado)', () => {
    const r = runStep(archiveStep(), 'nodevices-then-ok');
    expect(r.code).toBe(0);
    expect(r.calls).toHaveLength(2);
    // 1ª: assinado, com a chave da API; 2ª: sem assinatura e sem falar com a Apple
    expect(r.calls[0]).toContain('-allowProvisioningUpdates');
    expect(r.calls[0]).toContain('CODE_SIGN_STYLE=Automatic');
    expect(r.calls[1]).toContain('CODE_SIGNING_ALLOWED=NO');
    expect(r.calls[1]).toContain('CODE_SIGNING_REQUIRED=NO');
    expect(r.calls[1]).not.toContain('-allowProvisioningUpdates');
    expect(r.calls[1]).not.toContain('-authenticationKey');
    expect(r.calls[1]).toContain('CURRENT_PROJECT_VERSION=7');
    expect(r.env).toContain('XC_ARCHIVE_UNSIGNED=true');
    expect(r.out).toContain('::warning::O time Apple não tem dispositivos registrados');
    expect(r.out).toContain('registre um iPhone');
    expect(r.summary).toContain('sem assinatura');
    expect(existsSync(path.join(work, 'tmp', 'DuoFitness.xcarchive'))).toBe(true);
  });

  it('outro erro (cloud signing): NÃO repete, devolve o código do xcodebuild e roda o ios-log-hints', () => {
    const r = runStep(archiveStep(), 'cloud-signing');
    expect(r.code).toBe(65);
    expect(r.calls).toHaveLength(1);
    expect(r.out).toContain('::error::A chave da API não tem permissão para o cloud signing');
    expect(r.out).toContain('ADMIN');
  });

  it('a repetição também falha: devolve 65 e as dicas cobrem as DUAS tentativas', () => {
    const r = runStep(archiveStep(), 'nodevices-then-fail');
    expect(r.code).toBe(65);
    expect(r.calls).toHaveLength(2);
    expect(r.out).toContain('REGISTRE UM iPhone'); // causa da 1ª tentativa
    expect(r.out).toContain('papel ADMIN'); // erro da 2ª tentativa
    expect(r.out).not.toContain('Não foi possível obter o perfil de provisionamento'); // consequência de "sem dispositivos": dica suprimida
  });

  it('REGRESSÃO: o passo ANTIGO, sob bash -e, saía antes de repetir e de rodar as dicas', () => {
    const r = runStep(OLD_ARCHIVE_STEP, 'nodevices-then-ok');
    expect(r.code).toBe(65);
    expect(r.calls).toHaveLength(1); // nunca repetiu
    expect(r.out).not.toContain('::error::'); // ios-log-hints nunca rodou
  });
});

describe.skipIf(!hasBash)('ios.yml: passo do export (bash -e, xcodebuild falso)', () => {
  const env = (extra: Record<string, string> = {}) => ({
    XC_ARCHIVE: px(path.join(work, 'tmp', 'DuoFitness.xcarchive')),
    XC_LOG_DIR: px(path.join(work, 'tmp', 'logs')),
    BUNDLE_ID: 'com.duofitness.app',
    ...extra,
  });

  it('falha de export: roda o ios-log-hints (papel Admin) e devolve o código', () => {
    mkdirSync(path.join(work, 'tmp', 'logs'), { recursive: true });
    const r = runStep(exportStep(), 'cloud-signing', env());
    expect(r.code).toBe(65);
    expect(r.out).toContain('::error::A chave da API não tem permissão para o cloud signing');
    expect(r.out).not.toContain('SEM assinatura');
  });

  it('falha de export depois de archive sem assinatura: acrescenta a dica de registrar um iPhone', () => {
    mkdirSync(path.join(work, 'tmp', 'logs'), { recursive: true });
    const r = runStep(exportStep(), 'cloud-signing', env({ XC_ARCHIVE_UNSIGNED: 'true' }));
    expect(r.code).toBe(65);
    expect(r.out).toContain('depois de um archive SEM assinatura');
    expect(r.out).toContain('Registrar um iPhone no portal da Apple');
    expect(r.out).toContain('papel ADMIN');
  });
});
