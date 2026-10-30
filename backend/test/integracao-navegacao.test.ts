// INTEGRAÇÃO, área 5: navegação e estado global. O portão (carregando, conta, idade, onboarding, app) em todas as combinações, as rotas protegidas
// (só existem na árvore do app), todo navigate() do código aponta para uma rota registrada, deep links (não existem) e os estados de carregando/erro
// (ErrorBoundary e recuperação). Sem rede.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as F from '../../src/utils/accountFlow.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as R from '../../src/utils/errorRecovery.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as SS from '../../src/utils/safeStorage.js';
import { memory } from './helpers/memstore';

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const code = (f: string) => read(f).replace(/^\s*\/\/.*$/gm, '');
const walk = (d: string): string[] => readdirSync(path.join(REPO, d)).flatMap((n) => {
  const rel = `${d}/${n}`;
  return statSync(path.join(REPO, rel)).isDirectory() ? walk(rel) : n.endsWith('.js') ? [rel] : [];
});

type G = { authReady?: boolean; bound?: { uid: string | null | undefined; status: string }; authUid?: string | null; ageInfo?: unknown; user?: unknown };
const gate = (g: G) => F.decideGate({ authReady: true, bound: { uid: 'u1', status: 'ready' }, authUid: 'u1', ageInfo: { age: 30 }, user: { name: 'Ana' }, ...g });

describe('portão do app (decideGate)', () => {
  it('ordem: carregando -> sem conta -> idade -> onboarding -> app', () => {
    expect(gate({ authReady: false })).toBe('loading');
    expect(gate({ authUid: null, bound: { uid: null, status: 'ready' } })).toBe('auth');
    expect(gate({ ageInfo: null })).toBe('age');
    expect(gate({ user: null })).toBe('onboarding');
    expect(gate({})).toBe('main');
  });
  it('tabela completa: nenhuma combinação pula uma etapa (idade antes do onboarding, onboarding antes do app)', () => {
    const results = new Set<string>();
    for (const authReady of [true, false]) for (const status of ['binding', 'ready', 'signingout']) for (const authUid of [null, 'u1']) for (const boundUid of [undefined, null, 'u1', 'u2'])
      for (const ageInfo of [null, { age: 30 }]) for (const user of [null, { name: 'Ana' }]) {
        const g = F.decideGate({ authReady, bound: { uid: boundUid, status }, authUid, ageInfo, user });
        results.add(g);
        const settled = authReady && status === 'ready' && boundUid === authUid;
        if (!settled) { expect(g).toBe('loading'); continue; }
        if (!authUid) expect(g).toBe('auth');
        else if (!ageInfo) expect(g).toBe('age');
        else if (!user) expect(g).toBe('onboarding');
        else expect(g).toBe('main');
      }
    expect([...results].sort()).toEqual(['age', 'auth', 'loading', 'main', 'onboarding']);
  });
  it('sem vínculo ainda (bound nulo) é "carregando": nunca mostra dados de outra conta', () => {
    expect(F.decideGate({ authReady: true, bound: null, authUid: 'u1', ageInfo: { age: 30 }, user: { name: 'A' } })).toBe('loading');
    expect(gate({ bound: { uid: 'A', status: 'ready' }, authUid: 'B' })).toBe('loading');
  });
  it('trocar de conta no meio (A -> B) passa por "carregando" e a idade de A não vale para B', () => {
    expect(gate({ authUid: 'B', bound: { uid: 'A', status: 'ready' }, ageInfo: { age: 30 } })).toBe('loading');
    expect(gate({ authUid: 'B', bound: { uid: 'B', status: 'ready' }, ageInfo: null, user: null })).toBe('age');
  });
});

