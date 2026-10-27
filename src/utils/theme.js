export const COLORS = {
  primary: '#fed205',
  black: '#000000',
  white: '#FFFFFF',
  bg: '#0A0A0A',
  bgCard: '#141414',
  bgCardAlt: '#1C1C1C',
  border: '#2A2A2A',
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  textMuted: '#555555',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f97316',
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

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
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
