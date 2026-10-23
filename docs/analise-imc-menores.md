# Menores de 18 anos: onde a categoria de IMC de ADULTO influencia o gerador (análise)

**Status:** a combinação **A + E** foi **aplicada** (seção 6). As seções 1 a 5 descrevem a situação ANTES da mudança.

## 1. Como a categoria chega ao gerador

A categoria é calculada com as **faixas de adulto** (`getIMCCategory`, limites 18,5, 25, 30 e 35) **para qualquer idade**,
inclusive `under18`, e entra assim:

| Onde | O que faz |
|---|---|
| `onboarding/BodyDataScreen.js` | grava `imcCategory` em `@duo_user` (calculada com a faixa de adulto) |
| `EditBodyDataScreen.js` | idem, ao editar os dados físicos |
| `SmartPlanScreen.js` (gerador rápido) | passa `user.imcCategory` (a gravada) para `generateWorkoutPlan` |
| `guidedPlan.js` (série guiada) | recalcula pela faixa de adulto a partir do peso e da altura (`imcCategoryId`) e passa ao gerador e a `getIMCRecommendations` |
| `AIPersonalTrainerScreen.js` (chat antigo) | calcula a categoria em 2 pontos (plano local e plano da IA) e passa ao gerador/`hydratePlan` |
| `workoutGenerator.js` | `generateWorkoutPlan` e `hydratePlan` chamam `getIMCRecommendations(imcCategory, goals, gender, ageGroup)` |
| `backend/src/ia/filters.ts` | usa a categoria só em `avoidHighImpact` (`obese1`/`obese2`); para `under18` já é verdadeiro por idade, então **não muda nada** |

Na interface, o **rótulo/dica/cor** da categoria já ficam escondidos para menores (ajuda "i"). Mas o que o gerador **recebe** continua sendo a categoria de adulto.

## 2. O que a categoria muda na série de um menor (medido com o código atual)

`getIMCRecommendations` aplica **primeiro** a categoria e **depois** o ajuste de `under18` (`setsMultiplier = min(atual, 0,9)` e `avoidHighImpact = true`).
Medição: combo ELITE, iniciante, 3 dias, 60 min, sem limitação, `ageGroup: under18`, sem objetivo.

| Categoria (faixa de adulto) | Descanso (média) | Séries por exercício (média) | Cardio no início | Exercícios na série A | Notas de categoria exibidas |
|---|---|---|---|---|---|
| nenhuma / normal (referência) | 53 s | 3,11 | não | 9 | só a de menor |
| **abaixo do peso** | **83 s (+30 s)** | 3,11 | não | 9 | +2 ("Priorize exercícios compostos...", "Descanse bem...") |
| **sobrepeso** | **40 s (-13 s)** | 3,11 | **sim** | **10** | +2 ("Inicie cada sessão com 10min de cardio leve", "Prefira circuitos com menos descanso") |
| **obesidade grau I e II+** | **83 s (+30 s)** | **2,11 (-1 série)** | não | 9 | +2 ("Evite exercícios de alto impacto...", "Foque em movimentos controlados...") |

Detalhamento por mecanismo (código em `imc.js`, aplicado em `workoutGenerator.js`):

| Mecanismo | Quem aciona (adulto) | Efeito em quem é `under18` |
|---|---|---|
| `cardioFirst` | `overweight`, ou objetivo `lose_weight` | cardio no início de cada série (+1 exercício) |
| `restBetweenSets` | `underweight` 90, `overweight` 45, `obese1/2` 90; `lose_weight` limita a 45; `gain_muscle` exige 90 | o descanso por exercício vira `rest + (valor - 60)`, mínimo 30 s |
| `setsMultiplier` | `underweight` 1,2; `obese1/2` 0,8; `gain_muscle` 1,2 | **`under18` limita a 0,9**: então `underweight` e `gain_muscle` caem para 0,9, mas `obese1/2` **fica em 0,8** (uma série a menos) |
| `sessionIntensity` | `obese1/2` = "leve" | valor calculado, **sem efeito hoje** no gerador |
| `avoidHighImpact` | `obese1/2` | já é **verdadeiro por idade** para todo menor: sem efeito extra |
| `notes` | todas as faixas | frases por faixa aparecem em "Recomendações para você" no gerador rápido |

**Objetivo `lose_weight` (não é categoria, mas atinge menores do mesmo jeito):** cardio no início e descanso de 45 s (média de série A com ~33 s por exercício), qualquer que seja a categoria.
Na Saúde, menores já não têm meta nem recomendação de peso; no gerador, o objetivo "Emagrecer" continua disponível e continua alterando a série.

## 3. Por que isso importa

- A categoria de adulto **não se aplica** a menores (a avaliação correta é por percentil de idade e sexo). A série de um adolescente com "sobrepeso" ganha cardio obrigatório e descanso menor; com "obesidade", uma série a menos e descanso maior, decididos por uma faixa que **não vale** para a idade.
- O texto das notas dessas faixas também aparece para o menor, mesmo com o rótulo escondido.

