// check-firebase-podfile.mjs e os passos de diagnóstico do ios.yml / ci.yml para o Firebase no iOS.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do repositório, sem tipos
import * as C from '../../scripts/check-firebase-podfile.mjs';

const REPO = path.resolve(__dirname, '../..');
const req = createRequire(path.join(REPO, 'package.json'));
const yaml = req('js-yaml') as { load: (s: string) => { jobs: Record<string, { steps: Step[] }> } };
type Step = { name?: string; run?: string; if?: string; uses?: string; with?: Record<string, string> };
const wf = (f: string) => yaml.load(readFileSync(path.join(REPO, '.github/workflows', f), 'utf8'));
const fix = req('./plugins/withFirebaseIosFix.js') as { patchPodfile: (t: string) => string };
const CR = String.fromCharCode(13);
const TEMPLATE = readFileSync(path.join(__dirname, 'fixtures/Podfile.sdk54.rb'), 'utf8').split(CR).join('');
const SCRIPT = path.join(REPO, 'scripts/check-firebase-podfile.mjs');

const PROPS_ON = { 'ios.useFrameworks': 'static', 'ios.forceStaticLinking': '["RNFBApp","RNFBAuth"]', 'expo.jsEngine': 'hermes' };

describe('checkPresent / checkAbsent', () => {
  const patched = fix.patchPodfile(TEMPLATE);
  it('Podfile corrigido + propriedades certas: sem problemas', () => {
    expect(C.checkPresent(patched, PROPS_ON)).toEqual([]);
  });
  it('aponta cada falta: frameworks, pods forçados, marcadores e duplicação', () => {
    expect(C.checkPresent(patched, { ...PROPS_ON, 'ios.useFrameworks': 'dynamic' })).toContain('Podfile.properties.json sem ios.useFrameworks=static');
    expect(C.checkPresent(patched, { ...PROPS_ON, 'ios.forceStaticLinking': '["RNFBApp"]' })).toContain('ios.forceStaticLinking sem RNFBAuth');
    expect(C.checkPresent(patched, { ...PROPS_ON, 'ios.forceStaticLinking': 'lixo' })).toContain('ios.forceStaticLinking não é um JSON válido');
    expect(C.checkPresent(TEMPLATE, PROPS_ON).join('|')).toMatch(/0 marcador/);
    expect(C.checkPresent(patched + patched, PROPS_ON).join('|')).toMatch(/2 marcador/); // duplicado
  });
  it('sem Firebase: o template puro e propriedades sem frameworks passam; qualquer vestígio falha', () => {
    expect(C.checkAbsent(TEMPLATE, { 'expo.jsEngine': 'hermes' })).toEqual([]);
    expect(C.checkAbsent(patched, {}).length).toBeGreaterThanOrEqual(3);
    expect(C.checkAbsent(TEMPLATE, { 'ios.forceStaticLinking': '[]' })).toHaveLength(1);
    expect(C.checkAbsent(TEMPLATE, { 'ios.useFrameworks': 'static' })).toHaveLength(1);
  });
});

describe('CLI (projeto ios/ de fixture)', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), 'podfile-check-')); mkdirSync(path.join(dir, 'ios')); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  const put = (podfile: string, props: object) => {
    writeFileSync(path.join(dir, 'ios', 'Podfile'), podfile);
    writeFileSync(path.join(dir, 'ios', 'Podfile.properties.json'), JSON.stringify(props));
  };
  const run = (...args: string[]) => {
    const r = spawnSync(process.execPath, [SCRIPT, '--ios-dir', path.join(dir, 'ios'), ...args], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true', GITHUB_STEP_SUMMARY: '' } });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };

  it('COM Firebase: passa com o Podfile corrigido', () => {
    put(fix.patchPodfile(TEMPLATE), PROPS_ON);
    const r = run();
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('Podfile COM Firebase');
  });
  it('COM Firebase: falha se o plugin não rodou (template puro)', () => {
    put(TEMPLATE, {});
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::Podfile.properties.json sem ios.useFrameworks=static');
  });
  it('SEM Firebase: o Podfile como o template passa; o corrigido falha (vazou para o build normal)', () => {
    put(TEMPLATE, { 'expo.jsEngine': 'hermes' });
    expect(run('--expect-absent').code).toBe(0);
    put(fix.patchPodfile(TEMPLATE), PROPS_ON);
    const r = run('--expect-absent');
    expect(r.code).toBe(1);
    expect(r.out).toContain('mas o build é SEM Firebase');
  });
  it('Podfile ausente: mensagem clara', () => {
    rmSync(path.join(dir, 'ios'), { recursive: true, force: true });
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('Podfile não encontrado');
  });
  it('não lê o GoogleService-Info.plist (o script nem cita o arquivo no código)', () => {
    const src = readFileSync(SCRIPT, 'utf8').replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/GoogleService-Info/);
  });
});

