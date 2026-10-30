// Ajustes do cadastro: nome completo, nome aproveitado no onboarding, idade pedida UMA vez pelos três métodos.
// Provedor falso + armazenamento em memória; nada de rede. O nome nunca é impresso (um teste varre os módulos).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import FakeAuthProvider from '../../src/auth/FakeAuthProvider.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as F from '../../src/utils/accountFlow.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as S from '../../src/utils/accountSnapshot.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as A from '../../src/utils/accountAge.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as N from '../../src/utils/accountName.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as NS from '../../src/utils/accountNameStore.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as AF from '../../src/auth/authFlow.js';

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const code = (f: string) => read(f).replace(/^\s*\/\/.*$/gm, '');
const SENHA = 'Corvo#Lilas2026';

function memory() {
  const m = new Map<string, string>();
  return {
    m,
    getAllKeys: async () => [...m.keys()],
    getItem: async (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: async (k: string, v: string) => { m.set(k, v); },
    removeItem: async (k: string) => { m.delete(k); },
    multiGet: async (keys: string[]) => keys.map((k) => [k, m.has(k) ? (m.get(k) as string) : null]),
    multiSet: async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => m.set(k, v)); },
    multiRemove: async (keys: string[]) => { keys.forEach((k) => m.delete(k)); },
  };
}
type Store = ReturnType<typeof memory>;
type AuthUser = { uid: string; displayName: string | null };

// O que o AppContext faz ao ativar uma conta: vincula (restaura/adota/zera) e adota o nome. Devolve o estado lido.
async function activate(st: Store, u: AuthUser, pending = '') {
  await S.bindAccount(st, u.uid);
  const accountName = await NS.adoptAccountName(st, { displayName: u.displayName, pending });
  const ageRaw = await st.getItem('@duo_age');
  const ageInfo = ageRaw ? A.sanitizeAgeInfo(JSON.parse(ageRaw)) : null;
  const userRaw = await st.getItem('@duo_user');
  return { accountName, ageInfo, user: userRaw ? JSON.parse(userRaw) : null };
}
const gateOf = (uid: string, s: { ageInfo: unknown; user: unknown }) =>
  F.decideGate({ authReady: true, bound: { uid, status: 'ready' }, authUid: uid, ageInfo: s.ageInfo, user: s.user });

// Percorre o portão como a pessoa percorreria: conta uma vez cada tela de idade e de nome mostrada. Devolve as contagens.
async function journey(st: Store, u: AuthUser, { pending = '', age = '30', typedName = 'Digitado Manual' } = {}) {
  let s = await activate(st, u, pending);
  let agePrompts = 0;
  let namePrompts = 0;
  for (let guard = 0; guard < 5; guard++) {
    const g = gateOf(u.uid, s);
    if (g === 'age') {
      agePrompts++;
      await st.setItem('@duo_age', JSON.stringify(A.buildAgeInfo(A.evaluateAge(age), false)));
    } else if (g === 'onboarding') {
      const known = N.isUsableName(s.accountName);
      if (!known) namePrompts++;
      await st.setItem('@duo_user', JSON.stringify({ name: known ? s.accountName : N.cleanName(typedName), goals: ['health'], ageGroup: A.ageGroupFor(Number(age)) }));
      await st.setItem('@duo_onboarded', 'true');
    } else break;
    const ageRaw = await st.getItem('@duo_age');
    const userRaw = await st.getItem('@duo_user');
    s = { ...s, ageInfo: ageRaw ? A.sanitizeAgeInfo(JSON.parse(ageRaw)) : null, user: userRaw ? JSON.parse(userRaw) : null };
  }
  return { agePrompts, namePrompts, state: s };
}
async function signOut(st: Store, uid: string) { await F.signOutFlow({ storage: st, provider: { signOut: async () => {} }, uid }); }

