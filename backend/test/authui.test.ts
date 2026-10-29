// Telas de conta: regras de acessibilidade e de "flag desligada = app idêntico", conferidas no código-fonte.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { COLORS } from '../../src/utils/theme.js';
// @ts-expect-error módulo JS do app, sem tipos
import { showApple } from '../../src/auth/socialSupport.js';

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const code = (f: string) => read(f).replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, ''); // sem comentários
const authFiles = [
  ...readdirSync(path.join(REPO, 'src/screens/auth')).map((f) => `src/screens/auth/${f}`),
  ...readdirSync(path.join(REPO, 'src/components/auth')).map((f) => `src/components/auth/${f}`),
];

function lum(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

describe('contraste (mínimo 4,5:1 para texto)', () => {
  it.each([
    ['branco', COLORS.white], ['cinza secundário', COLORS.textSecondary], ['erro', COLORS.error], ['sucesso', COLORS.success], ['amarelo', COLORS.primary],
  ])('%s sobre o fundo e sobre o cartão', (_n, fg) => {
    expect(contrast(fg, COLORS.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(fg, COLORS.bgCard)).toBeGreaterThanOrEqual(4.5);
  });
  it('o botão amarelo tem texto preto legível e o botão de excluir tem texto branco legível', () => {
    expect(contrast(COLORS.black, COLORS.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(COLORS.white, COLORS.error)).toBeGreaterThanOrEqual(3); // texto grande e em negrito
  });
  it('as telas de conta não usam a cor "textMuted" (contraste insuficiente) em texto', () => {
    for (const f of authFiles) expect(code(f), f).not.toMatch(/COLORS\.textMuted/);
  });
});

describe('acessibilidade e teclado', () => {
  const parts = read('src/components/auth/AuthParts.js');
  it('área segura, teclado que empurra o conteúdo e rolagem até o campo focado', () => {
    expect(parts).toMatch(/useSafeAreaInsets/);
    expect(parts).toMatch(/KeyboardAvoidingView/);
    expect(parts).toMatch(/keyboardShouldPersistTaps="handled"/);
    expect(parts).toMatch(/onFocus=\{\(\) => scrollTo\(y\.current\)\}/);
  });
  it('botões e campos têm papel, rótulo e estado; alvos de toque de pelo menos 44', () => {
    expect(parts).toMatch(/accessibilityRole="button"/);
    expect(parts).toMatch(/accessibilityRole="checkbox"/);
    expect(parts).toMatch(/accessibilityState=\{\{ checked/);
    expect(parts).toMatch(/minHeight: 52/);
    expect(parts).toMatch(/minHeight: 44/);
    expect(parts).not.toMatch(/\ballowFontScaling=\{false\}|maxFontSizeMultiplier=\{1\}/); // fonte dinâmica respeitada
  });
  it('a checklist usa ícone E texto ("Atendido"/"Pendente"), nunca só cor, e anuncia sem repetir a cada tecla', () => {
    expect(parts).toMatch(/r\.ok \? 'Atendido' : 'Pendente'/);
    expect(parts).toMatch(/atendido' : 'pendente'/);
    expect(parts).toMatch(/announceForAccessibility/);
    expect(parts).toMatch(/setTimeout\(\(\) => \{[\s\S]*last\.current === done/); // pausa + só quando o número muda
  });
  it('a barra de força diz o rótulo em texto', () => {
    expect(parts).toMatch(/Força: \$\{strength\.label\}/);
  });
  it('listas roláveis sem barra de rolagem (regra do projeto)', () => {
    expect(parts.match(/<ScrollView/g)?.length).toBe(parts.match(/showsVerticalScrollIndicator=\{false\}/g)?.length);
  });
  it('a senha pede o preenchimento seguro do iOS e do Android', () => {
    const su = read('src/screens/auth/SignUpScreen.js');
    expect(su).toMatch(/textContentType="newPassword"/);
    expect(su).toMatch(/autoComplete="new-password"/);
    expect(su).toMatch(/passwordRules="minlength: 10; required: lower; required: upper; required: digit; required: special;"/);
    expect(read('src/screens/auth/SignInScreen.js')).toMatch(/textContentType="password"/);
  });
  it('nenhuma tela de conta usa Alert (não funciona na web e não é testável)', () => {
    for (const f of authFiles) expect(code(f), f).not.toMatch(/\bAlert\b/);
  });
});

describe('Apple só no iOS e flag desligada', () => {
  it('showApple: só com a capacidade E no iOS', () => {
    expect(showApple({ apple: true }, 'ios')).toBe(true);
    expect(showApple({ apple: true }, 'android')).toBe(false);
    expect(showApple({ apple: true }, 'web')).toBe(false);
    expect(showApple({ apple: false }, 'ios')).toBe(false);
  });
  it('as boas-vindas só têm Criar conta e Entrar (sem Modo Demo e sem "Continuar sem conta")', () => {
    const w = read('src/screens/onboarding/WelcomeScreen.js');
    expect(w).toMatch(/testID="wl-signup"/);
    expect(w).toMatch(/testID="wl-signin"/);
    expect(w).not.toMatch(/Modo Demo|Continuar sem conta|Começar agora|wl-guest|loadDemoData/);
  });
  it('o Perfil sempre mostra o cartão de conta e a seção Conta no fim; não há reset nem demo', () => {
    const p = read('src/screens/ProfileScreen.js');
    expect(p).toMatch(/<AccountCard \/>/);
    expect(p).toMatch(/<AccountActions \/>/);
    expect(p).not.toMatch(/Resetar todos os dados|resetAll|DemoCard|isDemo/);
  });
  it('os workflows recebem a flag como variável opcional (vars), nunca secret', () => {
    for (const f of ['.github/workflows/android.yml', '.github/workflows/ios.yml']) {
      expect(read(f), f).toMatch(/EXPO_PUBLIC_AUTH_ENABLED: \$\{\{ vars\.EXPO_PUBLIC_AUTH_ENABLED \}\}/);
      expect(read(f), f).not.toMatch(/secrets\.EXPO_PUBLIC_AUTH/);
    }
  });
  it('chaves @duo_* não ganharam nomes novos nas telas de conta', () => {
    for (const f of authFiles) expect(read(f), f).not.toMatch(/@duo_[a-z_]+/);
  });
});
