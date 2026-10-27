// scripts/check-ipa-entitlements.mjs e o passo do ios.yml que o chama (codesign falso, .ipa de fixture).
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do repositório, sem tipos
import * as E from '../../scripts/check-ipa-entitlements.mjs';

const REPO = path.resolve(__dirname, '../..');
const req = createRequire(path.join(REPO, 'package.json'));
const yaml = req('js-yaml') as { load: (s: string) => { jobs: Record<string, { steps: { name?: string; run?: string }[] }> } };
const SCRIPT = path.join(REPO, 'scripts/check-ipa-entitlements.mjs');
const hasBash = spawnSync('bash', ['--version']).status === 0;
const px = (p: string) => p.replace(/\\/g, '/');

const plist = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>${body}</dict></plist>`;
const SIWA = '<key>com.apple.developer.applesignin</key><array><string>Default</string></array>';
const IPA_OK = plist(`<key>application-identifier</key><string>TEAM.com.duofitness.app</string><key>com.apple.developer.team-identifier</key><string>TEAM</string><key>get-task-allow</key><false/>${SIWA}`);
const IPA_SEM_SIWA = plist('<key>application-identifier</key><string>TEAM.com.duofitness.app</string><key>get-task-allow</key><false/>');
const HK = '<key>com.apple.developer.healthkit</key><true/>';
const IPA_COM_HK = plist(`<key>application-identifier</key><string>TEAM.com.duofitness.app</string>${SIWA}${HK}`);
const PROJECT_HK = plist(`${SIWA}${HK}`);
const PROJECT_SIWA = plist(SIWA);
const PROJECT_VAZIO = plist('');

describe('parsePlist', () => {
  it('lê dict, array, string, booleanos, números, dict vazio e entidades', () => {
    const o = E.parsePlist(plist('<key>a</key><string>x &amp; y</string><key>b</key><true/><key>c</key><false/><key>d</key><integer>7</integer><key>e</key><array><string>1</string><string>2</string></array><key>f</key><dict/><key>g</key><string></string><key>h</key><string/>'));
    expect(o).toEqual({ a: 'x & y', b: true, c: false, d: 7, e: ['1', '2'], f: {}, g: '', h: '' });
  });
  it('plist inválido falha com mensagem', () => {
    expect(() => E.parsePlist('isto não é plist')).toThrow(/não é um plist XML/);
    expect(() => E.parsePlist('<plist><dict><key>a</key><weird/></dict></plist>')).toThrow(/não suportada/);
  });
});

describe('compareEntitlements', () => {
  const ipa = E.parsePlist(IPA_OK);
  it('tudo que o projeto declara existe no .ipa (e o .ipa pode ter chaves a mais): ok', () => {
    expect(E.compareEntitlements(ipa, E.parsePlist(PROJECT_SIWA)).problems).toEqual([]);
    expect(E.compareEntitlements(ipa, {}).problems).toEqual([]);
  });
  it('falta de qualquer entitlement do projeto no .ipa falha, citando só o NOME da chave', () => {
    const r = E.compareEntitlements(E.parsePlist(IPA_SEM_SIWA), E.parsePlist(plist(`${SIWA}<key>aps-environment</key><string>production</string>`)));
    expect(r.problems).toEqual([
      'Falta no .ipa o entitlement com.apple.developer.applesignin (o projeto iOS o declara)',
      'Falta no .ipa o entitlement aps-environment (o projeto iOS o declara)',
    ]);
  });
  it('valor diferente do projeto falha; valor com variável $(...) só exige a presença', () => {
    const outro = E.parsePlist(plist('<key>com.apple.developer.applesignin</key><array><string>Outro</string></array>'));
    expect(E.compareEntitlements(outro, E.parsePlist(PROJECT_SIWA)).problems).toEqual(['O entitlement com.apple.developer.applesignin do .ipa tem valor diferente do projeto']);
    const comVar = E.parsePlist(plist('<key>keychain-access-groups</key><array><string>$(AppIdentifierPrefix)com.duofitness.app</string></array>'));
    const noIpa = E.parsePlist(plist('<key>keychain-access-groups</key><array><string>TEAM.com.duofitness.app</string></array>'));
    expect(E.compareEntitlements(noIpa, comVar).problems).toEqual([]);
  });
  it('--require-applesignin: obrigatório no .ipa e declarado no projeto', () => {
    expect(E.compareEntitlements(ipa, E.parsePlist(PROJECT_SIWA), { requireAppleSignIn: true }).problems).toEqual([]);
    const semNoIpa = E.compareEntitlements(E.parsePlist(IPA_SEM_SIWA), {}, { requireAppleSignIn: true }).problems;
    expect(semNoIpa.join('|')).toContain('Falta no .ipa o entitlement com.apple.developer.applesignin (Sign in with Apple)');
    expect(semNoIpa.join('|')).toContain('O projeto iOS gerado não declara com.apple.developer.applesignin');
  });
});

describe('--require-healthkit', () => {
  it('obrigatório no .ipa e declarado no projeto quando a integração de saúde está ligada', () => {
    const ok = E.compareEntitlements(E.parsePlist(IPA_COM_HK), E.parsePlist(PROJECT_HK), { requireHealthKit: true });
    expect(ok.problems).toEqual([]);
    const semNoIpa = E.compareEntitlements(E.parsePlist(IPA_OK), E.parsePlist(PROJECT_HK), { requireHealthKit: true }).problems;
    expect(semNoIpa.join('|')).toContain('Falta no .ipa o entitlement com.apple.developer.healthkit (HealthKit)');
    expect(semNoIpa.join('|')).toContain('sign_archive=true');
    const semNoProjeto = E.compareEntitlements(E.parsePlist(IPA_COM_HK), E.parsePlist(PROJECT_SIWA), { requireHealthKit: true }).problems;
    expect(semNoProjeto.join('|')).toContain('O projeto iOS gerado não declara com.apple.developer.healthkit');
  });
  it('sem a exigência (integração desligada) o HealthKit não é cobrado', () => {
    expect(E.compareEntitlements(E.parsePlist(IPA_OK), E.parsePlist(PROJECT_SIWA)).problems).toEqual([]);
  });
  it('e a exigência do Sign in with Apple continua valendo junto', () => {
    const r = E.compareEntitlements(E.parsePlist(plist(HK)), {}, { requireAppleSignIn: true, requireHealthKit: true }).problems.join('|');
    expect(r).toContain('com.apple.developer.applesignin');
    expect(r).toContain('com.apple.developer.healthkit');
  });
});

describe('CLI', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), 'ents-')); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  const run = (ipa: string, project: string | null, ...extra: string[]) => {
    writeFileSync(path.join(dir, 'ipa.plist'), ipa);
    if (project !== null) writeFileSync(path.join(dir, 'proj.entitlements'), project);
    const r = spawnSync(process.execPath, [SCRIPT, '--ipa', path.join(dir, 'ipa.plist'), '--project', project === null ? 'none' : path.join(dir, 'proj.entitlements'), ...extra], { encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '' } });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };
  it('passa e mostra só os nomes das chaves', () => {
    const r = run(IPA_OK, PROJECT_SIWA, '--require-applesignin');
    expect(r.code).toBe(0);
    expect(r.out).toContain('com.apple.developer.applesignin');
    expect(r.out).not.toContain('TEAM.com.duofitness.app'); // valores do .ipa não são impressos
  });
  it('falha com ::error:: quando falta o Sign in with Apple', () => {
    const r = run(IPA_SEM_SIWA, PROJECT_SIWA, '--require-applesignin');
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::Falta no .ipa o entitlement com.apple.developer.applesignin');
  });
  it('projeto sem entitlements e sem exigência: ok; sem arquivo do projeto (none) com exigência: falha', () => {
    expect(run(IPA_OK, PROJECT_VAZIO).code).toBe(0);
    expect(run(IPA_OK, null).code).toBe(0);
    expect(run(IPA_OK, null, '--require-applesignin').code).toBe(1);
  });
  it('--require-healthkit: passa com o entitlement e falha com ::error:: (nome da chave, sem valores) sem ele', () => {
    const ok = run(IPA_COM_HK, PROJECT_HK, '--require-healthkit');
    expect(ok.code, ok.out).toBe(0);
    expect(ok.out).toContain('com.apple.developer.healthkit');
    const ruim = run(IPA_OK, PROJECT_HK, '--require-healthkit');
    expect(ruim.code).toBe(1);
    expect(ruim.out).toContain('::error::Falta no .ipa o entitlement com.apple.developer.healthkit');
    expect(ruim.out).not.toContain('TEAM.com.duofitness.app');
  });
  it('arquivo ilegível ou argumentos ausentes falham com mensagem', () => {
    expect(run('lixo', PROJECT_SIWA).out).toContain('::error::Não consegui ler os entitlements do .ipa');
    const r = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
    expect(r.status).toBe(2);
  });
});

describe.skipIf(!hasBash)('o passo do ios.yml (bash -e, codesign falso, .ipa de fixture)', () => {
  let work: string;
  beforeEach(() => { work = mkdtempSync(path.join(tmpdir(), 'ents-step-')); });
  afterEach(() => rmSync(work, { recursive: true, force: true }));

  const stepRun = () => yaml.load(readFileSync(path.join(REPO, '.github/workflows/ios.yml'), 'utf8')).jobs.build!.steps.find((s) => (s.name ?? '').startsWith('Conferir os entitlements do .ipa'))!.run!;

  function runStep(opts: { ipaEnts: string; projectEnts: string | null; auth?: string; firebase?: string; health?: string; signArchive?: string }) {
    mkdirSync(path.join(work, 'tmp', 'ipa-unzipped', 'Payload', 'DuoFitness.app'), { recursive: true });
    mkdirSync(path.join(work, 'scripts'), { recursive: true });
    mkdirSync(path.join(work, 'bin'), { recursive: true });
    mkdirSync(path.join(work, 'ios', 'DuoFitness'), { recursive: true });
    writeFileSync(path.join(work, 'scripts', 'check-ipa-entitlements.mjs'), readFileSync(SCRIPT));
    writeFileSync(path.join(work, 'ipa-ents.xml'), opts.ipaEnts);
    // codesign falso: só entende "-d --entitlements :-" e devolve o plist da fixture
    if (opts.projectEnts !== null) writeFileSync(path.join(work, 'ios', 'DuoFitness', 'DuoFitness.entitlements'), opts.projectEnts);
    // codesign falso como função de shell: só entende "-d --entitlements :-" e devolve o plist da fixture
    const script = `codesign() { cat "$FAKE_IPA_ENTS"; }\n${stepRun()}`;
    writeFileSync(path.join(work, 'step.sh'), script);
    const r = spawnSync('bash', ['-e', px(path.join(work, 'step.sh'))], {
      cwd: work, encoding: 'utf8',
      env: { ...process.env, RUNNER_TEMP: px(path.join(work, 'tmp')), XC_SCHEME: 'DuoFitness', FAKE_IPA_ENTS: px(path.join(work, 'ipa-ents.xml')),
        EXPO_PUBLIC_AUTH_ENABLED: opts.auth ?? '', FIREBASE_ENABLED: opts.firebase ?? '', HEALTH_INTEGRATION_ENABLED: opts.health ?? '', SIGN_ARCHIVE: opts.signArchive ?? 'false', GITHUB_STEP_SUMMARY: '' },
    });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  }

  it('HEALTH_INTEGRATION_ENABLED=true e .ipa SEM HealthKit (archive sem assinatura): FALHA e orienta sign_archive=true', () => {
    const r = runStep({ ipaEnts: IPA_OK, projectEnts: PROJECT_HK, health: 'true', signArchive: 'false' });
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::Falta no .ipa o entitlement com.apple.developer.healthkit');
    expect(r.out).toContain('::notice::HealthKit ligado com o archive SEM assinatura');
  });
  it('HEALTH_INTEGRATION_ENABLED=true e .ipa COM HealthKit: passa (sem aviso quando o archive é assinado)', () => {
    const r = runStep({ ipaEnts: IPA_COM_HK, projectEnts: PROJECT_HK, health: 'true', signArchive: 'true' });
    expect(r.code, r.out).toBe(0);
    expect(r.out).not.toContain('::notice::HealthKit ligado');
  });
  it('HEALTH_INTEGRATION_ENABLED vazio: o HealthKit não é exigido (o app atual não usa HealthKit)', () => {
    const r = runStep({ ipaEnts: IPA_OK, projectEnts: PROJECT_SIWA });
    expect(r.code, r.out).toBe(0);
  });
  it('contas + Firebase ligados e .ipa COM Sign in with Apple: passa', () => {
    const r = runStep({ ipaEnts: IPA_OK, projectEnts: PROJECT_SIWA, auth: 'true', firebase: 'true' });
    expect(r.code, r.out).toBe(0);
  });
  it('contas + Firebase ligados e .ipa SEM Sign in with Apple (archive sem assinatura perdeu): FALHA com ::error::', () => {
    const r = runStep({ ipaEnts: IPA_SEM_SIWA, projectEnts: PROJECT_SIWA, auth: 'true', firebase: 'true' });
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::Falta no .ipa o entitlement com.apple.developer.applesignin');
  });
  it('qualquer entitlement do projeto ausente no .ipa falha, mesmo sem contas', () => {
    const r = runStep({ ipaEnts: IPA_SEM_SIWA, projectEnts: PROJECT_SIWA });
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::');
  });
  it('contas ligadas SEM Firebase: não exige o Sign in with Apple (o login da Apple nem existe), mas avisa', () => {
    const r = runStep({ ipaEnts: IPA_SEM_SIWA, projectEnts: PROJECT_VAZIO, auth: 'true', firebase: '' });
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('::notice::Contas ligadas, mas sem Firebase');
  });
  it('build sem contas e sem entitlements no projeto: passa (build normal intacto)', () => {
    expect(runStep({ ipaEnts: IPA_SEM_SIWA, projectEnts: null }).code).toBe(0);
  });
});
