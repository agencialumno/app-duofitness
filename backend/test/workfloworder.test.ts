// Ordem dos passos do Firebase nos workflows android.yml e ios.yml, SIMULADA a partir do YAML real:
// o passo firebase-prepare roda de verdade (com fixtures falsas) e o GITHUB_ENV resultante decide os `if` seguintes.
// Ordem esperada: npm ci -> firebase-prepare -> install-firebase-deps -> expo prebuild -> check-autolinking.
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO = path.resolve(__dirname, '../..');
const req = createRequire(path.join(REPO, 'package.json'));
const yaml = req('js-yaml') as { load: (s: string) => { jobs: Record<string, { env?: Record<string, string>; steps: Step[] }> } };

type Step = { name?: string; run?: string; if?: string; uses?: string; env?: Record<string, string> };
const load = (f: string) => yaml.load(readFileSync(path.join(REPO, '.github/workflows', f), 'utf8'));
const stepsOf = (f: string) => Object.values(load(f).jobs)[0]!.steps;

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const ANDROID_JSON = JSON.stringify({ project_info: { project_id: 'fake' }, client: [{ client_info: { android_client_info: { package_name: 'com.duofitness.app' } }, api_key: [{ current_key: 'FAKE' }] }] });
const IOS_PLIST = '<plist version="1.0"><dict><key>BUNDLE_ID</key><string>com.duofitness.app</string><key>GOOGLE_APP_ID</key><string>1:1:ios:1</string><key>CLIENT_ID</key><string>123-abc.apps.googleusercontent.com</string><key>REVERSED_CLIENT_ID</key><string>com.googleusercontent.apps.123-abc</string><key>PROJECT_ID</key><string>f</string></dict></plist>';

const KEYS = [
  { id: 'npm ci', test: (r: string) => /^npm ci\b/m.test(r) },
  { id: 'firebase-prepare', test: (r: string) => /firebase-prepare\.mjs (android|ios)\b/.test(r) },
  { id: 'install-firebase-deps', test: (r: string) => /install-firebase-deps\.mjs/.test(r) },
  { id: 'expo prebuild', test: (r: string) => /npx expo prebuild --platform/.test(r) },
  { id: 'check-autolinking', test: (r: string) => /check-autolinking\.mjs/.test(r) },
];

let dir: string;
beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), 'wf-order-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

async function simulate(file: string, plat: 'android' | 'ios', scenario: { requested: string; secret: string }) {
  const { prepare } = (await import('../../scripts/firebase-prepare.mjs' as string)) as { prepare: (p: string, e: Record<string, string>, c: string, o: { log: (m: string) => void }) => unknown };
  const env: Record<string, string> = {};
  const ghEnv = path.join(dir, 'github_env');
  writeFileSync(ghEnv, '');
  const executed: { id: string; run: string; flag: string }[] = [];
  const cond = (s: Step) => {
    if (!s.if) return true;
    const c = String(s.if).replace(/^\$\{\{\s*|\s*\}\}$/g, '');
    if (c === 'always()') return true;
    const m = /^env\.FIREBASE_ENABLED == 'true'$/.exec(c);
    if (m) return env.FIREBASE_ENABLED === 'true';
    return null; // condição que esta simulação não avalia (upload, tag...): o passo não entra na sequência
  };
  for (const s of stepsOf(file)) {
    if (!s.run) continue;
    const key = KEYS.find((k) => k.test(s.run!));
    if (!key || cond(s) !== true) continue;
    if (key.id === 'firebase-prepare') {
      // monta o env do passo como o GitHub faria: variável e secret do cenário
      const stepEnv: Record<string, string> = {};
      for (const [k, v] of Object.entries(s.env ?? {})) {
        stepEnv[k] = /vars\.FIREBASE_ENABLED/.test(v) ? scenario.requested : /secrets\./.test(v) ? scenario.secret : v;
      }
      prepare(plat, { ...stepEnv, GITHUB_ENV: ghEnv }, dir, { log: () => {} });
      for (const line of readFileSync(ghEnv, 'utf8').split('\n').filter(Boolean)) { const i = line.indexOf('='); env[line.slice(0, i)] = line.slice(i + 1); }
    }
    executed.push({ id: key.id, run: s.run, flag: env.FIREBASE_ENABLED ?? '' });
  }
  void appendFileSync;
  return executed;
}

