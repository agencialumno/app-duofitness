// ScreenHeader e ScreenTopInset (docs/visual-cabecalho.md, lote 1): título e subtítulo, voltar por prop, alvos de 44 pt, acessibilidade, topo seguro opaco,
// nenhuma dependência de navegação e nenhum valor literal de cor, fonte ou espaçamento. Mesmo renderizador mínimo dos outros testes de componentes.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import ScreenHeader from '../../src/components/ScreenHeader.js';
// @ts-expect-error módulo JS do app, sem tipos
import ScreenTopInset from '../../src/components/ScreenTopInset.js';
// @ts-expect-error módulo JS do app, sem tipos
import { COLORS, SPACING, TYPE, HEALTH_UI } from '../../src/utils/theme.js';
import { __insets } from './stubs/safe-area';
import { mount, findAll, byLabel, byTestId, textsOf } from './stubs/mini-render';

const REPO = path.resolve(__dirname, '../..');
const src = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const flat = (s: any): Record<string, any> => (Array.isArray(s) ? s.flat(9).reduce((a: any, x: any) => ({ ...a, ...flat(x) }), {}) : s || {});
const styleOf = (n: any) => flat(n.props.style);
const render = (props: any, top = 47) => { __insets.top = top; return mount(ScreenHeader, props); };
const headerText = (t: any) => findAll(t, (n) => n.props?.accessibilityRole === 'header')[0];

describe('ScreenHeader', () => {
  it('mostra título e subtítulo', () => {
    const t = render({ title: 'Saúde', subtitle: 'Seus hábitos da semana', onBack: () => {} }).tree;
    expect(textsOf(t)).toEqual(['Saúde', 'Seus hábitos da semana']);
  });
  it('sem subtítulo, não desenha a linha', () => {
    expect(textsOf(render({ title: 'Lembretes', onBack: () => {} }).tree)).toEqual(['Lembretes']);
  });
  it('o voltar chama o onBack recebido por prop (uma vez por toque)', () => {
    let n = 0;
    const t = render({ title: 'X', onBack: () => { n++; } }).tree;
    byLabel(t, 'Voltar').props.onPress();
    expect(n).toBe(1);
  });
  it('voltar: botão com rótulo "Voltar" e alvo de pelo menos 44 x 44', () => {
    const b = byLabel(render({ title: 'X', onBack: () => {} }).tree, 'Voltar');
    expect(b.props.accessibilityRole).toBe('button');
    const s = styleOf(b);
    expect(s.minWidth).toBeGreaterThanOrEqual(44);
    expect(s.minHeight).toBeGreaterThanOrEqual(44);
    expect(HEALTH_UI.minTouch).toBe(44);
  });
  it('ação à direita: coluna com alvo de pelo menos 44 x 44 e o nó entregue pela tela', () => {
    const node = { type: 'Touch', props: { accessibilityRole: 'button', accessibilityLabel: 'Info' }, children: [] };
    const t = render({ title: 'X', onBack: () => {}, right: node }).tree;
    const slot = byTestId(t, 'screen-header-right');
    expect(styleOf(slot).minWidth).toBeGreaterThanOrEqual(44);
    expect(styleOf(slot).minHeight).toBeGreaterThanOrEqual(44);
    expect(byLabel(t, 'Info')).toBeTruthy();
  });
  it('sem ação à direita, a coluna não existe', () => {
    expect(byTestId(render({ title: 'X', onBack: () => {} }).tree, 'screen-header-right')).toBeUndefined();
  });
  it('título é cabeçalho para leitor de tela e aceita até 2 linhas', () => {
    const title = headerText(render({ title: 'Um título bem comprido de tela', onBack: () => {} }).tree);
    expect(title.props.numberOfLines).toBe(2);
  });
  it('variante interna usa TYPE.title; a raiz usa TYPE.titleLarge e não tem voltar', () => {
    expect(styleOf(headerText(render({ title: 'A', onBack: () => {} }).tree)).fontSize).toBe(TYPE.title.fontSize);
    const rootTree = render({ title: 'A', variant: 'root', onBack: () => {} }).tree;
    expect(styleOf(headerText(rootTree)).fontSize).toBe(TYPE.titleLarge.fontSize);
    expect(byLabel(rootTree, 'Voltar')).toBeUndefined();
  });
  it('sem onBack na interna, não desenha o voltar', () => {
    expect(byLabel(render({ title: 'A' }).tree, 'Voltar')).toBeUndefined();
  });
  it('topo seguro: fundo opaco COLORS.bg e paddingTop = insets.top + SPACING.sm', () => {
    const t = render({ title: 'A', onBack: () => {}, testID: 'hdr' }, 59).tree;
    const s = styleOf(byTestId(t, 'hdr'));
    expect(s.backgroundColor).toBe(COLORS.bg);
    expect(s.paddingTop).toBe(59 + SPACING.sm);
  });
});

describe('ScreenTopInset', () => {
  it('faixa fixa com a altura de insets.top e fundo opaco COLORS.bg', () => {
    __insets.top = 47;
    const s = styleOf(byTestId(mount(ScreenTopInset).tree, 'screen-top-inset'));
    expect(s.height).toBe(47);
    expect(s.backgroundColor).toBe(COLORS.bg);
  });
  it('acompanha a área segura (aparelho sem entalhe = 0)', () => {
    __insets.top = 0;
    expect(styleOf(byTestId(mount(ScreenTopInset).tree, 'screen-top-inset')).height).toBe(0);
  });
});

describe('código dos dois componentes', () => {
  const files = ['src/components/ScreenHeader.js', 'src/components/ScreenTopInset.js'];
  const code = (f: string) => src(f).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1')).join('\n');
  it('não importa nem usa useNavigation / React Navigation (o voltar é o onBack)', () => {
    for (const f of files) expect(code(f), f).not.toMatch(/useNavigation|@react-navigation|navigation\./);
  });
  it('só tokens: sem cor, fonte, peso, espaçamento, tamanho ou raio literais', () => {
    for (const f of files) {
      const c = code(f);
      expect(c, `${f} cor`).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
      expect(c, `${f} fonte`).not.toMatch(/fontSize\s*:|fontWeight\s*:|fontFamily\s*:/);
      expect(c, `${f} medida`).not.toMatch(/\b(?:padding|margin|gap|width|height|minWidth|minHeight|borderRadius|size)\w*\s*[:=]\s*\{?-?\d/);
    }
  });
});
