// InfoButton: alvo de toque efetivo (tamanho + hitSlop) de pelo menos 44 x 44 em cada dimensão, sem mudar o tamanho visual do ícone, e papel/rótulo preservados.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import InfoButton from '../../src/components/InfoButton.js';
// @ts-expect-error módulo JS do app, sem tipos
import { HEALTH_UI } from '../../src/utils/theme.js';
import { mount, findAll, byLabel } from './stubs/mini-render';

const flat = (s: any): Record<string, any> => (Array.isArray(s) ? s.flat(9).reduce((a: any, x: any) => ({ ...a, ...flat(x) }), {}) : s || {});
const touch = (props: any = { tema: 'saude' }) => findAll(mount(InfoButton, props).tree, (n) => n.type === 'TouchableOpacity')[0];
const effective = (t: any) => {
  const s = flat(t.props.style);
  const h = t.props.hitSlop || {};
  return {
    width: (s.minWidth ?? s.width ?? 0) + (h.left || 0) + (h.right || 0),
    height: (s.minHeight ?? s.height ?? 0) + (h.top || 0) + (h.bottom || 0),
  };
};

describe('InfoButton', () => {
  it('alvo efetivo (tamanho + hitSlop) >= 44 x 44', () => {
    const e = effective(touch());
    expect(e.width).toBeGreaterThanOrEqual(HEALTH_UI.minTouch);
    expect(e.height).toBeGreaterThanOrEqual(HEALTH_UI.minTouch);
    expect(HEALTH_UI.minTouch).toBe(44);
  });
  it('o alvo vem do tamanho do botão e o hitSlop não invade os vizinhos (zero)', () => {
    const t = touch();
    const h = t.props.hitSlop || {};
    for (const k of ['top', 'bottom', 'left', 'right']) expect(h[k] || 0, k).toBe(0);
    const s = flat(t.props.style);
    expect(s.width).toBe(HEALTH_UI.minTouch);
    expect(s.height).toBe(HEALTH_UI.minTouch);
  });
  it('alvo >= 44 também com `blocks` próprios e com outro tamanho de ícone (size só muda o ícone)', () => {
    const e = effective(touch({ titulo: 'T', label: 'L', blocks: [{ type: 'p', text: 'x' }], size: 28 }));
    expect(e.width).toBeGreaterThanOrEqual(44);
    expect(e.height).toBeGreaterThanOrEqual(44);
  });
  it('papel e rótulo preservados', () => {
    const t = touch();
    expect(t.props.accessibilityRole).toBe('button');
    expect(t.props.accessibilityLabel).toMatch(/^Saiba mais sobre /);
    expect(t.props.accessibilityHint).toBe('Abre uma explicação');
    expect(byLabel(mount(InfoButton, { tema: 'saude' }).tree, t.props.accessibilityLabel)).toBeTruthy();
  });
  it('o ícone continua com o mesmo tamanho visual (size 20 - 6 = 14) e o círculo de 24', () => {
    const tree = mount(InfoButton, { tema: 'saude' }).tree;
    expect(findAll(tree, (n) => n.type === 'Ionicons')[0].props.size).toBe(14);
    const code = readFileSync(path.resolve(__dirname, '../../src/components/InfoButton.js'), 'utf8');
    expect(code).toContain('circle: { width: 24, height: 24, borderRadius: 12');
  });
});
