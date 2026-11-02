// Versionamento SemVer 2.0.0: biblioteca pura, bump-version, check-version, conferência da tag, pisos de build, canais e a ligação nos workflows.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do repositório, sem tipos
import * as S from '../../scripts/lib/semver.mjs';
// @ts-expect-error módulo JS do repositório, sem tipos
import { updateChangelog } from '../../scripts/bump-version.mjs';
// @ts-expect-error módulo JS do repositório, sem tipos
import { checkVersion } from '../../scripts/check-version.mjs';

const REPO = path.resolve(__dirname, '../..');
const req = createRequire(path.join(REPO, 'package.json'));
const yaml = req('js-yaml') as { load: (s: string) => { on: any; jobs: Record<string, { steps: { name?: string; run?: string; env?: Record<string, string> }[] }> } };
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const cur = (core: string, prerelease = '') => ({ core, prerelease });

describe('expressão regular oficial do semver.org', () => {
  const OK = ['0.0.4', '1.2.3', '10.20.30', '1.1.2-prerelease+meta', '1.1.2+meta', '1.1.2+meta-valid', '1.0.0-alpha', '1.0.0-beta', '1.0.0-alpha.beta', '1.0.0-alpha.1', '1.0.0-beta.1', '1.0.0-rc.1',
    '1.0.0-alpha0.valid', '1.0.0-alpha.0valid', '1.0.0-rc.1+build.1', '2147483647.2147483647.2147483647', '1.0.0-0A.is.legal', '1.0.0+0.build.1-rc.10000aaa-kk-0.1', '1.0.0-beta.3+31'];
  const BAD = ['1', '1.2', '1.2.3-0123', '1.2.3-0123.0123', '1.1.2+.123', '+invalid', '-invalid', '-invalid+invalid', '-invalid.01', 'alpha', 'alpha.beta', '1.0.0-alpha_beta', '01.1.1', '1.01.1', '1.1.01',
    '1.2.3.DEV', '1.2-SNAPSHOT', '1.2.31.2.3----RC-SNAPSHOT.12.09.1--..12+788', '1.2-RC-SNAPSHOT', '-1.0.3-gamma+b7718', '+justmeta', '9.8.7+meta+meta', '9.8.7-whatever+meta+meta', '', ' 1.0.0', 'v1.0.0', '1.0.0-'];
  it.each(OK)('aceita %s', (v) => expect(S.isValid(v)).toBe(true));
  it.each(BAD)('rejeita "%s"', (v) => expect(S.isValid(v)).toBe(false));
  it('núcleo com zero à esquerda é inválido; nome completo = núcleo + (-prelançamento) + (+build)', () => {
    expect(S.CORE_RE.test('1.0.0')).toBe(true);
    expect(S.CORE_RE.test('01.0.0')).toBe(false);
    expect(S.fullName('1.0.0')).toBe('1.0.0');
    expect(S.fullName('1.0.0', 'beta.1')).toBe('1.0.0-beta.1');
    expect(S.fullName('1.0.0', 'beta.1', 33)).toBe('1.0.0-beta.1+33');
    expect(S.fullName('1.0.0', '', 33)).toBe('1.0.0+33');
    expect(S.releaseName('1.0.0', 'rc.2')).toBe('1.0.0-rc.2');
    expect(S.parse('1.0.0-beta.1+31')).toMatchObject({ core: '1.0.0', prerelease: 'beta.1', build: '31' });
    expect(S.parse('lixo')).toBeNull();
  });
  it('prelançamentos aceitos pelo app: "", beta.N e rc.N (N >= 1, sem zero à esquerda)', () => {
    for (const ok of ['', 'beta.1', 'beta.12', 'rc.1']) expect(S.PRERELEASE_RE.test(ok), ok).toBe(true);
    for (const bad of ['beta', 'beta.0', 'beta.01', 'alpha.1', 'rc', 'beta.1.2', 'BETA.1', 'beta.-1']) expect(S.PRERELEASE_RE.test(bad), bad).toBe(false);
  });
});

