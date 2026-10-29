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
import { authErrorDetail, authErrorMessage, isCancel } from '../../src/auth/authErrors.js';

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
    expect(out).toContain('[Google Sign-In] signIn: IN_PROGRESS');
    expect(out).toContain('signIn: 10');
    expect(out).not.toMatch(/segredo|SEGREDO|@/); // nunca e-mail, token nem a mensagem do erro
  });

  it('sem idToken: erro próprio (não "Algo deu errado") e registra o motivo', async () => {
    const e = await make(async () => ({ type: 'success', data: { idToken: null } })).signInWithGoogle().catch((x: Error & { code: string }) => x);
    expect(e.code).toBe('auth/google-no-id-token');
    expect(authErrorMessage(e, 'social')).toMatch(/não devolveu a identificação/);
    expect(logged()).toContain('idToken: ID_TOKEN_NULO');
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
  it('o plugin do Google recebe o iosUrlScheme só pelo googlePlugins e nunca imprime o valor', () => {
    const src = readFileSync(path.join(REPO, 'plugins/withFirebaseOptional.js'), 'utf8');
    expect(src).toMatch(/\{ iosUrlScheme: scheme \}/);
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
    expect(src).toMatch(/\(cfg\) => withGoogleReversedClientId\(cfg, scheme\)/);
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

describe('REGRESSÃO Android: o plugin do google-signin nunca é chamado com {} ou opções incompletas', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), 'g-and-')); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  const { googlePlugins } = req('../../plugins/withFirebaseOptional.js') as { googlePlugins: (f: string | null, load?: (n: string) => unknown) => any[] };
  const loads: string[] = [];
  const fakeLoad = (n: string) => { loads.push(n); return function fakePlugin() { /* ... */ }; };
  const plist = (body: string) => { const f = path.join(dir, 'GoogleService-Info.plist'); writeFileSync(f, `<plist><dict>${body}</dict></plist>`); return f; };

  it('sem plist (Android, só google-services.json): nada é aplicado e o plugin de terceiros nem é carregado', () => {
    loads.length = 0;
    expect(googlePlugins(null, fakeLoad)).toEqual([]);
    expect(loads).toEqual([]);
  });
  it('plist SEM REVERSED_CLIENT_ID: não aplica o plugin de terceiros (nunca com {}) e não lança', () => {
    loads.length = 0;
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(() => googlePlugins(plist('<key>BUNDLE_ID</key><string>x</string>'), fakeLoad)).not.toThrow();
      expect(googlePlugins(plist('<key>BUNDLE_ID</key><string>x</string>'), fakeLoad)).toEqual([]);
      expect(googlePlugins(plist('<key>REVERSED_CLIENT_ID</key><string></string>'), fakeLoad)).toEqual([]);
      expect(spy.mock.calls.join(' ')).not.toMatch(/com\.googleusercontent/); // não imprime valor
    } finally { spy.mockRestore(); }
    expect(loads).toEqual([]);
  });
  it('com plist e REVERSED_CLIENT_ID: aplica o plugin com iosUrlScheme preenchido + o withInfoPlist próprio', () => {
    loads.length = 0;
    const list = googlePlugins(plist('<key>REVERSED_CLIENT_ID</key><string>com.googleusercontent.apps.123-abc</string>'), fakeLoad);
    expect(loads).toEqual(['@react-native-google-signin/google-signin/app.plugin.js']);
    expect(list).toHaveLength(2);
    expect(list[0][1]).toEqual({ iosUrlScheme: 'com.googleusercontent.apps.123-abc' });
    expect(Object.keys(list[0][1])).toEqual(['iosUrlScheme']); // opções completas, nunca {}
    expect(typeof list[1]).toBe('function');
  });
  it('o plugin não chama o google-signin em nenhum outro lugar (nada de opções montadas à parte)', () => {
    const src = readFileSync(path.join(REPO, 'plugins/withFirebaseOptional.js'), 'utf8');
    expect((src.match(/google-signin\/app\.plugin\.js/g) || []).length).toBe(1); // só dentro de googlePlugins
    expect(src).not.toMatch(/googleOptions/);
    expect(src).toMatch(/plugins\.push\(\.\.\.googlePlugins\(iosFile\)\)/);
    expect(src).toMatch(/plug\('@react-native-firebase\/app\/app\.plugin\.js'\)/); // o Android segue pelo RNFB (google-services)
  });
  it('ci.yml: há um job de prebuild do Android com Firebase, só com google-services.json e SEM o plist', () => {
    const ci = readFileSync(path.join(REPO, '.github/workflows/ci.yml'), 'utf8');
    const job = ci.slice(ci.indexOf('  android-prebuild-firebase:'), ci.indexOf('\n  backend:'));
    expect(job).toContain('FIREBASE_ENABLED=true');
    expect(job).toContain('google-services.json');
    expect(job).not.toMatch(/GoogleService-Info\.plist|FIREBASE_IOS_CONFIG/);
    expect(job).toContain('npx expo prebuild --platform android --no-install');
  });
});

