// Conta: erros em português, intervalo entre tentativas, fluxo e lógica de estado, com o FakeAuthProvider (sem rede).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import FakeAuthProvider from '../../src/auth/FakeAuthProvider.js';
// @ts-expect-error módulo JS do app, sem tipos
import NullAuthProvider from '../../src/auth/NullAuthProvider.js';
// @ts-expect-error módulo JS do app, sem tipos
import { assertAuthProvider, AUTH_METHODS } from '../../src/auth/authInterface.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as E from '../../src/auth/authErrors.js';
// @ts-expect-error módulo JS do app, sem tipos
import { createAttemptLimiter } from '../../src/auth/attemptLimiter.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as F from '../../src/auth/authFlow.js';
// @ts-expect-error módulo JS do app, sem tipos
import { createAuthProvider, wantsFakeAuth } from '../../src/auth/createAuthProvider.js';

const REPO = path.resolve(__dirname, '../..');
const err = (code: string) => Object.assign(new Error(code), { code });
const SENHA = 'Corvo#Lilas2026';

describe('interface do provedor', () => {
  it('Fake e Null implementam toda a interface', () => {
    expect(() => assertAuthProvider(new FakeAuthProvider())).not.toThrow();
    expect(() => assertAuthProvider(new NullAuthProvider())).not.toThrow();
    expect(AUTH_METHODS).toHaveLength(11);
  });
  it('um provedor incompleto é recusado', () => {
    expect(() => assertAuthProvider({ capabilities: {}, signOut() {} })).toThrow(/falta/);
  });
});

describe('mapeamento de erros (português, sem revelar contas)', () => {
  it('e-mail desconhecido, senha errada e credencial inválida dão o MESMO texto', () => {
    const msgs = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'].map((c) => E.authErrorMessage(err(c), 'signIn'));
    expect(new Set(msgs).size).toBe(1);
    expect(msgs[0]).toBe('E-mail ou senha incorretos.');
  });
  it('cadastro com e-mail existente não confirma que ele existe', () => {
    const m = E.authErrorMessage(err('auth/email-already-in-use'), 'signUp');
    expect(m).not.toMatch(/já está (em uso|cadastrado)|já existe/i);
    expect(m).toMatch(/entre ou recupere a senha/);
  });
  it('conflito de provedor tem texto próprio com o caminho', () => {
    expect(E.authErrorMessage(err('auth/account-exists-with-different-credential'), 'social')).toMatch(/outro método de entrada/);
  });
  it('cancelar o login social não é erro (mensagem vazia)', () => {
    for (const c of ['auth/user-cancelled', 'ERR_REQUEST_CANCELED', 'SIGN_IN_CANCELLED']) expect(E.authErrorMessage(err(c), 'social')).toBe('');
  });
  it('rede, excesso de tentativas, e-mail inválido, reautenticação e código desconhecido', () => {
    expect(E.authErrorMessage(err('auth/network-request-failed'))).toMatch(/Sem conexão/);
    expect(E.authErrorMessage(err('auth/too-many-requests'))).toMatch(/Muitas tentativas/);
    expect(E.authErrorMessage(err('auth/invalid-email'))).toMatch(/Confira o e-mail/);
    expect(E.authErrorMessage(err('auth/requires-recent-login'))).toMatch(/confirme a sua identidade/);
    expect(E.authErrorMessage(err('auth/qualquer-coisa'))).toBe(E.GENERIC);
    expect(E.authErrorMessage(undefined)).toBe(E.GENERIC);
    expect(E.authErrorMessage(null)).toBe(E.GENERIC);
  });
  it('nenhuma mensagem vaza código técnico em inglês', () => {
    for (const c of ['auth/invalid-credential', 'auth/email-already-in-use', 'auth/too-many-requests', 'auth/unavailable', 'x']) {
      expect(E.authErrorMessage(err(c), 'signIn')).not.toMatch(/auth\/|firebase|error/i);
    }
  });
  it('a resposta da recuperação é única e valida o e-mail', () => {
    expect(E.RESET_SENT).toMatch(/Se existir uma conta/);
    expect(E.validateEmail('')).toMatch(/Informe/);
    expect(E.validateEmail('abc')).toMatch(/Confira/);
    expect(E.validateEmail('a@b')).toMatch(/Confira/);
    expect(E.validateEmail(' ana@exemplo.com ')).toBe('');
    expect(E.isThrottle(err('auth/too-many-requests'))).toBe(true);
  });
});

