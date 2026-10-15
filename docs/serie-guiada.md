# Série guiada

Experiência guiada para montar a série A/B/C, no lugar do chat do Personal Trainer IA. Roda 100% no aparelho,
sem rede, e nunca chama a API (Modo Demo incluso).

## Fluxo (`src/screens/GuidedPlanScreen.js`)

1. **Abertura** "Vamos montar sua série": chips editáveis de peso, altura, objetivos e nível, vindos do perfil.
   O que faltar aparece em amarelo e bloqueia o "Começar". As edições valem só para esta série (não mudam o perfil).
2. **Uma pergunta por tela**, com barra de progresso e botão voltar: dias e tempo, combo, limitação e foco.
3. **Montando sua série**: checklist de 5 etapas, cada uma com um número calculado de verdade (IMC, exercícios
   disponíveis no combo, grupos musculares, limitação, total de exercícios). Dura cerca de 4 s; "Pular" vai direto
   para a revisão. Respeita "Reduzir movimento".
4. **Revisão**: "Por que esta série" (3 a 4 razões geradas dos dados), cartões A/B/C expansíveis e "Trocar" por
   alternativa do mesmo grupo muscular, com equipamento do combo e respeitando a limitação.
5. **Quer ajustar algo?**: chips de sugestão e texto livre, interpretados por palavras-chave. Se não entender,
   diz isso e não regenera.
6. **Salvar série**: `addWorkouts` (mesmo formato dos treinos). O IMC só é gravado no perfil se o peso e a altura
   usados forem os do próprio perfil.

## Onde está a lógica

- `src/utils/guidedPlan.js` (puro, testado em `backend/test/guidedplan.test.ts`): geração, ajustes, troca, razões,
  etapas. Usa **só** o que o `workoutGenerator.js` exporta; os ajustes (impacto, mais glúteo) são aplicados
  **depois** do gerador.
- `src/utils/planOptions.js`: opções e parsers de palavras-chave, compartilhados com o chat antigo.
- `src/components/guided/`: peças visuais (cabeçalho com progresso, cartões de opção, checklist, cartão de série).

## Ajustes entendidos (texto livre)

| Pedido (exemplos) | Efeito |
|---|---|
| "mais glúteo", "bumbum" | troca até 2 exercícios do fim de cada série por glúteos do combo |
| "treino mais curto", "30 minutos" | reduz o tempo (30, 45, 60 ou 90) |
| "mais longo", "mais tempo" | aumenta o tempo |
| "evitar impacto", "sem pular" | remove saltos (`HIGH_IMPACT_IDS`) |
| "2 dias" | muda os dias por semana |
| "mais perna", "parte superior", "abdômen" | muda o foco |
| "dor no joelho/ombro/lombar" | passa a proteger a região (só com palavra de dor ou cuidado) |

Qualquer outra coisa recebe "Não entendi esse pedido" com exemplos.

## Rótulo e selo "IA"

A série vem sempre do gerador local e é rotulada **Personal Trainer Duo**. O selo "IA" só aparece se
`AI_BADGE_ENABLED` (`src/data/guidedConfig.js`, hoje `false`) estiver ligada **e** a API estiver configurada
**e** não for Modo Demo **e** a série tiver vindo da API. As séries salvas têm `generatedByAI: false`, então a
lista de treinos também não mostra "IA" para elas.

## Rotas

- `AIPersonalTrainer` (usada pelos atalhos da Home e de Treinos) abre a série guiada.
- `AIPersonalTrainerChat` é o chat antigo, mantido como alternativa (link "Usar o chat antigo" na abertura)
  até a validação.
