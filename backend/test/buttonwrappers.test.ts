// PrimaryButton e SecondaryButton como invólucros finos do Button (docs/visual-botoes.md, lote 2): mesmas props de antes, testIDs e acessibilidade preservados.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { PrimaryButton, SecondaryButton } from '../../src/components/auth/AuthParts.js';
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

describe('código dos invólucros', () => {
  it('PrimaryButton e SecondaryButton não têm mais estilo próprio nem TouchableOpacity; usam o Button', () => {
    const c = code('src/components/auth/AuthParts.js');
    const block = c.slice(c.indexOf('export function PrimaryButton'), c.indexOf('// Botões de login social'));
    expect(block).not.toMatch(/TouchableOpacity|activeOpacity|StyleSheet|styles\./);
    expect(block).toMatch(/<Button [^>]*variant="primary"/);
    expect(block).toMatch(/<Button [^>]*variant="secondary"/);
  });
});