describe('item 1/4: nome completo (módulo puro)', () => {
  it('cleanName: espaços, controle, tamanho', () => {
    expect(N.cleanName('  Ana   Paula \n Souza ')).toBe('Ana Paula Souza');
    expect(N.cleanName('')).toBe('');
    expect(N.cleanName(undefined)).toBe('');
    expect(N.cleanName('A'.repeat(100))).toHaveLength(N.MAX_NAME_LENGTH);
    expect(N.cleanName('José 😀')).toBe('José 😀');
  });
  it('validateFullName: só não vazio / só espaços e limite; sobrenome NÃO é exigido', () => {
    expect(N.validateFullName('')).toMatch(/nome completo/);
    expect(N.validateFullName('    ')).toMatch(/nome completo/);
    expect(N.validateFullName('Ana')).toBe('');
    expect(N.validateFullName('Ana Souza')).toBe('');
    expect(N.validateFullName('X'.repeat(N.MAX_NAME_LENGTH + 1))).toMatch(/até/);
    expect(N.NAME_HINT).toBe('Nome e sobrenome');
  });
  it('validateSignUp usa a regra do nome (vazio/só espaços bloqueia; um nome só não bloqueia)', () => {
    const base = { email: 'a@b.com', password: SENHA, confirm: SENHA, accepted: true };
    expect(AF.validateSignUp({ ...base, name: '   ' }, { name: true }).errors.name).toBeTruthy();
    expect(AF.validateSignUp({ ...base, name: '   ' }).canSubmit).toBe(false);
    expect(AF.validateSignUp({ ...base, name: 'Ana' }).canSubmit).toBe(true);
    expect(AF.validateSignUp({ ...base, name: 'Ana Souza' }).canSubmit).toBe(true);
  });
  it('a tela de cadastro: rótulo, placeholder, acessibilidade e preenchimento automático de "Nome completo", com a dica', () => {
    const c = code('src/screens/auth/SignUpScreen.js');
    const campo = c.slice(c.indexOf('label="Nome completo"'), c.indexOf('label="E-mail"'));
    expect(campo).toContain('placeholder="Nome completo"');
    expect(campo).toContain('accessibilityLabel="Nome completo"');
    expect(campo).toContain('textContentType="name"');
    expect(campo).toContain('autoComplete="name"');
    expect(campo).toContain('hint={NAME_HINT}');
    expect(c).not.toMatch(/label="Nome"/);
  });
  it('o texto do medidor de senha vai ao leitor de tela', () => {
    expect(code('src/components/auth/AuthParts.js')).toMatch(/Força da senha: \$\{strength\.label\}, nível/);
  });
});