describe('precedência (item 11 da SemVer)', () => {
  it('alpha < beta < rc < versão final, e o exemplo da própria especificação', () => {
    const order = ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0'];
    for (let i = 0; i < order.length - 1; i++) expect(S.compare(order[i], order[i + 1]), `${order[i]} < ${order[i + 1]}`).toBe(-1);
    for (let i = 1; i < order.length; i++) expect(S.compare(order[i], order[i - 1])).toBe(1);
    expect(S.compare('1.0.0-alpha.1', '1.0.0-alpha.1')).toBe(0);
  });
  it('beta.2 < beta.11 (numérico, não alfabético); numérico < alfanumérico; mais campos > menos campos', () => {
    expect(S.compare('1.0.0-beta.2', '1.0.0-beta.11')).toBe(-1);
    expect(S.compare('1.0.0-1', '1.0.0-a')).toBe(-1);
    expect(S.compare('1.0.0-alpha', '1.0.0-alpha.1')).toBe(-1);
  });
  it('o núcleo manda antes do prelançamento e o +build NÃO conta', () => {
    expect(S.compare('1.0.1-beta.1', '1.0.0')).toBe(1);
    expect(S.compare('2.0.0-rc.1', '1.9.9')).toBe(1);
    expect(S.compare('1.0.0+31', '1.0.0+99')).toBe(0);
    expect(S.compare('1.0.0-beta.1+1', '1.0.0-beta.1+2')).toBe(0);
  });
  it('versão inválida na comparação lança', () => {
    expect(() => S.compare('1.0', '1.0.0')).toThrow();
  });
});

describe('bump (todos os casos)', () => {
  it('patch, minor e major sobem, zeram à direita e LIMPAM o prelançamento', () => {
    expect(S.bump(cur('1.4.2', 'rc.2'), 'patch')).toEqual({ core: '1.4.3', prerelease: '' });
    expect(S.bump(cur('1.4.2', 'beta.3'), 'minor')).toEqual({ core: '1.5.0', prerelease: '' });
    expect(S.bump(cur('1.4.2'), 'major')).toEqual({ core: '2.0.0', prerelease: '' });
    expect(S.bump(cur('0.9.9'), 'minor')).toEqual({ core: '0.10.0', prerelease: '' });
    expect(S.bump(cur('1.9.9', 'beta.1'), 'patch')).toEqual({ core: '1.9.10', prerelease: '' });
  });
  it('beta incrementa beta.N ou inicia beta.1', () => {
    expect(S.bump(cur('1.0.0', 'beta.1'), 'beta')).toEqual({ core: '1.0.0', prerelease: 'beta.2' });
    expect(S.bump(cur('1.0.0', 'beta.9'), 'beta')).toEqual({ core: '1.0.0', prerelease: 'beta.10' });
    expect(S.bump(cur('1.1.0', ''), 'beta')).toEqual({ core: '1.1.0', prerelease: 'beta.1' }); // núcleo ainda não lançado
  });
  it('rc incrementa rc.N ou inicia rc.1 (vindo de beta ou de núcleo não lançado)', () => {
    expect(S.bump(cur('1.0.0', 'beta.4'), 'rc')).toEqual({ core: '1.0.0', prerelease: 'rc.1' });
    expect(S.bump(cur('1.0.0', 'rc.1'), 'rc')).toEqual({ core: '1.0.0', prerelease: 'rc.2' });
    expect(S.bump(cur('1.1.0', ''), 'rc')).toEqual({ core: '1.1.0', prerelease: 'rc.1' });
  });
  it('release remove o prelançamento; sobre versão que já é final, recusa', () => {
    expect(S.bump(cur('1.0.0', 'rc.2'), 'release')).toEqual({ core: '1.0.0', prerelease: '' });
    expect(S.bump(cur('1.0.0', 'beta.1'), 'release')).toEqual({ core: '1.0.0', prerelease: '' });
    expect(() => S.bump(cur('1.0.0'), 'release')).toThrow(/já é uma versão final/);
  });
  it('nunca volta de rc para beta (a precedência cairia)', () => {
    expect(() => S.bump(cur('1.0.0', 'rc.1'), 'beta')).toThrow(/rc/);
  });
  it('versão lançada (com tag) não muda: beta e rc sobre ela são recusados; patch/minor/major seguem possíveis', () => {
    const released = (core: string) => core === '1.0.0';
    expect(() => S.bump(cur('1.0.0'), 'beta', { released })).toThrow(/já foi lançada/);
    expect(() => S.bump(cur('1.0.0'), 'rc', { released })).toThrow(/já foi lançada/);
    expect(S.bump(cur('1.0.0'), 'patch', { released })).toEqual({ core: '1.0.1', prerelease: '' });
    expect(S.bump(cur('1.0.0', 'beta.1'), 'beta', { released })).toEqual({ core: '1.0.0', prerelease: 'beta.2' }); // ainda em prelançamento
  });
  it('rejeita tipo inválido, versão atual inválida e prelançamento fora do padrão', () => {
    expect(() => S.bump(cur('1.0.0'), 'gigante')).toThrow(/tipo inválido/);
    expect(() => S.bump(cur('01.0.0'), 'patch')).toThrow(/inválida/);
    expect(() => S.bump(cur('1.0', ''), 'patch')).toThrow();
    expect(() => S.bump(cur('1.0.0', 'alpha.1'), 'patch')).toThrow(/fora do padrão/);
    expect(() => S.bump(cur('1.0.0', 'beta'), 'rc')).toThrow(/fora do padrão/);
  });
  it('a sequência de um ciclo completo: beta.1 -> beta.2 -> rc.1 -> release -> patch', () => {
    let v = cur('1.0.0', 'beta.1');
    const steps: [string, string][] = [['beta', '1.0.0-beta.2'], ['rc', '1.0.0-rc.1'], ['release', '1.0.0'], ['patch', '1.0.1']];
    for (const [k, expected] of steps) { v = S.bump(v, k); expect(S.releaseName(v.core, v.prerelease)).toBe(expected); }
  });
  it('cada passo do ciclo SOBE na precedência (nunca regride)', () => {
    let v = cur('1.0.0', 'beta.1');
    for (const k of ['beta', 'rc', 'rc', 'release', 'patch']) {
      const next = S.bump(v, k);
      expect(S.compare(S.releaseName(next.core, next.prerelease), S.releaseName(v.core, v.prerelease)), k).toBe(1);
      v = next;
    }
  });
  it('canal pelo prelançamento', () => {
    expect([S.channelOf(''), S.channelOf('beta.2'), S.channelOf('rc.1'), S.channelOf('alpha.1')]).toEqual(['store', 'beta', 'rc', 'dev']);
  });
});

