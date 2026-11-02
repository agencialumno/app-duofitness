// Abre uma tela que pertence à pilha de OUTRA aba. `initial: false` mantém a tela inicial da aba de destino por baixo (sem isso, na primeira vez a tela
// ficaria sozinha na pilha e o voltar cairia na primeira aba), e `from` diz a useReturnToOrigin para qual aba voltar. Abas: Home, Workouts, Exercises, Profile.
export function openInTab(navigation, tab, screen, params, from) {
  navigation.navigate(tab, { screen, params: { ...(params || {}), from }, initial: false });
}
