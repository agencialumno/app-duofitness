// Assinatura MANUAL do iOS (secrets IOS_DIST_CERT_*): ordem dos passos, ausência de impressão de segredos, fallback sem secrets,
// limpeza com always(), ExportOptions manual e classificação dos erros. O keychain e o codesign só existem no macOS do CI:
// aqui se confere o texto dos scripts e do workflow (Linux/Windows), nunca a assinatura real.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO = path.resolve(__dirname, '../..');
const req = createRequire(path.join(REPO, 'package.json'));
type Step = { name?: string; run?: string; if?: string; env?: Record<string, string> };
const yaml = req('js-yaml') as { load: (s: string) => { jobs: Record<string, { steps: Step[] }> } };
const WF_TEXT = readFileSync(path.join(REPO, '.github/workflows/ios.yml'), 'utf8');
const steps = yaml.load(WF_TEXT).jobs.build!.steps;
const idx = (re: RegExp) => steps.findIndex((s) => re.test(s.name ?? ''));
const IMPORT = readFileSync(path.join(REPO, 'scripts/ios-signing-import.sh'), 'utf8');
const code = (s: string) => s.replace(/^\s*#.*$/gm, '');

describe('ios.yml: assinatura manual', () => {
  it('o passo de importação vem DEPOIS do pod install e ANTES do archive, e o cleanup vem depois do upload', () => {
    const pod = idx(/^pod install/);
    const imp = idx(/Assinatura manual - importar/);
    const arch = idx(/^Archive/);
    const clean = idx(/Assinatura manual - apagar/);
    const up = idx(/Validar o \.ipa e enviar/);
    expect(pod).toBeGreaterThan(-1);
    expect(imp).toBeGreaterThan(pod);
    expect(arch).toBeGreaterThan(imp);
    expect(clean).toBeGreaterThan(up);
  });

  it('o cleanup roda com always() e apaga keychain, .p12, perfil e o perfil instalado', () => {
    const s = steps[idx(/Assinatura manual - apagar/)]!;
    expect(s.if).toBe('always()');
    expect(s.run).toContain('security delete-keychain');
    expect(s.run).toContain('dist-cert.p12');
    expect(s.run).toContain('dist-profile.mobileprovision');
    expect(s.run).toContain('Provisioning Profiles/$SIGN_PROFILE_UUID.mobileprovision');
  });

  it('os 3 secrets só entram no passo de importação (nunca no env do job nem em outros passos)', () => {
    const wf = yaml.load(WF_TEXT) as unknown as { jobs: { build: { env: Record<string, string> } } };
    expect(JSON.stringify(wf.jobs.build.env)).not.toMatch(/IOS_DIST|IOS_PROVISIONING/);
    const withSecrets = steps.filter((s) => /IOS_DIST_CERT|IOS_PROVISIONING_PROFILE/.test(JSON.stringify(s.env ?? {})));
    expect(withSecrets.map((s) => s.name)).toEqual([steps[idx(/Assinatura manual - importar/)]!.name]);
    const env = steps[idx(/Assinatura manual - importar/)]!.env!;
    for (const k of ['IOS_DIST_CERT_P12_B64', 'IOS_DIST_CERT_PASSWORD', 'IOS_PROVISIONING_PROFILE_B64']) expect(env[k]).toBe(`\${{ secrets.${k} }}`);
  });

  it('SEM os secrets: só avisa e segue (nada falha); com 1 ou 2 deles: erro claro', () => {
    const run = steps[idx(/Assinatura manual - importar/)]!.run!;
    expect(run).toContain('Assinatura fixa NÃO configurada');
    expect(run).toMatch(/PRESENT" -eq 0 \][\s\S]*exit 0/);
    expect(run).toContain('Assinatura fixa incompleta');
    expect(run).toContain('bash scripts/ios-signing-import.sh');
  });

  it('o passo de importação roda de verdade no bash: sem secrets sai com 0, parcial sai com 1', () => {
    const bash = spawnSync('bash', ['--version']).status === 0;
    if (!bash) return;
    const run = steps[idx(/Assinatura manual - importar/)]!.run!;
    const dir = mkdtempSync(path.join(tmpdir(), 'ms-'));
    const f = path.join(dir, 'step.sh');
    writeFileSync(f, run.replace('bash scripts/ios-signing-import.sh', 'echo IMPORT_CHAMADO'));
    const base = { ...process.env, GITHUB_STEP_SUMMARY: path.join(dir, 'sum.md') };
    const none = spawnSync('bash', [f], { encoding: 'utf8', env: { ...base, IOS_DIST_CERT_P12_B64: '', IOS_DIST_CERT_PASSWORD: '', IOS_PROVISIONING_PROFILE_B64: '' } });
    expect(none.status).toBe(0);
    expect(none.stdout).toContain('NÃO configurada');
    expect(none.stdout).not.toContain('IMPORT_CHAMADO');
    const part = spawnSync('bash', [f], { encoding: 'utf8', env: { ...base, IOS_DIST_CERT_P12_B64: 'x', IOS_DIST_CERT_PASSWORD: '', IOS_PROVISIONING_PROFILE_B64: '' } });
    expect(part.status).toBe(1);
    expect(part.stdout).toContain('incompleta');
    const all = spawnSync('bash', [f], { encoding: 'utf8', env: { ...base, IOS_DIST_CERT_P12_B64: 'x', IOS_DIST_CERT_PASSWORD: 'y', IOS_PROVISIONING_PROFILE_B64: 'z' } });
    expect(all.status).toBe(0);
    expect(all.stdout).toContain('IMPORT_CHAMADO');
  });

  it('archive manual: sem allowProvisioningUpdates nem chave da API, só no target do app (ruby), com perfil e Apple Distribution', () => {
    const run = steps[idx(/^Archive/)]!.run!;
    const m = run.match(/archive_manual\(\) \{[\s\S]*?\n\}/); // o YAML tira a indentação do bloco
    expect(m, 'função archive_manual').toBeTruthy();
    const fn = m![0];
    expect(fn).toContain('scripts/ios-set-manual-signing.rb');
    expect(fn).toContain('"$SIGN_PROFILE_NAME"');
    expect(fn).toContain('Apple Distribution');
    expect(fn).not.toMatch(/allowProvisioningUpdates|authenticationKey|APPSTORE_KEY/);
    expect(fn).not.toMatch(/CODE_SIGN_STYLE=|PROVISIONING_PROFILE_SPECIFIER=|DEVELOPMENT_TEAM=/); // nada global na linha de comando (Pods)
    expect(run).toContain('if [ "${MANUAL_SIGNING:-}" = "true" ]');
    // os caminhos antigos continuam: sem assinatura por padrão e sign_archive=true
    expect(run).toContain('archive_unsigned');
    expect(run).toContain('archive_signed');
    expect(run).toContain('CODE_SIGNING_ALLOWED=NO');
  });

  it('o script ruby mexe só no target pedido e grava manual/identidade/time/perfil', () => {
    const rb = readFileSync(path.join(REPO, 'scripts/ios-set-manual-signing.rb'), 'utf8');
    expect(rb).toContain("project.targets.find { |t| t.name == target_name }");
    for (const k of ['CODE_SIGN_STYLE', 'CODE_SIGN_IDENTITY', 'DEVELOPMENT_TEAM', 'PROVISIONING_PROFILE_SPECIFIER']) expect(rb).toContain(k);
    expect(rb).not.toMatch(/project\.targets\.each|native_targets\.each/);
  });

  it('ExportOptions manual: app-store-connect, signingStyle manual, bundle -> nome do perfil, teamID; sem chave da API no export', () => {
    const run = steps.find((s) => /^Exportar o \.ipa/.test(s.name ?? ''))!.run!;
    const manual = run.slice(run.indexOf('if [ "${MANUAL_SIGNING:-}" = "true" ]; then'), run.indexOf('else\ncat > "$OPTS"'));
    expect(manual).toContain('<key>method</key><string>app-store-connect</string>');
    expect(manual).toContain('<key>signingStyle</key><string>manual</string>');
    expect(manual).toContain('<key>provisioningProfiles</key>');
    expect(manual).toContain('<key>${BUNDLE_ID}</key><string>${SIGN_PROFILE_NAME}</string>');
    expect(manual).toContain('<key>teamID</key><string>${APPLE_TEAM_ID}</string>');
    const cmd = run.match(/if \[ "\$\{MANUAL_SIGNING:-\}" = "true" \]; then\n\s+xcodebuild -exportArchive[\s\S]*?\nelse/);
    expect(cmd, 'export manual').toBeTruthy();
    expect(cmd![0]).not.toMatch(/allowProvisioningUpdates|authenticationKey/);
    // o envio ao TestFlight continua pelo altool
    expect(steps.find((s) => /enviar ao TestFlight \(altool\)/.test(s.name ?? ''))!.run).toContain('scripts/ios-upload.sh');
  });

  it('com assinatura manual o aviso "archive sem assinatura pode perder HealthKit" não aparece', () => {
    const run = steps.find((s) => /Conferir os entitlements do \.ipa/.test(s.name ?? ''))!.run!;
    expect(run).toContain('"${MANUAL_SIGNING:-}" != "true"');
    expect(run).toContain('--require-healthkit'); // a exigência continua
  });
});

describe('scripts/ios-signing-import.sh', () => {
  it('é sintaticamente válido (bash -n)', () => {
    if (spawnSync('bash', ['--version']).status !== 0) return;
    const r = spawnSync('bash', ['-n', path.join(REPO, 'scripts/ios-signing-import.sh')], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
  });

  it('mascara os secrets e NUNCA os imprime (nenhum echo/printf do p12, senha ou conteúdo do perfil)', () => {
    expect(IMPORT).toContain('::add-mask::');
    const c = code(IMPORT);
    for (const v of ['IOS_DIST_CERT_P12_B64', 'IOS_DIST_CERT_PASSWORD', 'IOS_PROVISIONING_PROFILE_B64', 'KCPASS']) {
      const lines = c.split('\n').filter((l) => l.includes(`$${v}`) || l.includes(`\${${v}`));
      for (const l of lines) {
        const prints = /\becho\b/.test(l) && !l.includes('::add-mask::') && !/\| base64|printf '%s'/.test(l);
        expect(prints, l).toBe(false);
      }
    }
    expect(c).not.toMatch(/security find-identity[^\n]*\n[^\n]*echo[^\n]*\$IDS/);
    expect(c).not.toMatch(/cat\s+"?\$PLIST|cat\s+"?\$PROFILE_FILE|PlistBuddy -c 'Print'\s+"\$PLIST"/);
  });

  it('só imprime o nome do perfil e o Team ID (e a data de validade)', () => {
    expect(IMPORT).toContain('echo "Perfil: $PROFILE_NAME | Team ID: $PROFILE_TEAM"');
  });

  it('usa um keychain temporário com senha aleatória, desbloqueado, na lista de busca, com a partição liberada ao codesign', () => {
    expect(IMPORT).toContain('openssl rand -hex 24');
    expect(IMPORT).toContain('security create-keychain');
    expect(IMPORT).toContain('security unlock-keychain');
    expect(IMPORT).toContain('security list-keychains -d user -s');
    expect(IMPORT).toContain('security default-keychain');
    expect(IMPORT).toContain('-T /usr/bin/codesign -T /usr/bin/security');
    expect(IMPORT).toContain('security set-key-partition-list -S apple-tool:,apple:,codesign:');
    expect(IMPORT).toContain('Provisioning Profiles/$PROFILE_UUID.mobileprovision');
    // os arquivos ficam em RUNNER_TEMP (fora do repositório)
    expect(IMPORT).toContain('TMP="${RUNNER_TEMP:?}"');
  });

  it('registra o keychain no GITHUB_ENV ANTES de criá-lo (o cleanup apaga mesmo se algo falhar)', () => {
    expect(IMPORT.indexOf('echo "SIGN_KEYCHAIN=')).toBeGreaterThan(-1);
    expect(IMPORT.indexOf('echo "SIGN_KEYCHAIN=')).toBeLessThan(IMPORT.indexOf('security create-keychain'));
  });

  it.each([
    ['perfil expirado', 'EXPIROU'],
    ['Team ID diferente', 'Team ID do perfil'],
    ['perfil de outro app', 'não é do app'],
    ['perfil de desenvolvimento', 'DESENVOLVIMENTO'],
    ['sem HealthKit', 'O perfil não contém HealthKit: habilite a capability HealthKit no App ID, recrie o perfil'],
    ['sem Sign in with Apple', 'O perfil não contém Sign in with Apple'],
    ['senha errada do .p12', 'abrir o .p12 com a senha informada'],
    ['certificado fora do perfil', 'NÃO está dentro do perfil'],
    ['sem certificado de distribuição', 'DISTRIBUIÇÃO com chave privada'],
  ])('falha com mensagem e ação claras: %s', (_n, text) => {
    expect(IMPORT).toContain(text);
  });

  it('confere o certificado do .p12 contra o perfil pelo HASH (sem imprimir)', () => {
    expect(IMPORT).toContain('DeveloperCertificates.$IDX');
    expect(IMPORT).toContain('shasum -a 1');
    expect(IMPORT).toMatch(/grep -q "\$H"/);
  });
});

describe('ios-log-hints: erros de assinatura manual', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ms-hints-'));
  const hint = (text: string) => {
    const f = path.join(dir, `l${Math.random().toString(36).slice(2)}.log`);
    writeFileSync(f, text);
    const r = spawnSync(process.execPath, [path.join(REPO, 'scripts/ios-log-hints.mjs'), f, '--stage', 'archive'], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true', GITHUB_STEP_SUMMARY: '' } });
    return `${r.stdout}${r.stderr}`;
  };
  it.each([
    ['error: No signing certificate "iOS Distribution" found', 'não achou uma identidade de distribuição'],
    ['error: Provisioning profile "X" doesn\'t match the signing certificate', 'não bate com o app ou com o certificado'],
    ['error: Provisioning profile "X" has expired', 'expirou'],
    ['error: Provisioning profile "X" doesn\'t include the com.apple.developer.healthkit entitlement.', 'não está no perfil'.slice(0, 0) + 'entitlement (HealthKit'],
  ])('%s', (text, expected) => {
    const out = hint(text);
    expect(out).toContain('assinatura manual');
    expect(out).toContain(expected);
    expect(out).not.toMatch(/Não foi possível obter o perfil de provisionamento/); // a dica genérica da assinatura automática fica de fora
  });
});
