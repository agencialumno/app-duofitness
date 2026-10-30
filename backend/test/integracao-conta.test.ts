// INTEGRAÇÃO, área 1: cadastro e conta. Provedor falso + armazenamento em memória; nada de rede. Percorre o fluxo real do app
// (validação do cadastro -> portão -> etapa de idade -> onboarding -> sair/entrar/excluir) com as mesmas funções puras que o AppContext usa.
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
import * as AF from '../../src/auth/authFlow.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as PW from '../../src/utils/passwordPolicy.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as NS from '../../src/utils/accountNameStore.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as LL from '../../src/utils/legalLinks.js';
// @ts-expect-error módulo JS do app, sem tipos
import { authError } from '../../src/auth/authInterface.js';
import { SENHA, memory, type Mem } from './helpers/memstore';

type AuthUser = { uid: string; displayName: string | null };
const gate = (uid: string | null, s: { ageInfo: unknown; user: unknown }) =>
  F.decideGate({ authReady: true, bound: { uid, status: 'ready' }, authUid: uid, ageInfo: s.ageInfo, user: s.user });

async function activate(st: Mem, u: AuthUser, pending = '') {
  await S.bindAccount(st, u.uid);
  await NS.adoptAccountName(st, { displayName: u.displayName, pending });
  const age = await st.getItem('@duo_age');
  const user = await st.getItem('@duo_user');
  return { ageInfo: age ? A.sanitizeAgeInfo(JSON.parse(age)) : null, user: user ? JSON.parse(user) : null };
}
// A pessoa conclui a idade e o onboarding e treina um pouco (dados que precisam voltar depois).
async function onboardAndTrain(st: Mem, name: string, age: string, extra: Record<string, string> = {}) {
  const info = A.buildAgeInfo(A.evaluateAge(age), A.evaluateAge(age).status === 'guardian');
  await st.setItem('@duo_age', JSON.stringify(info));
  await st.setItem('@duo_user', JSON.stringify({ name, ageGroup: info.ageGroup, goals: ['health'] }));
  await st.setItem('@duo_onboarded', 'true');
  await st.setItem('@duo_xp', '150');
  await st.setItem('@duo_sessions', JSON.stringify([{ id: 's1', workoutId: 'w1', completedAt: '2026-10-20T10:00:00.000Z', xpEarned: 50 }]));
  await st.setItem('@duo_health_v2', JSON.stringify({ version: 2, samples: [{ metric: 'weight', value: 70, date: '2026-10-20', tz: 'America/Sao_Paulo', source: 'manual' }], waterGoal: 8 }));
  for (const [k, v] of Object.entries(extra)) await st.setItem(k, v);
}
const signOut = (st: Mem, uid: string) => F.signOutFlow({ storage: st, provider: { signOut: async () => {} }, uid });