## 4. Opções (NÃO aplicadas)

| Opção | Como | Prós | Contras |
|---|---|---|---|
| **A. Ignorar a categoria nos pontos de chamada** | um helper único (ex.: `imcCategoryForPlan(ageGroup, imc)`) que devolve `undefined` para `under18`, usado em SmartPlan, GuidedPlan, AIPersonalTrainer e nas telas que gravam `imcCategory` | não toca em `imc.js` nem no `workoutGenerator.js`; fácil de testar | vários pontos de chamada (risco de esquecer um); `@duo_user.imcCategory` já gravado para menores continua lá (o helper precisa ignorá-lo na leitura) |
| **B. Ignorar dentro de `getIMCRecommendations`** | `if (ageGroup === 'under18')` pula o bloco da categoria | um único lugar; cobre gerador e `hydratePlan`; resolve também dados antigos | **altera a lógica de `imc.js`** (exige sua autorização); o backend tem testes de paridade (`avoidHighImpact`): precisa conferir que não diverge |
| **C. Ignorar só os efeitos de "peso"** | para menores, mantém `setsMultiplier` ≤ 0,9 e `avoidHighImpact`, mas descarta `cardioFirst`, descanso por faixa e notas de faixa | mantém a cautela de volume | mais regras e mais exceções para explicar e testar |
| **D. Percentis de idade e sexo** | tabelas de crescimento (OMS/CDC) para classificar menores corretamente | clinicamente correto | exige **validação por profissional de saúde** e fonte de dados; escopo maior |
| **E. Também neutralizar o objetivo "Emagrecer" para menores** | esconder a opção ou tratá-la como "Saúde geral" para `under18` | coerente com a Saúde (sem recomendação de peso para menores) | muda o fluxo de objetivos do onboarding e do gerador |

**Combinação que eu recomendaria (para você aprovar):** **A** (ou **B**, se aceitar mexer em `imc.js`) + **E**, com testes que comparam, para `under18`, a série gerada com qualquer categoria contra a série sem categoria (devem ser iguais) e o `under18` com `lose_weight` contra o mesmo caso com `health`. **D** fica como evolução futura com revisão clínica.

## 5. Como reproduzir a medição

O script usado (leitura apenas) carrega `imc.js` e `workoutGenerator.js` com o Babel do projeto e imprime as tabelas da seção 2; os números acima vêm dele.
Se a decisão for aplicar A, B ou C, o teste de regressão equivalente entra junto, em Vitest.

## 6. Aplicado: opção A + E (ponto central `src/utils/planForAge.js`)

Sem editar `workoutGenerator.js` nem `imc.js` (um teste confere). Todos os pontos de chamada passam por `planForAge.js`
(`generatePlanForAge`, `hydratePlanForAge`, `recommendationsForAge`, `effectiveGoals`); um teste varre `src/` e falha se alguém chamar o gerador direto.

- **Adultos** (`ageGroup` diferente de `under18`): os valores passam sem mudança. Provado por: série idêntica à do gerador direto (todos os combos, categorias, objetivos, sexos e faixas), hash das 1440 recomendações de adulto, e o hash das 1728 combinações de `imc.js` continua o mesmo.
- **Menores de 18:** a categoria de IMC de adulto é descartada (séries, descanso, cardio e notas não dependem dela) e "Emagrecer" vale como "Saúde geral", igual à área Saúde. O ajuste próprio de menores (volume até 0,9, sem impacto, nota de supervisão) continua em `imc.js`.
- Os dados gravados (`@duo_user.imcCategory`) não mudam; o ajuste é feito na hora de montar a série.

Antes (gerador direto) -> depois (`planForAge`), menor de 18, ELITE, iniciante, 3 dias, 60 min, série A:

| Categoria | Objetivo | Cardio no início | Séries (média) | Descanso | Exercícios | Notas |
|---|---|---|---|---|---|---|
| abaixo do peso | - | não | 3,11 | 83 s -> 53 s | 9 | 3 -> 1 |
| sobrepeso | - | sim -> não | 3,11 | 40 s -> 53 s | 10 -> 9 | 3 -> 1 |
| obesidade I e II | - | não | 2,11 -> 3,11 | 83 s -> 53 s | 9 | 3 -> 1 |
| qualquer | Emagrecer | sim -> não | (2,11 -> 3,11 em obesidade) | 33 s -> 53 s | 10 -> 9 | menos 2 |
| nenhuma / normal | qualquer | sem mudança | sem mudança | sem mudança | sem mudança | sem mudança |

Adulto (26-35), mesma configuração: todas as linhas idênticas antes e depois (ex.: sobrepeso 40 s com cardio; Emagrecer 33 s com cardio; obesidade 2,11 séries e 83 s).
