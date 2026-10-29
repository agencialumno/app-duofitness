// Verificação de e-mail: o estado vem do usuário RECARREGADO (reloadUser), numa única fonte (verificationController),
// sem reiniciar o app. Provedor falso (FakeAuthProvider) e Firebase com módulos falsos; nada de rede.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import FakeAuthProvider from '../../src/auth/FakeAuthProvider.js';
// @ts-expect-error módulo JS do app, sem tipos
import FirebaseAuthProvider from '../../src/auth/FirebaseAuthProvider.js';
// @ts-expect-error módulo JS do app, sem tipos
import { createVerificationController } from '../../src/auth/verificationController.js';
// @ts-expect-error módulo JS do app, sem tipos
import { isAppleRelayEmail, needsEmailVerification, verificationView } from '../../src/auth/authFlow.js';

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const SENHA = 'Corvo#Lilas2026';

async function setup() {
  const p = new FakeAuthProvider();
  const ctl = createVerificationController(p);
  ctl.start();
  await p.signUpWithEmail({ email: 'ana@exemplo.com', password: SENHA });
  await ctl.refresh(); // a conferência que o app faz ao entrar
  return { p, ctl };
}
const view = (ctl: any) => {
  const s = ctl.getState();
  return verificationView({ user: s.user, checking: s.checking, failed: s.failed, checkedOnce: s.checkedUid === s.user?.uid });
};

describe('não verificado -> verificado, sem reiniciar o app', () => {
  it('o link do e-mail só aparece numa recarga: antes dela o estado antigo continua; depois dela todas as telas veem "verificado"', async () => {
    const { p, ctl } = await setup();
    expect(view(ctl).kind).toBe('unverified');
    p.markVerified('ana@exemplo.com'); // a pessoa abriu o link no app de e-mail
    expect(ctl.getState().user.emailVerified).toBe(false); // ainda desatualizado em memória (a causa do problema)
    const r = await ctl.refresh(); // foco do Perfil / "Já verifiquei" / volta do segundo plano
    expect(r.ok).toBe(true);
    expect(r.user.emailVerified).toBe(true);
    expect(ctl.getState().user.emailVerified).toBe(true); // estado global atualizado
    expect(view(ctl)).toMatchObject({ kind: 'verified', text: 'E-mail verificado', icon: 'checkmark-circle' });
  });

  it('o token é renovado quando o e-mail passa a verificado (as regras leem email_verified do token)', async () => {
    const { p, ctl } = await setup();
    await ctl.refresh();
    expect(p.tokenRefreshes).toBe(0);
    p.markVerified('ana@exemplo.com');
    await ctl.refresh();
    expect(p.tokenRefreshes).toBe(1);
  });

  it('não pisca "não verificado": antes da primeira conferência é "Verificando…", e durante a recarga também', async () => {
    const p = new FakeAuthProvider();
    const ctl = createVerificationController(p);
    ctl.start();
    const states: string[] = [];
    ctl.subscribe(() => states.push(view(ctl)?.kind ?? 'sem-usuario'));
    await p.signUpWithEmail({ email: 'ana@exemplo.com', password: SENHA });
    await new Promise((r) => setTimeout(r, 0)); // a conferência automática ao entrar termina
    expect(states[0]).toBe('checking'); // entrou e ainda não conferiu: nunca começa em "não verificado"
    expect(states.indexOf('unverified')).toBeGreaterThan(states.indexOf('checking'));
    expect(view(ctl).kind).toBe('unverified');
    p.markVerified('ana@exemplo.com');
    const pending = ctl.refresh();
    expect(view(ctl).kind).toBe('checking'); // recarregando: "Verificando…", não "não verificado"
    await pending;
    expect(view(ctl).kind).toBe('verified');
  });

  it('já verificado nunca volta a "Verificando…" numa nova recarga (sem piscar)', async () => {
    const { p, ctl } = await setup();
    p.markVerified('ana@exemplo.com');
    await ctl.refresh();
    const kinds: string[] = [];
    ctl.subscribe(() => kinds.push(view(ctl).kind));
    await ctl.refresh();
    expect(new Set(kinds)).toEqual(new Set(['verified']));
  });
});

describe('quando recarregar', () => {
  it('volta do segundo plano (AppState "active") recarrega só quem ainda não verificou', async () => {
    const { p, ctl } = await setup();
    p.calls.length = 0;
    p.markVerified('ana@exemplo.com');
    await ctl.onAppActive();
    expect(p.calls.filter((c: string) => c === 'reloadUser')).toHaveLength(1);
    expect(ctl.getState().user.emailVerified).toBe(true);
    p.calls.length = 0;
    await ctl.onAppActive(); // já verificado: sem rede à toa
    expect(p.calls).not.toContain('reloadUser');
  });

  it('chamadas simultâneas (foco + AppState + botão) viram uma só recarga', async () => {
    const { p, ctl } = await setup();
    p.calls.length = 0;
    await Promise.all([ctl.refresh(), ctl.refresh(), ctl.onAppActive()]);
    expect(p.calls.filter((c: string) => c === 'reloadUser')).toHaveLength(1);
  });

  it('sem usuário (convidado) não há recarga nem erro', async () => {
    const p = new FakeAuthProvider();
    const ctl = createVerificationController(p);
    ctl.start();
    await expect(ctl.refresh()).resolves.toEqual({ ok: true, user: null });
    await ctl.onAppActive();
    expect(p.calls).not.toContain('reloadUser');
  });
});

