// PrimaryButton, SecondaryButton, LinkButton e FooterButton como invólucros finos do Button (docs/visual-botoes.md, lote 2): mesmas props de antes, testIDs e acessibilidade preservados.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { PrimaryButton, SecondaryButton, LinkButton } from '../../src/components/auth/AuthParts.js';
// @ts-expect-error módulo JS do app, sem tipos
import { FooterButton } from '../../src/components/guided/GuidedParts.js';
// @ts-expect-error módulo JS do app, sem tipos
import { COLORS } from '../../src/utils/theme.js';
import { mount, findAll, textsOf } from './stubs/mini-render';

const REPO = path.resolve(__dirname, '../..');
const flat = (s: any): Record<string, any> => (Array.isArray(s) ? s.flat(9).reduce((a: any, x: any) => ({ ...a, ...flat(x) }), {}) : s || {});
const press = (C: any, props: any) => findAll(mount(C, props).tree, (n) => n.type === 'Pressable')[0];
const styleOf = (n: any, pressed = false) => flat(typeof n.props.style === 'function' ? n.props.style({ pressed }) : n.props.style);
const code = (f: string) => readFileSync(path.join(REPO, f), 'utf8');

describe('PrimaryButton (invólucro do Button primary)', () => {
  it('visual do Button primário: amarelo, mínimo 52, e rótulo igual ao texto', () => {
    const b = press(PrimaryButton, { label: 'Entrar', onPress: () => {}, testID: 'si-submit' });
    expect(b.props.testID).toBe('si-submit');
    expect(b.props.accessibilityRole).toBe('button');
    expect(b.props.accessibilityLabel).toBe('Entrar');
    expect(styleOf(b).backgroundColor).toBe(COLORS.primary);
    expect(styleOf(b).minHeight).toBeGreaterThanOrEqual(52);
    expect(textsOf(mount(PrimaryButton, { label: 'Entrar' }).tree)).toEqual(['Entrar']);
  });
  it('onPress chamado; disabled e loading bloqueiam o toque e marcam o estado (como antes)', () => {
    let n = 0;
    press(PrimaryButton, { label: 'X', onPress: () => { n++; } }).props.onPress();
    expect(n).toBe(1);
    const d = press(PrimaryButton, { label: 'X', onPress: () => { n++; }, disabled: true });
    expect(d.props.onPress).toBeUndefined();
    expect(d.props.accessibilityState).toEqual({ disabled: true, busy: false });
    const l = press(PrimaryButton, { label: 'X', onPress: () => { n++; }, loading: true });
    expect(l.props.onPress).toBeUndefined();
    expect(l.props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(n).toBe(1);
  });
});

describe('SecondaryButton (invólucro do Button secondary)', () => {
  it('contorno com borda, texto branco, ícone à esquerda quando há `icon`', () => {
    const tree = mount(SecondaryButton, { label: 'Sair da conta', onPress: () => {}, testID: 'account-signout', icon: 'log-out-outline' }).tree;
    const b = findAll(tree, (n) => n.type === 'Pressable')[0];
    expect(b.props.testID).toBe('account-signout');
    expect(b.props.accessibilityLabel).toBe('Sair da conta');
    expect(styleOf(b).borderWidth).toBe(1);
    expect(styleOf(b).backgroundColor).toBeUndefined();
    expect(findAll(tree, (n) => n.type === 'Ionicons')[0].props.name).toBe('log-out-outline');
  });
  it('disabled bloqueia o toque', () => {
    const d = press(SecondaryButton, { label: 'X', onPress: () => {}, disabled: true });
    expect(d.props.onPress).toBeUndefined();
    expect(d.props.accessibilityState.disabled).toBe(true);
  });
});

describe('LinkButton (invólucro do Button terciário compacto)', () => {
  it('papel "link", testID e rótulo preservados; só texto sublinhado, mínimo 44 e onPress chamado', () => {
    let n = 0;
    const tree = mount(LinkButton, { label: 'Esqueci a senha', onPress: () => { n++; }, testID: 'si-forgot' }).tree;
    const b = findAll(tree, (x) => x.type === 'Pressable')[0];
    expect(b.props.accessibilityRole).toBe('link');
    expect(b.props.accessibilityLabel).toBe('Esqueci a senha');
    expect(b.props.testID).toBe('si-forgot');
    expect(styleOf(b).backgroundColor).toBeUndefined();
    expect(styleOf(b).minHeight).toBeGreaterThanOrEqual(44);
    expect(flat(findAll(tree, (x) => x.type === 'Text')[0].props.style).textDecorationLine).toBe('underline');
    b.props.onPress();
    expect(n).toBe(1);
  });
  it('danger vira o destrutivo só de texto (vermelho do tema)', () => {
    const tree = mount(LinkButton, { label: 'Apagar', onPress: () => {}, danger: true }).tree;
    expect(flat(findAll(tree, (x) => x.type === 'Text')[0].props.style).color).toBe(COLORS.error);
  });
});

describe('FooterButton (invólucro do Button dentro da barra do rodapé)', () => {
  it('padrão = primário; `secondary` = secundário; ícone à esquerda; rótulo e papel preservados', () => {
    const p = mount(FooterButton, { label: 'Continuar', onPress: () => {}, icon: 'arrow-forward' }).tree;
    const b = findAll(p, (x) => x.type === 'Pressable')[0];
    expect(b.props.accessibilityLabel).toBe('Continuar');
    expect(b.props.accessibilityRole).toBe('button');
    expect(styleOf(b).backgroundColor).toBe(COLORS.primary);
    expect(findAll(p, (x) => x.type === 'Ionicons')[0].props.name).toBe('arrow-forward');
    const sb = findAll(mount(FooterButton, { label: 'Pular', onPress: () => {}, secondary: true }).tree, (x) => x.type === 'Pressable')[0];
    expect(styleOf(sb).backgroundColor).toBeUndefined();
    expect(styleOf(sb).borderWidth).toBe(1);
  });
  it('disabled bloqueia o toque', () => {
    const d = findAll(mount(FooterButton, { label: 'Começar', onPress: () => {}, disabled: true }).tree, (x) => x.type === 'Pressable')[0];
    expect(d.props.onPress).toBeUndefined();
    expect(d.props.accessibilityState.disabled).toBe(true);
  });
});

describe('código dos invólucros', () => {
  it('PrimaryButton e SecondaryButton não têm mais estilo próprio nem TouchableOpacity; usam o Button', () => {
    const c = code('src/components/auth/AuthParts.js');
    const block = c.slice(c.indexOf('export function PrimaryButton'), c.indexOf('// Botões de login social'));
    expect(block).not.toMatch(/TouchableOpacity|activeOpacity|StyleSheet|styles\./);
    expect(block).toMatch(/<Button [^>]*variant="primary"/);
    expect(block).toMatch(/<Button [^>]*variant="secondary"/);
  });
  it('LinkButton e FooterButton também não têm estilo próprio; usam o Button', () => {
    const a = code('src/components/auth/AuthParts.js');
    const link = a.slice(a.indexOf('export function LinkButton'), a.indexOf('// Mensagem de erro/aviso geral'));
    expect(link).not.toMatch(/TouchableOpacity|StyleSheet|styles\./);
    expect(link).toMatch(/<Button /);
    const g = code('src/components/guided/GuidedParts.js');
    const foot = g.slice(g.indexOf('export function FooterButton'), g.indexOf('// Checklist animado'));
    expect(foot).not.toMatch(/TouchableOpacity|activeOpacity/);
    expect(foot).toMatch(/<Button /);
  });
});