describe('idade: menor de 13 bloqueado, 13 a 17 com responsável, 18+ segue', () => {
  it.each([['1', 'blocked'], ['12', 'blocked'], ['13', 'guardian'], ['17', 'guardian'], ['18', 'ok'], ['60', 'ok'], ['119', 'ok']])('idade %s -> %s', (t, status) => {
    expect(A.evaluateAge(t).status).toBe(status);
  });
  it.each(['', ' ', 'abc', '-5', '12.5', '0', '120', '121', '999', '1e2', 'treze'])('entrada inválida "%s" não avança', (t) => {
    const r = A.evaluateAge(t);
    expect(r.status).toBe('invalid');
    expect(A.canContinueAge(r, true)).toBe(false);
    expect(A.buildAgeInfo(r, true)).toBeNull();
  });
  it('13 a 17: só avança com a autorização do responsável e grava guardianConfirmed; 18+ nunca grava como menor', () => {
    const r = A.evaluateAge('15');
    expect(A.canContinueAge(r, false)).toBe(false);
    expect(A.canContinueAge(r, true)).toBe(true);
    expect(A.buildAgeInfo(r, true)).toEqual({ age: 15, ageGroup: 'under18', guardianConfirmed: true });
    expect(A.buildAgeInfo(A.evaluateAge('30'), false)).toEqual({ age: 30, ageGroup: '26-35', guardianConfirmed: false });
  });
  it('um valor adulterado no armazenamento (menor sem responsável, grupo errado) volta a pedir a idade', () => {
    expect(A.sanitizeAgeInfo({ age: 15, ageGroup: 'under18', guardianConfirmed: false })).toBeUndefined();
    expect(A.sanitizeAgeInfo({ age: 30, ageGroup: 'under18', guardianConfirmed: true })).toBeUndefined();
    expect(A.sanitizeAgeInfo({ age: 5, ageGroup: 'under18', guardianConfirmed: true })).toBeUndefined();
    expect(A.sanitizeAgeInfo('texto')).toBeUndefined();
  });
  it('menor de 13 no fluxo completo: a conta recém-criada é excluída e nada fica guardado', async () => {
    const st = memory();
    const p = new FakeAuthProvider();
    const u = await p.signUpWithEmail({ email: 'crianca@exemplo.com', password: SENHA, name: 'Criança Teste' });
    const s = await activate(st, { uid: u.uid, displayName: u.displayName });
    expect(gate(u.uid, s)).toBe('age');
    expect(A.evaluateAge('12').status).toBe('blocked');
    expect(await F.rejectUnderageFlow({ storage: st, provider: p, uid: u.uid })).toBe('deleted');
    expect(p.users.size).toBe(0);
    expect([...st.m.keys()].filter((k) => k.startsWith('@duo') )).toEqual([]);
  });
  it('se a exclusão falhar, a pessoa apenas sai da conta e os dados locais somem do mesmo jeito', async () => {
    const st = memory();
    const p = new FakeAuthProvider();
    const u = await p.signUpWithEmail({ email: 'c2@exemplo.com', password: SENHA, name: 'Outra Criança' });
    await activate(st, { uid: u.uid, displayName: u.displayName });
    p.failNext('auth/network-request-failed');
    expect(await F.rejectUnderageFlow({ storage: st, provider: p, uid: u.uid })).toBe('signed-out');
    expect(p.getCurrentUser()).toBeNull();
    expect([...st.m.keys()].filter((k) => k.startsWith('@duo'))).toEqual([]);
  });
});

describe('cadastro: nome, e-mail, senha e aceite', () => {
  const ok = { name: 'Ana Souza', email: 'ana@exemplo.com', password: SENHA, confirm: SENHA, accepted: true };
  it('o caso completo e válido habilita o botão', () => {
    expect(AF.validateSignUp(ok).canSubmit).toBe(true);
  });
  it.each([
    ['nome vazio', { name: '' }, 'name'], ['nome só com espaços', { name: '   ' }, 'name'], ['e-mail inválido', { email: 'ana@' }, 'email'],
    ['e-mail vazio', { email: '' }, 'email'], ['senha sem número', { password: 'Corvo#Lilas', confirm: 'Corvo#Lilas' }, 'password'],
    ['confirmação diferente', { confirm: 'Outra#Senha2026' }, 'confirm'], ['sem aceitar os termos', { accepted: false }, null],
  ])('%s bloqueia o envio', (_n, patch, field) => {
    const touched = { name: true, email: true, password: true, confirm: true };
    const r = AF.validateSignUp({ ...ok, ...patch }, touched);
    expect(r.canSubmit).toBe(false);
    if (field) expect(r.errors[field as string]).toBeTruthy();
  });
  it('a senha que contém o nome ou o e-mail é recusada', () => {
    expect(AF.validateSignUp({ ...ok, password: 'Souza#Forte2026', confirm: 'Souza#Forte2026' }).canSubmit).toBe(false);
    expect(AF.validateSignUp({ ...ok, password: 'Ana#Forte20267', confirm: 'Ana#Forte20267' }).canSubmit).toBe(false);
  });
  it('senha comum que cumpre os requisitos é ACEITA, mas o nível nunca passa de "Razoável"', () => {
    for (const s of ['Password#2026', 'Senha#123456', 'Qwerty#12345', 'Duofitness#2026']) {
      const r = PW.checkPassword(s, { email: 'zz@exemplo.com', name: 'Zé' });
      expect(r.allOk, s).toBe(true);
      expect(r.strength.level, s).toBeLessThanOrEqual(2);
      expect(AF.validateSignUp({ ...ok, name: 'Zé Silva', email: 'zz@exemplo.com', password: s, confirm: s }).canSubmit, s).toBe(true);
    }
    expect(PW.checkPassword(SENHA).strength).toEqual({ level: 4, label: 'Muito forte' });
  });
  it('aceite dos Termos e da Política: links presentes e ausentes', () => {
    const T = 'https://duofitnessoficial.com.br/termos/';
    const P = 'https://duofitnessoficial.com.br/privacidade/';
    expect(LL.legalLinks({ termsUrl: T, privacyUrl: P }).map((l: any) => l.id)).toEqual(['terms', 'privacy']);
    expect(LL.legalLinks({ privacyUrl: P }).map((l: any) => l.id)).toEqual(['privacy']);
    expect(LL.legalLinks({ termsUrl: T }).map((l: any) => l.id)).toEqual(['terms']);
    expect(LL.legalLinks({})).toEqual([]);
    expect(LL.acceptanceText(LL.legalLinks({ termsUrl: T, privacyUrl: P }))).toContain('Termos de Uso e a Política de Privacidade');
  });
  it('e-mail repetido e senha fraca no servidor viram mensagens, sem revelar contas', async () => {
    const p = new FakeAuthProvider();
    await p.signUpWithEmail({ email: 'a@exemplo.com', password: SENHA, name: 'A B' });
    await expect(p.signUpWithEmail({ email: 'A@exemplo.com', password: SENHA, name: 'A B' })).rejects.toMatchObject({ code: 'auth/email-already-in-use' });
    p.failNext('auth/weak-password');
    await expect(p.signUpWithEmail({ email: 'b@exemplo.com', password: 'x', name: 'B' })).rejects.toMatchObject({ code: 'auth/weak-password' });
    expect(authError('auth/weak-password').code).toBe('auth/weak-password');
  });
});

