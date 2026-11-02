export const COLORS = {
  primary: '#fed205',
  black: '#000000',
  white: '#FFFFFF',
  bg: '#0A0A0A',
  bgCard: '#141414',
  bgCardAlt: '#1C1C1C',
  border: '#2A2A2A',
  textPrimary: '#FFFFFF',
  // #B0B0B5: 9,17:1 sobre bg, 8,53:1 sobre bgCard e 7,89:1 sobre bgCardAlt. Hierarquia: textPrimary > textSecondary > textMuted (era #888888, mais escuro que o textMuted novo).
  textSecondary: '#B0B0B5',
  // #8E8E93: 6,07:1 sobre bg, 5,65:1 sobre bgCard e 5,23:1 sobre bgCardAlt (WCAG 2.1, texto normal pede 4,5:1). Era #555555 (2,29 a 2,66:1).
  textMuted: '#8E8E93',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f97316',
  // Botões (docs/visual-botoes.md). #D9B204: preto sobre ele 10,32:1 (primário pressionado). #DC2626: texto branco 4,83:1 (destrutivo preenchido; era #ef4444 com 3,76:1).
  // #B91C1C: texto branco 6,47:1 (destrutivo pressionado).
  primaryPressed: '#D9B204',
  danger: '#DC2626',
  dangerPressed: '#B91C1C',
};

export const FONTS = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 36,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// Escala tipográfica nomeada (só tamanhos e pesos que já existem; a fonte continua a do sistema). Baseada nos tamanhos mais usados da auditoria visual
// (docs/visual-auditoria.md): 13 (127 usos), 15 (118), 11 (84), 18 (26), 28 (25), 22 (16), 36 (1). NENHUMA tela usa esta escala ainda (etapa de migração separada).
export const TYPE = {
  caption: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.regular },
  bodySmall: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.regular },
  body: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.regular },
  bodyLarge: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.semibold },
  title: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold },
  titleLarge: { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.bold },
  display: { fontSize: FONTS.sizes.xxxl, fontWeight: FONTS.weights.bold },
};

// Espaçamento em múltiplos de 4. smd (12) cobre o literal 12 (7 usos na auditoria; os literais 2, 3, 6, 7 e 10 não são múltiplos de 4
// e ficam para a etapa de migração decidir).
export const SPACING = {
  xs: 4,
  sm: 8,
  smd: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Raios em múltiplos de 4 (full é o círculo). xs vale 0 DE PROPÓSITO: `RADIUS.xs` já era usado (AIPersonalTrainerScreen.js:684) mas não existia, então o
// borderRadius era undefined, que o React Native trata como sem arredondamento; 0 mantém o visual idêntico. tight (4) cobre o raio literal mais usado.
export const RADIUS = {
  xs: 0,
  tight: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const SHADOWS = {
  card: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Escalas fixas da tela Saúde (só ela usa; as outras telas seguem com SPACING e FONTS). Tudo em múltiplos de 4 ou 8:
//  - cartão: padding de 16 a 20; entre cartões 12 a 16; entre seções 24 a 32;
//  - tipografia em 4 níveis: título da seção, valor principal, rótulo e texto de apoio (mais a legenda, 12 no mínimo);
//  - raio e borda iguais em todos os cartões.
export const HEALTH_UI = {
  space: { screen: 16, cardPadding: 16, cardGap: 12, section: 24, inner: 8, tight: 4 },
  type: {
    section: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
    value: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
    label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
    support: { fontSize: 13, lineHeight: 20, fontWeight: '400' },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  },
  card: { radius: 16, borderWidth: 1 },
  minTouch: 44,
};

// Botões (componente Button). Medidas e cores por variante e estado; o Button só lê daqui. Desabilitado: fundo bgCardAlt com texto textMuted (5,23:1), sem opacity.
// Pares texto/fundo e razões de contraste: docs/visual-botoes.md (item 4.2) e backend/test/button.test.ts. `bg: null` = sem fundo (transparente).
export const BUTTON = {
  minHeight: { normal: 52, compact: HEALTH_UI.minTouch },
  minWidth: HEALTH_UI.minTouch,
  iconSize: 20,
  borderWidth: HEALTH_UI.card.borderWidth,
  colors: {
    primary: {
      rest: { bg: COLORS.primary, fg: COLORS.black },
      pressed: { bg: COLORS.primaryPressed, fg: COLORS.black },
      disabled: { bg: COLORS.bgCardAlt, fg: COLORS.textMuted },
    },
    secondary: {
      rest: { bg: null, fg: COLORS.white, border: COLORS.textSecondary },
      pressed: { bg: COLORS.bgCardAlt, fg: COLORS.white, border: COLORS.textSecondary },
      disabled: { bg: null, fg: COLORS.textMuted, border: COLORS.border },
    },
    tertiary: {
      rest: { bg: null, fg: COLORS.textSecondary },
      pressed: { bg: null, fg: COLORS.white },
      disabled: { bg: null, fg: COLORS.textMuted },
    },
    destructive: {
      rest: { bg: COLORS.danger, fg: COLORS.white },
      pressed: { bg: COLORS.dangerPressed, fg: COLORS.white },
      disabled: { bg: COLORS.bgCardAlt, fg: COLORS.textMuted },
    },
    // destrutivo só de texto (forma `quiet`): vermelho já existente no tema; pressionado sobe um degrau de superfície
    destructiveQuiet: {
      rest: { bg: null, fg: COLORS.error },
      pressed: { bg: COLORS.bgCardAlt, fg: COLORS.error },
      disabled: { bg: null, fg: COLORS.textMuted },
    },
  },
};
