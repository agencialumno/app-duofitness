// Button (docs/visual-botoes.md, lote 0): contraste de cada par texto/fundo por variante e estado, alvo de toque, props e acessibilidade,
// loading e disabled bloqueiam o toque, pressionado por cor (não por opacidade) e nenhum valor literal. Mesmo renderizador mínimo dos outros testes de componentes.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import Button from '../../src/components/Button.js';
// @ts-expect-error módulo JS do app, sem tipos
import { BUTTON, COLORS, FONTS, HEALTH_UI, TYPE } from '../../src/utils/theme.js';
import { mount, findAll, byTestId, textsOf } from './stubs/mini-render';

const REPO = path.resolve(__dirname, '../..');
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = (h: string) => { const [r, g, b] = hex(h) as [number, number, number]; return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const ratio = (a: string, b: string) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const SURFACES = [COLORS.bg, COLORS.bgCard, COLORS.bgCardAlt];

const flat = (s: any): Record<string, any> => (Array.isArray(s) ? s.flat(9).reduce((a: any, x: any) => ({ ...a, ...flat(x) }), {}) : s || {});
const btn = (props: any = {}) => findAll(mount(Button, { label: 'Continuar', onPress: () => {}, ...props }).tree, (n) => n.type === 'Pressable')[0];
const styleOf = (n: any, pressed = false) => flat(typeof n.props.style === 'function' ? n.props.style({ pressed }) : n.props.style);

describe('contraste dos pares texto/fundo (tokens BUTTON)', () => {
  const MIN = 4.5;
  it('primária: preto sobre amarelo e sobre amarelo pressionado', () => {
    const c = BUTTON.colors.primary;
    expect(ratio(c.rest.fg, c.rest.bg)).toBeGreaterThanOrEqual(MIN);
    expect(ratio(c.pressed.fg, c.pressed.bg)).toBeGreaterThanOrEqual(MIN);
    expect(c.rest.bg).toBe(COLORS.primary);
    expect(c.pressed.bg).not.toBe(c.rest.bg); // o pressionado se distingue pela cor
  });
  it('destrutiva preenchida: branco sobre #DC2626 (>= 4,5:1; era 3,76:1 com #ef4444) e sobre o pressionado', () => {
    const c = BUTTON.colors.destructive;
    expect(COLORS.danger.toLowerCase()).toBe('#dc2626');
    expect(ratio(c.rest.fg, c.rest.bg)).toBeGreaterThanOrEqual(MIN);
    expect(ratio(c.pressed.fg, c.pressed.bg)).toBeGreaterThanOrEqual(MIN);
    expect(ratio(COLORS.white, COLORS.error)).toBeLessThan(MIN); // o par antigo não passava
  });
  it('secundária: texto branco sobre as superfícies e borda de controle >= 3:1', () => {
    const c = BUTTON.colors.secondary;
    for (const s of SURFACES) expect(ratio(c.rest.fg, s), `sobre ${s}`).toBeGreaterThanOrEqual(MIN);
    expect(ratio(c.rest.border, COLORS.bg)).toBeGreaterThanOrEqual(3);
    expect(ratio(c.pressed.fg, c.pressed.bg)).toBeGreaterThanOrEqual(MIN);
  });
  it('terciária: textSecondary sobre as três superfícies e branco ao pressionar', () => {
    const c = BUTTON.colors.tertiary;
    for (const s of SURFACES) { expect(ratio(c.rest.fg, s)).toBeGreaterThanOrEqual(MIN); expect(ratio(c.pressed.fg, s)).toBeGreaterThanOrEqual(MIN); }
  });
  it('destrutiva quiet (só texto): vermelho do tema sobre as três superfícies e sobre o fundo pressionado', () => {
    const c = BUTTON.colors.destructiveQuiet;
    for (const s of SURFACES) expect(ratio(c.rest.fg, s), `sobre ${s}`).toBeGreaterThanOrEqual(MIN);
    expect(ratio(c.pressed.fg, c.pressed.bg)).toBeGreaterThanOrEqual(MIN);
  });
  it('desabilitado: legível (>= 4,5:1) e distinto do estado normal, em todas as variantes', () => {
    for (const [name, c] of Object.entries(BUTTON.colors) as [string, any][]) {
      const bgs = c.disabled.bg ? [c.disabled.bg] : SURFACES;
      for (const s of bgs) expect(ratio(c.disabled.fg, s), `${name} desabilitado`).toBeGreaterThanOrEqual(MIN);
      expect(`${c.disabled.fg}/${c.disabled.bg}`, name).not.toBe(`${c.rest.fg}/${c.rest.bg}`);
    }
  });
});

describe('alvo de toque', () => {
  it('altura mínima 52 (normal) e 44 (compacto), nunca altura fixa; largura mínima 44', () => {
    expect(BUTTON.minHeight).toEqual({ normal: 52, compact: 44 });
    expect(HEALTH_UI.minTouch).toBe(44);
    for (const [size, h] of [['normal', 52], ['compact', 44]] as const) {
      const s = styleOf(btn({ size }));
      expect(s.minHeight, size).toBe(h);
      expect(s.minWidth, size).toBeGreaterThanOrEqual(44);
      expect(s.height, 'sem altura fixa').toBeUndefined();
    }
    for (const variant of ['primary', 'secondary', 'tertiary', 'destructive']) {
      expect(styleOf(btn({ variant, size: 'compact' })).minHeight, variant).toBeGreaterThanOrEqual(44);
    }
  });
});

describe('props e acessibilidade', () => {
  it('mostra o rótulo e usa o papel "button" e o rótulo como accessibilityLabel', () => {
    const b = btn({ label: 'Excluir conta' });
    expect(b.props.accessibilityRole).toBe('button');
    expect(b.props.accessibilityLabel).toBe('Excluir conta');
    expect(textsOf(mount(Button, { label: 'Excluir conta' }).tree)).toEqual(['Excluir conta']);
  });
  it('accessibilityLabel, hint e testID são repassados', () => {
    const b = btn({ accessibilityLabel: 'Enviar', accessibilityHint: 'Abre o e-mail', testID: 'ok' });
    expect(b.props.accessibilityLabel).toBe('Enviar');
    expect(b.props.accessibilityHint).toBe('Abre o e-mail');
    expect(b.props.testID).toBe('ok');
  });
  it('accessibilityRole pode ser trocado (ex.: "link" no LinkButton); o padrão é "button"', () => {
    expect(btn().props.accessibilityRole).toBe('button');
    expect(btn({ accessibilityRole: 'link' }).props.accessibilityRole).toBe('link');
  });
  it('accessibilityState: disabled e busy', () => {
    expect(btn().props.accessibilityState).toEqual({ disabled: false, busy: false });
    expect(btn({ disabled: true }).props.accessibilityState).toEqual({ disabled: true, busy: false });
    expect(btn({ loading: true }).props.accessibilityState).toEqual({ disabled: true, busy: true });
  });
  it('cada variante usa as suas cores (fundo e texto)', () => {
    const bg = (props: any) => styleOf(btn(props)).backgroundColor;
    expect(bg({ variant: 'primary' })).toBe(COLORS.primary);
    expect(bg({ variant: 'destructive' })).toBe(COLORS.danger);
    expect(bg({ variant: 'secondary' })).toBeUndefined();
    expect(bg({ variant: 'tertiary' })).toBeUndefined();
    expect(bg({ variant: 'destructive', quiet: true })).toBeUndefined();
    const fg = (props: any) => flat(findAll(mount(Button, { label: 'X', ...props }).tree, (n) => n.type === 'Text')[0].props.style).color;
    expect(fg({ variant: 'primary' })).toBe(COLORS.black);
    expect(fg({ variant: 'destructive' })).toBe(COLORS.white);
    expect(fg({ variant: 'destructive', quiet: true })).toBe(COLORS.error);
    expect(fg({ variant: 'tertiary' })).toBe(COLORS.textSecondary);
  });
  it('secundária tem borda; terciária e quiet são só texto sublinhado', () => {
    expect(styleOf(btn({ variant: 'secondary' })).borderWidth).toBe(1);
    const t = (props: any) => flat(findAll(mount(Button, { label: 'X', ...props }).tree, (n) => n.type === 'Text')[0].props.style);
    expect(t({ variant: 'tertiary' }).textDecorationLine).toBe('underline');
    expect(t({ variant: 'destructive', quiet: true }).textDecorationLine).toBe('underline');
    expect(t({ variant: 'primary' }).textDecorationLine).toBeUndefined();
  });
  it('ícones à esquerda e à direita do rótulo', () => {
    const tree = mount(Button, { label: 'X', onPress: () => {}, iconLeft: 'arrow-back', iconRight: 'arrow-forward' }).tree;
    const pressable = findAll(tree, (n) => n.type === 'Pressable')[0];
    const kids = pressable.children.filter(Boolean).map((c: any) => (c.type === 'Ionicons' ? `i:${c.props.name}` : c.type));
    expect(kids).toEqual(['i:arrow-back', 'Text', 'i:arrow-forward']);
  });
  it('fullWidth: padrão verdadeiro no normal, falso no compacto e na terciária; a prop manda', () => {
    expect(styleOf(btn()).alignSelf).toBe('stretch');
    expect(styleOf(btn({ size: 'compact' })).alignSelf).toBeUndefined();
    expect(styleOf(btn({ variant: 'tertiary' })).alignSelf).toBeUndefined();
    expect(styleOf(btn({ size: 'compact', fullWidth: true })).alignSelf).toBe('stretch');
    expect(styleOf(btn({ fullWidth: false })).alignSelf).toBeUndefined();
  });
});

describe('fonte do rótulo vem do TAMANHO, não da variante', () => {
  const font = (props: any) => flat(findAll(mount(Button, { label: 'X', ...props }).tree, (n) => n.type === 'Text')[0].props.style);
  it('normal = TYPE.bodyLarge (18/600) e compacto = TYPE.body (15) em peso 600, igual em todas as variantes', () => {
    for (const variant of ['primary', 'secondary', 'tertiary', 'destructive']) {
      const n = font({ variant, size: 'normal' });
      const c = font({ variant, size: 'compact' });
      expect([n.fontSize, n.fontWeight], `${variant} normal`).toEqual([TYPE.bodyLarge.fontSize, FONTS.weights.semibold]);
      expect([c.fontSize, c.fontWeight], `${variant} compacto`).toEqual([TYPE.body.fontSize, FONTS.weights.semibold]);
    }
    expect(TYPE.bodyLarge.fontSize).toBe(18);
    expect(TYPE.body.fontSize).toBe(15);
    expect(font({ variant: 'destructive', quiet: true, size: 'compact' }).fontSize).toBe(15);
  });
  it('o rótulo aceita até 2 linhas e o botão não tem altura fixa (cresce com o texto)', () => {
    const t = findAll(mount(Button, { label: 'X' }).tree, (n) => n.type === 'Text')[0];
    expect(t.props.numberOfLines).toBe(2);
    expect(styleOf(btn()).height).toBeUndefined();
  });
});

describe('toque, carregando e desabilitado', () => {
  it('onPress é chamado ao tocar', () => {
    let n = 0;
    btn({ onPress: () => { n++; } }).props.onPress();
    expect(n).toBe(1);
  });
  it('disabled bloqueia o toque (sem onPress e com disabled no Pressable)', () => {
    let n = 0;
    const b = btn({ disabled: true, onPress: () => { n++; } });
    expect(b.props.onPress).toBeUndefined();
    expect(b.props.disabled).toBe(true);
    expect(n).toBe(0);
  });
  it('loading bloqueia o toque, mostra o indicador e mantém o rótulo no lugar (a largura não pula)', () => {
    let n = 0;
    const tree = mount(Button, { label: 'Salvar', onPress: () => { n++; }, loading: true }).tree;
    const b = findAll(tree, (x) => x.type === 'Pressable')[0];
    expect(b.props.onPress).toBeUndefined();
    expect(b.props.disabled).toBe(true);
    expect(findAll(tree, (x) => x.type === 'ActivityIndicator')).toHaveLength(1);
    expect(textsOf(tree)).toEqual(['Salvar']); // o rótulo continua na árvore, invisível, ocupando a largura
    expect(flat(findAll(tree, (x) => x.type === 'Text')[0].props.style).opacity).toBe(0);
    expect(n).toBe(0);
    expect(findAll(mount(Button, { label: 'Salvar' }).tree, (x) => x.type === 'ActivityIndicator')).toHaveLength(0);
  });
});

describe('pressionado por cor, não por opacidade', () => {
  it('o estilo pressionado troca o fundo para o token e não usa opacity', () => {
    const b = btn({ variant: 'primary' });
    expect(styleOf(b, false).backgroundColor).toBe(COLORS.primary);
    expect(styleOf(b, true).backgroundColor).toBe(COLORS.primaryPressed);
    expect(styleOf(b, true).opacity).toBeUndefined();
    expect(styleOf(btn({ variant: 'destructive' }), true).backgroundColor).toBe(COLORS.dangerPressed);
    expect(styleOf(btn({ variant: 'secondary' }), true).backgroundColor).toBe(COLORS.bgCardAlt);
  });
  it('desabilitado usa cores próprias (sem opacity) e ignora o pressionado', () => {
    const s = styleOf(btn({ variant: 'primary', disabled: true }), true);
    expect(s.backgroundColor).toBe(BUTTON.colors.primary.disabled.bg);
    expect(s.opacity).toBeUndefined();
  });
  it('o código não usa TouchableOpacity nem activeOpacity', () => {
    const code = readFileSync(path.join(REPO, 'src/components/Button.js'), 'utf8');
    expect(code).not.toMatch(/TouchableOpacity|activeOpacity/);
    expect(code).toMatch(/Pressable/);
  });
});

describe('código do Button', () => {
  const code = readFileSync(path.join(REPO, 'src/components/Button.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1')).join('\n');
  it('não usa navegação nem contexto', () => {
    expect(code).not.toMatch(/useNavigation|@react-navigation|navigation\.|useContext|useApp/);
  });
  it('só tokens: sem cor, fonte, peso, espaçamento, tamanho ou raio literais', () => {
    expect(code, 'cor').not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    expect(code, 'fonte').not.toMatch(/fontSize\s*:|fontWeight\s*:\s*['"\d]|fontFamily\s*:/);
    expect(code, 'medida').not.toMatch(/\b(?:padding|margin|gap|width|height|minWidth|minHeight|borderRadius|borderWidth|size)\w*\s*[:=]\s*\{?-?\d/);
  });
});