describe('erro de rede', () => {
  it('mostra "Não foi possível verificar agora" (nunca "não verificado") e se recupera na próxima tentativa', async () => {
    const { p, ctl } = await setup();
    p.failNext('auth/network-request-failed');
    const r = await ctl.refresh();
    expect(r.ok).toBe(false);
    expect(view(ctl)).toMatchObject({ kind: 'unavailable', text: 'Não foi possível verificar agora', canAct: true });
    expect(view(ctl).text).not.toMatch(/não verificado/i);
    p.markVerified('ana@exemplo.com');
    expect((await ctl.refresh()).ok).toBe(true);
    expect(view(ctl).kind).toBe('verified');
  });

  it('a falha na primeira conferência (app reaberto, sem rede) também não vira "não verificado"', async () => {
    const p = new FakeAuthProvider();
    await p.signUpWithEmail({ email: 'ana@exemplo.com', password: SENHA }); // sessão que já existia
    const ctl = createVerificationController(p);
    ctl.start();
    expect(view(ctl).kind).toBe('checking');
    p.failNext('auth/network-request-failed');
    await ctl.refresh();
    expect(view(ctl)).toMatchObject({ kind: 'unavailable', text: 'Não foi possível verificar agora' });
  });

  it('o estado antigo é mantido quando a recarga falha (não perde o usuário)', async () => {
    const { p, ctl } = await setup();
    const before = ctl.getState().user;
    p.failNext('auth/network-request-failed');
    await ctl.refresh();
    expect(ctl.getState().user).toEqual(before);
  });
});

describe('Google e Apple', () => {
  it('Google: não pergunta nada; mostra o e-mail como vem do provedor, sem recarga', async () => {
    const p = new FakeAuthProvider();
    const ctl = createVerificationController(p);
    ctl.start();
    await p.signInWithGoogle();
    p.calls.length = 0;
    await ctl.onAppActive();
    expect(p.calls).not.toContain('reloadUser');
    const v = view(ctl);
    expect(v).toMatchObject({ kind: 'provider', text: 'E-mail informado pelo Google', canAct: false });
    expect(needsEmailVerification(ctl.getState().user)).toBe(false);
    expect(ctl.getState().user.email).toBe('pessoa.google@exemplo.com');
  });

  it('Apple com e-mail privado (relay): texto próprio explicando o repasse', async () => {
    const p = new FakeAuthProvider();
    const ctl = createVerificationController(p);
    ctl.start();
    await p.signInWithApple();
    const v = view(ctl);
    expect(v.kind).toBe('provider');
    expect(v.text).toBe('E-mail informado pela Apple');
    expect(isAppleRelayEmail(ctl.getState().user.email)).toBe(true);
    expect(v.note).toMatch(/e-mail privado da Apple/i);
    expect(isAppleRelayEmail('ana@icloud.com')).toBe(false);
    expect(verificationView({ user: { ...ctl.getState().user, email: 'ana@icloud.com' } }).note).toBe('');
  });
});

describe('Firebase: renovação do token', () => {
  function env(verifiedAfterReload: boolean) {
    const log: string[] = [];
    const user = { uid: 'u1', email: 'a@b.com', displayName: null, emailVerified: false, providerData: [{ providerId: 'password' }] };
    const auth = { currentUser: user as typeof user | null };
    const api = {
      getAuth: () => auth,
      reload: async (u: typeof user) => { log.push('reload'); if (verifiedAfterReload) u.emailVerified = true; },
      getIdToken: async (_u: unknown, force: boolean) => { log.push('token:' + force); },
      onAuthStateChanged: () => () => undefined,
    };
    const p = new FirebaseAuthProvider({ authApi: api, googleSignin: null, appleAuth: null, crypto: null, os: 'ios' });
    return { p, log };
  }
  it('e-mail passou a verificado: recarrega e força um token novo (getIdToken(true))', async () => {
    const { p, log } = env(true);
    const u = await p.reloadUser();
    expect(u.emailVerified).toBe(true);
    expect(log).toEqual(['reload', 'token:true']);
  });
  it('ainda não verificado: só recarrega, sem renovar o token', async () => {
    const { p, log } = env(false);
    expect((await p.reloadUser()).emailVerified).toBe(false);
    expect(log).toEqual(['reload']);
  });
});

describe('uma só fonte, sem valor gravado', () => {
  it('nenhuma tela guarda "verificado" no aparelho: o estado vem do usuário recarregado', () => {
    for (const f of ['src/auth/AuthContext.js', 'src/auth/verificationController.js', 'src/components/auth/AccountCard.js']) {
      const code = read(f).replace(/^\s*\/\/.*$/gm, '');
      expect(code, f).not.toMatch(/AsyncStorage\.(set|get)Item\([^)]*(verif|email)/i);
      expect(code, f).not.toMatch(/localStorage/);
    }
  });
  it('Perfil: recarrega ao abrir e ao voltar ao foco; contexto: recarrega ao voltar do segundo plano; telas usam refreshUser', () => {
    const prof = read('src/screens/ProfileScreen.js');
    expect(prof).toMatch(/addListener\('focus'/);
    expect(prof).toMatch(/refreshUser\(\)/);
    const ctx = read('src/auth/AuthContext.js');
    expect(ctx).toMatch(/AppState\.addEventListener\('change'/);
    expect(ctx).toMatch(/st === 'active'/);
    const c = read('src/components/auth/AccountCard.js');
    expect(c).toMatch(/refreshUser/);
    expect(c).not.toMatch(/provider\.reloadUser\(\)/); // sempre pelo estado global
  });
  it('o cartão de conta usa ícone E texto, intervalo entre reenvios e "Já verifiquei"', () => {
    const c = read('src/components/auth/AccountCard.js');
    expect(c).toMatch(/verificationView/);
    expect(c).toMatch(/name=\{view\.icon\}/);
    expect(c).toMatch(/RESEND_WAIT_SECONDS/);
    expect(c).toMatch(/Já verifiquei/);
    expect(c).toMatch(/Reenviar e-mail de verificação/);
  });
});
