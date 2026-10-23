// FirebaseAuthProvider (RN Firebase) com módulos FALSOS injetados, o plugin opcional e o instalador dos módulos nativos.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import FirebaseAuthProvider from '../../src/auth/FirebaseAuthProvider.js';
// @ts-expect-error módulo JS do app, sem tipos
import { assertAuthProvider } from '../../src/auth/authInterface.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as E from '../../src/auth/authErrors.js';
// @ts-expect-error módulo JS do app, sem tipos
import { createAuthProvider } from '../../src/auth/createAuthProvider.js';

const REPO = path.resolve(__dirname, '../..');
const req = createRequire(import.meta.url);
const err = (code: string) => Object.assign(new Error(code), { code });

type U = { uid: string; email: string; displayName: string | null; emailVerified: boolean; providerData: { providerId: string }[] };

function makeEnv(opts: { os?: string } = {}) {
  const log: string[] = [];
  const auth: { currentUser: U | null; languageCode?: string } = { currentUser: null };
  const listeners: ((u: U | null) => void)[] = [];
  const set = (u: U | null) => { auth.currentUser = u; listeners.forEach((l) => l(u)); };
  const mk = (email: string, providerId: string, extra: Partial<U> = {}): U => ({ uid: 'u1', email, displayName: null, emailVerified: false, providerData: [{ providerId }], ...extra });
  const state = { appleResult: null as unknown, googleResult: null as unknown, failWith: null as string | null };
  const api = {
    getAuth: () => auth,
    createUserWithEmailAndPassword: async (_a: unknown, email: string) => { log.push('create'); if (state.failWith) throw err(state.failWith); const user = mk(email, 'password'); set(user); return { user }; },
    signInWithEmailAndPassword: async (_a: unknown, email: string, pw: string) => { log.push('signin'); if (pw !== 'certa') throw err('auth/wrong-password'); const user = mk(email, 'password'); set(user); return { user }; },
    signInWithCredential: async (_a: unknown, c: { providerId: string; token: string }) => { log.push('credential:' + c.providerId); if (state.failWith) throw err(state.failWith); const user = mk('x@y.com', c.providerId, { emailVerified: true }); set(user); return { user }; },
    reauthenticateWithCredential: async (_u: unknown, c: { providerId: string; nonce?: string }) => { log.push('reauth:' + c.providerId); },
    deleteUser: async () => { log.push('delete'); set(null); },
    revokeAccessToken: async (_a: unknown, token: string) => { log.push('revoke:' + token); },
    sendPasswordResetEmail: async (_a: unknown, email: string) => { log.push('reset'); if (email.startsWith('naoexiste')) throw err('auth/user-not-found'); },
    sendEmailVerification: async () => { log.push('verify'); },
    reload: async () => { log.push('reload'); },
    signOut: async () => { log.push('signout'); set(null); },
    updateProfile: async (u: U, p: { displayName: string }) => { log.push('profile:' + p.displayName); u.displayName = p.displayName; },
    onAuthStateChanged: (_a: unknown, cb: (u: U | null) => void) => { listeners.push(cb); cb(auth.currentUser); return () => listeners.splice(listeners.indexOf(cb), 1); },
    GoogleAuthProvider: { credential: (t: string) => ({ providerId: 'google.com', token: t }) },
    AppleAuthProvider: { credential: (t: string, nonce: string) => ({ providerId: 'apple.com', token: t, nonce }) },
    EmailAuthProvider: { credential: (e: string, p: string) => ({ providerId: 'password', token: `${e}:${p}` }) },
  };
  const google = {
    GoogleSignin: {
      configure: (o: unknown) => { log.push('google-configure:' + JSON.stringify(o)); },
      hasPlayServices: async () => true,
      signIn: async () => { log.push('google-signin'); if (state.googleResult) return state.googleResult; return { type: 'success', data: { idToken: 'gid' } }; },
      signOut: async () => { log.push('google-signout'); },
    },
  };
  const apple = {
    AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
    signInAsync: async (o: { nonce: string }) => { log.push('apple-signin:' + o.nonce); if (state.appleResult) return state.appleResult; return { identityToken: 'aid', authorizationCode: 'acode', fullName: { givenName: 'Ana', familyName: 'Lima' } }; },
  };
  const crypto = {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    getRandomBytesAsync: async () => new Uint8Array([1, 2, 3, 255, 0, 16, 32, 64, 1, 2, 3, 4, 5, 6, 7, 8]),
    digestStringAsync: async (_alg: string, v: string) => 'hash(' + v + ')',
  };
  const p = new FirebaseAuthProvider({ authApi: api, googleSignin: google, appleAuth: apple, crypto, os: opts.os ?? 'ios' });
  return { p, api, auth, log, state, set, mk };
}