for (const [file, plat, secret] of [['android.yml', 'android', b64(ANDROID_JSON)], ['ios.yml', 'ios', b64(IOS_PLIST)]] as const) {
  describe(`${file}: ordem dos passos (simulação)`, () => {
    it('SEM a variável FIREBASE_ENABLED: nada de Firebase, o check roda sem a flag (build idêntico ao de hoje)', async () => {
      const seq = await simulate(file, plat, { requested: '', secret });
      expect(seq.map((s) => s.id)).toEqual(['npm ci', 'firebase-prepare', plat === 'android' ? 'expo prebuild' : 'check-autolinking', plat === 'android' ? 'check-autolinking' : 'expo prebuild']);
      expect(seq.every((s) => s.flag === '')).toBe(true);
    });

    it('variável ligada mas SEM o secret: aviso e segue sem Firebase (sem instalar nada)', async () => {
      const seq = await simulate(file, plat, { requested: 'true', secret: '' });
      expect(seq.map((s) => s.id)).not.toContain('install-firebase-deps');
      expect(seq.every((s) => s.flag === '')).toBe(true);
    });

    it('variável ligada COM o secret: instala ANTES do prebuild e do check, e os dois rodam com FIREBASE_ENABLED=true', async () => {
      const seq = await simulate(file, plat, { requested: 'true', secret });
      const ids = seq.map((s) => s.id);
      expect(ids.slice(0, 3)).toEqual(['npm ci', 'firebase-prepare', 'install-firebase-deps']);
      expect(ids.indexOf('install-firebase-deps')).toBeLessThan(ids.indexOf('expo prebuild'));
      expect(ids.indexOf('install-firebase-deps')).toBeLessThan(ids.indexOf('check-autolinking'));
      for (const s of seq.slice(2)) expect(s.flag, s.id).toBe('true');
    });

    it(`o check de autolinking é chamado com --platform ${plat}`, () => {
      const run = stepsOf(file).map((s) => s.run ?? '').find((r) => /check-autolinking\.mjs/.test(r))!;
      expect(run).toContain(`--platform ${plat}`);
    });

    it('a flag efetiva só nasce do firebase-prepare (GITHUB_ENV), nunca fixa no job; o secret só aparece no passo de preparo', () => {
      const wf = load(file);
      const job = Object.values(wf.jobs)[0]!;
      expect(job.env ?? {}).not.toHaveProperty('FIREBASE_ENABLED');
      const withSecret = job.steps.filter((s) => Object.values(s.env ?? {}).some((v) => /secrets\.FIREBASE_/.test(String(v))));
      expect(withSecret).toHaveLength(1);
      expect(withSecret[0]!.run).toMatch(/firebase-prepare\.mjs/);
    });

    it('o passo de instalação só roda com a flag e a limpeza roda sempre', () => {
      const steps = stepsOf(file);
      const inst = steps.find((s) => /install-firebase-deps\.mjs/.test(s.run ?? ''))!;
      expect(inst.if).toBe("env.FIREBASE_ENABLED == 'true'");
      const clean = steps.find((s) => /firebase-prepare\.mjs cleanup/.test(s.run ?? ''))!;
      expect(clean.if).toBe('always()');
    });
  });
}

describe('ci.yml e firebase-spike.yml', () => {
  it('o ci.yml confere o autolinking do Android e o do iOS, sem a flag', () => {
    const runs = stepsOf('ci.yml').map((s) => s.run ?? '').join('\n');
    expect(runs).toMatch(/check-autolinking\.mjs\s*$/m);
    expect(runs).toContain('check-autolinking.mjs --platform ios');
    expect(runs).not.toMatch(/FIREBASE_ENABLED/);
  });
  it('o spike confere o autolinking da plataforma depois da instalação e antes do prebuild', () => {
    const wf = load('firebase-spike.yml');
    for (const [job, plat] of [['android', 'android'], ['ios', 'ios']] as const) {
      const runs = wf.jobs[job]!.steps.map((s) => s.run ?? '');
      const inst = runs.findIndex((r) => /install-firebase-deps/.test(r));
      const chk = runs.findIndex((r) => r.includes(`check-autolinking.mjs --platform ${plat}`));
      const pre = runs.findIndex((r) => /expo prebuild/.test(r));
      expect(inst).toBeGreaterThan(-1);
      expect(chk).toBeGreaterThan(inst);
      expect(chk).toBeLessThan(pre);
    }
  });
});