describe('pisos de build', () => {
  it('iOS 31 e Android 0: a build precisa ser MAIOR que o piso', () => {
    expect(S.BUILD_FLOORS).toEqual({ ios: 31, android: 0 });
    expect(S.checkBuild('ios', 31)).toHaveLength(1);
    expect(S.checkBuild('ios', 30)[0]).toMatch(/piso/);
    expect(S.checkBuild('ios', 32)).toEqual([]);
    expect(S.checkBuild('android', 0)).not.toEqual([]);
    expect(S.checkBuild('android', 1)).toEqual([]);
    expect(S.checkBuild('ios', '45')).toEqual([]);
  });
  it('versionCode: inteiro positivo e no máximo 2100000000 (Google Play)', () => {
    expect(S.checkBuild('android', 2100000000)).toEqual([]);
    expect(S.checkBuild('android', 2100000001)[0]).toMatch(/limite/);
    for (const bad of ['abc', '-3', '1.5', '', undefined, null, 'NaN', '0x10']) expect(S.checkBuild('android', bad as never)[0], String(bad)).toMatch(/inteiro positivo/);
    expect(S.toBuild(' 12 ')).toBe(12);
    expect(S.checkBuild('web', 5)[0]).toMatch(/plataforma/);
  });
});

describe('conferência da tag', () => {
  it('aceita a tag igual ao nome esperado, com prefixo v (Android) ou ios-v (iOS), inclusive com prelançamento', () => {
    expect(S.checkTag('v1.0.0-beta.3', '1.0.0-beta.3')).toEqual([]);
    expect(S.checkTag('ios-v1.0.0-beta.3', '1.0.0-beta.3')).toEqual([]);
    expect(S.checkTag('v1.0.0', '1.0.0')).toEqual([]);
    expect(S.checkTag('v2.10.3-rc.12', '2.10.3-rc.12')).toEqual([]);
  });
  it('falha com mensagem clara quando diverge, e diz qual tag criar', () => {
    const e = S.checkTag('v1.0.0', '1.0.0-beta.1')[0];
    expect(e).toMatch(/diverge/);
    expect(e).toContain('v1.0.0-beta.1');
    expect(S.checkTag('v1.0.1-beta.1', '1.0.0-beta.1')[0]).toMatch(/diverge/);
  });
  it('rejeita tag mal formada, sem prefixo, com +build ou com zero à esquerda', () => {
    expect(S.checkTag('1.0.0', '1.0.0')[0]).toMatch(/não começa com v/);
    expect(S.checkTag('v1.0', '1.0.0')[0]).toMatch(/SemVer válido/);
    expect(S.checkTag('v01.0.0', '1.0.0')[0]).toMatch(/SemVer válido/);
    expect(S.checkTag('v1.0.0+31', '1.0.0')[0]).toMatch(/\+build/);
    expect(S.checkTag('vbeta', '1.0.0')[0]).toMatch(/SemVer válido/);
  });
});