describe('FirebaseAuthProvider', () => {
  it('implementa a interface inteira; Apple só no iOS; e-mails em português', () => {
    const ios = makeEnv({ os: 'ios' });
    expect(() => assertAuthProvider(ios.p)).not.toThrow();
    expect(ios.p.capabilities).toEqual({ email: true, google: true, apple: true });
    expect(ios.auth.languageCode).toBe('pt-BR');
    expect(makeEnv({ os: 'android' }).p.capabilities.apple).toBe(false);
  });

  it('cadastro: cria, grava o nome e devolve o usuário com os provedores', async () => {
    const { p, log } = makeEnv();
    const u = await p.signUpWithEmail({ email: ' ana@x.com ', password: 'Senha#Forte123', name: ' Ana ' });
    expect(u).toMatchObject({ email: 'ana@x.com', displayName: 'Ana', providers: ['password'], emailVerified: false });
    expect(log).toEqual(['create', 'profile:Ana']);
  });

  it('erros do Firebase passam com o código e viram mensagens em português sem revelar a conta', async () => {
    const { p, state } = makeEnv();
    state.failWith = 'auth/email-already-in-use';
    const e = await p.signUpWithEmail({ email: 'a@b.com', password: 'x' }).catch((x: Error) => x);
    expect(E.authErrorMessage(e, 'signUp')).toMatch(/entre ou recupere a senha/);
    const bad = await p.signInWithEmail({ email: 'a@b.com', password: 'errada' }).catch((x: Error) => x);
    expect(E.authErrorMessage(bad, 'signIn')).toBe('E-mail ou senha incorretos.');
  });

  it('Google: configura pelo arquivo do Firebase (autoDetect) e entra', async () => {
    const { p, log } = makeEnv();
    const u = await p.signInWithGoogle();
    expect(u.providers).toEqual(['google.com']);
    expect(log[0]).toBe('google-configure:{"webClientId":"autoDetect"}');
    expect(log).toContain('credential:google.com');
  });

  it('Google cancelado vira cancelamento (sem mensagem de erro)', async () => {
    const { p, state } = makeEnv();
    state.googleResult = { type: 'cancelled' };
    const e = await p.signInWithGoogle().catch((x: Error) => x);
    expect(E.authErrorMessage(e, 'social')).toBe('');
  });

  it('Apple: manda o HASH do nonce à Apple e o valor BRUTO ao Firebase; grava o nome da primeira vez', async () => {
    const { p, log, auth } = makeEnv();
    const u = await p.signInWithApple();
    const sent = log.find((l) => l.startsWith('apple-signin:'))!.slice('apple-signin:'.length);
    expect(sent).toBe('hash(010203ff0010204001020304050607' + '08)'); // SHA-256 do bruto (hex dos 16 bytes)
    expect(sent).not.toBe('010203ff001020400102030405060708');
    expect(u.providers).toEqual(['apple.com']);
    expect(auth.currentUser!.displayName).toBe('Ana Lima');
    expect(log).toContain('profile:Ana Lima');
  });

  it('Apple: fora do iOS não funciona (indisponível)', async () => {
    const { p } = makeEnv({ os: 'android' });
    await expect(p.signInWithApple()).rejects.toMatchObject({ code: 'auth/unavailable' });
  });

  it('recuperação de senha: e-mail inexistente não vira erro', async () => {
    const { p } = makeEnv();
    await expect(p.sendPasswordReset('naoexiste@x.com')).resolves.toBeUndefined();
    await expect(p.sendPasswordReset('existe@x.com')).resolves.toBeUndefined();
  });

  it('verificação, recarregar e sair (e sair do Google)', async () => {
    const { p, log } = makeEnv();
    await expect(p.sendEmailVerification()).rejects.toMatchObject({ code: 'auth/no-current-user' });
    await p.signInWithEmail({ email: 'a@b.com', password: 'certa' });
    await p.sendEmailVerification();
    expect((await p.reloadUser()).email).toBe('a@b.com');
    await p.signOut();
    expect(p.getCurrentUser()).toBeNull();
    expect(log).toEqual(expect.arrayContaining(['verify', 'reload', 'signout', 'google-signout']));
  });

  it('excluir conta por e-mail: reautentica com a senha e apaga', async () => {
    const { p, log } = makeEnv();
    await p.signInWithEmail({ email: 'a@b.com', password: 'certa' });
    await p.deleteAccount({ password: 'certa' });
    expect(log.filter((l) => /^(reauth|delete)/.test(l))).toEqual(['reauth:password', 'delete']);
    expect(p.getCurrentUser()).toBeNull();
  });

  it('excluir conta com Apple: reautentica na Apple, REVOGA o token e só então apaga', async () => {
    const { p, log } = makeEnv();
    await p.signInWithApple();
    log.length = 0;
    await p.deleteAccount();
    expect(log.find((l) => l.startsWith('apple-signin'))).toBeTruthy();
    const order = log.filter((l) => /^(reauth|revoke|delete)/.test(l));
    expect(order).toEqual(['reauth:apple.com', 'revoke:acode', 'delete']);
  });

  it('excluir conta com Google: reautentica no Google', async () => {
    const { p, log } = makeEnv();
    await p.signInWithGoogle();
    log.length = 0;
    await p.deleteAccount();
    expect(log.filter((l) => /^(reauth|delete)/.test(l))).toEqual(['reauth:google.com', 'delete']);
  });

  it('o estado da conta chega pelos listeners', async () => {
    const { p } = makeEnv();
    const seen: unknown[] = [];
    const off = p.onAuthStateChanged((u: { email: string } | null) => seen.push(u?.email ?? null));
    await p.signInWithEmail({ email: 'a@b.com', password: 'certa' });
    await p.signOut();
    off();
    expect(seen).toEqual([null, 'a@b.com', null]);
  });
});

