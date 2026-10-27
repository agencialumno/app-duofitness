// Redesenho da Saúde: escalas fixas de layout e (nas etapas seguintes) estrutura, helpers e acessibilidade.
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as V from '../../src/utils/healthView.js';
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

const NOW = new Date(2026, 5, 15, 12, 0, 0);
const dk = (off: number) => { const d = new Date(NOW); d.setDate(d.getDate() + off); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const smp = (metric: string, value: number, off: number, source = 'manual') => ({ metric, value, unit: '', date: dk(off), tz: 'America/Sao_Paulo', source });
const views = (samples: unknown[], extra: Record<string, unknown> = {}) => V.buildCategoryViews({ samples, now: NOW, ...extra });

describe('frase do Duo Score', () => {
  it('neutra por faixa, com o que falta e sem termos proibidos', () => {
    expect(V.scorePhrase(null)).toMatch(/Registre/);
    expect(V.scorePhrase(90)).toBe('Seus hábitos da semana estão em dia.');
    expect(V.scorePhrase(60)).toBe('Dá para ajustar um hábito de cada vez.');
    expect(V.scorePhrase(80, { missing: 1 })).toContain('Falta 1 categoria com dados.');
    expect(V.scorePhrase(80, { missing: 3 })).toContain('Faltam 3 categorias com dados.');
    const all = [null, 95, 75, 55, 20].map((n) => V.scorePhrase(n, { missing: 2 })).join(' ').toLowerCase();
    for (const bad of ['dieta', 'caloria', 'déficit', 'meta de peso', 'emagrec', 'garant', 'diagnóst', 'doença', 'suplement']) expect(all).not.toContain(bad);
  });
});

describe('variação compacta do cartão', () => {
  it('sobe, cai, estável e sem tendência, com ícone e texto (nunca só cor)', () => {
    const up = views([smp('steps', 4000, -6), smp('steps', 4200, -5), smp('steps', 4100, -4), smp('steps', 7000, -2), smp('steps', 7200, -1), smp('steps', 7100, 0)]).find((v: any) => v.id === 'activity');
    expect(V.compactVariation(up)).toMatchObject({ icon: 'trending-up', window: '7 dias' });
    expect(V.compactVariation(up).text).toMatch(/^Subindo/);
    const flat = views([smp('steps', 5000, -6), smp('steps', 5100, -4), smp('steps', 5050, -2), smp('steps', 5020, 0)]).find((v: any) => v.id === 'activity');
    expect(V.compactVariation(flat)).toMatchObject({ icon: 'remove-outline', text: 'Estável' });
    const one = views([smp('steps', 5000, 0)]).find((v: any) => v.id === 'activity');
    expect(V.compactVariation(one)).toMatchObject({ icon: 'help-circle-outline', text: 'Sem tendência ainda' });
    expect(V.compactVariation(null).text).toBe('Sem tendência ainda');
  });
});

describe('rótulo do cartão para o VoiceOver (um item)', () => {
  it('sono: "6 horas e 40 minutos", relação com a média de 7 dias e "atualizado"', () => {
    const v = views([smp('sleep_duration', 480, -4), smp('sleep_duration', 470, -3), smp('sleep_duration', 460, -2), smp('sleep_duration', 450, -1), smp('sleep_duration', 400, 0)]).find((x: any) => x.id === 'sleep');
    const a = V.cardA11y(v);
    expect(a).toContain('Sono, 6 horas e 40 minutos, abaixo da sua média de 7 dias, atualizado hoje.');
    expect(a).toContain('Origem: Registro manual.');
    expect(a).toMatch(/Toque para ver o detalhe\.$/);
  });
  it('valor antigo: "atualizado em dd/mm"; sem dados: diz o que fazer; uma hora redonda vira "8 horas"', () => {
    const old = views([smp('weight', 78.5, -3)]).find((x: any) => x.id === 'body');
    expect(V.cardA11y(old)).toMatch(/atualizado em \d{2}\/\d{2}/);
    const none = views([]).find((x: any) => x.id === 'sleep');
    expect(V.cardA11y(none)).toMatch(/^Sono: sem dados\. .*Toque para abrir\.$/);
    expect(V.spokenValue('sleep_duration', 480, '8h')).toBe('8 horas');
    expect(V.spokenValue('sleep_duration', 61, '1h01')).toBe('1 hora e 1 minuto');
    expect(V.spokenValue('weight', 70, '70,0 kg')).toBe('70,0 kg');
  });
});

describe('agrupamento "Sem dados ainda"', () => {
  it('separa cartões com dados e sem dados, mantendo a ordem; menor de 18 não tem composição', () => {
    const v = views([smp('steps', 6000, 0), smp('water', 4, 0)]);
    const { withData, noData } = V.splitViews(v);
    expect(withData.map((x: any) => x.id)).toEqual(['activity', 'hydration']);
    expect(noData.map((x: any) => x.id)).toEqual(['body', 'sleep', 'heart']);
    const minor = V.splitViews(views([], { ageGroup: 'under18' }));
    expect(minor.noData.map((x: any) => x.id)).toEqual(['activity', 'sleep', 'heart', 'hydration']);
    expect(V.splitViews(null)).toEqual({ withData: [], noData: [] });
  });
});