describe('intervalo entre tentativas', () => {
  it('bloqueia depois de 5 falhas, libera com o tempo e cresce a cada rodada', () => {
    let t = 0;
    const l = createAttemptLimiter({ now: () => t });
    for (let i = 0; i < 4; i++) l.recordFailure();
    expect(l.canTry()).toBe(true);
    l.recordFailure();
    expect(l.canTry()).toBe(false);
    expect(l.remainingSeconds()).toBe(30);
    t += 30000;
    expect(l.canTry()).toBe(true);
    for (let i = 0; i < 5; i++) l.recordFailure();
    expect(l.remainingSeconds()).toBe(60); // dobra
  });
  it('sucesso zera tudo; o bloqueio tem teto de 5 minutos; lock() força a espera', () => {
    let t = 0;
    const l = createAttemptLimiter({ now: () => t });
    for (let i = 0; i < 5; i++) l.recordFailure();
    l.recordSuccess();
    expect(l.canTry()).toBe(true);
    for (let r = 0; r < 12; r++) { for (let i = 0; i < 5; i++) l.recordFailure(); t += 400000; }
    for (let i = 0; i < 5; i++) l.recordFailure();
    expect(l.remainingSeconds()).toBeLessThanOrEqual(300);
    t += 400000;
    l.lock(10000);
    expect(l.remainingSeconds()).toBe(10);
  });
});

describe('cadastro: validação e destino', () => {
  const base = { name: 'Ana Souza', email: 'ana@exemplo.com', password: SENHA, confirm: SENHA, isAdult: true, accepted: true };
  it('com tudo certo, habilita', () => {
    expect(F.validateSignUp(base).canSubmit).toBe(true);
  });
  it.each([
    ['sem confirmar 18+', { isAdult: false }],
    ['sem aceitar os termos', { accepted: false }],
    ['senhas diferentes', { confirm: SENHA + 'x' }],
    ['confirmação vazia', { confirm: '' }],
    ['senha fraca', { password: 'abc', confirm: 'abc' }],
    ['senha com o nome', { password: 'Souza#Lilas2026', confirm: 'Souza#Lilas2026' }],
    ['e-mail inválido', { email: 'ana@' }],
    ['sem nome', { name: '  ' }],
  ])('%s: não habilita', (_n, over) => {
    expect(F.validateSignUp({ ...base, ...over }).canSubmit).toBe(false);
  });
  it('erros só aparecem nos campos tocados', () => {
    const r = F.validateSignUp({ ...base, email: 'x', confirm: '' }, { email: true });
    expect(Object.keys(r.errors)).toEqual(['email']);
  });
  it('destino depois de entrar: perfil existente vai ao app; sem perfil segue o cadastro do perfil', () => {
    expect(F.destinationAfterAuth({ hasRealProfile: true })).toBe('Main');
    expect(F.destinationAfterAuth({ hasRealProfile: false })).toBe('ProfileSetup');
  });
  it('excluir conta: exige digitar EXCLUIR e, para e-mail e senha, a senha', () => {
    expect(F.canConfirmDelete({ providers: ['password'], password: 'x', typed: 'excluir' })).toBe(true);
    expect(F.canConfirmDelete({ providers: ['password'], password: '', typed: 'EXCLUIR' })).toBe(false);
    expect(F.canConfirmDelete({ providers: ['google.com'], password: '', typed: 'EXCLUIR' })).toBe(true);
    expect(F.canConfirmDelete({ providers: ['google.com'], typed: 'sim' })).toBe(false);
  });
});

