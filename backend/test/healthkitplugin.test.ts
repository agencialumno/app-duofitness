// Plugin de config do HealthKit (só leitura), a checagem do projeto iOS gerado e o job de prebuild em Linux.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO = path.resolve(__dirname, '../..');
const req = createRequire(path.join(REPO, 'package.json'));
const plugin = req('./plugins/withHealthKitOptional.js') as ((c: unknown) => unknown) & {
  applyEntitlements: (e: Record<string, unknown>) => Record<string, unknown>;
  applyInfoPlist: (i: Record<string, unknown>) => Record<string, unknown>;
  USAGE_DESCRIPTION: string;
};

describe('withHealthKitOptional', () => {
  it('sem HEALTH_INTEGRATION_ENABLED devolve o config INTACTO (mesma referência): o iOS gerado fica idêntico', () => {
    const cfg = { name: 'x', ios: {} };
    const before = process.env;
    for (const v of ['', 'false', 'nao']) {
      process.env = { ...before, HEALTH_INTEGRATION_ENABLED: v };
      try { expect(plugin(cfg)).toBe(cfg); } finally { process.env = before; }
    }
  });
  it('com a flag liga o entitlement do HealthKit, o texto de LEITURA e o texto "não grava" exigido pela Apple (ITMS-90683)', () => {
    expect(plugin.applyEntitlements({ 'com.apple.developer.applesignin': ['Default'] })).toEqual({ 'com.apple.developer.applesignin': ['Default'], 'com.apple.developer.healthkit': true });
    const info = plugin.applyInfoPlist({ ITSAppUsesNonExemptEncryption: false });
    expect(info.NSHealthShareUsageDescription).toBe('O Duo Fitness lê seus dados de atividade, sono e batimentos do app Saúde para mostrar sua evolução. Os dados ficam no seu aparelho.');
    expect(info.NSHealthUpdateUsageDescription).toBe('O Duo Fitness não grava dados no app Saúde. Ele apenas lê os dados que você autorizar. Esta permissão não é usada.');
    expect(info.ITSAppUsesNonExemptEncryption).toBe(false); // não apaga o que já existe
  });
  it('NUNCA liga background delivery nem registros clínicos e o texto de escrita sempre diz que o app não grava', () => {
    const info = plugin.applyInfoPlist({ NSHealthUpdateUsageDescription: 'outro texto qualquer' });
    expect(info.NSHealthUpdateUsageDescription).toMatch(/não grava dados/); // sobrescreve qualquer texto antigo
    const ent = plugin.applyEntitlements({});
    expect(Object.keys(ent)).toEqual(['com.apple.developer.healthkit']);
    const src = readFileSync(path.join(REPO, 'plugins/withHealthKitOptional.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/background-delivery|health-records|healthkit\.access/);
  });
  it('o plugin está no app.json e o app.json não cita HealthKit direto', () => {
    const app = readFileSync(path.join(REPO, 'app.json'), 'utf8');
    expect(app).toContain('./plugins/withHealthKitOptional');
    expect(app).not.toMatch(/NSHealth|com\.apple\.developer\.healthkit/);
  });
});

describe('check-ios-project: HealthKit', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), 'hk-ios-')); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  const USAGE = 'O Duo Fitness lê seus dados de atividade, sono e batimentos do app Saúde.';
  const info = (extra: string) => `<?xml version="1.0"?>\n<plist version="1.0">\n  <dict>\n    <key>ITSAppUsesNonExemptEncryption</key>\n    <false/>\n${extra}\n  </dict>\n</plist>\n`;
  const ent = (body: string) => `<?xml version="1.0"?>\n<plist version="1.0">\n  <dict>\n${body}\n  </dict>\n</plist>\n`;
  function project(infoExtra: string, entBody: string | null) {
    const ios = path.join(dir, 'ios');
    mkdirSync(path.join(ios, 'DuoFitness.xcodeproj'), { recursive: true });
    mkdirSync(path.join(ios, 'DuoFitness'), { recursive: true });
    writeFileSync(path.join(ios, 'DuoFitness.xcodeproj', 'project.pbxproj'), 'PRODUCT_BUNDLE_IDENTIFIER = "com.duofitness.app";\n');
    writeFileSync(path.join(ios, 'DuoFitness', 'Info.plist'), info(infoExtra));
    writeFileSync(path.join(ios, 'Podfile'), 'use_expo_modules!\n');
    if (entBody !== null) writeFileSync(path.join(ios, 'DuoFitness', 'DuoFitness.entitlements'), ent(entBody));
  }
  const run = (flag: string) => {
    const r = spawnSync(process.execPath, [path.join(REPO, 'scripts/check-ios-project.mjs'), '--root', dir], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true', FIREBASE_ENABLED: '', HEALTH_INTEGRATION_ENABLED: flag } });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };
  const OK_INFO = `    <key>NSHealthShareUsageDescription</key>\n    <string>${USAGE}</string>\n    <key>NSHealthUpdateUsageDescription</key>\n    <string>O Duo Fitness não grava dados no app Saúde. Esta permissão não é usada.</string>`;
  const OK_ENT = '    <key>com.apple.developer.healthkit</key>\n    <true/>';

  it('com a flag: entitlement e texto de leitura presentes e nada de escrita/background/clínicos: passa', () => {
    project(OK_INFO, OK_ENT);
    const r = run('true');
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('entitlement com.apple.developer.healthkit presente');
  });
  it('com a flag e SEM o entitlement: falha; sem o texto: falha', () => {
    project(OK_INFO, '');
    expect(run('true').out).toContain('[HealthKit] Esperado: o entitlement com.apple.developer.healthkit');
    project('', OK_ENT);
    const r = run('true');
    expect(r.code).toBe(1);
    expect(r.out).toContain('NSHealthShareUsageDescription');
  });
  it('com a flag, a chave de escrita é EXIGIDA com o texto "não grava": sem ela, ou com outro texto, falha (a Apple recusa o .ipa)', () => {
    project(`    <key>NSHealthShareUsageDescription</key>\n    <string>${USAGE}</string>`, OK_ENT);
    const a = run('true');
    expect(a.code).toBe(1);
    expect(a.out).toContain('NSHealthUpdateUsageDescription com o texto "não grava"');
    expect(a.out).toContain('ITMS-90683');
    project(`${OK_INFO.split('<key>NSHealthUpdateUsageDescription')[0]}<key>NSHealthUpdateUsageDescription</key>\n    <string>Precisamos gravar seus dados</string>`, OK_ENT);
    expect(run('true').code).toBe(1);
  });
  it('com a flag, background delivery ou registros clínicos continuam FALHANDO', () => {
    project(OK_INFO, `${OK_ENT}\n    <key>com.apple.developer.healthkit.background-delivery</key>\n    <true/>`);
    expect(run('true').out).toContain('background-delivery não deveria existir');
    project(OK_INFO, `${OK_ENT}\n    <key>com.apple.developer.healthkit.access</key>\n    <array><string>health-records</string></array>`);
    expect(run('true').out).toContain('healthkit.access não deveria existir');
  });
  it('SEM a flag: o projeto de hoje passa e qualquer chave de saúde falha (o iOS gerado tem de ser idêntico)', () => {
    project('', null);
    expect(run('').code).toBe(0);
    project(OK_INFO, OK_ENT);
    const r = run('');
    expect(r.code).toBe(1);
    expect(r.out).toContain('deveria ser idêntico ao de antes');
  });
});

