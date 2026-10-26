// Fundo escuro nas telas de conta (e em TODAS as telas): falha se uma tela ficar sem fundo próprio nem usar o AuthScreen.
// O tema escuro do NavigationContainer (navtheme.test.ts) é a rede de proteção; aqui cada tela também define o seu fundo.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { COLORS } from '../../src/utils/theme.js';

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const code = (f: string) => read(f).replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');

function walk(dir: string): string[] {
  return readdirSync(path.join(REPO, dir)).flatMap((f) => {
    const rel = `${dir}/${f}`;
    return statSync(path.join(REPO, rel)).isDirectory() ? walk(rel) : rel.endsWith('.js') ? [rel] : [];
  });
}

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

const DARK_BG = /backgroundColor:\s*(COLORS\.bg\b|COLORS\.black\b|'#0A0A0A'|'#000000'|'#000')/;
const authScreens = walk('src/screens/auth').filter((f) => !/SocialButtons/.test(f));

describe('telas de conta: fundo do tema', () => {
  it('toda tela de conta é montada pelo AuthScreen (que define o fundo escuro)', () => {
    expect(authScreens.length).toBeGreaterThanOrEqual(4);
    for (const f of authScreens) {
      const c = code(f);
      expect(c, f).toMatch(/import \{[^}]*\bAuthScreen\b[^}]*\} from '..\/..\/components\/auth\/AuthParts'/);
      expect(c, f).toMatch(/<AuthScreen\b/);
    }
  });

  it('o AuthScreen pinta de COLORS.bg o KeyboardAvoidingView, o ScrollView (bounce) e o conteúdo', () => {
    const c = code('src/components/auth/AuthParts.js');
    expect(c).toMatch(/<KeyboardAvoidingView testID="auth-screen" style=\{styles\.screen\}/);
    expect(c).toMatch(/<ScrollView\s+ref=\{ref\}\s+style=\{styles\.screen\}/);
    expect(c).toMatch(/screen: \{ flex: 1, backgroundColor: COLORS\.bg \}/);
    expect(c).toMatch(/screenContent: \{[^}]*backgroundColor: COLORS\.bg/);
  });

  it('as boas-vindas (com e sem conta) têm fundo próprio', () => {
    expect(code('src/screens/onboarding/WelcomeScreen.js')).toMatch(/container: \{[^}]*backgroundColor: COLORS\.bg/);
  });

  it('o cartão de conta e a janela de excluir conta usam fundos escuros', () => {
    expect(code('src/components/auth/AccountCard.js')).toMatch(/card: \{ backgroundColor: COLORS\.bgCard/);
    const parts = code('src/components/auth/AuthParts.js');
    expect(parts).toMatch(/sheet: \{ backgroundColor: COLORS\.bgCard/);
    expect(parts).toMatch(/backdrop: \{[^}]*backgroundColor: 'rgba\(0,0,0,0\.7\)'/);
  });
});

describe('campos de texto e botões no escuro', () => {
  const parts = code('src/components/auth/AuthParts.js');
  it('teclado escuro, cursor amarelo e placeholder legível', () => {
    expect(parts).toContain('keyboardAppearance="dark"');
    expect(parts).toContain('selectionColor={COLORS.primary}');
    expect(parts).toContain('placeholderTextColor={COLORS.textSecondary}');
    expect(contrast(COLORS.textSecondary, COLORS.bgCard)).toBeGreaterThanOrEqual(4.5); // placeholder sobre o campo
    expect(contrast(COLORS.error, COLORS.bg)).toBeGreaterThanOrEqual(4.5); // texto de erro
    expect(contrast(COLORS.success, COLORS.bgCard)).toBeGreaterThanOrEqual(4.5); // requisito atendido
    expect(contrast(COLORS.white, COLORS.bgCard)).toBeGreaterThanOrEqual(7); // texto do campo
  });
  it('botão da Apple: BRANCO com logo e texto pretos (aparência da Apple para fundo escuro), texto "Continuar com a Apple"', () => {
    expect(parts).toMatch(/apple: \{ bg: '#FFFFFF', fg: '#000000'/);
    expect(contrast('#FFFFFF', '#000000')).toBeGreaterThanOrEqual(7);
    expect(code('src/screens/auth/SocialButtons.js')).toContain('label="Continuar com a Apple"');
    expect(parts).toMatch(/social: \{[^}]*minHeight: 52/); // pelo menos 44 pt
  });
  it('botão do Google no tema escuro: #131314, contorno #8E918F e texto #E3E3E3, com contraste adequado', () => {
    expect(parts).toMatch(/google: \{ bg: '#131314', fg: '#E3E3E3', border: '#8E918F'/);
    expect(contrast('#E3E3E3', '#131314')).toBeGreaterThanOrEqual(7);
    expect(contrast('#8E918F', COLORS.bg)).toBeGreaterThanOrEqual(3); // contorno (elemento não textual: 3:1)
  });
  it('os botões sociais usam o SocialButton (não mais o botão secundário genérico)', () => {
    const s = code('src/screens/auth/SocialButtons.js');
    expect(s).toContain('<SocialButton provider="google"');
    expect(s).toContain('<SocialButton provider="apple"');
    expect(s).not.toContain('SecondaryButton');
  });
});

describe('varredura: nenhuma tela do app fica sem fundo próprio', () => {
  const screens = walk('src/screens');
  it('toda tela define backgroundColor escuro em seu estilo ou usa o AuthScreen (lista conferida)', () => {
    const sem: string[] = [];
    for (const f of screens) {
      if (/SocialButtons/.test(f)) continue; // componente, não tela
      const c = code(f);
      if (!DARK_BG.test(c) && !/<AuthScreen\b/.test(c)) sem.push(f);
    }
    expect(sem).toEqual([]);
  });
  it('as janelas (Modal) do app têm fundo escuro próprio', () => {
    for (const f of [...walk('src/components')]) {
      const c = code(f);
      if (!/<Modal\b/.test(c)) continue;
      expect(c, f).toMatch(/sheet: \{[^}]*backgroundColor: COLORS\.bgCard/);
    }
  });
});
