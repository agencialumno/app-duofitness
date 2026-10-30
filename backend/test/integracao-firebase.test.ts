// INTEGRAÇÃO, área 6: Firebase. O projeto NÃO tem emuladores configurados (sem firebase.json, .firebaserc nem emulators): então a cobertura é com MOCKS
// (FakeAuthProvider, e o FirebaseAuthProvider com módulos falsos em firebaseauth.test.ts). Aqui: seleção do provedor, conformidade com a interface,
// limitador de tentativas, regras de referência e a garantia de que nenhuma configuração real do Firebase está no repositório.
// SEM COBERTURA REAL (precisa do Firebase de verdade ou do emulador): login com Google/Apple, e-mail de verificação, renovação do token,
// exclusão no servidor e as regras do Firestore/Storage (nem estão publicadas).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { createAuthProvider, wantsFakeAuth } from '../../src/auth/createAuthProvider.js';
// @ts-expect-error módulo JS do app, sem tipos
import FakeAuthProvider from '../../src/auth/FakeAuthProvider.js';
// @ts-expect-error módulo JS do app, sem tipos
import NullAuthProvider from '../../src/auth/NullAuthProvider.js';
// @ts-expect-error módulo JS do app, sem tipos
import { AUTH_METHODS, assertAuthProvider } from '../../src/auth/authInterface.js';
// @ts-expect-error módulo JS do app, sem tipos
import { createAttemptLimiter } from '../../src/auth/attemptLimiter.js';
import { SENHA } from './helpers/memstore';

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');

describe('emuladores', () => {
  it('NÃO há emuladores do Firebase configurados no projeto (registrado: a cobertura é por mocks)', () => {
    for (const f of ['firebase.json', '.firebaserc', 'firebase/firebase.json']) expect(existsSync(path.join(REPO, f)), f).toBe(false);
    expect(read('package.json')).not.toMatch(/firebase-tools|emulators/);
  });
});

describe('seleção do provedor de conta', () => {
  const native = () => new FakeAuthProvider();
  it('flag desligada: provedor nulo, sem tocar em nada', () => {
    const p = createAuthProvider({ enabled: false, platformOS: 'ios', loadNative: native });
    expect(p).toBeInstanceOf(NullAuthProvider);
    expect(p.reason).toBe('disabled');
  });
  it('o provedor FALSO só existe na web e só pela URL de teste (nenhum build de iOS/Android cai nele)', () => {
    expect(wantsFakeAuth('web', '?duoFakeAuth=1')).toBe(true);
    expect(wantsFakeAuth('ios', '?duoFakeAuth=1')).toBe(false);
    expect(wantsFakeAuth('android', '?duoFakeAuth=1')).toBe(false);
    expect(wantsFakeAuth('web', '')).toBe(false);
    expect(wantsFakeAuth('web', '?duoFakeAuth=10')).toBe(false);
    expect(createAuthProvider({ enabled: true, platformOS: 'ios', search: '?duoFakeAuth=1', loadNative: () => null })).toBeInstanceOf(NullAuthProvider);
  });
  it('flag ligada sem módulo nativo (ou o módulo lança): provedor nulo "indisponível", sem derrubar o app', () => {
    const a = createAuthProvider({ enabled: true, platformOS: 'android', loadNative: () => null });
    expect(a).toBeInstanceOf(NullAuthProvider);
    expect(a.reason).toBe('unavailable');
    const b = createAuthProvider({ enabled: true, platformOS: 'ios', loadNative: () => { throw new Error('módulo ausente'); } });
    expect(b.reason).toBe('unavailable');
  });
  it('o provedor nulo falha com "indisponível" nas ações de conta e nunca faz rede', async () => {
    const p = new NullAuthProvider({ reason: 'unavailable' });
    for (const m of ['signUpWithEmail', 'signInWithEmail', 'signInWithGoogle', 'signInWithApple', 'deleteAccount']) await expect((p as any)[m]({})).rejects.toMatchObject({ code: 'auth/unavailable' });
    expect(await p.reloadUser()).toBeNull();
    let seen: unknown = 'x';
    p.onAuthStateChanged((u: unknown) => { seen = u; });
    expect(seen).toBeNull();
  });
});

