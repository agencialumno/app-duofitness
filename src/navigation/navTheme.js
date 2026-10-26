// Tema e opções de fundo da navegação. CAUSA RAIZ do fundo branco nas telas de conta: o NavigationContainer, sem `theme`,
// usa o tema CLARO padrão do React Navigation (background rgb(242,242,242), card branco), e o Stack pinta cada tela
// (o "card") com essa cor. Telas que não definem o próprio fundo (as de conta, antes desta correção) mostravam o fundo claro.
// Aqui o fundo escuro do app (COLORS.bg) vira o fundo do tema, do card e do navegador, então NENHUMA tela cai em branco,
// nem a área atrás do teclado, o bounce ao puxar a tela ou a transição entre telas.
import { COLORS } from '../utils/theme';

// Cores do tema do NavigationContainer; o App.js as aplica por cima do DarkTheme do React Navigation.
export const NAV_COLORS = {
  primary: COLORS.primary,
  background: COLORS.bg,
  card: COLORS.bg,
  text: COLORS.textPrimary,
  border: COLORS.border,
  notification: COLORS.primary,
};

// screenOptions de todo Stack: sem cabeçalho e com o card no fundo escuro do app.
export const STACK_SCREEN_OPTIONS = {
  headerShown: false,
  cardStyle: { backgroundColor: COLORS.bg },
};

// Pano de fundo das cenas da barra de abas.
export const TAB_SCENE_STYLE = { backgroundColor: COLORS.bg };
