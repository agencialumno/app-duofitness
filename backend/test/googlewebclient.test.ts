// EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: chega aos workflows (ao passo que gera o bundle), aviso no firebase-prepare e fallback 'autoDetect'.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do repositório, sem tipos
import * as F from '../../scripts/firebase-prepare.mjs';

const REPO = path.resolve(__dirname, '../..');
const req = createRequire(path.join(REPO, 'package.json'));
const yaml = req('js-yaml') as { load: (s: string) => { jobs: Record<string, { env?: Record<string, string>; steps: { name?: string; run?: string; env?: Record<string, string> }[] }> } };
const load = (f: string) => yaml.load(readFileSync(path.join(REPO, '.github/workflows', f), 'utf8'));
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const ANDROID = JSON.stringify({ project_info: { project_id: 'fake' }, client: [{ client_info: { android_client_info: { package_name: 'com.duofitness.app' } }, api_key: [{ current_key: 'FAKE-KEY' }] }] });
const WEB_ID = '123456-abcdef.apps.googleusercontent.com';

describe('a variável chega aos workflows', () => {
  for (const [file, job, bundleStep] of [['android.yml', 'build', 'gradlew'], ['ios.yml', 'build', 'xcodebuild archive']] as const) {
    it(`${file}: está no env do JOB (como as outras EXPO_PUBLIC_*), vem de vars (não de secrets) e vale para o passo do bundle`, () => {
      const wf = load(file);
      const j = wf.jobs[job]!;
      expect(j.env!.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).toBe('${{ vars.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID }}');
      for (const k of ['EXPO_PUBLIC_AUTH_ENABLED', 'EXPO_PUBLIC_PRIVACY_URL']) expect(j.env![k], k).toMatch(/vars\./); // mesmo estilo
      // env no nível do job: herdado pelo Gradle e pelo xcodebuild (que gera o bundle JS); nenhum desses passos zera o ambiente
      const step = j.steps.find((s) => (s.run ?? '').includes(bundleStep));
      expect(step, bundleStep).toBeTruthy();
      expect(step!.run).not.toMatch(/\benv -i\b/);
      expect(step!.env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).toBeUndefined(); // vem do job
      expect(readFileSync(path.join(REPO, '.github/workflows', file), 'utf8')).not.toMatch(/secrets\.EXPO_PUBLIC_GOOGLE/);
    });
  }
  it('ci.yml não gera o bundle do app (só prebuild com Firebase falso): não precisa da variável', () => {
    const ci = readFileSync(path.join(REPO, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).not.toMatch(/gradlew|xcodebuild|expo export/);
  });
});

describe('firebase-prepare: aviso (sem falhar) quando a variável está vazia', () => {
  let dir: string;
  let logs: string[];
  const out = { log: (m: string) => { logs.push(String(m)); } };
  beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), 'fb-gwc-')); logs = []; });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  const base = () => { writeFileSync(path.join(dir, 'env'), ''); return { FIREBASE_REQUESTED: 'true', FIREBASE_GOOGLE_SERVICES_JSON_B64: b64(ANDROID), GITHUB_ENV: path.join(dir, 'env') }; };

  it('FIREBASE_ENABLED=true e variável vazia: ::warning:: com a mensagem pedida; o Firebase segue ligado', () => {
    for (const v of [undefined, '', '   ']) {
      logs.length = 0;
      const r = F.prepare('android', { ...base(), ...(v === undefined ? {} : { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: v }) }, dir, out);
      expect(r.enabled).toBe(true);
      expect(r.failed).toBeUndefined();
      expect(logs.join('\n')).toContain('::warning::EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID vazio: o login com Google pode falhar');
    }
  });
  it('com a variável preenchida: sem aviso e o valor NUNCA é impresso', () => {
    const r = F.prepare('android', { ...base(), EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: WEB_ID }, dir, out);
    expect(r.enabled).toBe(true);
    expect(logs.join('\n')).not.toMatch(/EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID vazio/);
    expect(logs.join('\n')).not.toContain(WEB_ID);
  });
  it('sem FIREBASE_ENABLED não avisa nada (build normal intacto)', () => {
    F.prepare('android', { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '' }, dir, out);
    expect(logs.join('\n')).not.toMatch(/GOOGLE_WEB_CLIENT_ID/);
  });
});

describe("fallback 'autoDetect' e documentação", () => {
  it("o provedor usa o ID da variável quando existe e 'autoDetect' quando não existe", () => {
    const p = readFileSync(path.join(REPO, 'src/auth/FirebaseAuthProvider.js'), 'utf8');
    expect(p).toMatch(/webClientId: this\.webClientId \|\| 'autoDetect'/);
    expect(readFileSync(path.join(REPO, 'src/data/authConfig.js'), 'utf8')).toContain('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
  });
  it('docs/pendencias-usuario.md diz onde achar o ID e por que o autoDetect não funciona (arquivo e linha do pacote)', () => {
    const d = readFileSync(path.join(REPO, 'docs/pendencias-usuario.md'), 'utf8');
    expect(d).toContain('Authentication > Método de login > Google > Configuração do SDK da Web');
    expect(d).toContain('ios/RNGoogleSignin.mm');
    expect(d).toContain('Utils.java');
    expect(d).toMatch(/EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/);
  });
});