describe('FakeAuthProvider: lógica de estado', () => {
  it('cadastro, estado e listeners', async () => {
    const p = new FakeAuthProvider();
    const seen: unknown[] = [];
    const off = p.onAuthStateChanged((u: unknown) => seen.push(u && (u as { email: string }).email));
    expect(seen).toEqual([null]);
    const u = await p.signUpWithEmail({ email: 'Ana@Exemplo.com', password: SENHA, name: 'Ana' });
    expect(u).toMatchObject({ email: 'ana@exemplo.com', emailVerified: false, providers: ['password'], displayName: 'Ana' });
    expect(p.getCurrentUser().email).toBe('ana@exemplo.com');
    await p.signOut();
    expect(p.getCurrentUser()).toBeNull();
    off();
    await p.signInWithEmail({ email: 'ana@exemplo.com', password: SENHA });
    expect(seen).toEqual([null, 'ana@exemplo.com', null]); // o último login ocorreu depois de cancelar a inscrição
  });
  it('entrar com senha errada ou e-mail inexistente: mesmo código', async () => {
    const p = new FakeAuthProvider();
    await p.signUpWithEmail({ email: 'ana@exemplo.com', password: SENHA });
    await p.signOut();
    const codes: string[] = [];
    for (const cred of [{ email: 'ana@exemplo.com', password: 'errada' }, { email: 'outra@exemplo.com', password: SENHA }]) {
      await p.signInWithEmail(cred).catch((e: { code: string }) => codes.push(e.code));
    }
    expect(codes).toEqual(['auth/invalid-credential', 'auth/invalid-credential']);
  });
  it('e-mail repetido, e-mail inválido e recuperação sem revelar', async () => {
    const p = new FakeAuthProvider();
    await p.signUpWithEmail({ email: 'ana@exemplo.com', password: SENHA });
    await expect(p.signUpWithEmail({ email: 'ANA@exemplo.com', password: SENHA })).rejects.toMatchObject({ code: 'auth/email-already-in-use' });
    await expect(p.signUpWithEmail({ email: 'sem-arroba', password: SENHA })).rejects.toMatchObject({ code: 'auth/invalid-email' });
    await expect(p.sendPasswordReset('ana@exemplo.com')).resolves.toBeUndefined();
    await expect(p.sendPasswordReset('ninguem@exemplo.com')).resolves.toBeUndefined();
    expect(p.sentReset).toHaveLength(2);
  });
  it('verificação de e-mail: reenviar e "já verifiquei"', async () => {
    const p = new FakeAuthProvider();
    await p.signUpWithEmail({ email: 'ana@exemplo.com', password: SENHA });
    await p.sendEmailVerification();
    await p.sendEmailVerification();
    expect(p.sentVerification).toBe(2);
    expect((await p.reloadUser()).emailVerified).toBe(false);
    p.markVerified('ana@exemplo.com');
    expect((await p.reloadUser()).emailVerified).toBe(true);
  });
  it('Google/Apple: criam conta verificada; conflito de provedor com o mesmo e-mail', async () => {
    const p = new FakeAuthProvider();
    const g = await p.signInWithGoogle();
    expect(g).toMatchObject({ providers: ['google.com'], emailVerified: true });
    await p.signOut();
    p.nextSocialEmail.apple = g.email; // mesmo e-mail, outro método
    await expect(p.signInWithApple()).rejects.toMatchObject({ code: 'auth/account-exists-with-different-credential' });
    await p.signInWithGoogle(); // o método original entra normalmente
    expect(p.getCurrentUser().email).toBe(g.email);
  });
  it('excluir conta: reautentica por senha, apaga e revoga a Apple quando for o caso', async () => {
    const p = new FakeAuthProvider();
    await p.signUpWithEmail({ email: 'ana@exemplo.com', password: SENHA });
    await expect(p.deleteAccount({ password: 'errada' })).rejects.toMatchObject({ code: 'auth/wrong-password' });
    expect(p.getCurrentUser()).not.toBeNull();
    await p.deleteAccount({ password: SENHA });
    expect(p.getCurrentUser()).toBeNull();
    await expect(p.signInWithEmail({ email: 'ana@exemplo.com', password: SENHA })).rejects.toBeTruthy();
    const a = new FakeAuthProvider();
    await a.signInWithApple();
    await a.deleteAccount({});
    expect(a.revokedApple).toBe(true);
  });
  it('falhas injetadas chegam como erro e o provedor segue funcionando', async () => {
    const p = new FakeAuthProvider();
    p.failNext('auth/network-request-failed');
    await expect(p.signInWithGoogle()).rejects.toMatchObject({ code: 'auth/network-request-failed' });
    await expect(p.signInWithGoogle()).resolves.toBeTruthy();
  });
});

describe('escolha do provedor', () => {
  it('flag desligada: convidado (Null), mesmo com ?duoFakeAuth=1', () => {
    const p = createAuthProvider({ enabled: false, platformOS: 'web', search: '?duoFakeAuth=1' });
    expect(p).toBeInstanceOf(NullAuthProvider);
    expect(p.reason).toBe('disabled');
    expect(p.getCurrentUser()).toBeNull();
  });
  it('o provedor falso só aparece na web, com a flag ligada e a URL de teste', () => {
    expect(createAuthProvider({ enabled: true, platformOS: 'web', search: '?duoFakeAuth=1' })).toBeInstanceOf(FakeAuthProvider);
    expect(createAuthProvider({ enabled: true, platformOS: 'web', search: '' })).toBeInstanceOf(NullAuthProvider);
    for (const os of ['ios', 'android']) {
      expect(wantsFakeAuth(os, '?duoFakeAuth=1')).toBe(false);
      expect(createAuthProvider({ enabled: true, platformOS: os, search: '?duoFakeAuth=1' })).toBeInstanceOf(NullAuthProvider);
    }
  });
  it('sem provedor nativo, a flag ligada vira "indisponível" sem derrubar o app', async () => {
    const p = createAuthProvider({ enabled: true, platformOS: 'ios', search: '' });
    expect(p.reason).toBe('unavailable');
    await expect(p.signInWithGoogle()).rejects.toMatchObject({ code: 'auth/unavailable' });
    const quebrado = createAuthProvider({ enabled: true, platformOS: 'ios', loadNative: () => { throw new Error('módulo ausente'); } });
    expect(quebrado).toBeInstanceOf(NullAuthProvider);
  });
  it('a flag EXPO_PUBLIC_AUTH_ENABLED vem desligada por padrão', () => {
    const src = readFileSync(path.join(REPO, 'src/data/authConfig.js'), 'utf8');
    expect(src).toMatch(/process\.env\.EXPO_PUBLIC_AUTH_ENABLED \|\| ''/);
    expect(src).toMatch(/=== 'true'/);
  });
});