describe('ci.yml: job ios-prebuild-healthkit (Linux, sem Mac)', () => {
  const ci = readFileSync(path.join(REPO, '.github/workflows/ci.yml'), 'utf8');
  const start = ci.indexOf('  ios-prebuild-healthkit:');
  const job = ci.slice(start, ci.indexOf('  # Gera o projeto Android COM Firebase'));
  it('liga a flag, instala os módulos, confere o autolinking, gera o iOS e confere entitlement e texto', () => {
    expect(start).toBeGreaterThan(-1);
    expect(job).toContain("HEALTH_INTEGRATION_ENABLED: 'true'");
    const order = ['npm ci', 'install-healthkit-deps.mjs', 'check-autolinking.mjs --platform ios', 'expo prebuild --platform ios --no-install', 'check-ios-project.mjs'].map((t) => job.indexOf(t));
    expect(order.every((i) => i > -1), order.join(',')).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
  it('o job do iOS sem a flag continua conferindo que NÃO há chave de saúde (check-ios-project sem flag)', () => {
    const plain = ci.slice(ci.indexOf('  ios-prebuild:'), ci.indexOf('  ios-prebuild-firebase:'));
    expect(plain).toContain('check-ios-project.mjs');
    expect(plain).not.toContain('HEALTH_INTEGRATION_ENABLED');
  });
});

describe('REGRESSÃO ITMS-90683: a saída do altool é classificada (e nunca manda procurar no log do xcodebuild)', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'altool-hints-'));
  const hint = (text: string, extra: string[] = ['--stage', 'altool']) => {
    const f = path.join(dir, `l${Math.random().toString(36).slice(2)}.log`);
    writeFileSync(f, text);
    const r = spawnSync(process.execPath, [path.join(REPO, 'scripts/ios-log-hints.mjs'), f, ...extra], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true', GITHUB_STEP_SUMMARY: '' } });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };
  const REAL = 'altool: Validating app...\n*** Error: Validation failed (409) Missing purpose string in Info.plist. The Info.plist file for the "DuoFitness.app" bundle should contain a NSHealthUpdateUsageDescription key with a user-facing purpose string explaining clearly and completely why your app needs the data. If you\'re using external libraries or SDKs, they may reference APIs that require a purpose string. While your app might not use these APIs, a purpose string is still required. (90683)\n';

  it('o erro REAL (90683, sem o prefixo ITMS): diz qual chave faltou, a causa e a ação, e não manda olhar o xcodebuild', () => {
    const r = hint(REAL);
    expect(r.code).toBe(0);
    expect(r.out).toContain('CAUSA (ITMS-90683)');
    expect(r.out).toContain('NSHealthUpdateUsageDescription');
    expect(r.out).toContain('withHealthKitOptional');
    expect(r.out).not.toMatch(/log do xcodebuild|Não reconheci/);
  });
  it('várias chaves são listadas só pelo NOME; os valores/textos do log nunca são impressos', () => {
    const r = hint('Missing purpose string (90683) NSHealthShareUsageDescription e NSCameraUsageDescription "texto secreto do usuário 12345"');
    expect(r.out).toContain('NSHealthShareUsageDescription, NSCameraUsageDescription');
    expect(r.out).not.toContain('texto secreto');
  });
  it.each([
    ['build number repetido', '*** Error: Validation failed (409) The bundle version must be higher than the previously uploaded version. (90189)', 'número do build já foi usado'],
    ['ícone inválido', 'ERROR ITMS-90022: Missing required icon file', 'recusou o ícone'],
    ['entitlement fora do perfil', 'ERROR ITMS-90046: Invalid Code Signing Entitlements. The entitlements in your app bundle signature do not match the ones that are contained in the provisioning profile (90046)', 'não está no perfil de provisionamento'],
    ['permissão da chave de API', '*** Error: Unable to authenticate: NOT_AUTHORIZED - 403 Forbidden', 'recusou a chave da API'],
  ])('%s', (_n, text, expected) => {
    const r = hint(text);
    expect(r.code).toBe(0);
    expect(r.out).toContain(expected);
    expect(r.out).not.toMatch(/log do xcodebuild/);
  });
  it('causa desconhecida do altool: diz que a falha é do altool, aponta ipa-validate.log/ipa-upload.log e sanitiza as linhas', () => {
    const r = hint('*** Error: algo inédito (12345) Authorization: Bearer eyJhbGciOiJFUzI1NiJ9.eyJpc3MiOiJ4In0.assinatura123456');
    expect(r.code).toBe(1);
    expect(r.out).toContain('Esta falha é do envio ao App Store Connect, NÃO do xcodebuild');
    expect(r.out).toContain('ipa-validate.log');
    expect(r.out).toContain('ipa-upload.log');
    expect(r.out).not.toMatch(/eyJhbGci|Procure|procure a primeira linha com "error:"/);
  });
  it('fora do altool o comportamento continua o de sempre (xcodebuild)', () => {
    const r = hint('nada reconhecível', ['--stage', 'archive']);
    expect(r.out).toContain('Não reconheci a causa no log (archive)');
  });
  it('ios-upload.sh chama o classificador com --stage altool e o artifact tem a saída completa do altool', () => {
    const sh = readFileSync(path.join(REPO, 'scripts/ios-upload.sh'), 'utf8');
    expect(sh).toMatch(/ios-log-hints\.mjs" "\$log" --stage altool/);
    expect(sh).toContain('VALIDATE_LOG="$LOG_DIR/ipa-validate.log"');
    expect(sh).toContain('UPLOAD_LOG="$LOG_DIR/ipa-upload.log"');
    const wf = readFileSync(path.join(REPO, '.github/workflows/ios.yml'), 'utf8');
    expect(wf).toContain('XC_LOG_DIR=$LOG_DIR'); // o mesmo diretório do artifact xcodebuild-logs
    expect(wf).toContain('path: ${{ runner.temp }}/xcodebuild-logs');
  });
});
