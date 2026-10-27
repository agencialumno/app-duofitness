// Redesenho da Saúde: escalas fixas de layout e (nas etapas seguintes) estrutura, helpers e acessibilidade.
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { FONTS, HEALTH_UI, SPACING } from '../../src/utils/theme.js';

const multipleOf4 = (n: number) => n % 4 === 0;

describe('escalas de layout da Saúde (theme.js)', () => {
  it('espaçamentos em múltiplos de 4; padding do cartão 16 a 20, entre cartões 12 a 16, entre seções 24 a 32', () => {
    for (const v of Object.values(HEALTH_UI.space) as number[]) expect(multipleOf4(v), String(v)).toBe(true);
    expect(HEALTH_UI.space.cardPadding).toBeGreaterThanOrEqual(16);
    expect(HEALTH_UI.space.cardPadding).toBeLessThanOrEqual(20);
    expect(HEALTH_UI.space.cardGap).toBeGreaterThanOrEqual(12);
    expect(HEALTH_UI.space.cardGap).toBeLessThanOrEqual(16);
    expect(HEALTH_UI.space.section).toBeGreaterThanOrEqual(24);
    expect(HEALTH_UI.space.section).toBeLessThanOrEqual(32);
  });
  it('escala tipográfica de 4 níveis (+ legenda de no mínimo 12) com linha maior que a fonte', () => {
    const t = HEALTH_UI.type;
    expect(Object.keys(t)).toEqual(['section', 'value', 'label', 'support', 'caption']);
    expect(t.value.fontSize).toBeGreaterThan(t.section.fontSize);
    expect(t.section.fontSize).toBeGreaterThan(t.support.fontSize);
    expect(t.caption.fontSize).toBeGreaterThanOrEqual(12);
    for (const k of Object.keys(t)) expect(t[k].lineHeight, k).toBeGreaterThan(t[k].fontSize);
  });
  it('alvo de toque mínimo de 44 e raio/borda únicos; as escalas globais não mudaram', () => {
    expect(HEALTH_UI.minTouch).toBe(44);
    expect(HEALTH_UI.card).toEqual({ radius: 16, borderWidth: 1 });
    expect(SPACING).toEqual({ xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 });
    expect(FONTS.sizes.md).toBe(15);
  });
});
