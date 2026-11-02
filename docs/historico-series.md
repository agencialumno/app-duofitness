# Histórico de séries

Cada geração de série (A, B e C geradas juntas) vira um **registro** em `@duo_series_v2`. A mais recente é a **série atual** (em destaque em Meus Treinos); as anteriores ficam em "Séries anteriores", recolhidas. Tudo só no aparelho, por conta (a chave é `@duo_*`, então entra no snapshot `@duoacct:<uid>:snapshot` e na exclusão de conta).

## Formato

`{ version: 1, migrated: true, items: [registro, ...] }` (do mais antigo para o mais novo).
Registro: `{ id, createdAt, goals|null, level|null, combo|null, source, workoutIds, weights: [{ date, kg }], migrated? }`.

- Os treinos continuam em `@duo_workouts` (formato intocado). O registro só referencia os ids.
- **Treinos concluídos e sequência de dias não são gravados**: são calculados na hora de exibir, a partir de `@duo_sessions` (cada sessão tem `workoutId`). Sequência = maior sequência de dias seguidos com treino daquela série.
- Só treinos com `serie` A, B ou C entram (os criados à mão não têm o campo `serie` e ficam em "Outros treinos").
- Limite de 50 registros: a 51ª geração remove a mais antiga, com os treinos dela, e avisa.

## Migração (idempotente)

Na primeira leitura sem `@duo_series_v2`, os treinos A/B/C existentes são agrupados pela geração (prefixo do id `<timestamp>_<índice>`). Cada grupo vira um registro "migrado": objetivo, nível e combo = "desconhecido"; peso = "sem registro". Treinos concluídos e sequência são reais (das sessões). A marca `migrated` impede nova migração. Nunca altera `@duo_workouts` nem `@duo_sessions`; se a gravação do histórico falhar, os treinos ficam intactos.

## Peso

Só de maiores de 18 (idade desconhecida também não grava). Peso inicial no registro da geração; peso novo do perfil acrescenta um ponto à série atual. Variação só com 2 ou mais pontos. Menores de 18 nunca têm peso gravado nem exibido.

## Dia

Os cálculos novos usam `America/Sao_Paulo` (`src/utils/saoPauloDay.js`). `computeStreak` e a Saúde não mudaram e usam o dia do aparelho: só divergem quando o aparelho não está no fuso de São Paulo, perto da meia-noite (e porque o novo é por série).

## Excluir

Sempre com confirmação ("Tem certeza? Esta série e a linha do tempo dela serão apagadas. Seus treinos realizados continuam contando no perfil. Não dá para desfazer."). Apaga os treinos da série e o registro; `@duo_sessions` fica.