describe('sem módulos nativos o app segue convidado', () => {
  it('createAuthProvider cai no NullAuthProvider se o carregamento nativo devolver null ou lançar', () => {
    for (const loadNative of [() => null, () => { throw new Error('sem módulo'); }]) {
      const p = createAuthProvider({ enabled: true, platformOS: 'ios', loadNative });
      expect(p.reason).toBe('unavailable');
    }
  });
  it('loadNativeProvider usa require dentro de try/catch direto (formato aceito pelo Metro) e há versão web vazia', () => {
    const src = readFileSync(path.join(REPO, 'src/auth/loadNativeProvider.js'), 'utf8');
    for (const m of ['@react-native-firebase/auth', '@react-native-firebase/app', '@react-native-google-signin/google-signin', 'expo-apple-authentication', 'expo-crypto']) {
      expect(src).toMatch(new RegExp(`try \\{ \\w+ = require\\('${m.replace(/[/@-]/g, (c) => '\\' + c)}'\\); \\} catch`));
    }
    expect(readFileSync(path.join(REPO, 'src/auth/loadNativeProvider.web.js'), 'utf8')).toMatch(/return null/);
  });
  it('os módulos de conta NÃO estão no package.json nem no lockfile (build normal idêntico)', () => {
    const pkg = readFileSync(path.join(REPO, 'package.json'), 'utf8');
    const lock = readFileSync(path.join(REPO, 'package-lock.json'), 'utf8');
    for (const m of ['@react-native-firebase', 'google-signin', 'expo-apple-authentication', 'expo-crypto', 'expo-build-properties']) {
      expect(pkg, m).not.toContain(m);
      expect(lock, m).not.toContain(`node_modules/${m}`);
    }
  });
});

