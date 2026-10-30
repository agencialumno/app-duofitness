// Conta obrigatória: portão do app, etapa de idade pelos três métodos (e-mail, Google, Apple), sair/entrar com os mesmos dados,
// recusa abaixo da idade mínima e exclusão da conta. Provedor falso + armazenamento em memória; nada de rede.
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

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const code = (f: string) => read(f).replace(/^\s*\/\/.*$/gm, '');
const SENHA = 'Corvo#Lilas2026';

function memory(initial: Record<string, string> = {}) {
  const m = new Map<string, string>(Object.entries(initial));
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

// Simula o que o AppContext faz (vincula a conta, guarda a idade e o perfil), sobre as mesmas funções puras.
async function enter(st: ReturnType<typeof memory>, uid: string) {
  const mode = await S.bindAccount(st, uid);
  const ageRaw = await st.getItem('@duo_age');
  const ageInfo = ageRaw ? A.sanitizeAgeInfo(JSON.parse(ageRaw)) : null;
  const userRaw = await st.getItem('@duo_user');
  return { mode, ageInfo, user: userRaw ? JSON.parse(userRaw) : null };
}
const gate = (uid: string | null, ageInfo: unknown, user: unknown, status = 'ready') =>
  F.decideGate({ authReady: true, bound: { uid, status }, authUid: uid, ageInfo, user });
async function finishAge(st: ReturnType<typeof memory>, text: string, guardian: boolean) {
  const info = A.buildAgeInfo(A.evaluateAge(text), guardian);
  if (info) await st.setItem('@duo_age', JSON.stringify(info));
  return info;
}

describe('portão do app', () => {
  it('conta -> idade -> perfil -> app, e carregando enquanto vincula ou sai', () => {
    expect(F.decideGate({ authReady: false, bound: { uid: undefined, status: 'binding' }, authUid: null, ageInfo: null, user: null })).toBe('loading');
    expect(gate(null, null, null)).toBe('auth');
    expect(gate('u1', null, null)).toBe('age');
    expect(gate('u1', { age: 30 }, null)).toBe('onboarding');
    expect(gate('u1', { age: 30 }, { name: 'Ana' })).toBe('main');
    expect(gate('u1', null, null, 'binding')).toBe('loading');
    expect(gate('u1', { age: 30 }, { name: 'Ana' }, 'signingout')).toBe('loading');
    // vínculo de OUTRA conta: carregando (nada de A aparece para B)
    expect(F.decideGate({ authReady: true, bound: { uid: 'A', status: 'ready' }, authUid: 'B', ageInfo: { age: 30 }, user: { name: 'A' } })).toBe('loading');
  });
});

describe('etapa de idade pelos três métodos de entrada', () => {
  const methods: [string, (p: any) => Promise<any>][] = [
    ['e-mail e senha', (p) => p.signUpWithEmail({ email: 'ana@exemplo.com', password: SENHA, name: 'Ana' })],
    ['Google', (p) => p.signInWithGoogle()],
    ['Apple', (p) => p.signInWithApple()],
  ];

  for (const [name, login] of methods) {
    it(`${name}: conta nova cai na etapa de idade ANTES do perfil; 18+ segue direto; nada é coletado antes`, async () => {
      const p = new FakeAuthProvider();
      const st = memory();
      const u = await login(p);
      const e = await enter(st, u.uid);
      expect(e.mode).toBe('fresh');
      expect(gate(u.uid, e.ageInfo, e.user)).toBe('age');
      expect([...st.m.keys()].sort()).toEqual(['@duo_owner']); // nenhum dado coletado ainda
      const info = await finishAge(st, '30', false);
      expect(info).toEqual({ age: 30, ageGroup: '26-35', guardianConfirmed: false });
      const e2 = await enter(st, u.uid);
      expect(gate(u.uid, e2.ageInfo, e2.user)).toBe('onboarding'); // pergunta de idade não se repete no onboarding: a faixa já está na conta
      expect(e2.ageInfo.ageGroup).toBe('26-35');
    });

    it(`${name}: 13 a 17 exige a autorização do responsável; sem marcar não avança`, async () => {
      const p = new FakeAuthProvider();
      const st = memory();
      const u = await login(p);
      await enter(st, u.uid);
      expect(await finishAge(st, '16', false)).toBeNull();
      expect(st.m.has('@duo_age')).toBe(false);
      expect(await finishAge(st, '16', true)).toEqual({ age: 16, ageGroup: 'under18', guardianConfirmed: true });
      expect(gate(u.uid, (await enter(st, u.uid)).ageInfo, null)).toBe('onboarding');
    });

    it(`${name}: abaixo de 13 bloqueia, a conta recém-criada é excluída e nada fica guardado`, async () => {
      const p = new FakeAuthProvider();
      const st = memory();
      const u = await login(p);
      await enter(st, u.uid);
      expect(A.evaluateAge('12').status).toBe('blocked');
      expect(await finishAge(st, '12', true)).toBeNull();
      expect(await F.rejectUnderageFlow({ storage: st, provider: p, uid: u.uid })).toBe('deleted'); // sem reautenticar (senha não é pedida)
      expect(p.users.size).toBe(0);
      expect(p.getCurrentUser()).toBeNull();
      expect([...st.m.keys()]).toEqual([]);
      expect(gate(null, null, null)).toBe('auth'); // de volta às boas-vindas
    });
  }

  it('se excluir a conta recente falhar, apenas sai da conta (e ainda não guarda nada)', async () => {
    const p = new FakeAuthProvider();
    const st = memory();
    const u = await p.signInWithGoogle();
    await enter(st, u.uid);
    p.failNext('auth/requires-recent-login'); // a próxima chamada (deleteAccount) falha
    expect(await F.rejectUnderageFlow({ storage: st, provider: p, uid: u.uid })).toBe('signed-out');
    expect(p.getCurrentUser()).toBeNull();
    expect([...st.m.keys()]).toEqual([]);
  });

  it('valores inválidos nunca avançam: vazio, letras, negativo, 120 ou mais', () => {
    for (const t of ['', 'abc', '-3', '120', '300']) expect(A.canContinueAge(A.evaluateAge(t), true), t).toBe(false);
  });
});

describe('sair e entrar de novo com os mesmos dados (A -> sair -> B -> sair -> A)', () => {
  it('A (e-mail) com dados, B (Google) nova não vê nada de A, A volta e vê tudo, sem refazer idade nem onboarding', async () => {
    const p = new FakeAuthProvider();
    const st = memory();

    // A cria a conta, informa a idade (16 + autorização), faz o perfil e treina
    const a = await p.signUpWithEmail({ email: 'ana@exemplo.com', password: SENHA, name: 'Ana' });
    await enter(st, a.uid);
    await finishAge(st, '16', true);
    await st.setItem('@duo_user', JSON.stringify({ name: 'Ana', ageGroup: 'under18' }));
    await st.setItem('@duo_onboarded', 'true');
    await st.setItem('@duo_xp', '150');
    await st.setItem('@duo_health_v2', '{"version":2,"samples":[],"waterGoal":8,"migratedFromV1":false}');

    await F.signOutFlow({ storage: st, provider: p, uid: a.uid });
    expect(p.getCurrentUser()).toBeNull();
    expect([...st.m.keys()].filter((k) => k.startsWith('@duo_'))).toEqual([]); // ativas limpas
    expect(st.m.has('@duoacct:' + a.uid + ':snapshot')).toBe(true);

    // B (Google): conta nova, não vê nada de A, e passa pela etapa de idade
    const b = await p.signInWithGoogle();
    const eb = await enter(st, b.uid);
    expect(eb.mode).toBe('fresh');
    expect(gate(b.uid, eb.ageInfo, eb.user)).toBe('age');
    expect(st.m.get('@duo_xp')).toBeUndefined();
    await finishAge(st, '40', false);
    await st.setItem('@duo_xp', '999');
    await F.signOutFlow({ storage: st, provider: p, uid: b.uid });

    // A volta: tudo de A (inclusive a idade e a autorização), direto na Home
    await p.signInWithEmail({ email: 'ana@exemplo.com', password: SENHA });
    const ea = await enter(st, a.uid);
    expect(ea.mode).toBe('restored');
    expect(ea.ageInfo).toEqual({ age: 16, ageGroup: 'under18', guardianConfirmed: true });
    expect(ea.user.name).toBe('Ana');
    expect(st.m.get('@duo_xp')).toBe('150');
    expect(st.m.get('@duo_health_v2')).toContain('"version":2');
    expect(gate(a.uid, ea.ageInfo, ea.user)).toBe('main');
  });

  it('reabrir o app com a sessão ativa entra direto, como antes', async () => {
    const st = memory({ '@duo_owner': 'u1', '@duo_user': '{"name":"Ana"}', '@duo_age': JSON.stringify({ age: 30, ageGroup: '26-35', guardianConfirmed: false }) });
    const e = await enter(st, 'u1');
    expect(e.mode).toBe('owner');
    expect(gate('u1', e.ageInfo, e.user)).toBe('main');
  });

  it('dados de antes das contas: adotados pela primeira conta, que ainda passa pela etapa de idade', async () => {
    const st = memory({ '@duo_onboarded': 'true', '@duo_user': '{"name":"Antigo","ageGroup":"26-35"}', '@duo_xp': '80' });
    const e = await enter(st, 'novo');
    expect(e.mode).toBe('adopted');
    expect(st.m.get('@duo_xp')).toBe('80');
    expect(gate('novo', e.ageInfo, e.user)).toBe('age'); // idade ainda exigida, e depois vai direto ao app (perfil já existe)
    await finishAge(st, '30', false);
    const e2 = await enter(st, 'novo');
    expect(gate('novo', e2.ageInfo, e2.user)).toBe('main');
  });

  it('sair falhando não perde nada: o snapshot continua e a conta ativa volta a ser vinculada', async () => {
    const p = new FakeAuthProvider();
    const st = memory();
    const a = await p.signUpWithEmail({ email: 'ana@exemplo.com', password: SENHA });
    await enter(st, a.uid);
    await st.setItem('@duo_xp', '5');
    p.failNext('auth/network-request-failed'); // provider.signOut falha
    await expect(F.signOutFlow({ storage: st, provider: p, uid: a.uid })).rejects.toBeTruthy();
    expect(p.getCurrentUser()).not.toBeNull();
    expect((await enter(st, a.uid)).mode).toBe('restored'); // o AppContext vincula de novo e tudo volta
    expect(st.m.get('@duo_xp')).toBe('5');
  });
});

describe('excluir minha conta', () => {
  async function setup() {
    const p = new FakeAuthProvider();
    const st = memory();
    const a = await p.signUpWithEmail({ email: 'ana@exemplo.com', password: SENHA });
    await enter(st, a.uid);
    await st.setItem('@duo_xp', '5');
    await st.setItem('@duoacct:' + a.uid + ':snapshot', '{"version":1,"data":{}}');
    await st.setItem('@duoacct:outra:snapshot', '{"version":1,"data":{}}');
    return { p, st, uid: a.uid };
  }
  it('senha errada: nada local é apagado', async () => {
    const { p, st, uid } = await setup();
    await expect(F.deleteAccountFlow({ storage: st, provider: p, uid, password: 'errada' })).rejects.toMatchObject({ code: 'auth/wrong-password' });
    expect(st.m.get('@duo_xp')).toBe('5');
    expect(st.m.has('@duoacct:' + uid + ':snapshot')).toBe(true);
    expect(p.users.size).toBe(1);
  });
  it('senha certa: apaga a conta, o snapshot do uid e os dados ativos, sem tocar no snapshot de outras contas', async () => {
    const { p, st, uid } = await setup();
    await F.deleteAccountFlow({ storage: st, provider: p, uid, password: SENHA });
    expect(p.users.size).toBe(0);
    expect([...st.m.keys()]).toEqual(['@duoacct:outra:snapshot']);
  });
  it('Apple: a exclusão revoga o token (como antes)', async () => {
    const p = new FakeAuthProvider();
    const st = memory();
    const a = await p.signInWithApple();
    await enter(st, a.uid);
    await F.deleteAccountFlow({ storage: st, provider: p, uid: a.uid });
    expect(p.revokedApple).toBe(true);
  });
});

describe('telas (código-fonte)', () => {
  it('boas-vindas e cadastro: sem Modo Demo, sem "Continuar sem conta" e sem a caixa "Tenho 18 anos"', () => {
    for (const f of ['src/screens/onboarding/WelcomeScreen.js', 'src/screens/auth/SignUpScreen.js', 'src/screens/auth/SignInScreen.js']) {
      expect(code(f), f).not.toMatch(/Modo Demo|Continuar sem conta|Tenho 18 anos|loadDemoData|su-adult|su-guest|si-guest|wl-guest/);
    }
  });
  it('etapa de idade: vale para todos os métodos (está no portão, não no cadastro), usa a constante e o texto de autorização', () => {
    expect(code('src/navigation/RootNavigator.js')).toMatch(/gate === 'age'[\s\S]*AgeNavigator/);
    const g = code('src/screens/auth/AgeGateScreen.js');
    expect(g).toContain('evaluateAge');
    expect(g).toContain('GUARDIAN_CONSENT_TEXT');
    expect(g).toContain('<LegalLinks'); // o link da política (e dos termos) vem do LegalLinks, que lê PRIVACY_URL e TERMS_URL
    expect(g).toContain('MIN_ACCOUNT_AGE');
    expect(g).toContain('rejectUnderage');
    expect(g).toContain('testID="age-guardian"');
    expect(read('src/config/account.js')).toContain('MIN_ACCOUNT_AGE = 13');
    expect(read('src/config/account.js')).toContain('Confirmo que tenho autorização do meu responsável legal para usar o app');
  });
  it('onboarding reaproveita a idade da conta: nenhuma pergunta de faixa etária nas telas de onboarding e edição', () => {
    const b = code('src/screens/onboarding/BodyDataScreen.js');
    expect(b).toMatch(/useApp\(\)/);
    expect(b).not.toMatch(/AGE_GROUPS|setAgeGroup|FAIXA ETÁRIA/);
    const e = code('src/screens/EditBodyDataScreen.js');
    expect(e).not.toMatch(/setAgeGroup|onPress=\{\(\) => setAge/);
  });
  it('Perfil: "Excluir minha conta" é link de texto pequeno, neutro, sem ícone, com 44 pt, abaixo de "Sair da conta"', () => {
    const c = code('src/components/auth/AccountCard.js');
    const out = c.indexOf('testID="account-signout"');
    const del = c.indexOf('testID="account-delete"');
    expect(out).toBeGreaterThan(-1);
    expect(del).toBeGreaterThan(out);
    expect(c).toMatch(/deleteLink: \{ minHeight: 44/);
    expect(c).toMatch(/deleteText: \{[^}]*COLORS\.textSecondary/);
    expect(c).not.toMatch(/deleteText: \{[^}]*COLORS\.error/);
    expect(c).toMatch(/accessibilityLabel="Excluir minha conta"/);
    expect(c).not.toMatch(/Ionicons name="trash/);
    expect(c).not.toMatch(/Alert\./);
    // a seção fica no fim do Perfil, depois do cartão de conta e de tudo mais
    const p = code('src/screens/ProfileScreen.js');
    expect(p.indexOf('<AccountActions />')).toBeGreaterThan(p.indexOf('<AccountCard />'));
    expect(p.indexOf('<AccountActions />')).toBeGreaterThan(p.indexOf('<ProfileHealthCard'));
  });
  it('conexão com Apple Saúde / Health Connect indisponível para menores: tela, ação rápida e provedor', () => {
    const connect = code('src/screens/HealthConnectScreen.js');
    expect(connect).toMatch(/const enabled = integrationEnabled && !!target && !minor/);
    expect(code('src/components/health/HealthParts.js')).toMatch(/\{!minor \? \(\s*<QuickButton testID="health-connect-card"/);
    expect(code('src/hooks/useHealth.js')).toMatch(/selectProvider\(\{[^}]*minor/);
  });
  it('sem chave para esconder o botão de excluir: nada de flag ligada a "account-delete"', () => {
    expect(code('src/components/auth/AccountCard.js')).not.toMatch(/process\.env|SHOW_DELETE|HIDE_DELETE/);
  });
  it('nenhum arquivo de demo sobrou no app', () => {
    for (const f of ['src/components/DemoControls.js', 'src/utils/demoSession.js', 'src/data/demoData.js', 'src/navigation/resetNavigation.js', 'src/screens/auth/VerifyEmailScreen.js']) {
      expect(() => read(f), f).toThrow();
    }
  });
});
