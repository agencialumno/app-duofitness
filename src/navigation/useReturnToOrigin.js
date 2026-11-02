import { useEffect, useRef } from 'react';

// Voltar entre abas: uma tela aberta a partir de OUTRA aba (ver crossTab.js) recebe o parâmetro `from` (nome da aba de origem). Ao voltar (botão do cabeçalho,
// gesto do iOS, botão ou gesto do Android: todos passam pelo evento `beforeRemove`), o app troca para a aba de origem SEM mexer na pilha dela (a posição de
// rolagem, os filtros e a tela aberta ficam como estavam) e só então remove esta tela da pilha de destino, para não deixar tela pendurada.
//  - Sem `from` (tela aberta dentro da própria aba) o voltar fica exatamente como era.
//  - Só intercepta GO_BACK e POP. REPLACE, RESET, POP_TO_TOP e NAVIGATE passam direto.
//  - A trava `leaving` evita o laço: a remoção que nós mesmos disparamos depois da troca de aba não é interceptada de novo.
export function shouldIntercept({ from, leaving, actionType }) {
  return Boolean(from) && !leaving && (actionType === 'GO_BACK' || actionType === 'POP');
}

export default function useReturnToOrigin(navigation, route) {
  const from = route?.params?.from;
  const leaving = useRef(false);
  useEffect(() => {
    if (!from || typeof navigation?.addListener !== 'function') return undefined;
    return navigation.addListener('beforeRemove', (e) => {
      if (!shouldIntercept({ from, leaving: leaving.current, actionType: e?.data?.action?.type })) return;
      const tabs = navigation.getParent?.();
      if (!tabs) return; // sem navegador de abas acima: deixa o voltar normal
      e.preventDefault();
      leaving.current = true;
      try {
        tabs.navigate(from); // volta à aba de origem, com a pilha dela intacta
        navigation.dispatch(e.data.action); // agora remove esta tela da pilha de destino (a trava impede de interceptar de novo)
      } finally {
        leaving.current = false;
      }
    });
  }, [navigation, from]);
}
