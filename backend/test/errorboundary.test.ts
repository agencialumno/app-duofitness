// Rede de segurança: ErrorBoundary (classe real, com stubs de React e React Native), leitura segura do
// armazenamento (valor corrompido = ausente, sem apagar nada) e a flag de teste só da web.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import ErrorBoundary from '../../src/components/ErrorBoundary.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as R from '../../src/utils/errorRecovery.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as S from '../../src/utils/safeStorage.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as F from '../../src/utils/errorTestFlag.js';
import { Alert, Platform, alerts } from './stubs/react-native';
import AsyncStorage, { store } from './stubs/async-storage';

const REPO = path.resolve(__dirname, '../..');

// ---------- "Renderização" mínima dos descritores do stub ----------
type Node = any;
function expand(node: Node, insets: any = { top: 10, bottom: 20 }): Node {
  if (node === null || node === undefined || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map((n) => expand(n, insets));
  if (node.type === 'InsetsConsumer') return expand(node.children[0](insets), insets);
  return { ...node, children: (node.children || []).map((c: Node) => expand(c, insets)) };
}
function findAll(node: Node, pred: (n: Node) => boolean, out: Node[] = []): Node[] {
  if (node === null || node === undefined || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, pred, out)); return out; }
  if (pred(node)) out.push(node);
  (node.children || []).forEach((c: Node) => findAll(c, pred, out));
  return out;
}
const texts = (node: Node) => findAll(node, (n) => n.type === 'Text').flatMap((n) => n.children.map(String));
const button = (node: Node, label: string) => findAll(node, (n) => n.type === 'TouchableOpacity' && n.props.accessibilityLabel === label)[0];

function makeBoundary(props: Record<string, unknown> = {}) {
  const b = new (ErrorBoundary as any)({ children: 'APP', ...props });
  const crash = (err: Error) => {
    // o React chama getDerivedStateFromError e depois componentDidCatch
    b.state = { ...b.state, ...(ErrorBoundary as any).getDerivedStateFromError(err) };
    b.componentDidCatch(err, { componentStack: '\n  in Tela' });
  };
  const view = () => expand(b.render());
  return { b, crash, view };
}

let errSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  store.clear();
  alerts.length = 0;
  Platform.OS = 'ios';
});
afterEach(() => { errSpy.mockRestore(); vi.unstubAllGlobals(); });

