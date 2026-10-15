# Lotação ("Academia agora") e integração futura com a catraca

Hoje o app mostra **dados de exemplo** (`MockProvider`), sempre com o selo "Dados de exemplo". Este documento descreve
o contrato do endpoint para a integração real (catraca, sensor de contagem ou outro sistema de acesso).

## Como o app escolhe a fonte

`selectProvider` (`src/utils/occupancy.js`) usa o provedor **remoto** só se:

1. `EXPO_PUBLIC_API_URL` estiver definida, **e**
2. `EXPO_PUBLIC_OCCUPANCY_REMOTE` for `true` ou `1`, **e**
3. o usuário **não** estiver no Modo Demo (o demo nunca chama a rede).

Caso contrário usa o Mock. Se o remoto falhar (rede, timeout de 4 s, HTTP diferente de 200, JSON inválido), a tela mostra
**"Sem dados no momento"**: o app **nunca** troca por números de exemplo quando a flag remota está ligada, para não passar
dado inventado por real. O `gymId` padrão é `demo` (ainda não existe catálogo de condomínios).

## Contrato

### `GET {EXPO_PUBLIC_API_URL}/occupancy/{gymId}`

Resposta `200 application/json`:

```json
{ "count": 7, "capacity": 20, "updatedAt": "2026-06-10T18:32:00Z" }
```

| Campo | Tipo | Regra |
|---|---|---|
| `count` | inteiro >= 0 | pessoas na academia agora (agregado) |
| `capacity` | inteiro > 0 | capacidade da academia |
| `updatedAt` | ISO 8601 (UTC) | quando a contagem foi calculada |

O app ignora qualquer outro campo. Resposta fora desse formato é tratada como "sem dados".

### `GET {EXPO_PUBLIC_API_URL}/occupancy/{gymId}/forecast` (opcional)

Usado só para a dica de "melhor horário". Sem ele, o app mostra "Sem previsão no momento".

```json
{ "capacity": 20, "hours": [{ "hour": 6, "count": 5 }, { "hour": 7, "count": 9 }] }
```

`hour` é a hora local do condomínio (0 a 23) e `count` é a média esperada de pessoas.

## Autenticação: a chave fica no servidor, não no app

Tudo que tem prefixo `EXPO_PUBLIC_` vai dentro do app e qualquer pessoa consegue ler. Por isso o app **não envia chave**
nesse endpoint e **nenhum segredo da catraca pode ir para o app**. A integração deve ser assim:

- A catraca/sensor envia os eventos de entrada e saída **para o backend**, autenticada por uma chave guardada só no servidor
  (variável de ambiente da Vercel), nunca para o app.
- O backend calcula `count` e responde o endpoint acima, que é **público e de leitura**, com limite de requisições
  por IP (`RATE_LIMIT_PER_MIN`) e CORS restrito (`ALLOWED_ORIGINS`).
- Sem expor identificadores de equipamento, de morador ou de unidade.

## Atualização e falhas

- O app lê ao abrir a tela e a cada **60 s** enquanto ela está em foco (`OCCUPANCY_CONFIG.refreshMs`). Não consulta em segundo plano.
- Servidor: recomenda-se `Cache-Control: max-age=30` e atualizar a contagem a cada 30 a 60 s.
- Falha do sensor: devolva `200` com o último `updatedAt` verdadeiro (a tela mostra "Atualizado há X min" e o morador percebe
  que está defasado) ou `503`, que vira "Sem dados no momento". **Nunca** devolva `count` inventado.
- Contagem negativa ou capacidade zero são descartadas pelo app.

## Privacidade

- **Só contagem agregada.** Nenhum nome, foto, identificador, horário individual de entrada ou histórico por pessoa trafega para o app.
- Não registre no backend quem entrou, só o total (e, se quiser, médias por hora para a previsão).
- Se for preciso tratar dados pessoais no futuro (ex.: reserva de horário), isso exige autenticação e base legal próprias
  (LGPD), fora do escopo deste endpoint.

## Teste

`cd backend && npm test` (`test/occupancy.test.ts`): faixas, determinismo do Mock, fallback do Remote, timeout e melhor horário.
