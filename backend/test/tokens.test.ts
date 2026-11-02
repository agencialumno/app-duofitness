// Tokens visuais (src/utils/theme.js): contraste do textMuted, toda referência COLORS/SPACING/RADIUS/FONTS/SHADOWS/HEALTH_UI/TYPE do código existe no tema,
// escalas em múltiplos de 4, escala tipográfica só com tamanhos e pesos já existentes, e nenhum valor antigo mudou (a única mudança de aparência é o textMuted).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as T from '../../src/utils/theme.js';

const REPO = path.resolve(__dirname, '../..');
const THEME = 'src/utils/theme.js';

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}
const files = [...walk(path.join(REPO, 'src')), path.join(REPO, 'App.js')].filter((f) => path.relative(REPO, f).replace(/\\/g, '/') !== THEME);
const rel = (f: string) => path.relative(REPO, f).replace(/\\/g, '/');
// tira comentários (de linha e de bloco) para não contar "COLORS.x" citado em texto
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).split('\n').map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1')).join('\n');

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = (h: string) => { const [r, g, b] = hex(h) as [number, number, number]; return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const ratio = (a: string, b: string) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

describe('contraste do textMuted (WCAG 2.1, texto normal 4,5:1)', () => {
  it('textMuted passa 4,5:1 sobre as três superfícies do tema (fundo, cartão e cartão elevado)', () => {
    for (const bg of ['bg', 'bgCard', 'bgCardAlt']) {
      const r = ratio(T.COLORS.textMuted, T.COLORS[bg]);
      expect(r, `textMuted sobre ${bg} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('hierarquia: textPrimary > textSecondary > textMuted (secundário com pelo menos 1,3x o contraste do mudo, ambos sobre bg)', () => {
    const p = ratio(T.COLORS.textPrimary, T.COLORS.bg);
    const s = ratio(T.COLORS.textSecondary, T.COLORS.bg);
    const m = ratio(T.COLORS.textMuted, T.COLORS.bg);
    expect(s, `secundário ${s.toFixed(2)} x mudo ${m.toFixed(2)}`).toBeGreaterThanOrEqual(1.3 * m);
    expect(p).toBeGreaterThan(s);
  });
  it('o valor é o decidido (#8E8E93)', () => {
    expect(T.COLORS.textMuted.toLowerCase()).toBe('#8e8e93');
  });
});

describe('toda referência a token existe no tema', () => {
  const missing: string[] = [];
  let refs = 0;
  for (const f of files) {
    const t = strip(readFileSync(f, 'utf8'));
    const lines = t.split('\n');
    lines.forEach((line, i) => {
      for (const m of line.matchAll(/\b(COLORS|SPACING|RADIUS|SHADOWS|TYPE)\.(\w+)/g)) {
        refs++;
        if (!(m[2]! in T[m[1]!])) missing.push(`${rel(f)}:${i + 1} ${m[0]}`);
      }
      for (const m of line.matchAll(/\bFONTS\.(\w+)(?:\.(\w+))?/g)) {
        refs++;
        const group = T.FONTS[m[1]!];
        if (group === undefined || (m[2] !== undefined && !(m[2] in group))) missing.push(`${rel(f)}:${i + 1} ${m[0]}`);
      }
      for (const m of line.matchAll(/\bHEALTH_UI((?:\.\w+)+)/g)) {
        refs++;
        let node: any = T.HEALTH_UI;
        for (const k of m[1]!.split('.').filter(Boolean)) { if (node === undefined || node === null || !(k in Object(node))) { node = undefined; break; } node = node[k]; }
        if (node === undefined) missing.push(`${rel(f)}:${i + 1} ${m[0]}`);
      }
    });
  }
  it('varredura de src/ e App.js: nenhuma referência a token inexistente', () => {
    expect(refs).toBeGreaterThan(1000); // sanidade do analisador
    expect(missing, `tokens inexistentes:\n${missing.join('\n')}`).toEqual([]);
  });
});

describe('escalas', () => {
  it('SPACING em múltiplos de 4 e cobrindo 4, 8, 12, 16, 24, 32 e 48 (os mais usados da auditoria)', () => {
    for (const [k, v] of Object.entries(T.SPACING) as [string, number][]) expect(v % 4, `SPACING.${k}`).toBe(0);
    expect(Object.values(T.SPACING)).toEqual(expect.arrayContaining([4, 8, 12, 16, 24, 32, 48]));
  });
  it('RADIUS em múltiplos de 4 (exceto full, o círculo) e cobrindo 4, 8, 12, 16 e 24', () => {
    for (const [k, v] of Object.entries(T.RADIUS) as [string, number][]) if (k !== 'full') expect(v % 4, `RADIUS.${k}`).toBe(0);
    expect(T.RADIUS.full).toBe(999);
    expect(Object.values(T.RADIUS)).toEqual(expect.arrayContaining([4, 8, 12, 16, 24]));
  });
  it('RADIUS.xs vale 0: é o que o código já resolvia (borderRadius: undefined = sem arredondar), então nenhuma tela muda', () => {
    expect(T.RADIUS.xs).toBe(0);
    expect(readFileSync(path.join(REPO, 'src/screens/AIPersonalTrainerScreen.js'), 'utf8')).toContain('borderRadius: RADIUS.xs');
  });
  it('escala tipográfica nomeada: só tamanhos de FONTS.sizes e pesos de FONTS.weights (nenhum peso novo) e sem família de fonte', () => {
    const roles = ['caption', 'bodySmall', 'body', 'bodyLarge', 'title', 'titleLarge', 'display'];
    expect(Object.keys(T.TYPE)).toEqual(roles);
    const sizes = Object.values(T.FONTS.sizes);
    const weights = Object.values(T.FONTS.weights);
    let prev = 0;
    for (const r of roles) {
      const s = T.TYPE[r];
      expect(sizes, `TYPE.${r}.fontSize`).toContain(s.fontSize);
      expect(weights, `TYPE.${r}.fontWeight`).toContain(s.fontWeight);
      expect(Object.keys(s).sort(), r).toEqual(['fontSize', 'fontWeight']);
      expect(s.fontSize, `${r} cresce`).toBeGreaterThan(prev);
      prev = s.fontSize;
    }
    expect(Object.keys(T.FONTS.weights)).toEqual(['regular', 'medium', 'semibold', 'bold']);
  });
});

describe('nada mais mudou: os valores antigos do tema continuam iguais', () => {
  it('cores (exceto textMuted), tamanhos, pesos, espaços, raios e sombra', () => {
    const { textMuted, textSecondary, ...cores } = T.COLORS;
    expect(textMuted).toBeTruthy();
    expect(textSecondary).toBeTruthy();
    expect(cores).toEqual({
      primary: '#fed205', black: '#000000', white: '#FFFFFF', bg: '#0A0A0A', bgCard: '#141414', bgCardAlt: '#1C1C1C', border: '#2A2A2A',
      textPrimary: '#FFFFFF', success: '#22c55e', error: '#ef4444', warning: '#f97316',
    });
    expect(T.FONTS.sizes).toEqual({ xs: 11, sm: 13, md: 15, lg: 18, xl: 22, xxl: 28, xxxl: 36 });
    expect(T.FONTS.weights).toEqual({ regular: '400', medium: '500', semibold: '600', bold: '700' });
    expect(T.SPACING).toMatchObject({ xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 });
    expect(T.RADIUS).toMatchObject({ sm: 8, md: 12, lg: 16, xl: 24, full: 999 });
    expect(T.SHADOWS.card.elevation).toBe(4);
    expect(T.HEALTH_UI.minTouch).toBe(44);
  });
  // Desde o lote 1 do cabeçalho (docs/visual-cabecalho.md) o ScreenHeader é o primeiro usuário de TYPE; nenhuma TELA usa ainda.
  it('nenhuma tela foi migrada para TYPE, SPACING.smd ou RADIUS.tight (só o ScreenHeader, componente novo, usa TYPE)', () => {
    const users = files.filter((f) => /\b(TYPE\.|SPACING\.smd\b|RADIUS\.tight\b)/.test(strip(readFileSync(f, 'utf8')))).map(rel).filter((f) => f !== 'src/components/ScreenHeader.js');
    expect(users).toEqual([]);
  });
});

describe('app.json (etapa 0)', () => {
  it('modo escuro e iPhone explícitos no iOS; a chave de nível superior continua dark', () => {
    const app = JSON.parse(readFileSync(path.join(REPO, 'app.json'), 'utf8')).expo;
    expect(app.userInterfaceStyle).toBe('dark');
    expect(app.ios.userInterfaceStyle).toBe('dark');
    expect(app.ios.supportsTablet).toBe(false);
  });
});