describe('ErrorBoundary (classe real)', () => {
  it('sem erro, renderiza os filhos normalmente', () => {
    const { view } = makeBoundary();
    const v = view();
    expect(v.type).toBe('Fragment');
    expect(v.children).toEqual(['APP']);
  });

  it('captura o erro, mostra "Algo deu errado" e registra com console.error (sem enviar a lugar nenhum)', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const onError = vi.fn();
    const { crash, view } = makeBoundary({ onError });
    crash(new Error('boom no render'));
    const t = texts(view());
    expect(t).toContain('Algo deu errado');
    expect(t.join(' ')).toMatch(/Seus dados continuam salvos neste aparelho/);
    expect(button(view(), 'Tentar novamente')).toBeTruthy();
    expect(button(view(), 'Recomeçar do zero')).toBeUndefined(); // só se o erro se repetir
    expect(errSpy).toHaveBeenCalled();
    expect(String(errSpy.mock.calls[0]![0])).toContain('[ErrorBoundary]');
    expect(String(errSpy.mock.calls[0]![1])).toContain('boom no render');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('"Tentar novamente" limpa o erro e re-renderiza a árvore (nova key)', () => {
    const { b, crash, view } = makeBoundary();
    crash(new Error('x'));
    const keyBefore = 0;
    button(view(), 'Tentar novamente').props.onPress();
    const v = view();
    expect(v.type).toBe('Fragment');
    expect(v.children).toEqual(['APP']);
    expect(v.props.key).toBe(keyBefore + 1);
    expect(b.state.error).toBeNull();
  });

  it('se o erro se repetir logo depois, aparece também "Recomeçar do zero"', () => {
    const { crash, view } = makeBoundary();
    crash(new Error('1'));
    button(view(), 'Tentar novamente').props.onPress();
    crash(new Error('2'));
    const v = view();
    expect(texts(v)).toContain('Algo deu errado');
    expect(texts(v).join(' ')).toMatch(/O problema continua/);
    expect(button(v, 'Tentar novamente')).toBeTruthy();
    expect(button(v, 'Recomeçar do zero')).toBeTruthy();
  });

  it('"Recomeçar do zero" pede confirmação; confirmando limpa só as @duo_* e chama onReset', async () => {
    store.set('@duo_user', '{"name":"x"}');
    store.set('@duo_workouts', '[]');
    store.set('@duo_health', '{}');
    store.set('@duo_onboarded', 'true');
    store.set('outra_chave', 'fica');
    const onReset = vi.fn();
    const { b, crash, view } = makeBoundary({ onReset });
    crash(new Error('1'));
    button(view(), 'Tentar novamente').props.onPress();
    crash(new Error('2'));

    const pending = button(view(), 'Recomeçar do zero').props.onPress();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.title).toBe('Recomeçar do zero');
    expect(alerts[0]!.message).toMatch(/Tem certeza\?/);
    expect(alerts[0]!.buttons.map((x: { text: string }) => x.text)).toEqual(['Cancelar', 'Apagar e recomeçar']);
    expect(store.size).toBe(5); // nada apagado antes de confirmar
    alerts[0]!.buttons[1].onPress();
    await pending;

    expect([...store.keys()]).toEqual(['outra_chave']);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(b.state.error).toBeNull();
    expect(b.state.repeated).toBe(false);
  });

  it('cancelar a confirmação não apaga nada e não chama onReset', async () => {
    store.set('@duo_user', '{}');
    const onReset = vi.fn();
    const { crash, view } = makeBoundary({ onReset });
    crash(new Error('1'));
    button(view(), 'Tentar novamente').props.onPress();
    crash(new Error('2'));
    const pending = button(view(), 'Recomeçar do zero').props.onPress();
    alerts[0]!.buttons[0].onPress();
    await pending;
    expect(store.has('@duo_user')).toBe(true);
    expect(onReset).not.toHaveBeenCalled();
    expect(button(view(), 'Recomeçar do zero')).toBeTruthy(); // continua na tela de recuperação
  });

  it('na web a confirmação usa window.confirm (Alert.alert não existe lá)', async () => {
    Platform.OS = 'web';
    const confirm = vi.fn(() => true);
    vi.stubGlobal('window', { confirm });
    store.set('@duo_user', '{}');
    const onReset = vi.fn();
    const { crash, view } = makeBoundary({ onReset });
    crash(new Error('1'));
    button(view(), 'Tentar novamente').props.onPress();
    crash(new Error('2'));
    await button(view(), 'Recomeçar do zero').props.onPress();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(alerts).toHaveLength(0);
    expect(store.size).toBe(0);
    expect(onReset).toHaveBeenCalled();
  });

  it('um erro isolado, bem depois da nova tentativa, não oferece apagar tudo', () => {
    const { b, crash, view } = makeBoundary();
    crash(new Error('1'));
    button(view(), 'Tentar novamente').props.onPress();
    b.state.retriedAt = Date.now() - R.REPEAT_WINDOW_MS - 1000; // passou a janela
    crash(new Error('outro erro'));
    expect(button(view(), 'Recomeçar do zero')).toBeUndefined();
  });

  it('a tela usa a área segura (insets) e não depende de AppContext nem de navegação', () => {
    const { crash, b } = makeBoundary();
    crash(new Error('x'));
    const root = findAll(expand(b.render(), { top: 47, bottom: 34 }), (n) => n.type === 'View')[0];
    const style = [].concat(root.props.style).reduce((a: any, s: any) => ({ ...a, ...s }), {});
    expect(style.paddingTop).toBeGreaterThan(47);
    expect(style.paddingBottom).toBeGreaterThan(34);
    // sem provider de área segura (insets null) também renderiza
    expect(texts(expand(b.render(), null))).toContain('Algo deu errado');
    const src = readFileSync(path.join(REPO, 'src/components/ErrorBoundary.js'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, ''); // sem comentários
    const imports = [...code.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
    expect(imports.sort()).toEqual(['../utils/errorRecovery', '../utils/theme', '@react-native-async-storage/async-storage', 'react', 'react-native', 'react-native-safe-area-context']);
    expect(code).not.toMatch(/useApp|useNavigation|Ionicons|fetch\(|XMLHttpRequest|Linking|Share\./);
  });

  it('botões com tamanho mínimo de toque e sem altura fixa (fonte dinâmica), contraste claro/escuro', () => {
    const src = readFileSync(path.join(REPO, 'src/components/ErrorBoundary.js'), 'utf8');
    expect(src).toMatch(/minHeight: 52/);
    expect(src).not.toMatch(/\bheight: (?!72)\d+/); // só o círculo decorativo do "!" tem altura fixa
    expect(src).toMatch(/COLORS\.black/); // texto preto sobre o botão amarelo
  });
});

describe('recuperação (estado)', () => {
  it('repetição só vale dentro da janela depois de "Tentar novamente"', () => {
    let s = R.initialState();
    s = R.onCatch(s, new Error('a'), 1000);
    expect(R.offerReset(s)).toBe(false);
    s = R.onRetry(s, 2000);
    expect(s.attempt).toBe(1);
    expect(s.error).toBeNull();
    expect(R.offerReset(R.onCatch(s, new Error('b'), 2000 + R.REPEAT_WINDOW_MS))).toBe(true);
    expect(R.offerReset(R.onCatch(s, new Error('b'), 2000 + R.REPEAT_WINDOW_MS + 1))).toBe(false);
  });
  it('erro sem mensagem ou nulo não quebra o boundary', () => {
    expect(R.describeError(null)).toBe('erro desconhecido');
    expect(R.describeError({})).toBe('[object Object]');
    expect(R.describeError(new TypeError('x'))).toBe('TypeError: x');
    expect(R.onCatch(R.initialState(), undefined).error).toBeInstanceOf(Error);
  });
  it('resetAppData apaga só as @duo_*', async () => {
    store.set('@duo_a', '1'); store.set('@duo_health', '2'); store.set('x', '3');
    expect((await R.resetAppData(AsyncStorage)).sort()).toEqual(['@duo_a', '@duo_health']);
    expect([...store.keys()]).toEqual(['x']);
  });
});

describe('leitura segura do armazenamento (valor corrompido = ausente)', () => {
  it('JSON quebrado, tipo errado e vazio viram undefined, sem lançar', () => {
    expect(S.parseJsonSafe('{quebrado', S.sanitizeObject)).toBeUndefined();
    expect(S.parseJsonSafe('"texto"', S.sanitizeObject)).toBeUndefined();
    expect(S.parseJsonSafe('[1,2]', S.sanitizeObject)).toBeUndefined();
    expect(S.parseJsonSafe('null', S.sanitizeObject)).toBeUndefined();
    expect(S.parseJsonSafe('{"a":1}', S.sanitizeObjectList)).toBeUndefined();
    expect(S.parseJsonSafe('', S.sanitizeObject)).toBeUndefined();
    expect(S.parseJsonSafe(null, S.sanitizeObject)).toBeUndefined();
    expect(S.parseJsonSafe(undefined)).toBeUndefined();
    expect(S.parseJsonSafe('{"a":1}', S.sanitizeObject)).toEqual({ a: 1 });
  });
  it('lista com itens inválidos descarta só os inválidos', () => {
    expect(S.parseJsonSafe('[{"id":1}, null, 3, "x", {"id":2}]', S.sanitizeObjectList)).toEqual([{ id: 1 }, { id: 2 }]);
  });
  it.each([['450', 450], ['0', 0], [' 8 ', 8], ['abc', undefined], ['', undefined], ['-3', undefined], ['1e999', undefined], ['NaN', undefined], ['12.5', undefined], [null, undefined], ['99999999999', undefined]])('contador %j -> %j', (raw, out) => {
    expect(S.parseCountSafe(raw as string | null)).toBe(out);
  });

  const good = { '@duo_user': '{"name":"Ana","isDemo":false}', '@duo_workouts': '[{"id":"w1"}]', '@duo_sessions': '[{"id":"s1","completedAt":"2026-06-10T12:00:00Z"}]', '@duo_xp': '450', '@duo_streak': '8', '@duo_achievements': '[{"id":"a1"}]' };

  it('dados bons são lidos por inteiro', async () => {
    Object.entries(good).forEach(([k, v]) => store.set(k, v));
    const d = await S.readAppData(AsyncStorage);
    expect(d).toEqual({ user: { name: 'Ana', isDemo: false }, workouts: [{ id: 'w1' }], sessions: [{ id: 's1', completedAt: '2026-06-10T12:00:00Z' }], xp: 450, streak: 8, achievements: [{ id: 'a1' }] });
  });

  it('uma chave corrompida não derruba nem apaga as outras: só ela é tratada como ausente', async () => {
    Object.entries(good).forEach(([k, v]) => store.set(k, v));
    store.set('@duo_user', '{quebrado');
    store.set('@duo_xp', 'abc');
    const before = JSON.stringify([...store.entries()]);
    const d = await S.readAppData(AsyncStorage);
    expect(d.user).toBeUndefined();
    expect(d.xp).toBeUndefined();
    expect(d.workouts).toEqual([{ id: 'w1' }]);
    expect(d.streak).toBe(8);
    expect(d.sessions).toHaveLength(1);
    expect(JSON.stringify([...store.entries()])).toBe(before); // nada foi apagado nem reescrito
  });

  it('tudo corrompido ou o armazenamento falhando: devolve vazio, sem lançar', async () => {
    for (const k of Object.keys(good)) store.set(k, '}{');
    expect(await S.readAppData(AsyncStorage)).toEqual({});
    const broken = { getItem: async () => { throw new Error('disco'); } };
    expect(await S.readAppData(broken)).toEqual({});
    expect(await S.readJsonKey(broken, '@duo_user', S.sanitizeObject)).toBeUndefined();
  });
});

describe('nenhum JSON.parse solto de chaves @duo_* no app', () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const f of readdirSync(dir)) {
      const p = path.join(dir, f);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.js$/.test(f)) out.push(p);
    }
    return out;
  }
  // arquivos que lêem JSON do armazenamento sempre dentro de try/catch (ou do protocolo SSE/HTTP, que não é armazenamento)
  const ALLOWED = ['src/utils/safeStorage.js', 'src/utils/demoSession.js', 'src/hooks/useHealth.js', 'src/services/api.js', 'src/utils/sse.js'];
  it('AppContext e as telas não usam JSON.parse direto', () => {
    const offenders = walk(path.join(REPO, 'src')).map((f) => path.relative(REPO, f).replace(/\\/g, '/'))
      .filter((f) => !ALLOWED.includes(f))
      .filter((f) => /JSON\.parse\(/.test(readFileSync(path.join(REPO, f), 'utf8')));
    expect(offenders).toEqual([]);
  });
  it('os leitores permitidos protegem o parse com try/catch', () => {
    for (const f of ['src/utils/demoSession.js', 'src/hooks/useHealth.js', 'src/utils/safeStorage.js']) {
      const src = readFileSync(path.join(REPO, f), 'utf8');
      const i = src.indexOf('JSON.parse(');
      expect(src.lastIndexOf('try', i), f).toBeGreaterThan(-1);
      expect(src.lastIndexOf('try', i), f).toBeGreaterThan(src.lastIndexOf('\nexport', i) - 400);
    }
  });
  it('AppContext usa readAppData e App.js protege a leitura do onboarding', () => {
    const ctx = readFileSync(path.join(REPO, 'src/context/AppContext.js'), 'utf8');
    expect(ctx).toMatch(/readAppData\(AsyncStorage\)/);
    expect(ctx).not.toMatch(/parseInt\(/);
    const app = readFileSync(path.join(REPO, 'App.js'), 'utf8');
    expect(app).toMatch(/try \{\s*const val = await AsyncStorage\.getItem\('@duo_onboarded'\)/);
  });
});

describe('App.js: boundary na raiz e flag de teste', () => {
  const app = readFileSync(path.join(REPO, 'App.js'), 'utf8');
  it('o ErrorBoundary envolve o app dentro do SafeAreaProvider, com onReset remontando o app', () => {
    expect(app.indexOf('<SafeAreaProvider>')).toBeLessThan(app.indexOf('<ErrorBoundary'));
    expect(app.indexOf('<ErrorBoundary')).toBeLessThan(app.indexOf('<AppRoot'));
    expect(app).toMatch(/<AppRoot key=\{appKey\} \/>/);
    expect(app).toMatch(/onReset=\{handleReset\}/);
  });
  it('flag de teste: só web, pela URL; nunca em iOS/Android nem por variável de ambiente', () => {
    expect(F.parseForceError('?duoForceError=once')).toBe(1);
    expect(F.parseForceError('?x=1&duoForceError=twice')).toBe(2);
    expect(F.parseForceError('?duoForceError=sempre')).toBe(0);
    expect(F.parseForceError('')).toBe(0);
    expect(F.parseForceError(undefined)).toBe(0);
    for (const os of ['ios', 'android', undefined]) expect(F.createForcedError(os, '?duoForceError=twice').shouldThrow()).toBe(false);
    const web = F.createForcedError('web', '?duoForceError=twice');
    expect(web.shouldThrow()).toBe(true);
    web.consume();
    expect(web.shouldThrow()).toBe(true);
    web.consume();
    expect(web.shouldThrow()).toBe(false);
    web.consume();
    expect(web.remaining).toBe(0);
    const flagSrc = readFileSync(path.join(REPO, 'src/utils/errorTestFlag.js'), 'utf8');
    expect(flagSrc).not.toMatch(/process\.env|__DEV__/);
    expect(app).toMatch(/createForcedError\(Platform\.OS,/);
  });
});

void Alert;