describe('plugin opcional do Firebase', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), 'fb-plugin-')); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  const plugin = req('../../plugins/withFirebaseOptional.js') as ((c: unknown) => unknown) & { resolveConfigFiles: (env: Record<string, string>, cwd: string) => { enabled: boolean; androidFile: string | null; iosFile: string | null } };

  it('sem FIREBASE_ENABLED devolve o config INTACTO (mesma referência), mesmo com os arquivos presentes', () => {
    writeFileSync(path.join(dir, 'google-services.json'), '{}');
    writeFileSync(path.join(dir, 'GoogleService-Info.plist'), '<plist/>');
    const env = { FIREBASE_ANDROID_CONFIG: path.join(dir, 'google-services.json'), FIREBASE_IOS_CONFIG: path.join(dir, 'GoogleService-Info.plist') };
    expect(plugin.resolveConfigFiles(env, dir)).toEqual({ enabled: false, androidFile: null, iosFile: null });
    const cfg = { name: 'x', ios: {}, android: {} };
    const before = process.env.FIREBASE_ENABLED;
    delete process.env.FIREBASE_ENABLED;
    try { expect(plugin(cfg)).toBe(cfg); } finally { if (before !== undefined) process.env.FIREBASE_ENABLED = before; }
  });
  it('com a flag e sem arquivos, também devolve o config intacto (build normal)', () => {
    const cfg = { name: 'x' };
    const before = process.env;
    process.env = { ...before, FIREBASE_ENABLED: 'true', FIREBASE_ANDROID_CONFIG: path.join(dir, 'nao.json'), FIREBASE_IOS_CONFIG: path.join(dir, 'nao.plist') };
    try { expect(plugin(cfg)).toBe(cfg); } finally { process.env = before; }
  });
  it('com a flag, cada plataforma só entra se o arquivo dela existir', () => {
    writeFileSync(path.join(dir, 'google-services.json'), '{}');
    const env = { FIREBASE_ENABLED: 'TRUE', FIREBASE_ANDROID_CONFIG: path.join(dir, 'google-services.json'), FIREBASE_IOS_CONFIG: path.join(dir, 'GoogleService-Info.plist') };
    const r = plugin.resolveConfigFiles(env, dir);
    expect(r.enabled).toBe(true);
    expect(r.androidFile).toBe(path.join(dir, 'google-services.json'));
    expect(r.iosFile).toBeNull();
  });
  it('o plugin está no app.json e o app.json NÃO cita arquivos do Firebase nem frameworks estáticos', () => {
    const app = readFileSync(path.join(REPO, 'app.json'), 'utf8');
    expect(app).toContain('./plugins/withFirebaseOptional');
    expect(app).not.toMatch(/googleServicesFile|useFrameworks|usesAppleSignIn|expo-build-properties/);
  });
  it('o código do plugin só liga frameworks estáticos, Apple e URL scheme quando o arquivo do iOS existe', () => {
    const src = readFileSync(path.join(REPO, 'plugins/withFirebaseOptional.js'), 'utf8');
    expect(src).toMatch(/if \(iosFile\) \{[\s\S]*usesAppleSignIn: true[\s\S]*useFrameworks: 'static'[\s\S]*\}/);
    expect(src).not.toMatch(/console\.log\([^)]*(readFileSync|content)/);
  });
});

