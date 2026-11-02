# Lembretes de treino e de inatividade (notificações locais)

Notificações **locais** agendadas no aparelho com `expo-notifications`. Sem servidor, sem token, sem enviar nenhum dado. No máximo **1 por dia**.

## Opcional (flag)

Só existe em build com `NOTIFICATIONS_ENABLED=true` (variável do repositório do GitHub, Settings > Secrets and variables > Actions > Variables). A mesma variável:
- instala o módulo (`scripts/install-notifications-deps.mjs`, que grava `expo-notifications` no `package.json` do workspace do CI; o repositório não o tem);
- aplica o plugin próprio `plugins/withNotificationsOptional.js` no prebuild;
- liga o JavaScript (`EXPO_PUBLIC_NOTIFICATIONS_ENABLED`, no env do job dos workflows).

Sem a variável o build fica idêntico ao de antes (plugin devolve o config intacto, o cartão do Perfil não aparece, o módulo nunca é carregado).

**Não usamos o plugin do pacote** (`app.plugin.js`): ele grava `aps-environment` (push) no iOS. O nosso, no Android, declara `POST_NOTIFICATIONS` e `RECEIVE_BOOT_COMPLETED` (reagendar depois de reiniciar) e REMOVE (`tools:node="remove"`) `SCHEDULE_EXACT_ALARM` e `USE_EXACT_ALARM`; no iOS garante que não haja `aps-environment` nem `remote-notification`. Conferido por `scripts/check-notifications-project.mjs` (android.yml, ios.yml e job `prebuild-notifications` do ci.yml).

## Regras da agenda (`src/utils/reminders.js`, pura)

- **Treino:** nos dias escolhidos, no horário escolhido (padrão 18h), por 7 dias contados do último acesso. Dias padrão = dias por semana da série (`days` no registro do histórico: 1 = quarta; 2 = segunda e quinta; 3 = segunda, quarta e sexta). Séries sem o campo (migradas): 3 dias.
- **Inatividade:** no 3º, 7º e 14º dia desde o último acesso; depois, silêncio total.
- **Colisão:** em dia de treino escolhido vence o lembrete de treino; o marco de inatividade desse dia é DESCARTADO (não adiado).
- **Silêncio:** 21h às 8h (nada nesse intervalo; vai para o próximo horário válido). Fuso America/Sao_Paulo (UTC-3).
- **Textos:** 5 de treino e 4 de inatividade, escolha determinística pela data; neutros, sem dado de saúde, peso, nome nem cobrança. Iguais para menores de 18.
- **Máximo 1 por dia** por construção (mapa dia -> notificação). Só notificações únicas com data (nada de repetição semanal): no máximo 8 + 3 pendentes, muito abaixo do limite de 64 do iOS.

## Ciclo (`src/utils/remindersService.js`)

- Ao abrir o app e ao voltar ao primeiro plano: grava `lastOpen`, **cancela tudo** e reagenda.
- Permissão: pedida só depois da PRIMEIRA série gerada, com uma explicação antes do pedido do sistema. Negou ou "Agora não": não insiste; os Ajustes (Perfil > Lembretes) mostram como ativar.
- Logout, exclusão de conta e recusa por idade cancelam todas as notificações.
- Canal Android `lembretes`: importância MÉDIA (som padrão), sem vibração, conteúdo privado na tela de bloqueio.
- Dados: `@duo_reminders` (preferências, último acesso e estado da permissão), só no aparelho, por conta (snapshot) e apagado na exclusão da conta.

## Só dá para validar no aparelho

Entrega no horário (inclusive com o app fechado e depois de reiniciar o aparelho), o pedido de permissão do iOS e do Android 13+, o canal e o som no Android, a tela de bloqueio, o "Reduzir notificações"/Não perturbe, economia de bateria de fabricantes Android e o limite de 64 do iOS na prática.
