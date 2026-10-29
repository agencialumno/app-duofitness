// Login com Google no iOS: erros mapeados em português (cancelar não é erro), código bruto no console sem dados pessoais,
// URL scheme (REVERSED_CLIENT_ID) no plugin e no Info.plist, e o plist validado sem imprimir valores.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import FirebaseAuthProvider from '../../src/auth/FirebaseAuthProvider.js';
// @ts-expect-error módulo JS do app, sem tipos
import { authErrorMessage, isCancel } from '../../src/auth/authErrors.js';

const REPO = path.resolve(__dirname, '../..');
const req = createRequire(import.meta.url);
const err = (code: string, message = 'x') => Object.assign(new Error(message), { code });

function make(signIn: () => Promise<unknown>, opts: { credentialFails?: string } = {}) {
  const user = { uid: 'u1', email: 'segredo@exemplo.com', displayName: null, emailVerified: true, providerData: [{ providerId: 'google.com' }] };
  const auth = { currentUser: null as typeof user | null };
  const api = {
    getAuth: () => auth,
    GoogleAuthProvider: { credential: (t: string) => ({ providerId: 'google.com', token: t }) },
    signInWithCredential: async () => { if (opts.credentialFails) throw err(opts.credentialFails, 'token SEGREDO'); auth.currentUser = user; return { user }; },
    onAuthStateChanged: () => () => undefined,
  };
  const google = {
    statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED', IN_PROGRESS: 'IN_PROGRESS', PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE' },
    GoogleSignin: { configure: () => undefined, hasPlayServices: async () => true, signIn, signOut: async () => undefined },
  };
  return new FirebaseAuthProvider({ authApi: api, googleSignin: google, appleAuth: null, crypto: null, os: 'ios' });
}

describe('FirebaseAuthProvider: erros do Google', () => {
  let spy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { spy = vi.spyOn(console, 'error').mockImplementation(() => undefined); });
  afterEach(() => spy.mockRestore());
  const logged = () => spy.mock.calls.map((c: unknown[]) => c.join(' ')).join('\n');

  it('SIGN_IN_CANCELLED (e o cancelamento do iOS) é cancelamento: sem mensagem e sem log', async () => {
    for (const code of ['SIGN_IN_CANCELLED', '-5', '12501']) {
      const e = await make(async () => { throw err(code); }).signInWithGoogle().catch((x: Error) => x);
      expect(isCancel(e), code).toBe(true);
      expect(authErrorMessage(e, 'social')).toBe('');
    }
    const c = await make(async () => ({ type: 'cancelled' })).signInWithGoogle().catch((x: Error) => x);
    expect(isCancel(c)).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('IN_PROGRESS, Play Services e falha genérica viram mensagens em português e registram SÓ o código', async () => {
    const cases: [string, string, RegExp][] = [
      ['IN_PROGRESS', 'auth/google-in-progress', /já está em andamento/],
      ['PLAY_SERVICES_NOT_AVAILABLE', 'auth/google-play-services', /Play Services/],
      ['10', 'auth/google-failed', /Não foi possível entrar com o Google/],
    ];
    for (const [raw, mapped, text] of cases) {
      const e = await make(async () => { throw err(raw, 'erro com segredo@exemplo.com e token SEGREDO'); }).signInWithGoogle().catch((x: Error & { code: string }) => x);
      expect(e.code).toBe(mapped);
      expect(authErrorMessage(e, 'social')).toMatch(text);
    }
    const out = logged();
    expect(out).toContain('[Google Sign-In] google-signin: IN_PROGRESS');
    expect(out).toContain('google-signin: 10');
    expect(out).not.toMatch(/segredo|SEGREDO|@/); // nunca e-mail, token nem a mensagem do erro
  });

  it('sem idToken: erro próprio (não "Algo deu errado") e registra o motivo', async () => {
    const e = await make(async () => ({ type: 'success', data: { idToken: null } })).signInWithGoogle().catch((x: Error & { code: string }) => x);
    expect(e.code).toBe('auth/google-no-id-token');
    expect(authErrorMessage(e, 'social')).toMatch(/não devolveu a identificação/);
    expect(logged()).toContain('id-token: ausente');
  });

  it('erro de credencial do Firebase no Google: registra o código e a mensagem NÃO diz "senha incorreta"', async () => {
    const e = await make(async () => ({ type: 'success', data: { idToken: 'tok' } }), { credentialFails: 'auth/invalid-credential' }).signInWithGoogle().catch((x: Error & { code: string }) => x);
    expect(e.code).toBe('auth/invalid-credential');
    expect(logged()).toContain('firebase: auth/invalid-credential');
    expect(authErrorMessage(e, 'social')).toBe('Não foi possível entrar com esta conta. Tente de novo.');
    expect(authErrorMessage(e, 'signIn')).toBe('E-mail ou senha incorretos.'); // o texto do e-mail e senha não mudou
    expect(logged()).not.toMatch(/SEGREDO|tok\b/);
  });

  it('login que funciona não registra nada', async () => {
    const u = await make(async () => ({ type: 'success', data: { idToken: 'tok' } })).signInWithGoogle();
    expect(u.providers).toEqual(['google.com']);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('plugin: URL scheme do Google vem do plist', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), 'g-plugin-')); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  const plugin = req('../../plugins/withFirebaseOptional.js') as { readReversedClientId: (f: string) => string };

  it('lê o REVERSED_CLIENT_ID; plist sem ele (baixado antes de ativar o Google) ou ausente devolve vazio', () => {
    const f = path.join(dir, 'GoogleService-Info.plist');
    writeFileSync(f, '<plist><dict><key>REVERSED_CLIENT_ID</key><string>com.googleusercontent.apps.123-abc</string></dict></plist>');
    expect(plugin.readReversedClientId(f)).toBe('com.googleusercontent.apps.123-abc');
    writeFileSync(f, '<plist><dict><key>BUNDLE_ID</key><string>x</string></dict></plist>');
    expect(plugin.readReversedClientId(f)).toBe('');
    expect(plugin.readReversedClientId(path.join(dir, 'nao.plist'))).toBe('');
  });
  it('o plugin do Google recebe o iosUrlScheme de forma explícita e nunca imprime o valor', () => {
    const src = readFileSync(path.join(REPO, 'plugins/withFirebaseOptional.js'), 'utf8');
    expect(src).toMatch(/googleOptions\.iosUrlScheme = scheme/);
    expect(src).toMatch(/plugins\.push\(\[plug\('@react-native-google-signin\/google-signin\/app\.plugin\.js'\), googleOptions\]\)/);
    expect(src).not.toMatch(/console\.(log|warn|error)\([^)]*scheme[^)]*\)/);
  });
});

