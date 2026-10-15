// Navegação para "Sair do demo" e "Resetar tudo": sobe pelos navegadores (Perfil -> abas -> ...) até
// achar um que tenha a tela "Welcome" (boas-vindas) ou "Onboarding" e reinicia a pilha nele.
// Funciona nos dois casos: demo aberto pela boas-vindas (as abas ficam dentro do onboarding) e app
// reaberto depois (a raiz tem "Main" e "Onboarding" lado a lado).
export function resetToWelcome(navigation) {
  let nav = navigation;
  while (nav) {
    const names = nav.getState?.()?.routeNames || [];
    if (names.includes('Welcome')) {
      nav.reset({ index: 0, routes: [{ name: 'Welcome' }] });
      return true;
    }
    if (names.includes('Onboarding')) {
      nav.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
      return true;
    }
    nav = nav.getParent?.();
  }
  return false;
}

// Volta à Home (aba Início, tela inicial da pilha) sem passar pela boas-vindas.
export function goToHome(navigation) {
  let nav = navigation;
  while (nav) {
    const names = nav.getState?.()?.routeNames || [];
    if (names.includes('Home')) {
      nav.navigate('Home', { screen: 'HomeMain' });
      return true;
    }
    nav = nav.getParent?.();
  }
  return false;
}