describe('rotas protegidas e navegação', () => {
  const root = code('src/navigation/RootNavigator.js');
  it('o RootNavigator escolhe a árvore só pelo portão, sem navigation.reset', () => {
    expect(root).toContain("if (gate === 'loading') return null;");
    expect(root).toContain("if (gate === 'auth') return <AuthNavigator />;");
    expect(root).toContain("if (gate === 'age') return <AgeNavigator />;");
    expect(root).toContain("if (gate === 'onboarding') return <OnboardingNavigator />;");
    expect(root).toMatch(/return <MainNavigator \/>;\s*\}/);
    expect(walk('src').map((f) => code(f)).join('\n')).not.toMatch(/navigation\.reset\(|CommonActions\.reset/);
  });
  it('as telas do app (Saúde, treino, perfil, marketplace) só existem na árvore Main; as de conta, só nas árvores de conta', () => {
    const main = code('src/navigation/MainNavigator.js');
    for (const r of ['Saude', 'SaudeConectar', 'WorkoutsList', 'Loja', 'AnunciarMarketplace', 'ProfileMain']) expect(main, r).toContain(`name="${r}"`);
    for (const r of ['Welcome', 'SignUp', 'SignIn', 'AgeGate', 'ProfileSetup']) expect(main, r).not.toContain(`name="${r}"`);
    expect(root).toContain('name="Welcome"');
    expect(root).toContain('name="AgeGate"');
    expect(code('src/navigation/OnboardingNavigator.js')).toContain('name="ProfileSetup"');
  });
  it('todo navigation.navigate/replace do código aponta para uma rota REGISTRADA (nenhum botão leva a lugar nenhum)', () => {
    const files = walk('src');
    const registered = new Set<string>();
    for (const f of files) for (const m of code(f).matchAll(/Screen\s+name="([A-Za-z]+)"/g)) registered.add(m[1]!);
    expect(registered.size).toBeGreaterThan(20);
    const targets: [string, string][] = [];
    for (const f of files) for (const m of code(f).matchAll(/\.(?:navigate|replace)\(\s*(?:'([A-Za-z]+)'|"([A-Za-z]+)")/g)) targets.push([f, (m[1] || m[2])!]);
    expect(targets.length).toBeGreaterThan(20);
    const missing = targets.filter(([, t]) => !registered.has(t));
    expect(missing, `rotas inexistentes: ${JSON.stringify(missing)}`).toEqual([]);
  });
  it('as rotas do marketplace e da Saúde usadas pelos botões principais existem', () => {
    const all = walk('src/navigation').map(code).join('\n');
    for (const r of ['Loja', 'LojaDetalhe', 'AnunciarMarketplace', 'Saude', 'SaudeDetalhe', 'SaudeConectar', 'AcademiaAgora']) expect(all, r).toContain(`name="${r}"`);
  });
  it('deep links: o app não declara esquema nem configuração de linking (nada para testar; fica registrado)', () => {
    expect(JSON.parse(read('app.json')).expo.scheme).toBeUndefined();
    expect(walk('src').map(code).join('\n') + code('App.js')).not.toMatch(/linking=\{|\blinking:/);
  });
});

describe('estados de carregando e de erro', () => {
  it('"carregando" do portão não mostra nenhuma tela (null) e o app tem um ErrorBoundary de classe na raiz', () => {
    expect(code('App.js')).toMatch(/<ErrorBoundary[\s\S]*<\/ErrorBoundary>/);
    expect(code('src/components/ErrorBoundary.js')).toMatch(/class ErrorBoundary extends/);
    expect(code('src/components/ErrorBoundary.js')).toMatch(/getDerivedStateFromError/);
  });
  it('recuperação: tentar de novo; se repetir em até 15 s, oferece recomeçar do zero', () => {
    let s = R.initialState();
    s = R.onCatch(s, new Error('x'), 1000);
    expect(R.offerReset(s)).toBe(false);
    s = R.onRetry(s, 2000);
    s = R.onCatch(s, new Error('x'), 5000); // repetiu dentro da janela
    expect(R.offerReset(s)).toBe(true);
    let t = R.onCatch(R.initialState(), new Error('x'), 1000);
    t = R.onRetry(t, 2000);
    t = R.onCatch(t, new Error('x'), 2000 + R.REPEAT_WINDOW_MS + 1); // passou da janela
    expect(R.offerReset(t)).toBe(false);
  });
  // B1 (corrigido): describeError devolve só o NOME do erro e o CÓDIGO, nunca a mensagem. Antes a mensagem inteira ia para console.error.
  it('a descrição do erro não vaza o texto da exceção (pode conter dado de saúde)', () => {
    const d = R.describeError(new Error('peso 71,3 kg do Victor'));
    expect(JSON.stringify(d)).not.toMatch(/71,3|Victor/);
    expect(d).toBe('Error');
    expect(R.describeError(Object.assign(new Error('batimentos 142 bpm'), { code: 'auth/network-request-failed' }))).toBe('Error (auth/network-request-failed)');
    expect(R.describeError(new TypeError('peso 71,3'))).toBe('TypeError');
  });
  it('nome ou código com formato estranho (pode carregar um valor) é descartado', () => {
    const e = Object.assign(new Error('x'), { name: 'peso 71,3 kg', code: 'frequência 142 bpm' });
    expect(R.describeError(e)).toBe('Error');
    expect(R.describeError(Object.assign(new Error('x'), { code: 7 }))).toBe('Error'); // código só numérico é descartado (poderia ser um valor)
    expect(R.describeError(Object.assign(new Error('x'), { code: 'a'.repeat(200) }))).toBe('Error');
  });
  it('o ErrorBoundary registra o erro com console.error SEM o texto da mensagem (nem de erro de limpeza)', async () => {
    const src = readFileSync(path.join(REPO, 'src/components/ErrorBoundary.js'), 'utf8');
    expect(src).toMatch(/console\.error\('\[ErrorBoundary\] Erro de render capturado:', describeError\(error\)/);
    expect(src).not.toMatch(/console\.error\([^)]*\.message/);
    expect(src).not.toMatch(/console\.error\([^)]*String\(error\)/);
  });
  it('"Recomeçar do zero" apaga só as chaves @duo_ e não toca nos snapshots de conta nem em chaves de outros', async () => {
    const st = memory({ '@duo_user': '{}', '@duo_xp': '1', '@duoacct:u1:snapshot': '{}', 'outra': 'x' });
    await R.resetAppData(st);
    expect(st.duoKeys()).toEqual([]);
    expect(st.m.has('outra')).toBe(true);
    expect(st.m.has('@duoacct:u1:snapshot')).toBe(true);
  });
  it('dados corrompidos em qualquer chave não derrubam a leitura (erro tratado como ausente)', async () => {
    const st = memory({ '@duo_user': '[[', '@duo_workouts': '"texto"', '@duo_sessions': 'null', '@duo_xp': '{}', '@duo_streak': 'x', '@duo_achievements': '5' });
    expect(await SS.readAppData(st)).toEqual({});
    expect([...st.m.keys()].length).toBe(6); // nada foi apagado
  });
  it('erro de rede nas chamadas de conta vira mensagem em português, sem expor o código técnico', async () => {
    // @ts-expect-error módulo JS do app, sem tipos
    const E = await import('../../src/auth/authErrors.js');
    const msg = E.authErrorMessage({ code: 'auth/network-request-failed' }, 'signIn');
    expect(msg).toMatch(/conex|rede|internet/i);
    expect(msg).not.toMatch(/auth\//);
    expect(E.authErrorMessage(new Error('qualquer coisa estranha'), 'signIn').length).toBeGreaterThan(10);
  });
});