// ---------- check-version e bump-version sobre uma cópia temporária ----------
function project(over: { appVersion?: string; pkgVersion?: string; prerelease?: string | null; extraApp?: object } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'ver-'));
  const v = over.appVersion ?? '1.0.0';
  writeFileSync(path.join(dir, 'app.json'), JSON.stringify({ expo: { name: 'x', version: v, ...over.extraApp } }, null, 2));
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', version: over.pkgVersion ?? v }, null, 2));
  if (over.prerelease !== null) writeFileSync(path.join(dir, 'versao.json'), JSON.stringify({ prerelease: over.prerelease ?? 'beta.1' }));
  writeFileSync(path.join(dir, 'CHANGELOG.md'), '# Registro\n\n## [Não lançado]\n\n- Algo novo.\n\n## Textos da loja\n\nmodelo\n');
  return dir;
}
const node = (script: string, args: string[], env: Record<string, string> = {}) => {
  const r = spawnSync(process.execPath, [path.join(REPO, 'scripts', script), ...args], { encoding: 'utf8', env: { ...process.env, RUN_NUMBER: '', GITHUB_ACTIONS: '', ...env } });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
};

describe('check-version', () => {
  it('o repositório de verdade passa e o app.json, o package.json e o versao.json concordam', () => {
    const r = node('check-version.mjs', []);
    expect(r.code, r.out).toBe(0);
    const app = JSON.parse(read('app.json'));
    expect(JSON.parse(read('package.json')).version).toBe(app.expo.version);
    expect(S.PRERELEASE_RE.test(JSON.parse(read('versao.json')).prerelease)).toBe(true);
  });
  it('núcleo com zero à esquerda ou fora do formato falha', () => {
    for (const bad of ['01.0.0', '1.0', '1.0.0.0', 'v1.0.0', '1.0.0-beta.1']) {
      const dir = project({ appVersion: bad, pkgVersion: bad });
      expect(node('check-version.mjs', ['--root', dir]).code, bad).toBe(1);
    }
  });
  it('app.json e package.json divergentes falham', () => {
    const r = node('check-version.mjs', ['--root', project({ appVersion: '1.2.0', pkgVersion: '1.1.0' })]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/divergem/);
  });
  it('prelançamento fora do padrão e versao.json ausente falham', () => {
    expect(node('check-version.mjs', ['--root', project({ prerelease: 'alpha.1' })]).code).toBe(1);
    expect(node('check-version.mjs', ['--root', project({ prerelease: 'beta' })]).code).toBe(1);
    expect(node('check-version.mjs', ['--root', project({ prerelease: null })]).out).toMatch(/versao\.json não existe/);
  });
  it('a build (RUN_NUMBER) vs o piso: iOS <= 31 falha; Android 0 falha; valores válidos passam; sem plataforma pede --platform', () => {
    const dir = project();
    expect(node('check-version.mjs', ['--root', dir, '--platform', 'ios'], { RUN_NUMBER: '31' }).code).toBe(1);
    expect(node('check-version.mjs', ['--root', dir, '--platform', 'ios'], { RUN_NUMBER: '32' }).code).toBe(0);
    expect(node('check-version.mjs', ['--root', dir, '--platform', 'android'], { RUN_NUMBER: '1' }).code).toBe(0);
    expect(node('check-version.mjs', ['--root', dir, '--platform', 'android'], { RUN_NUMBER: '0' }).code).toBe(1);
    expect(node('check-version.mjs', ['--root', dir, '--platform', 'android'], { RUN_NUMBER: '2100000001' }).code).toBe(1);
    expect(node('check-version.mjs', ['--root', dir, '--platform', 'android'], { RUN_NUMBER: 'abc' }).code).toBe(1);
    expect(node('check-version.mjs', ['--root', dir, '--build', '40']).out).toMatch(/--platform/); // --build explícito sem plataforma
    expect(node('check-version.mjs', ['--root', dir], { RUN_NUMBER: '40' }).code).toBe(0); // só RUN_NUMBER no ambiente, sem --platform: não é conferência de build
  });
  it('a tag: confere com app.json + versao.json (com e sem prelançamento) e falha na divergência', () => {
    const beta = project({ prerelease: 'beta.1' });
    expect(node('check-version.mjs', ['--root', beta, '--platform', 'android', '--build', '5', '--tag', 'v1.0.0-beta.1']).code).toBe(0);
    expect(node('check-version.mjs', ['--root', beta, '--platform', 'android', '--build', '5', '--tag', 'ios-v1.0.0-beta.1']).code).toBe(0);
    const bad = node('check-version.mjs', ['--root', beta, '--platform', 'android', '--build', '5', '--tag', 'v1.0.0']);
    expect(bad.code).toBe(1);
    expect(bad.out).toMatch(/diverge/);
    const final = project({ prerelease: '' });
    expect(node('check-version.mjs', ['--root', final, '--platform', 'android', '--build', '5', '--tag', 'v1.0.0']).code).toBe(0);
    expect(node('check-version.mjs', ['--root', final, '--platform', 'android', '--build', '5', '--tag', 'v1.0.0-beta.1']).code).toBe(1);
  });
  it('item 3 da SemVer: tag do núcleo atual em OUTRO commit (ou apontando para outro núcleo) falha; no mesmo commit passa', () => {
    const dir = project({ prerelease: '' });
    const git = (...a: string[]) => spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: dir, encoding: 'utf8' });
    git('init', '-q'); git('add', '-A'); git('commit', '-qm', 'um');
    git('tag', 'v1.0.0');
    expect(node('check-version.mjs', ['--root', dir]).code).toBe(0); // a tag está no HEAD: é a própria release
    writeFileSync(path.join(dir, 'novo.txt'), 'x'); git('add', '-A'); git('commit', '-qm', 'dois');
    const r = node('check-version.mjs', ['--root', dir]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/já foi lançada/);
    // tag cujo app.json tem outro núcleo
    const dir2 = project({ appVersion: '1.0.0', prerelease: '' });
    const g2 = (...a: string[]) => spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: dir2, encoding: 'utf8' });
    writeFileSync(path.join(dir2, 'app.json'), JSON.stringify({ expo: { version: '0.9.0' } })); g2('init', '-q'); g2('add', '-A'); g2('commit', '-qm', 'a'); g2('tag', 'v1.0.0');
    writeFileSync(path.join(dir2, 'app.json'), JSON.stringify({ expo: { version: '1.0.0' } })); writeFileSync(path.join(dir2, 'package.json'), JSON.stringify({ version: '1.0.0' }));
    expect(node('check-version.mjs', ['--root', dir2]).out).toMatch(/aponta para um app\.json com versão 0\.9\.0/);
  });
  it('channel=store com prelançamento no versao.json FALHA com a mensagem clara; store sem prelançamento e beta/rc/dev com prelançamento passam', () => {
    const beta = project({ prerelease: 'beta.1' });
    const r = node('check-version.mjs', ['--root', beta, '--channel', 'store']);
    expect(r.code).toBe(1);
    expect(r.out).toContain('build de loja exige versao.json sem prelançamento; rode bump-version release');
    expect(r.out).toContain('beta.1');
    expect(node('check-version.mjs', ['--root', project({ prerelease: 'rc.2' }), '--channel', 'store']).code).toBe(1);
    expect(node('check-version.mjs', ['--root', project({ prerelease: '' }), '--channel', 'store']).code).toBe(0);
    for (const ch of ['dev', 'beta', 'rc', '']) expect(node('check-version.mjs', ['--root', beta, '--channel', ch]).code, ch).toBe(0);
  });
  it('versão iOS com letras é recusada (só números e pontos)', () => {
    const r = checkVersion({ root: project({ appVersion: '1.0.0-beta' , pkgVersion: '1.0.0-beta' }), gitFn: () => null });
    expect(r.problems.join(' ')).toMatch(/iOS|MAJOR\.MINOR\.PATCH/);
  });
});