describe('diagnóstico na tela: só o código e a etapa', () => {
  let spy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { spy = vi.spyOn(console, 'error').mockImplementation(() => undefined); });
  afterEach(() => spy.mockRestore());
  const MSG = 'falhou para segredo@exemplo.com com token SEGREDO-123 e nome Ana Souza';
  const line = (e: unknown) => authErrorDetail(e) as string;

  it('erro do google-signin no signIn: "Código: DEVELOPER_ERROR · etapa: signIn", sem a mensagem bruta', async () => {
    const e = await make(async () => { throw err('DEVELOPER_ERROR', MSG); }).signInWithGoogle().catch((x: Error) => x);
    expect(line(e)).toBe('Código: DEVELOPER_ERROR · etapa: signIn');
    expect(authErrorMessage(e, 'social')).toMatch(/Não foi possível entrar com o Google/);
    for (const t of [line(e), authErrorMessage(e, 'social'), spy.mock.calls.join(' ')]) expect(t).not.toMatch(/segredo|SEGREDO|Ana|@/);
  });
  it('códigos numéricos (10, 12500, 7) viram texto curto', async () => {
    for (const code of [10, 12500, 7]) {
      const e = await make(async () => { throw Object.assign(new Error(MSG), { code }); }).signInWithGoogle().catch((x: Error) => x);
      expect(line(e)).toBe(`Código: ${code} · etapa: signIn`);
    }
  });
  it('sem error.code usa error.name; sem nenhum dos dois, DESCONHECIDO', async () => {
    const a = await make(async () => { const x = new Error(MSG); x.name = 'TypeError'; throw x; }).signInWithGoogle().catch((x: Error) => x);
    expect(line(a)).toBe('Código: TypeError · etapa: signIn');
    const b = await make(async () => { throw Object.assign(new Error(MSG), { name: 'nome com espaços e @' }); }).signInWithGoogle().catch((x: Error) => x);
    expect(line(b)).toBe('Código: DESCONHECIDO · etapa: signIn');
  });
  it('configure: falha ao configurar mostra "etapa: configure"', async () => {
    const p = make(async () => ({ type: 'success', data: { idToken: 't' } }));
    p.google.GoogleSignin.configure = () => { throw err('configure', MSG); };
    const e = await p.signInWithGoogle().catch((x: Error) => x);
    expect(line(e)).toBe('Código: configure · etapa: configure');
  });
  it('idToken nulo: "Código: ID_TOKEN_NULO · etapa: idToken"', async () => {
    const e = await make(async () => ({ type: 'success', data: { idToken: null } })).signInWithGoogle().catch((x: Error) => x);
    expect(line(e)).toBe('Código: ID_TOKEN_NULO · etapa: idToken');
  });
  it('credencial do Firebase: código do Firebase e "etapa: signInWithCredential"', async () => {
    for (const code of ['auth/invalid-credential', 'auth/operation-not-allowed', 'auth/invalid-api-key', 'auth/app-not-authorized', 'auth/network-request-failed']) {
      const e = await make(async () => ({ type: 'success', data: { idToken: 'tok' } }), { credentialFails: code }).signInWithGoogle().catch((x: Error) => x);
      expect(line(e)).toBe(`Código: ${code} · etapa: signInWithCredential`);
      expect((e as { code: string }).code).toBe(code); // a tradução em português continua pelo código original
    }
  });
  it('cancelar não tem diagnóstico nem erro; login que funciona não registra nada', async () => {
    const e = await make(async () => { throw err('SIGN_IN_CANCELLED'); }).signInWithGoogle().catch((x: Error) => x);
    expect(line(e)).toBe('');
    expect(authErrorMessage(e, 'social')).toBe('');
    const u = await make(async () => ({ type: 'success', data: { idToken: 'tok' } })).signInWithGoogle();
    expect(u.providers).toEqual(['google.com']);
    expect(spy).not.toHaveBeenCalled();
  });
  it('erro sem detalhe (e-mail e senha) não ganha linha de código', () => {
    expect(line(err('auth/wrong-password'))).toBe('');
    expect(line(null)).toBe('');
  });
  it('a tela mostra a linha em cor neutra e pequena, abaixo da mensagem; o texto não usa error.message', () => {
    const s = readFileSync(path.join(REPO, 'src/screens/auth/SocialButtons.js'), 'utf8');
    expect(s).toMatch(/authErrorDetail\(e\)/);
    expect(s).toMatch(/testID="social-error-detail"[\s\S]*COLORS\.textSecondary/);
    expect(s).not.toMatch(/\.message/);
    const p = readFileSync(path.join(REPO, 'src/auth/FirebaseAuthProvider.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    expect(p).not.toMatch(/console\.error\([^)]*\.message/);
    expect(p).not.toMatch(/detail[^;\n]*\.message/);
  });
});

describe('ID de cliente Web por variável', () => {
  it('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID é lido (público); vazio mantém o comportamento anterior', () => {
    const cfg = readFileSync(path.join(REPO, 'src/data/authConfig.js'), 'utf8');
    expect(cfg).toContain('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
    const mk = (webClientId?: string) => {
      const calls: unknown[] = [];
      const p = make(async () => ({ type: 'success', data: { idToken: 't' } }));
      p.webClientId = webClientId ?? '';
      p.google.GoogleSignin.configure = (o: unknown) => { calls.push(o); };
      return { p, calls };
    };
    const a = mk('123-abc.apps.googleusercontent.com');
    return a.p.signInWithGoogle().then(() => {
      expect(a.calls).toEqual([{ webClientId: '123-abc.apps.googleusercontent.com' }]);
      const b = mk('');
      return b.p.signInWithGoogle().then(() => expect(b.calls).toEqual([{ webClientId: 'autoDetect' }]));
    });
  });
});
