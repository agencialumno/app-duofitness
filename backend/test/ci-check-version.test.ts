// Execução REAL do scripts/check-version.mjs com exatamente os argumentos que android.yml e ios.yml usam (extraídos dos .yml por expressão regular, para nunca
// divergirem). Falha se um workflow chamar o script com argumentos que ele rejeita (bug: "informe --platform ios|android" com só --channel).
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO = path.resolve(__dirname, '../..');
const WORKFLOWS = { android: '.github/workflows/android.yml', ios: '.github/workflows/ios.yml' } as const;
const BUILD = { android: '24', ios: '32' } as const;

// raiz temporária com cópias de app.json/package.json e um versao.json à escolha (sem git: a conferência de tags é pulada)
function makeRoot(prerelease: string) {
  const root = mkdtempSync(path.join(tmpdir(), 'checkver-'));
  for (const f of ['app.json', 'package.json']) copyFileSync(path.join(REPO, f), path.join(root, f));
  writeFileSync(path.join(root, 'versao.json'), JSON.stringify({ prerelease }));
  return root;
}
function run(root: string, args: string[]) {
  // RUN_NUMBER fica no ambiente, como no workflow (foi o que causou o bug)
  const r = spawnSync(process.execPath, [path.join(REPO, 'scripts/check-version.mjs'), '--root', root, ...args], {
    encoding: 'utf8', env: { ...process.env, RUN_NUMBER: '24', GITHUB_ACTIONS: '' },
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}
// chamadas do script em um workflow: os argumentos depois de "check-version.mjs" (linhas que não são comentário)
function calls(wf: keyof typeof WORKFLOWS) {
  const out: string[][] = [];
  for (const line of readFileSync(path.join(REPO, WORKFLOWS[wf]), 'utf8').split(/\r?\n/)) {
    const m = /^\s*node scripts\/check-version\.mjs\s+(.*?)\s*$/.exec(line);
    if (m) out.push(m[1]!.split(/\s+/).map((a) => a.replace(/^"|"$/g, '')));
  }
  return out;
}
// troca as variáveis do shell pelos valores de um caso
const subst = (args: string[], v: Record<string, string>) => args.map((a) => a.replace(/\$([A-Z_]+)/g, (_, n) => v[n] ?? `\$${n}`));

describe('chamadas de check-version.mjs nos workflows (execução real)', () => {
  it('cada workflow tem as três chamadas esperadas (build, build+tag e canal)', () => {
    for (const wf of ['android', 'ios'] as const) {
      const c = calls(wf).map((a) => a.join(' '));
      expect(c, wf).toContain(`--platform ${wf} --build $RUN_NUMBER`);
      expect(c, wf).toContain(`--platform ${wf} --build $RUN_NUMBER --tag $REF_NAME`);
      expect(c, wf).toContain('--channel $CHANNEL');
    }
  });

  for (const wf of ['android', 'ios'] as const) {
    const tagPrefix = wf === 'ios' ? 'ios-v' : 'v';
    it(`${wf}.yml: TODA chamada do script passa com versao.json beta.1 (build ${BUILD[wf]}, tag ${tagPrefix}1.0.0-beta.1, canal beta)`, () => {
      const root = makeRoot('beta.1');
      const core = JSON.parse(readFileSync(path.join(REPO, 'app.json'), 'utf8')).expo.version;
      const list = calls(wf);
      expect(list.length).toBeGreaterThanOrEqual(3);
      for (const raw of list) {
        const args = subst(raw, { RUN_NUMBER: BUILD[wf], REF_NAME: `${tagPrefix}${core}-beta.1`, CHANNEL: 'beta' });
        expect(args.join(' ')).not.toMatch(/\$[A-Z_]+/); // nenhuma variável sem valor: o teste conhece todas
        const r = run(root, args);
        expect(r.code, `${wf}: ${raw.join(' ')}\n${r.out}`).toBe(0);
      }
    });
    it(`${wf}.yml: a chamada com --channel sozinha passa nos 4 canais válidos com o prelançamento coerente`, () => {
      const line = calls(wf).find((a) => a[0] === '--channel')!;
      for (const [channel, pre] of [['dev', 'beta.1'], ['beta', 'beta.1'], ['rc', 'rc.1'], ['store', '']] as const) {
        const r = run(makeRoot(pre), subst(line, { CHANNEL: channel }));
        expect(r.code, `${wf} ${channel}\n${r.out}`).toBe(0);
      }
    });
  }

  // os seis casos pedidos, com os argumentos tirados dos .yml
  const pick = (wf: 'android' | 'ios', first: string) => calls(wf).find((a) => a[0] === first && !a.includes('--tag'))!;
  it('(a) --platform android --build 24 passa', () => {
    const r = run(makeRoot('beta.1'), subst(pick('android', '--platform'), { RUN_NUMBER: '24' }));
    expect(r.code, r.out).toBe(0);
    expect(r.out).toMatch(/android, build 24/);
  });
  it('(b) --platform ios --build 32 passa', () => {
    const r = run(makeRoot('beta.1'), subst(pick('ios', '--platform'), { RUN_NUMBER: '32' }));
    expect(r.code, r.out).toBe(0);
    expect(r.out).toMatch(/ios, build 32/);
  });
  it('(c) --channel beta sozinho passa, mesmo com RUN_NUMBER no ambiente', () => {
    const r = run(makeRoot('beta.1'), subst(pick('android', '--channel'), { CHANNEL: 'beta' }));
    expect(r.code, r.out).toBe(0);
    expect(r.out).not.toMatch(/informe --platform/);
  });
  it('(d) --channel store com versao.json beta.1 FALHA com a mensagem esperada', () => {
    for (const wf of ['android', 'ios'] as const) {
      const r = run(makeRoot('beta.1'), subst(pick(wf, '--channel'), { CHANNEL: 'store' }));
      expect(r.code, wf).toBe(1);
      expect(r.out).toContain('build de loja exige versao.json sem prelançamento; rode bump-version release');
    }
  });
  it('(e) --channel store com prelançamento vazio passa', () => {
    const r = run(makeRoot(''), subst(pick('ios', '--channel'), { CHANNEL: 'store' }));
    expect(r.code, r.out).toBe(0);
  });
  it('(f) --platform ios --build 31 FALHA pelo piso do iOS', () => {
    const r = run(makeRoot('beta.1'), subst(pick('ios', '--platform'), { RUN_NUMBER: '31' }));
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/piso de ios \(31\)/);
  });

  it('--build ou --tag sem --platform continuam sendo rejeitados (--platform só é dispensado com --channel sozinho)', () => {
    const root = makeRoot('beta.1');
    const a = run(root, ['--build', '40']);
    expect(a.code).toBe(1);
    expect(a.out).toMatch(/informe --platform/);
    const b = run(root, ['--tag', 'v1.0.0-beta.1']);
    expect(b.code).toBe(1);
    expect(b.out).toMatch(/informe --platform/);
  });
});