describe('check-ios-project: URL scheme do Google no Info.plist', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), 'g-ios-')); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  const SCHEME = 'com.googleusercontent.apps.123-abc';
  const info = (urlTypes: string) => `<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0">\n  <dict>\n    <key>ITSAppUsesNonExemptEncryption</key>\n    <false/>\n${urlTypes}\n  </dict>\n</plist>\n`;
  const URL_TYPES = (s: string) => `    <key>CFBundleURLTypes</key>\n    <array>\n      <dict>\n        <key>CFBundleURLSchemes</key>\n        <array>\n          <string>${s}</string>\n        </array>\n      </dict>\n    </array>`;
  function project(infoXml: string, firebasePlist?: string) {
    const ios = path.join(dir, 'ios');
    mkdirSync(path.join(ios, 'DuoFitness.xcodeproj'), { recursive: true });
    mkdirSync(path.join(ios, 'DuoFitness'), { recursive: true });
    writeFileSync(path.join(ios, 'DuoFitness.xcodeproj', 'project.pbxproj'), 'PRODUCT_BUNDLE_IDENTIFIER = "com.duofitness.app";\n');
    writeFileSync(path.join(ios, 'DuoFitness', 'Info.plist'), infoXml);
    writeFileSync(path.join(ios, 'Podfile'), 'use_expo_modules!\n');
    if (firebasePlist) writeFileSync(path.join(ios, 'DuoFitness', 'GoogleService-Info.plist'), firebasePlist);
  }
  const fbPlist = (rev: string) => `<plist><dict><key>REVERSED_CLIENT_ID</key><string>${rev}</string></dict></plist>`;
  const run = (env: Record<string, string> = {}) => {
    const r = spawnSync(process.execPath, [path.join(REPO, 'scripts/check-ios-project.mjs'), '--root', dir], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true', FIREBASE_ENABLED: '', ...env } });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };

  it('sem Firebase a checagem nem roda (build normal intacto)', () => {
    project(info(''));
    expect(run().code).toBe(0);
  });
  it('com Firebase e o esquema igual ao REVERSED_CLIENT_ID: passa e NÃO imprime o valor', () => {
    project(info(URL_TYPES(SCHEME)), fbPlist(SCHEME));
    const r = run({ FIREBASE_ENABLED: 'true' });
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('URL scheme do Google presente');
    expect(r.out).not.toContain(SCHEME);
  });
  it('com Firebase e sem o esquema do Google: FALHA com mensagem clara', () => {
    project(info(''));
    const r = run({ FIREBASE_ENABLED: 'true' });
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::[Google URL scheme]');
    expect(r.out).toContain('login com Google não volta ao app');
  });
  it('esquema diferente do REVERSED_CLIENT_ID do plist usado: FALHA sem imprimir valores', () => {
    project(info(URL_TYPES('com.googleusercontent.apps.outro')), fbPlist(SCHEME));
    const r = run({ FIREBASE_ENABLED: 'true' });
    expect(r.code).toBe(1);
    expect(r.out).toContain('não é igual ao REVERSED_CLIENT_ID');
    expect(r.out).not.toContain(SCHEME);
    expect(r.out).not.toContain('apps.outro');
  });
  it('outro esquema (que não é do Google) não conta', () => {
    project(info(URL_TYPES('meuapp')));
    expect(run({ FIREBASE_ENABLED: 'true' }).code).toBe(1);
  });
});