describe('instalador dos módulos nativos', () => {
  const run = (env: Record<string, string>, args: string[] = []) => spawnSync(process.execPath, [path.join(REPO, 'scripts/install-firebase-deps.mjs'), ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
  const bundled = JSON.parse(readFileSync(path.join(REPO, 'node_modules/expo/bundledNativeModules.json'), 'utf8')) as Record<string, string>;
  const inst = req('../../scripts/install-firebase-deps.mjs') as never;
  void inst;

  it('sem a flag não instala nada', () => {
    const r = run({ FIREBASE_ENABLED: '' });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/nenhum módulo de conta será instalado/);
  });

  it('com a flag (simulação): módulos do Expo na versão do SDK 54 (bundledNativeModules), os demais em versão EXATA', () => {
    const r = run({ FIREBASE_ENABLED: 'true' }, ['--dry-run']);
    expect(r.status).toBe(0);
    for (const m of ['expo-apple-authentication', 'expo-crypto', 'expo-build-properties']) {
      expect(bundled[m], m).toBeTruthy();
      expect(r.stdout).toContain(`${m}@${bundled[m]}`); // a versão do SDK, sem chute
    }
    for (const m of ['@react-native-firebase/app@23.8.8', '@react-native-firebase/auth@23.8.8', '@react-native-google-signin/google-signin@16.1.5']) expect(r.stdout).toContain(m);
    expect(r.stdout).toMatch(/Ordem esperada: npm ci -> firebase-prepare -> install-firebase-deps -> expo prebuild -> check-autolinking/);
  });

  it('GRAVA no package.json do workspace (--save-exact): --no-save deixaria os módulos fora do autolinking', () => {
    const src = readFileSync(path.join(REPO, 'scripts/install-firebase-deps.mjs'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toContain("'--save-exact'");
    expect(src).not.toContain("'--no-save'");
  });

  it('native-deps.json: Expo só por nome (versão vem do SDK) e os demais com versão exata', () => {
    const cfg = JSON.parse(readFileSync(path.join(REPO, 'firebase/native-deps.json'), 'utf8')) as { expo: string[]; pinned: Record<string, string> };
    expect(cfg.expo.sort()).toEqual(['expo-apple-authentication', 'expo-build-properties', 'expo-crypto']);
    expect(Object.keys(cfg.pinned).sort()).toEqual(['@react-native-firebase/app', '@react-native-firebase/auth', '@react-native-google-signin/google-signin']);
    for (const v of Object.values(cfg.pinned)) expect(v).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('resolveSpecs recusa módulo do Expo ausente no SDK e versão não fixada', async () => {
    const { resolveSpecs, verifyInstalled } = await import('../../scripts/install-firebase-deps.mjs' as string);
    expect(() => resolveSpecs({ expo: ['expo-crypto'] }, {})).toThrow(/bundledNativeModules/);
    expect(() => resolveSpecs({ pinned: { x: '^1.0.0' } }, {})).toThrow(/não fixada/);
    expect(resolveSpecs({ expo: ['expo-crypto'], pinned: { y: '1.2.3' } }, { 'expo-crypto': '~15.0.9' }).map((s: { spec: string }) => s.spec)).toEqual(['expo-crypto@~15.0.9', 'y@1.2.3']);
    // o erro real: instalado em node_modules, mas fora de dependencies (o autolinking não vê)
    const dir = mkdtempSync(path.join(tmpdir(), 'inst-'));
    try {
      writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', dependencies: { b: '1.0.0' } }));
      for (const n of ['a', 'b']) { mkdirSync(path.join(dir, 'node_modules', n), { recursive: true }); writeFileSync(path.join(dir, 'node_modules', n, 'package.json'), `{"name":"${n}","version":"1.0.0"}`); }
      const problems = verifyInstalled(dir, ['a', 'b', 'c']) as string[];
      expect(problems.some((p) => /^a não está em dependencies do package\.json/.test(p))).toBe(true);
      expect(problems.some((p) => /^c não está resolvível/.test(p))).toBe(true);
      expect(problems.some((p) => p.startsWith('b '))).toBe(false);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