describe('conformidade com a interface de conta', () => {
  it('o provedor falso e o nulo implementam TODOS os métodos da interface', () => {
    expect(() => assertAuthProvider(new FakeAuthProvider())).not.toThrow();
    expect(() => assertAuthProvider(new NullAuthProvider())).not.toThrow();
    expect(AUTH_METHODS.length).toBeGreaterThanOrEqual(8);
  });
  it('o provedor falso notifica os ouvintes na entrada e na saída, e para de notificar ao cancelar a inscrição', async () => {
    const p = new FakeAuthProvider();
    const seen: (string | null)[] = [];
    const off = p.onAuthStateChanged((u: any) => seen.push(u ? u.email : null));
    await p.signUpWithEmail({ email: 'a@exemplo.com', password: SENHA, name: 'Ana Souza' });
    await p.signOut();
    off();
    await p.signInWithEmail({ email: 'a@exemplo.com', password: SENHA });
    expect(seen).toEqual([null, 'a@exemplo.com', null]);
  });
  it('login com senha errada e conta inexistente dão a MESMA resposta (não revela quais contas existem)', async () => {
    const p = new FakeAuthProvider();
    await p.signUpWithEmail({ email: 'a@exemplo.com', password: SENHA, name: 'Ana Souza' });
    const wrong = await p.signInWithEmail({ email: 'a@exemplo.com', password: 'errada' }).catch((e: any) => e.code);
    const none = await p.signInWithEmail({ email: 'naoexiste@exemplo.com', password: 'errada' }).catch((e: any) => e.code);
    expect(wrong).toBe(none);
    await p.sendPasswordReset('naoexiste@exemplo.com'); // existente ou não: nenhuma exceção
  });
  it('conta já existente por Google não aceita o mesmo e-mail por outro método (sem fundir contas por engano)', async () => {
    const p = new FakeAuthProvider();
    p.nextSocialEmail = { google: 'mesmo@exemplo.com' };
    await p.signInWithGoogle();
    await p.signOut();
    await expect(p.signUpWithEmail({ email: 'mesmo@exemplo.com', password: SENHA, name: 'Outra' })).rejects.toBeTruthy();
  });
});

describe('limitador de tentativas', () => {
  it('bloqueia depois de 5 falhas, o tempo cresce a cada rodada (30 s, 60 s, ... até 5 min) e o sucesso zera', () => {
    let t = 0;
    const l = createAttemptLimiter({ now: () => t });
    for (let i = 0; i < 4; i++) l.recordFailure();
    expect(l.canTry()).toBe(true);
    l.recordFailure();
    expect(l.canTry()).toBe(false);
    expect(l.remainingSeconds()).toBe(30);
    t += 31_000;
    expect(l.canTry()).toBe(true);
    for (let i = 0; i < 5; i++) l.recordFailure();
    expect(l.remainingSeconds()).toBe(60);
    for (let r = 0; r < 6; r++) { t += 400_000; for (let i = 0; i < 5; i++) l.recordFailure(); }
    expect(l.remainingSeconds()).toBeLessThanOrEqual(300); // teto de 5 min
    l.recordSuccess();
    expect(l.canTry()).toBe(true);
  });
});

describe('regras de referência e segredos', () => {
  it('as regras do Firestore negam tudo por padrão e só o dono, verificado, lê e grava o próprio documento', () => {
    const r = read('firebase/firestore.rules');
    expect(r).toMatch(/match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
    expect(r).toContain('request.auth.token.email_verified == true');
    expect(r).toContain('request.auth.uid == uid');
    expect(read('firebase/storage.rules')).toMatch(/allow read, write: if false;/);
  });
  it('nenhum arquivo de configuração real do Firebase está versionado e o .gitignore os barra', () => {
    const files = spawnSync('git', ['ls-files'], { cwd: REPO, encoding: 'utf8' }).stdout.split('\n');
    expect(files.filter((f) => /google-services\.json$|GoogleService-Info\.plist$/.test(f))).toEqual([]);
    const gi = read('.gitignore');
    expect(gi).toContain('google-services.json');
    expect(gi).toContain('GoogleService-Info.plist');
  });
  it('node scripts/check-no-secrets.mjs passa', () => {
    const r = spawnSync(process.execPath, [path.join(REPO, 'scripts/check-no-secrets.mjs')], { cwd: REPO, encoding: 'utf8' });
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });
  it('o módulo nativo do Firebase NÃO está no package.json do repositório (entra só no CI, com a flag)', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(JSON.stringify({ ...pkg.dependencies, ...pkg.devDependencies })).not.toMatch(/@react-native-firebase|react-native-health-connect|react-native-healthkit/);
  });
  // BUG B2 (baixa gravidade, documentação): o comentário das regras de referência ainda diz "nada de dados de menores (a conta é 18+)", mas a idade
  // mínima agora é 13 anos com autorização do responsável (src/config/account.js). As regras não estão publicadas; o texto está desatualizado.
  it.fails('o comentário das regras de referência reflete a idade mínima atual (13 anos), não "18+"', () => {
    expect(read('firebase/firestore.rules')).not.toMatch(/a conta é 18\+/);
  });
});