describe('REGRESSÃO: Info.plist como o Expo grava (um <dict> por tipo de URL)', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), 'g-real-')); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  const SCHEME = 'com.googleusercontent.apps.000000000000-ci';
  // formato real: o esquema do app num <dict> e o do Google em OUTRO <dict> (o regex antigo só enxergava o primeiro)
  const REAL = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
  <dict>
    <key>ITSAppUsesNonExemptEncryption</key>
    <false/>
    <key>CFBundleURLTypes</key>
    <array>
      <dict>
        <key>CFBundleURLSchemes</key>
        <array>
          <string>com.duofitness.app</string>
        </array>
      </dict>
      <dict>
        <key>CFBundleURLSchemes</key>
        <array>
          <string>${SCHEME}</string>
        </array>
      </dict>
    </array>
    <key>UIRequiresFullScreen</key>
    <false/>
  </dict>
</plist>
`;
  function project(infoXml: string, firebase = true) {
    const ios = path.join(dir, 'ios');
    mkdirSync(path.join(ios, 'DuoFitness.xcodeproj'), { recursive: true });
    mkdirSync(path.join(ios, 'DuoFitness'), { recursive: true });
    writeFileSync(path.join(ios, 'DuoFitness.xcodeproj', 'project.pbxproj'), 'PRODUCT_BUNDLE_IDENTIFIER = "com.duofitness.app";\n');
    writeFileSync(path.join(ios, 'DuoFitness', 'Info.plist'), infoXml);
    writeFileSync(path.join(ios, 'Podfile'), 'use_expo_modules!\n');
    if (firebase) writeFileSync(path.join(ios, 'DuoFitness', 'GoogleService-Info.plist'), `<plist><dict><key>REVERSED_CLIENT_ID</key><string>${SCHEME}</string></dict></plist>`);
  }
  const run = () => {
    const r = spawnSync(process.execPath, [path.join(REPO, 'scripts/check-ios-project.mjs'), '--root', dir], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true', FIREBASE_ENABLED: 'true' } });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };
  it('o esquema do Google no SEGUNDO <dict> é encontrado (antes dava falso negativo) e o valor não é impresso', () => {
    project(REAL);
    const r = run();
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('URL scheme do Google presente');
    expect(r.out).not.toContain(SCHEME);
  });
  it('sem o <dict> do Google o check FALHA, também com o esquema do app presente', () => {
    project(REAL.replace(/<dict>\s*<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>com\.googleusercontent[^<]*<\/string>\s*<\/array>\s*<\/dict>/, ''));
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('[Google URL scheme]');
    expect(r.out).not.toContain(SCHEME);
  });
});

describe('plugin: addUrlScheme (withInfoPlist próprio, idempotente)', () => {
  const { addUrlScheme } = req('../../plugins/withFirebaseOptional.js') as { addUrlScheme: (p: any, s: string) => any };
  const G = 'com.googleusercontent.apps.123-abc';
  it('sem esquema prévio: cria o CFBundleURLTypes com o esquema', () => {
    expect(addUrlScheme({}, G).CFBundleURLTypes).toEqual([{ CFBundleURLSchemes: [G] }]);
  });
  it('com esquemas prévios (o do app/Expo): preserva todos e acrescenta o do Google', () => {
    const before = { CFBundleURLTypes: [{ CFBundleURLSchemes: ['com.duofitness.app'] }, { CFBundleURLSchemes: ['duofitness'] }] };
    const after = addUrlScheme(JSON.parse(JSON.stringify(before)), G);
    const all = after.CFBundleURLTypes.flatMap((t: { CFBundleURLSchemes: string[] }) => t.CFBundleURLSchemes);
    expect(all).toEqual(expect.arrayContaining(['com.duofitness.app', 'duofitness', G]));
    expect(all).toHaveLength(3);
  });
  it('idempotente: chamar de novo (ou já existir) não duplica', () => {
    const once = addUrlScheme({ CFBundleURLTypes: [{ CFBundleURLSchemes: ['com.duofitness.app'] }] }, G);
    const twice = addUrlScheme(once, G);
    const all = twice.CFBundleURLTypes.flatMap((t: { CFBundleURLSchemes: string[] }) => t.CFBundleURLSchemes);
    expect(all.filter((s: string) => s === G)).toHaveLength(1);
    expect(addUrlScheme({ CFBundleURLTypes: [{ CFBundleURLSchemes: [G] }] }, G).CFBundleURLTypes).toHaveLength(1);
  });
  it('sem esquema (plist sem REVERSED_CLIENT_ID) não muda nada', () => {
    const p = { CFBundleURLTypes: [{ CFBundleURLSchemes: ['x'] }] };
    expect(addUrlScheme(p, '')).toBe(p);
  });
  it('só entra com a flag e o plist: o código do plugin protege os dois caminhos e o iOS sem a flag segue intacto', () => {
    const src = readFileSync(path.join(REPO, 'plugins/withFirebaseOptional.js'), 'utf8');
    expect(src).toMatch(/if \(!enabled\) return config;/);
    expect(src).toMatch(/if \(iosFile && googleOptions\.iosUrlScheme\) plugins\.push\(\(cfg\) => withGoogleReversedClientId\(cfg, googleOptions\.iosUrlScheme\)\)/);
    expect(src).not.toMatch(/console\.(log|warn|error)\([^)]*(scheme|REVERSED)[^)]*\$\{/);
    const cfg = { name: 'x' };
    const before = process.env;
    process.env = { ...before, FIREBASE_ENABLED: '' };
    try { expect((req('../../plugins/withFirebaseOptional.js') as (c: unknown) => unknown)(cfg)).toBe(cfg); } finally { process.env = before; }
  });
});

describe('ci.yml: o job do iOS com Firebase reproduz o erro do Mac', () => {
  const ci = readFileSync(path.join(REPO, '.github/workflows/ci.yml'), 'utf8');
  const job = ci.slice(ci.indexOf('  ios-prebuild-firebase:'), ci.indexOf('\n  backend:'));
  it('o plist falso tem CLIENT_ID e REVERSED_CLIENT_ID no formato com.googleusercontent.apps.<numero>-<id>', () => {
    expect(job).toMatch(/<key>CLIENT_ID<\/key><string>\d+-[a-z0-9]+\.apps\.googleusercontent\.com<\/string>/);
    expect(job).toMatch(/<key>REVERSED_CLIENT_ID<\/key><string>com\.googleusercontent\.apps\.\d+-[a-z0-9]+<\/string>/);
  });
  it('roda o check-ios-project com FIREBASE_ENABLED=true, depois do prebuild', () => {
    expect(job).toContain('FIREBASE_ENABLED=true');
    const prebuild = job.indexOf('npx expo prebuild --platform ios --no-install');
    const check = job.indexOf('node scripts/check-ios-project.mjs');
    expect(prebuild).toBeGreaterThan(-1);
    expect(check).toBeGreaterThan(prebuild);
  });
});