describe('bump-version (script)', () => {
  const run = (dir: string, kind: string, extra: string[] = []) => node('bump-version.mjs', [kind, '--root', dir, '--date', '2026-11-02', ...extra]);
  it('atualiza app.json, package.json, versao.json e o CHANGELOG; não faz commit nem tag; imprime os comandos', () => {
    const dir = project({ prerelease: 'beta.1' });
    const r = run(dir, 'beta');
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('1.0.0-beta.1  ->  1.0.0-beta.2');
    expect(JSON.parse(readFileSync(path.join(dir, 'versao.json'), 'utf8')).prerelease).toBe('beta.2');
    expect(JSON.parse(readFileSync(path.join(dir, 'app.json'), 'utf8')).expo.version).toBe('1.0.0');
    const log = readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
    expect(log).toMatch(/## \[Não lançado\]\n\n## \[1\.0\.0-beta\.2\] - 2026-11-02\n\n- Algo novo\./);
    expect(r.out).toContain('git tag v1.0.0-beta.2');
    expect(r.out).toContain('git tag ios-v1.0.0-beta.2');
    expect(r.out).toContain('nada foi executado');
    expect(spawnSync('git', ['rev-parse', '--git-dir'], { cwd: dir }).status).not.toBe(0); // nenhum repositório criado
  });
  it('minor zera à direita, limpa o prelançamento e mantém package.json sincronizado', () => {
    const dir = project({ appVersion: '1.4.2', prerelease: 'rc.2' });
    expect(run(dir, 'minor').code).toBe(0);
    expect(JSON.parse(readFileSync(path.join(dir, 'app.json'), 'utf8')).expo.version).toBe('1.5.0');
    expect(JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')).version).toBe('1.5.0');
    expect(JSON.parse(readFileSync(path.join(dir, 'versao.json'), 'utf8')).prerelease).toBe('');
    expect(node('check-version.mjs', ['--root', dir]).code).toBe(0);
  });
  it('--dry-run não grava nada; tipo inválido e "release" sobre versão final falham sem alterar arquivos', () => {
    const dir = project({ prerelease: 'beta.1' });
    expect(run(dir, 'rc', ['--dry-run']).out).toContain('simulação');
    expect(JSON.parse(readFileSync(path.join(dir, 'versao.json'), 'utf8')).prerelease).toBe('beta.1');
    expect(run(dir, 'enorme').code).toBe(1);
    const final = project({ prerelease: '' });
    const r = run(final, 'release');
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/já é uma versão final/);
  });
  it('o ciclo completo pelo script termina com um repositório que passa no check-version', () => {
    const dir = project({ prerelease: 'beta.1' });
    for (const k of ['beta', 'rc', 'release', 'patch']) expect(run(dir, k).code, k).toBe(0);
    expect(JSON.parse(readFileSync(path.join(dir, 'app.json'), 'utf8')).expo.version).toBe('1.0.1');
    expect(node('check-version.mjs', ['--root', dir]).code).toBe(0);
  });
});

describe('CHANGELOG (Keep a Changelog)', () => {
  it('move o conteúdo de "Não lançado" para a nova versão e deixa a seção vazia; sem conteúdo, registra "Sem mudanças"', () => {
    const t = '# R\n\n## [Não lançado]\n\n- A\n- B\n\n## [0.9.0] - 2026-01-01\n\n- velho\n';
    const out = updateChangelog(t, '1.0.0', '2026-11-02');
    expect(out).toBe('# R\n\n## [Não lançado]\n\n## [1.0.0] - 2026-11-02\n\n- A\n- B\n\n## [0.9.0] - 2026-01-01\n\n- velho\n');
    expect(updateChangelog('## [Não lançado]\n\n## [0.1.0] - x\n', '0.2.0', '2026-11-02')).toContain('- Sem mudanças registradas.');
    expect(() => updateChangelog('# sem seção', '1.0.0', 'x')).toThrow(/Não lançado/);
    expect(updateChangelog(t.replace(/\n/g, '\r\n'), '1.0.0', 'd')).toContain('\r\n'); // preserva o fim de linha
  });
  it('o CHANGELOG do repositório tem a seção [Não lançado], a nota das builds 1 a 31 e os "Textos da loja"', () => {
    const c = read('CHANGELOG.md');
    expect(c).toContain('## [Não lançado]');
    expect(c).toContain('As builds 1 a 31 foram testes internos anteriores ao versionamento SemVer');
    expect(c).toContain('## Textos da loja');
    expect(c).toContain('Novidades da versão X.Y.Z');
  });
});

describe('workflows: versão, tag, canal e build', () => {
  const wf = (f: string) => yaml.load(read(`.github/workflows/${f}`));
  const step = (f: string) => wf(f).jobs.build!.steps.find((s) => /Versão/.test(s.name ?? ''))!;
  it('as duas entradas de workflow_dispatch "channel" (dev | beta | rc | store), padrão beta', () => {
    for (const f of ['android.yml', 'ios.yml']) {
      const ch = wf(f).on.workflow_dispatch.inputs.channel;
      expect(ch.options, f).toEqual(['dev', 'beta', 'rc', 'store']);
      expect(ch.default, f).toBe('beta');
    }
  });
  it('os arquivos continuam com os mesmos nomes (o run_number depende do arquivo) e o upload do iOS não mudou', () => {
    expect(read('.github/workflows/ios.yml')).toMatch(/NÃO RENOMEIE ESTE ARQUIVO/);
    expect(read('.github/workflows/android.yml')).toMatch(/NÃO RENOMEIE ESTE ARQUIVO/);
    const ios = wf('ios.yml');
    expect(ios.on.workflow_dispatch.inputs.upload.default).toBe(false);
    expect(ios.on.workflow_dispatch.inputs.sign_archive.default).toBe(false);
    expect(read('.github/workflows/ios.yml')).toContain("UPLOAD: ${{ (github.event_name == 'push' || inputs.upload) && 'true' || 'false' }}");
  });
  it('a versão da loja vem SEMPRE do app.json e a build do run_number (Android versionCode, iOS CFBundleVersion)', () => {
    const a = step('android.yml').run!;
    expect(a).toContain(`VERSION_NAME="$(node -p "require('./app.json').expo.version")"`);
    expect(a).toContain('echo "ANDROID_VERSION_CODE=$RUN_NUMBER" >> "$GITHUB_ENV"');
    expect(a).not.toContain('${REF_NAME#v}'); // a tag NÃO define mais a versão
    const i = step('ios.yml').run!;
    expect(i).toContain(`VERSION_NAME="$(node -p "require('./app.json').expo.version")"`);
    expect(i).toContain('echo "IOS_BUILD_NUMBER=$RUN_NUMBER" >> "$GITHUB_ENV"');
  });
  it('a tag é só conferência (check-version --tag) e as builds sem tag também conferem o piso', () => {
    for (const [f, platform] of [['android.yml', 'android'], ['ios.yml', 'ios']]) {
      const run = step(f!).run!;
      expect(run, f).toContain(`node scripts/check-version.mjs --platform ${platform} --build "$RUN_NUMBER" --tag "$REF_NAME"`);
      expect(run, f).toContain(`node scripts/check-version.mjs --platform ${platform} --build "$RUN_NUMBER"\n`);
    }
  });
  it('injeta canal, branch, commit curto e prelançamento no build (EXPO_PUBLIC_BUILD_*)', () => {
    for (const f of ['android.yml', 'ios.yml']) {
      const run = step(f).run!;
      for (const v of ['EXPO_PUBLIC_BUILD_CHANNEL=$CHANNEL', 'EXPO_PUBLIC_BUILD_BRANCH=$BRANCH_NAME', 'EXPO_PUBLIC_BUILD_SHA=$SHA_SHORT', 'EXPO_PUBLIC_BUILD_PRERELEASE=$PRE']) expect(run, `${f} ${v}`).toContain(v);
      expect(run, f).toContain('git rev-parse --short HEAD');
      expect(run, f).toContain('>> "$GITHUB_ENV"');
      expect(run, f).toMatch(/case "\$CHANNEL" in dev\|beta\|rc\|store\)/);
    }
  });
  it('o canal da tag vem do prelançamento (""=store, rc.N=rc, beta.N=beta) e o manual usa a entrada', () => {
    const run = step('android.yml').run!;
    expect(run).toContain('case "$PRE" in "") CHANNEL=store ;; rc.*) CHANNEL=rc ;; beta.*) CHANNEL=beta ;; *) CHANNEL=dev ;; esac');
    expect(run).toContain('CHANNEL="${INPUT_CHANNEL:-beta}"');
  });
  it('o bash dos workflows decide o canal como esperado (execução real do trecho)', () => {
    const snippet = (pre: string, event: string, input: string) => {
      const body = step('android.yml').run!.split('\n');
      const a = body.findIndex((l) => l.includes('if [ "$EVENT_NAME" = "push" ]; then'));
      const b = body.findIndex((l, i) => i > a && l.startsWith('case "$CHANNEL" in'));
      const code = `PRE='${pre}'; EVENT_NAME='${event}'; INPUT_CHANNEL='${input}'\n${body.slice(a, b).join('\n')}\necho "$CHANNEL"`;
      return spawnSync('bash', ['-c', code], { encoding: 'utf8' }).stdout.trim();
    };
    expect(snippet('', 'push', '')).toBe('store');
    expect(snippet('beta.3', 'push', '')).toBe('beta');
    expect(snippet('rc.1', 'push', '')).toBe('rc');
    expect(snippet('beta.1', 'workflow_dispatch', '')).toBe('beta');
    expect(snippet('beta.1', 'workflow_dispatch', 'dev')).toBe('dev');
    expect(snippet('', 'workflow_dispatch', 'store')).toBe('store');
  });
  it('os dois workflows FALHAM no canal store com prelançamento (chamam o check-version --channel) e não só avisam', () => {
    for (const f of ['android.yml', 'ios.yml']) {
      const run = step(f).run!;
      expect(run, f).toContain('node scripts/check-version.mjs --channel "$CHANNEL"');
      expect(run, f).not.toContain('::warning::Canal store');
      // a conferência vem DEPOIS de decidir o canal e ANTES de gravar as variáveis da build
      expect(run.indexOf('--channel "$CHANNEL"'), f).toBeGreaterThan(run.indexOf('case "$CHANNEL" in dev|beta|rc|store)'));
      expect(run.indexOf('--channel "$CHANNEL"'), f).toBeLessThan(run.indexOf('SHA_SHORT='));
    }
  });
  it('git fetch --tags roda ANTES da conferência de tag/versão nos dois workflows (checkout raso não traz as tags)', () => {
    for (const f of ['android.yml', 'ios.yml']) {
      const run = step(f).run!;
      expect(run, f).toContain('git fetch --tags --quiet');
      expect(run.indexOf('git fetch --tags'), f).toBeGreaterThan(-1);
      expect(run.indexOf('git fetch --tags'), f).toBeLessThan(run.indexOf('node scripts/check-version.mjs --platform'));
    }
  });
  it('o test:all do package.json inclui o check-version', () => {
    expect(JSON.parse(read('package.json')).scripts['test:all']).toContain('node scripts/check-version.mjs');
  });
});

describe('arquivos de versão do repositório', () => {
  it('versao.json é { prerelease } e docs/versionamento.md explica a convenção', () => {
    expect(Object.keys(JSON.parse(read('versao.json')))).toEqual(['prerelease']);
    const d = read('docs/versionamento.md');
    for (const t of ['SemVer', 'API pública', 'beta', 'rc', 'run_number', 'piso', 'nunca reutilizar', 'não podem ser renomeados', 'Passo a passo']) expect(d.toLowerCase(), t).toContain(t.toLowerCase());
  });
  it('o helper de pasta temporária cria diretórios (sanidade)', () => {
    const d = mkdtempSync(path.join(tmpdir(), 'x-')); mkdirSync(path.join(d, 'a')); expect(d).toBeTruthy();
  });
});
