// ios-log-hints.mjs: erro do RNFB com frameworks estáticos, linhas de erro sanitizadas e sanitização de pasta de logs.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do repositório, sem tipos
import * as S from '../../scripts/ios-log-sanitize.mjs';

const SCRIPT = path.resolve(__dirname, '../../scripts/ios-log-hints.mjs');
let dir: string;
beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), 'ios-hints-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function run(log: string, extra: string[] = [], env: Record<string, string> = {}) {
  const f = path.join(dir, 'x.log');
  writeFileSync(f, log);
  const r = spawnSync(process.execPath, [SCRIPT, f, ...extra], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true', GITHUB_STEP_SUMMARY: '', ...env } });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const FAKE_KEY = 'AI' + 'za' + 'Sy' + 'B'.repeat(33); // formato de chave do Google, montado em pedaços

describe('classificação do erro do RNFB (non-modular header)', () => {
  const LOG = [
    "/Users/runner/work/app/ios/Pods/RNFBApp/ios/RNFBApp/RCTConvert+FIRApp.h:21:9: error: include of non-modular header inside framework module 'RNFBApp.RCTConvert_FIRApp': '/Users/runner/.../React/RCTConvert.h' [-Werror,-Wnon-modular-include-in-framework-module]",
    '/Users/runner/.../RCTBridgeModule.h: error: include of non-modular header inside framework module',
    '** ARCHIVE FAILED **',
    'PrecompileModule /Users/runner/Library/Developer/Xcode/DerivedData/ExplicitPrecompiledModules/RNFBApp-ABC.pcm',
  ].join('\n');

  it('reconhece, explica a causa e a ação (forceStaticLinking, marcadores, reserva documentada, JS SDK)', () => {
    const r = run(LOG);
    expect(r.code).toBe(0);
    expect(r.out).toContain('::error::CAUSA: o pod do React Native Firebase (RNFBApp/RNFBAuth) foi compilado como FRAMEWORK');
    expect(r.out).toContain('AÇÃO:');
    expect(r.out).toContain('ios.forceStaticLinking');
    expect(r.out).toContain('[withFirebaseIosFix]');
    expect(r.out).toContain('buildReactNativeFromSource=true');
    expect(r.out).toContain('Firebase JS SDK');
    expect(r.out).not.toContain('Não reconheci a causa'); // há causa conhecida: não cai no fallback
    expect(r.out).not.toContain('/Users/runner'); // nunca imprime linhas cruas
  });

  it('também reconhece só pelo PrecompileModule do RNFB', () => {
    expect(run('PrecompileModule ... ExplicitPrecompiledModules/RNFBApp').out).toContain('CAUSA: o pod do React Native Firebase');
  });

  it('modulemap do React Native pré-compilado e pods Swift sem frameworks', () => {
    expect(run('error: module map file /x/React-use-frameworks.modulemap not found').out).toContain('React-Core-prebuilt');
    expect(run("[!] The following Swift pods cannot yet be integrated as static libraries:\nThe Swift pod `FirebaseCoreInternal` depends upon `GoogleUtilities`").out).toContain('ios.useFrameworks=static');
  });
});

describe('causa não reconhecida: primeiras linhas de erro, sanitizadas', () => {
  it('imprime até 40 linhas com error:, Undefined symbol, No such module, fatal error, PhaseScriptExecution failed', () => {
    const lines = Array.from({ length: 60 }, (_, i) => `file${i}.m:1:1: error: algo novo ${i}`);
    const log = ['linha normal', ...lines, 'Undefined symbol: _foo', "No such module 'Bar'", 'fatal error: x', 'PhaseScriptExecution failed with a nonzero exit code'].join('\n');
    const r = run(log, ['--stage', 'pod-install']);
    expect(r.code).toBe(1);
    expect(r.out).toContain('Não reconheci a causa no log (pod-install)');
    expect(r.out).toContain('::group::Primeiras linhas de erro (pod-install)');
    const shown = r.out.split('\n').filter((l) => /error: algo novo/.test(l));
    expect(shown).toHaveLength(40);
    expect(shown[0]).toContain('algo novo 0');
    expect(r.out).not.toContain('algo novo 40');
    expect(r.out).not.toContain('linha normal');
  });

  it('inclui os outros tipos quando cabem', () => {
    const r = run(['x', 'Undefined symbol: _foo', "No such module 'Bar'", 'fatal error: x', 'PhaseScriptExecution failed with a nonzero exit code'].join('\n'));
    for (const t of ['Undefined symbol: _foo', "No such module 'Bar'", 'fatal error: x', 'PhaseScriptExecution failed']) expect(r.out).toContain(t);
  });

  it('mascara segredos e OMITE linhas que pareçam conteúdo de arquivos do Firebase', () => {
    const log = [
      `error: chave ${FAKE_KEY} vazou`,
      'error: <key>API_KEY</key><string>valor-secreto-123</string>',
      'error: GOOGLE_APP_ID = 1:123:ios:abc',
      'error: "current_key": "xyz"',
      'error: Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123456789abcdefghij',
      'error: token ' + 'a1b2c3d4e5'.repeat(6),
      'error: eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop',
      'error: linha normal com ./Pods/RNFBApp',
    ].join('\n');
    const r = run(log);
    for (const proibido of [FAKE_KEY, 'valor-secreto-123', '1:123:ios:abc', '"xyz"', 'abcdefghijklmnopqrstuvwxyz0123456789', 'a1b2c3d4e5a1b2c3d4e5', 'eyJhbGci']) expect(r.out).not.toContain(proibido);
    expect(r.out).toContain('[linha omitida: pode conter configuração ou segredo]');
    expect(r.out).toContain('error: linha normal com ./Pods/RNFBApp');
  });

  it('grava as linhas no resumo do job quando GITHUB_STEP_SUMMARY existe', () => {
    const summary = path.join(dir, 'summary.md');
    writeFileSync(summary, '');
    run('error: algo novo', [], { GITHUB_STEP_SUMMARY: summary });
    expect(readFileSync(summary, 'utf8')).toMatch(/Primeiras linhas de erro \(xcodebuild, sanitizadas\)[\s\S]*error: algo novo/);
  });

  it('sem nenhuma linha de erro avisa em vez de ficar mudo', () => {
    expect(run('tudo certo\nsem problemas').out).toContain('(nenhuma linha com error:');
  });
});

describe('sanitização da pasta de logs (antes do artifact)', () => {
  it('reescreve só os .log, omitindo linhas sensíveis', () => {
    const logs = path.join(dir, 'logs');
    mkdirSync(logs);
    writeFileSync(path.join(logs, 'a.log'), `ok\n<key>API_KEY</key>\nchave ${FAKE_KEY}\nfim`);
    writeFileSync(path.join(logs, 'b.log'), 'nada a omitir');
    writeFileSync(path.join(logs, 'c.json'), `${FAKE_KEY}`);
    const r = spawnSync(process.execPath, [SCRIPT, '--sanitize-dir', logs], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('2 arquivo(s), 1 com linhas omitidas');
    const a = readFileSync(path.join(logs, 'a.log'), 'utf8');
    expect(a).toBe('ok\n[linha omitida: pode conter configuração ou segredo]\n[linha omitida: pode conter configuração ou segredo]\nfim');
    expect(readFileSync(path.join(logs, 'b.log'), 'utf8')).toBe('nada a omitir');
  });
  it('pasta inexistente não derruba o passo', () => {
    const r = spawnSync(process.execPath, [SCRIPT, '--sanitize-dir', path.join(dir, 'nao-existe')], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Não consegui sanitizar');
  });
  it('sanitizeLine: omite, mascara e limita o tamanho', () => {
    expect(S.sanitizeLine('x'.repeat(1000)).length).toBeLessThanOrEqual(400);
    expect(S.sanitizeLine('Authorization: Bearer abc123')).toBe('Authorization: Bearer ***');
  });
});