describe('ios.yml: logs do prebuild e do pod install, Podfile conferido e artifact sanitizado', () => {
  const steps = wf('ios.yml').jobs.build!.steps;
  const find = (re: RegExp) => steps.find((s) => re.test(s.run ?? ''))!;
  it('o prebuild grava prebuild.log na pasta do artifact e chama o ios-log-hints se falhar', () => {
    const s = find(/npx expo prebuild --platform ios/);
    expect(s.run).toContain('xcodebuild-logs');
    expect(s.run).toContain('tee "$LOG_DIR/prebuild.log"');
    expect(s.run).toContain('${PIPESTATUS[0]}');
    expect(s.run).toContain('ios-log-hints.mjs "$LOG_DIR/prebuild.log" --stage prebuild');
  });
  it('o pod install grava pod-install.log e chama o ios-log-hints se falhar', () => {
    const s = steps.find((x) => x.name === 'pod install')!;
    expect(s.run).toContain('tee "$LOG_DIR/pod-install.log"');
    expect(s.run).toContain('ios-log-hints.mjs "$LOG_DIR/pod-install.log" --stage pod-install');
  });
  it('o archive passa a etapa ao ios-log-hints', () => {
    expect(find(/xcodebuild archive/).run).toContain('--stage archive');
  });
  it('o Podfile do Firebase é conferido só com a flag, logo depois do prebuild e antes do pod install', () => {
    const idx = (re: RegExp) => steps.findIndex((s) => re.test(s.run ?? ''));
    const chk = steps.find((s) => /check-firebase-podfile\.mjs/.test(s.run ?? ''))!;
    expect(chk.if).toBe("env.FIREBASE_ENABLED == 'true'");
    expect(idx(/check-firebase-podfile/)).toBeGreaterThan(idx(/npx expo prebuild --platform ios/));
    expect(idx(/check-firebase-podfile/)).toBeLessThan(steps.findIndex((x) => x.name === 'pod install'));
  });
  it('o artifact xcodebuild-logs sobe em QUALQUER falha, depois da sanitização, e a pasta tem o diagnóstico do Podfile', () => {
    const up = steps.findIndex((s) => /upload-artifact/.test(s.uses ?? '') && /xcodebuild-logs/.test(String(s.with?.name)));
    expect(steps[up]!.if).toBe('failure()');
    expect(steps[up]!.with!.path).toContain('xcodebuild-logs');
    const prep = steps.findIndex((s) => /--sanitize-dir/.test(s.run ?? ''));
    expect(prep).toBeGreaterThan(-1);
    expect(prep).toBeLessThan(up);
    expect(steps[prep]!.if).toBe('failure()');
    expect(steps[prep]!.run).toMatch(/cp ios\/Podfile ios\/Podfile\.properties\.json ios\/Podfile\.lock/);
    expect(steps[prep]!.run).not.toMatch(/GoogleService-Info|\.firebase-config/); // o arquivo do Firebase nunca vai para o artifact
  });
});

describe('ci.yml: prebuild iOS sem e com Firebase', () => {
  const jobs = wf('ci.yml').jobs;
  it('o job sem Firebase confere que o Podfile ficou como o template', () => {
    expect(jobs['ios-prebuild']!.steps.some((s) => /check-firebase-podfile\.mjs --expect-absent/.test(s.run ?? ''))).toBe(true);
  });
  it('o job com Firebase usa arquivo FALSO, instala os módulos, gera o iOS, confere o Podfile, a sintaxe Ruby e a idempotência', () => {
    const runs = jobs['ios-prebuild-firebase']!.steps.map((s) => s.run ?? '');
    const at = (re: RegExp) => runs.findIndex((r) => re.test(r));
    expect(at(/NOT-A-REAL-KEY/)).toBeGreaterThan(-1);
    expect(at(/install-firebase-deps\.mjs/)).toBeGreaterThan(at(/NOT-A-REAL-KEY/));
    expect(at(/check-autolinking\.mjs --platform ios/)).toBeGreaterThan(at(/install-firebase-deps/));
    expect(at(/expo prebuild --platform ios/)).toBeGreaterThan(at(/check-autolinking/));
    expect(at(/check-firebase-podfile\.mjs$/m)).toBeGreaterThan(at(/expo prebuild --platform ios/));
    expect(at(/ruby -c ios\/Podfile/)).toBeGreaterThan(-1);
    const idem = runs.find((r) => /prebuild/.test(r) && /check-firebase-podfile/.test(r))!;
    expect(idem).not.toContain('--clean'); // roda de novo sobre o ios/ existente
    expect(runs.join('\n')).not.toMatch(/secrets\./);
  });
});