describe('item 3: o nome da conta é aproveitado', () => {
  it('e-mail com nome: o nome digitado vira o nome do perfil e o onboarding não pergunta', async () => {
    const st = memory();
    const p = new FakeAuthProvider();
    const u = await p.signUpWithEmail({ email: 'ana@exemplo.com', password: SENHA, name: 'Ana Souza' });
    // o Firebase real só devolve o displayName depois; aqui simulamos que ele ainda veio vazio
    const r = await journey(st, { uid: u.uid, displayName: null }, { pending: 'Ana Souza' });
    expect(r.namePrompts).toBe(0);
    expect(r.state.user.name).toBe('Ana Souza');
    expect(await st.getItem('@duo_account_name')).toBe('Ana Souza');
  });
  it('Google com nome: usa o displayName', async () => {
    const st = memory();
    const p = new FakeAuthProvider();
    const u = await p.signInWithGoogle();
    const r = await journey(st, { uid: u.uid, displayName: u.displayName });
    expect(r.namePrompts).toBe(0);
    expect(r.state.user.name).toBe('Pessoa Google');
  });
  it('Apple COM nome: usa o displayName', async () => {
    const st = memory();
    const p = new FakeAuthProvider();
    const u = await p.signInWithApple();
    const r = await journey(st, { uid: u.uid, displayName: u.displayName });
    expect(r.namePrompts).toBe(0);
    expect(r.state.user.name).toBe('Pessoa Apple');
  });
  it('Apple SEM nome (ocultar e-mail): pergunta UMA vez e o campo começa vazio; depois não pergunta mais', async () => {
    const st = memory();
    const p = new FakeAuthProvider();
    p.nextSocialName = { apple: null };
    const u = await p.signInWithApple();
    expect(u.displayName).toBeNull();
    const r = await journey(st, { uid: u.uid, displayName: u.displayName }, { typedName: 'Maria Oculta' });
    expect(r.namePrompts).toBe(1);
    expect(r.state.accountName).toBe(''); // nada pré-preenchido
    expect(r.state.user.name).toBe('Maria Oculta');
    await signOut(st, u.uid);
    const again = await journey(st, { uid: u.uid, displayName: null });
    expect(again.namePrompts).toBe(0);
    expect(again.agePrompts).toBe(0);
    expect(again.state.user.name).toBe('Maria Oculta');
  });
  it('Google com displayName vazio: pergunta uma vez', async () => {
    const st = memory();
    const p = new FakeAuthProvider();
    p.nextSocialName = { google: '' };
    const u = await p.signInWithGoogle();
    expect((await journey(st, { uid: u.uid, displayName: u.displayName })).namePrompts).toBe(1);
  });
  it('nome editado no Perfil persiste depois de sair e entrar (mesmo com outro displayName na conta)', async () => {
    const st = memory();
    const p = new FakeAuthProvider();
    const u = await p.signInWithGoogle();
    const a = { uid: u.uid, displayName: u.displayName };
    await journey(st, a);
    // Perfil > Editar nome (renameUser do AppContext grava @duo_user)
    const user = JSON.parse((await st.getItem('@duo_user')) as string);
    await st.setItem('@duo_user', JSON.stringify({ ...user, name: N.cleanName('  Nome   Editado ') }));
    await signOut(st, u.uid);
    const back = await journey(st, a);
    expect(back.state.user.name).toBe('Nome Editado');
    expect(back.namePrompts).toBe(0);
  });
  it('conta A e conta B no mesmo aparelho não misturam nomes', async () => {
    const st = memory();
    const p = new FakeAuthProvider();
    const ua = await p.signUpWithEmail({ email: 'a@exemplo.com', password: SENHA, name: 'Aline Alves' });
    const a = { uid: ua.uid, displayName: ua.displayName };
    await journey(st, a, { pending: 'Aline Alves' });
    await signOut(st, ua.uid);
    expect(await st.getItem('@duo_account_name')).toBeNull(); // sair limpa as ativas
    p.nextSocialName = { apple: null };
    const ub = await p.signInWithApple(); // B sem nome
    const b = { uid: ub.uid, displayName: ub.displayName };
    const rb = await journey(st, b, { typedName: 'Bruno Braga' });
    expect(rb.namePrompts).toBe(1); // o nome da A NÃO vazou para a B
    expect(rb.state.user.name).toBe('Bruno Braga');
    await signOut(st, ub.uid);
    const ra = await journey(st, a);
    expect(ra.state.user.name).toBe('Aline Alves');
    expect(ra.state.accountName).toBe('Aline Alves');
    expect(ra.namePrompts).toBe(0);
    await signOut(st, ua.uid);
    expect((await journey(st, b)).state.user.name).toBe('Bruno Braga');
  });
  it('valor corrompido ou curto em @duo_account_name vale como ausente', async () => {
    const st = memory();
    await st.setItem('@duo_account_name', 'x');
    expect(await NS.readAccountName(st)).toBe('');
    expect(await NS.adoptAccountName(st, { displayName: 'Carla Dias' })).toBe('Carla Dias');
  });
  it('nenhum módulo do nome imprime o nome em log nem o envia a rede', () => {
    for (const f of ['src/utils/accountName.js', 'src/utils/accountNameStore.js', 'src/components/EditNameRow.js']) {
      expect(code(f), f).not.toMatch(/console\.|fetch\(|XMLHttpRequest|analytics/);
    }
    const ctx = code('src/context/AppContext.js');
    expect(ctx).not.toMatch(/console\.log\([^)]*(name|Name)/);
  });
  it('o onboarding pula a pergunta quando o nome é conhecido e pergunta (vazio) quando não é', () => {
    const c = code('src/screens/onboarding/ProfileSetupScreen.js');
    expect(c).toContain('const nameKnown = isUsableName(accountName)');
    expect(c).toContain("useState('')"); // campo digitado começa vazio
    expect(c).toContain('{nameKnown ? (');
  });
  it('o Perfil tem edição do nome com alvos de 44 pt e rótulos', () => {
    const c = code('src/components/EditNameRow.js');
    expect(c).toContain('accessibilityLabel="Editar nome"');
    expect(c).toContain('accessibilityLabel="Salvar nome"');
    expect(c).toMatch(/minHeight: 44/);
    expect(code('src/screens/ProfileScreen.js')).toContain('<EditNameRow');
  });
});

describe('item 2: a idade é pedida UMA vez por pessoa', () => {
  const providers: [string, (p: any) => Promise<AuthUser>][] = [
    ['e-mail', (p) => p.signUpWithEmail({ email: 'x@exemplo.com', password: SENHA, name: 'Xavier Lima' })],
    ['Google', (p) => p.signInWithGoogle()],
    ['Apple', (p) => p.signInWithApple()],
  ];
  it.each(providers)('%s: primeira entrada pede a idade uma vez; sair e entrar de novo na mesma conta não pede', async (_n, make) => {
    const st = memory();
    const p = new FakeAuthProvider();
    const u = await make(p);
    const au = { uid: u.uid, displayName: u.displayName };
    const first = await journey(st, au);
    expect(first.agePrompts).toBe(1);
    await signOut(st, u.uid);
    const second = await journey(st, au);
    expect(second.agePrompts).toBe(0);
    expect(second.state.ageInfo).toEqual(first.state.ageInfo);
  });
  it('reabrir o app com a sessão ativa (dono das chaves) não pede de novo', async () => {
    const st = memory();
    const p = new FakeAuthProvider();
    const u = await p.signInWithGoogle();
    const au = { uid: u.uid, displayName: u.displayName };
    await journey(st, au);
    expect((await journey(st, au)).agePrompts).toBe(0);
  });
  it('a regra de menores não enfraqueceu: <13 bloqueia, 13 a 17 exige o responsável, 18+ segue', () => {
    expect(A.evaluateAge('12').status).toBe('blocked');
    expect(A.canContinueAge(A.evaluateAge('15'), false)).toBe(false);
    expect(A.canContinueAge(A.evaluateAge('15'), true)).toBe(true);
    expect(A.evaluateAge('18').status).toBe('ok');
    expect(A.sanitizeAgeInfo({ age: 15, ageGroup: 'under18', guardianConfirmed: false })).toBeUndefined();
  });
  it('só a etapa de idade coleta a idade: nenhuma outra tela pergunta idade ou faixa etária', () => {
    const fs = ['src/screens/onboarding/WelcomeScreen.js', 'src/screens/onboarding/ProfileSetupScreen.js', 'src/screens/onboarding/BodyDataScreen.js',
      'src/screens/EditBodyDataScreen.js', 'src/screens/auth/SignUpScreen.js', 'src/screens/auth/SignInScreen.js'];
    for (const f of fs) expect(code(f), f).not.toMatch(/Idade \(em anos\)|AGE_GROUPS\.map|setAgeGroup|label="Idade"/);
    const dir = read('docs/fluxo-cadastro.md');
    expect(dir).toContain('AgeGateScreen');
    expect(dir).toContain('@duo_age');
  });
});
