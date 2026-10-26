// Fundo escuro em toda a navegação: o tema padrão do React Navigation é CLARO e foi a causa do fundo branco nas telas de conta.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { COLORS } from '../../src/utils/theme.js';
// @ts-expect-error módulo JS do app, sem tipos
import { NAV_COLORS, STACK_SCREEN_OPTIONS, TAB_SCENE_STYLE } from '../../src/navigation/navTheme.js';

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const code = (f: string) => read(f).replace(/^\s*\/\/.*$/gm, '');

function luminance(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

describe('tema e opções de fundo da navegação', () => {
  it('background e card do tema são o fundo escuro do app (COLORS.bg)', () => {
    expect(NAV_COLORS.background).toBe(COLORS.bg);
    expect(NAV_COLORS.card).toBe(COLORS.bg);
    expect(luminance(NAV_COLORS.background)).toBeLessThan(0.02); // bem escuro
    expect(NAV_COLORS.text).toBe(COLORS.textPrimary);
  });
  it('todo Stack usa card escuro e sem cabeçalho; a barra de abas tem pano de fundo escuro', () => {
    expect(STACK_SCREEN_OPTIONS).toEqual({ headerShown: false, cardStyle: { backgroundColor: COLORS.bg } });
    expect(TAB_SCENE_STYLE.backgroundColor).toBe(COLORS.bg);
  });
  it('o App.js passa o tema (partindo do DarkTheme) ao NavigationContainer', () => {
    const app = code('App.js');
    expect(app).toMatch(/import \{ DarkTheme, NavigationContainer \} from '@react-navigation\/native'/);
    expect(app).toMatch(/\{ \.\.\.DarkTheme, colors: \{ \.\.\.DarkTheme\.colors, \.\.\.NAV_COLORS \} \}/);
    expect(app).toMatch(/<NavigationContainer theme=\{APP_NAV_THEME\}>/);
    expect(app).toMatch(/<StatusBar style="light"/);
  });
  it('nenhum navegador usa o screenOptions cru (sem o fundo escuro)', () => {
    for (const f of readdirSync(path.join(REPO, 'src/navigation')).filter((x) => x.endsWith('.js') && x !== 'navTheme.js' && x !== 'resetNavigation.js')) {
      const c = code(`src/navigation/${f}`);
      expect(c, f).not.toMatch(/screenOptions=\{\{ headerShown: false \}\}/);
      if (/Stack\.Navigator/.test(c)) expect(c, f).toContain('STACK_SCREEN_OPTIONS');
    }
    expect(code('src/navigation/MainNavigator.js')).toMatch(/sceneContainerStyle=\{TAB_SCENE_STYLE\}/);
  });
  it('o app.json já fixa userInterfaceStyle "dark" (teclado e alertas escuros no iOS)', () => {
    expect(JSON.parse(read('app.json')).expo.userInterfaceStyle).toBe('dark');
  });
});