describe('sair, entrar e excluir: os dados são da conta, não do aparelho', () => {
  it('sair e entrar de novo na MESMA conta restaura tudo, e a idade não é pedida de novo', async () => {
    const st = memory();
    const p = new FakeAuthProvider();
    const u = await p.signUpWithEmail({ email: 'ana@exemplo.com', password: SENHA, name: 'Ana Souza' });
    const au = { uid: u.uid, displayName: u.displayName };
    expect(gate(u.uid, await activate(st, au, 'Ana Souza'))).toBe('age');
    await onboardAndTrain(st, 'Ana Souza', '30');
    const before = Object.fromEntries(st.duoKeys().map((k) => [k, st.m.get(k)]));
    await signOut(st, u.uid);
    expect(st.duoKeys()).toEqual([]); // nada da conta fica nas chaves ativas
    expect(st.m.has(S.snapshotKey(u.uid))).toBe(true); // e o snapshot guarda tudo
    const back = await activate(st, au);
    expect(gate(u.uid, back)).toBe('main');
    for (const [k, v] of Object.entries(before)) if (k !== '@duo_owner') expect(st.m.get(k), k).toBe(v);
  });
  it('DUAS contas no mesmo aparelho não vazam dados em nenhuma ordem (A -> B -> A -> B)', async () => {
    const st = memory();
    const p = new FakeAuthProvider();
    const ua = await p.signUpWithEmail({ email: 'a@exemplo.com', password: SENHA, name: 'Aline Alves' });
    const ub = await p.signUpWithEmail({ email: 'b@exemplo.com', password: SENHA, name: 'Bruno Braga' });
    const a = { uid: ua.uid, displayName: 'Aline Alves' };
    const b = { uid: ub.uid, displayName: 'Bruno Braga' };
    await activate(st, a, 'Aline Alves');
    await onboardAndTrain(st, 'Aline Alves', '30', { '@duo_xp': '900' });
    await signOut(st, a.uid);
    const sb = await activate(st, b, 'Bruno Braga');
    expect(gate(b.uid, sb)).toBe('age'); // B começa do zero: nada de A
    expect(await st.getItem('@duo_xp')).toBeNull();
    expect(await st.getItem('@duo_health_v2')).toBeNull();
    await onboardAndTrain(st, 'Bruno Braga', '45', { '@duo_xp': '10' });
    await signOut(st, b.uid);
    const sa = await activate(st, a);
    expect(sa.user.name).toBe('Aline Alves');
    expect(await st.getItem('@duo_xp')).toBe('900');
    expect(JSON.parse((await st.getItem('@duo_age')) as string).age).toBe(30);
    await signOut(st, a.uid);
    const sb2 = await activate(st, b);
    expect(sb2.user.name).toBe('Bruno Braga');
    expect(await st.getItem('@duo_xp')).toBe('10');
    expect(JSON.parse((await st.getItem('@duo_age')) as string).age).toBe(45);
    // os snapshots ficam em chaves separadas por uid
    expect(S.snapshotKey(a.uid)).not.toBe(S.snapshotKey(b.uid));
    expect((await S.readSnapshot(st, a.uid))['@duo_xp']).toBe('900');
  });
  it('queda antes de sair (chaves da conta A ainda ativas) e entrada da conta B: A é salva no snapshot dela, B começa limpa', async () => {
    const st = memory();
    await S.bindAccount(st, 'A');
    await onboardAndTrain(st, 'Aline', '30');
    expect(await S.bindAccount(st, 'B')).toBe('fresh');
    expect(st.duoKeys()).toEqual(['@duo_owner']);
    expect((await S.readSnapshot(st, 'A'))['@duo_user']).toContain('Aline');
  });
  it('excluir a conta apaga a conta online, o snapshot e os dados ativos; a outra conta fica intacta', async () => {
    const st = memory();
    const p = new FakeAuthProvider();
    const ua = await p.signUpWithEmail({ email: 'a@exemplo.com', password: SENHA, name: 'Aline Alves' });
    const ub = await p.signUpWithEmail({ email: 'b@exemplo.com', password: SENHA, name: 'Bruno Braga' });
    await activate(st, { uid: ub.uid, displayName: 'Bruno' });
    await onboardAndTrain(st, 'Bruno Braga', '45');
    await signOut(st, ub.uid);
    await activate(st, { uid: ua.uid, displayName: 'Aline' });
    await onboardAndTrain(st, 'Aline Alves', '30');
    p._publish(p.users.get('a@exemplo.com'));
    await F.deleteAccountFlow({ storage: st, provider: p, uid: ua.uid, password: SENHA });
    expect(p.users.has('a@exemplo.com')).toBe(false);
    expect(st.duoKeys()).toEqual([]);
    expect(st.m.has(S.snapshotKey(ua.uid))).toBe(false);
    expect(st.m.has(S.snapshotKey(ub.uid))).toBe(true); // a conta B continua guardada
  });
  it('se a exclusão online falhar, NADA local é apagado', async () => {
    const st = memory();
    const p = new FakeAuthProvider();
    const u = await p.signUpWithEmail({ email: 'a@exemplo.com', password: SENHA, name: 'Aline Alves' });
    await activate(st, { uid: u.uid, displayName: 'Aline' });
    await onboardAndTrain(st, 'Aline Alves', '30');
    const keys = st.duoKeys();
    p.failNext('auth/requires-recent-login');
    await expect(F.deleteAccountFlow({ storage: st, provider: p, uid: u.uid, password: SENHA })).rejects.toBeTruthy();
    expect(st.duoKeys()).toEqual(keys);
  });
  it('sair guarda o snapshot ANTES de sair (se o provedor falhar, os dados já estão salvos e as ativas foram limpas só depois)', async () => {
    const st = memory();
    await S.bindAccount(st, 'A');
    await onboardAndTrain(st, 'Aline', '30');
    const calls: string[] = [];
    const order = { signOut: async () => { calls.push(`signOut com snapshot=${st.m.has(S.snapshotKey('A'))}`); } };
    await F.signOutFlow({ storage: st, provider: order, uid: 'A' });
    expect(calls).toEqual(['signOut com snapshot=true']);
  });
  it('snapshot corrompido é ignorado (a entrada não quebra) e conta nova sem snapshot começa do zero', async () => {
    const st = memory({ [S.snapshotKey('A')]: '{isso não é json' });
    expect(await S.bindAccount(st, 'A')).toBe('fresh');
    expect(st.duoKeys()).toEqual(['@duo_owner']);
  });
});
