# Sequência: Home, Saúde e conquistas (análise e proposta)

**Status:** Home e Perfil usam o cálculo por datas (aplicado). As conquistas "3 dias seguidos" e "Semana perfeita" também (aplicado, `src/utils/achievements.js`). "Guerreiro da semana" NÃO mudou (continua 7 treinos no total).

## O que mudou (aplicado)

O número de **Sequência** da Home (selo ao lado do nome e cartão "Sequência") agora vem de `computeStreak(completedSessions)`,
de `src/utils/health.js`: a **mesma função** da Saúde e do Duo Score (sem cópia). É o número de dias seguidos com pelo menos um
treino concluído, contando de hoje ou de ontem; quebra quando passa um dia inteiro sem treino; dois treinos no mesmo dia contam como um dia.

O contador gravado em `@duo_streak` **continua como está** (continua sendo gravado a cada treino, sem migração). Ele só não é mais
exibido na Home. O texto de ajuda (`infoContent.js`, tema `sequencia`) foi atualizado.

## Como as conquistas usam o contador antigo hoje

Em `src/context/AppContext.js`, `completeSession`:

```js
const newStreak = streak + 1;            // contador: +1 a cada treino concluído, NUNCA zera
await AsyncStorage.setItem('@duo_streak', newStreak.toString());
checkAchievements(updatedSessions, newXp, newStreak);
```

e em `checkAchievements`:

| Conquista | Regra atual | Usa o contador antigo? |
|---|---|---|
| **"3 dias seguidos"** (`streak_3`) | `currentStreak >= 3` | **Sim** (`newStreak`) |
| **"Semana perfeita"** (`streak_7`) | `currentStreak >= 7` | **Sim** (`newStreak`) |
| "Guerreiro da semana" (`week_warrior`) | `sessions.length >= 7` (7 treinos no total, de sempre) | não (conta sessões), mas o nome sugere "em uma semana" |
| "Primeira série!", "Besta mensal", XP | total de sessões / XP | não |

**Consequência:** as duas conquistas "de dias seguidos" desbloqueiam pelo **total de treinos**, não por dias seguidos.

| Cenário | Contador antigo | Sequência por datas (Home e Saúde) | Conquistas |
|---|---|---|---|
| Treina segunda, quarta e sexta | 3 | 1 (só sexta) | "3 dias seguidos" desbloqueia, mesmo sem 3 dias seguidos |
| 7 treinos espalhados em 3 semanas | 7 | 1 a 2 | "Semana perfeita" desbloqueia, mesmo sem 7 dias seguidos |
| Fica 2 semanas sem treinar e volta | continua somando | 1 | nada muda |

Com a Home mostrando "Sequência 1d" e a conquista "3 dias seguidos" aparecendo, o usuário vê uma **contradição**.

## Proposta (APLICADA para "3 dias seguidos" e "Semana perfeita"; o item 1 abaixo segue em aberto)

Passar a **sequência por datas** para `checkAchievements`, mantendo o contador gravado:

```js
// AppContext.completeSession, depois de montar updatedSessions:
const dateStreak = computeStreak(updatedSessions);       // import de ../utils/health (mesma função)
// (o contador continua a ser gravado em @duo_streak, sem migração)
checkAchievements(updatedSessions, newXp, dateStreak);   // em vez de newStreak
```

Efeitos:
- **Novos desbloqueios** passam a exigir 3 e 7 dias seguidos de verdade, coerentes com a Home e a Saúde.
- **Quem já desbloqueou não perde nada**: `unlock` só acrescenta; conquistas já gravadas continuam (sem revogação retroativa).
- Como o cálculo roda logo depois de o treino de hoje entrar em `updatedSessions`, o dia de hoje já conta.
- O Modo Demo já é coerente: 8 dias seguidos nos dados de exemplo, "Semana perfeita" já desbloqueada.

Pontos a decidir junto:
1. **"Guerreiro da semana"**: hoje é "7 treinos no total". Opções: manter (e talvez renomear para "7 treinos"), ou exigir
   N treinos nos últimos 7 dias (`countTrainingDays(sessions, { days: 7 })`, também em `health.js`).
2. **Perfil**: a tela de Perfil ainda mostra "Sequência atual" com o contador antigo (`streak`, `ProfileScreen.js`). Para ficar
   coerente, deveria usar `computeStreak` também (mudança de uma linha, **não aplicada**).
3. O contador `@duo_streak` passaria a ser só histórico/legado. Pode ser mantido sem uso, ou removido numa migração futura.

Testes a acrescentar quando aplicar: treinos em dias alternados (não desbloqueia), 3 dias seguidos (desbloqueia), 7 dias
seguidos, dois treinos no mesmo dia, passagem de mês/ano, conquistas já desbloqueadas preservadas.
