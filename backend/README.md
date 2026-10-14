# Duo Fitness — backend

API do Duo Fitness, para rodar na Vercel. TypeScript, [Hono](https://hono.dev) em Vercel Functions, validação com Zod e SDK da Anthropic.

**Fase 1 (esta):** `GET /api/health` e `POST /api/ia/chat` (personal trainer IA em streaming). Sem banco e sem login. As pastas `src/auth/` e `src/db/` têm só as interfaces, prontas para Auth e Postgres (Neon).

O app continua 100% funcional offline: se esta API falhar ou demorar, o app cai no roteiro offline. O Modo Demo nunca chama a API.

## Estrutura

```
backend/
  src/index.ts           entrada da Vercel Function (export default do app Hono)
  src/app.ts             rotas e middlewares
  src/config.ts          leitura das variáveis de ambiente
  src/routes/iaChat.ts   POST /api/ia/chat (SSE)
  src/ia/
    catalog.ts           GERADO a partir do app (npm run sync-catalog)
    filters.ts           exercícios permitidos por combo, nível, limitação, faixa etária e IMC
    plan.ts              ferramenta criar_plano + validação com Zod
    prompt.ts            system prompt do personal trainer (pt-BR)
    request.ts           schema do corpo da requisição
  src/middleware/        CORS, x-app-key, rate limit, teto diário
  src/lib/store.ts       contadores: MemoryStore e UpstashStore
  src/auth/, src/db/     interfaces para a fase 2 (sem implementação)
  scripts/               sync-catalog, test.sh (curl)
  test/                  vitest
```

## Rodar local

Precisa de Node 22+.

```bash
cd backend
npm install
cp .env.example .env      # preencha as variáveis obrigatórias
npm run dev               # http://localhost:3000
```

Testar com curl (o chat gasta poucos tokens de verdade):

```bash
BASE_URL=http://localhost:3000 APP_KEY=<o mesmo APP_KEY do .env> ./scripts/test.sh
./scripts/test.sh health   # só a saúde, sem gastar nada
```

Checagens (rodam também no CI, `.github/workflows/backend.yml`):

```bash
npm run typecheck
npm run check-catalog     # falha se src/ia/catalog.ts estiver desatualizado em relação ao app
npm test
```

## Variáveis de ambiente

Veja o `.env.example`. Nada de segredo vai para o repositório.

| Variável | Obrigatória | Para quê |
|---|---|---|
| `ANTHROPIC_API_KEY` | sim | chave da API da Anthropic |
| `ANTHROPIC_MODEL` | sim | modelo do chat (id vigente na documentação da Anthropic) |
| `MODEL_INPUT_USD_PER_MTOK`, `MODEL_OUTPUT_USD_PER_MTOK` | sim | preços do modelo acima, USD por milhão de tokens. Base do teto diário. **Troque junto com `ANTHROPIC_MODEL`.** |
| `APP_KEY` | sim | valor esperado no header `x-app-key` |
| `DAILY_SPEND_LIMIT_USD` | não (5) | teto de gasto por dia (UTC) |
| `RATE_LIMIT_PER_MIN` | não (10) | requisições por minuto por IP |
| `MAX_USER_TURNS` | não (8) | a partir deste turno a IA é obrigada a entregar o plano |
| `MAX_OUTPUT_TOKENS` | não (3000) | teto de tokens por resposta |
| `ALLOWED_ORIGINS` | não (vazio) | origens de navegador aceitas (CORS), separadas por vírgula |
| `MODEL_CACHE_WRITE_USD_PER_MTOK`, `MODEL_CACHE_READ_USD_PER_MTOK` | não | preços de cache, se diferentes do padrão (1,25x e 0,1x da entrada) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | recomendado em produção | contadores compartilhados |

### Gerar o `APP_KEY`

Qualquer texto aleatório serve. Exemplos:

```bash
openssl rand -hex 16
# ou, sem openssl (Windows/PowerShell ou qualquer Node):
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Use o **mesmo valor** em dois lugares: `APP_KEY` no backend (`vercel env add APP_KEY production`) e `EXPO_PUBLIC_APP_KEY` no `.env` do app. Lembre: como vai dentro do app, não é segredo. Para trocar a chave (se vazar), gere outra, atualize os dois lados e publique uma nova versão do app.

### Onde achar o preço por token do modelo

`MODEL_INPUT_USD_PER_MTOK` e `MODEL_OUTPUT_USD_PER_MTOK` são o preço do modelo definido em `ANTHROPIC_MODEL`, em **dólares por milhão de tokens** (entrada e saída).

- Página de preços da Anthropic: <https://platform.claude.com/docs/en/about-claude/pricing> (confira o nome exato do seu modelo na tabela; a página muda com o tempo).
- Os ids de modelo vigentes ficam na documentação de modelos da Anthropic. Copie o id exatamente como está (sem acrescentar datas).
- Se o modelo tiver preço diferente para prompts longos ou para cache, o teto diário fica um pouco impreciso; defina `MODEL_CACHE_WRITE_USD_PER_MTOK` e `MODEL_CACHE_READ_USD_PER_MTOK` se quiser acertar o cache.
- Ao trocar `ANTHROPIC_MODEL`, troque os dois preços na mesma hora. Preço antigo com modelo novo faz o teto diário medir errado.
- Confira o gasto real no Console da Anthropic (uso e custo) e compare com `DAILY_SPEND_LIMIT_USD` nos primeiros dias.

Sem as variáveis obrigatórias, `/api/health` funciona e `/api/ia/chat` responde `500 server_misconfigured` (o nome das variáveis que faltam vai só para o log da function).

## Deploy na Vercel (passo a passo)

Eu não publico nada nem uso tokens: rode os comandos abaixo.

1. **Instale e entre na Vercel** (uma vez):
   ```bash
   npm i -g vercel
   vercel login
   ```
2. **Vincule o projeto**, a partir da pasta `backend/`:
   ```bash
   cd backend
   vercel link
   ```
   Crie um projeto novo (ex: `duo-fitness-api`). Se for conectar o repositório do GitHub ao projeto, em *Project Settings → General* defina **Root Directory = `backend`** (o backend tem `package.json` e lockfile próprios; a raiz do app não é alterada).
3. **Cadastre as variáveis** (cada comando pede o valor; repita para `production` e `preview`):
   ```bash
   vercel env add ANTHROPIC_API_KEY production
   vercel env add ANTHROPIC_MODEL production
   vercel env add MODEL_INPUT_USD_PER_MTOK production
   vercel env add MODEL_OUTPUT_USD_PER_MTOK production
   vercel env add APP_KEY production
   vercel env add DAILY_SPEND_LIMIT_USD production
   # recomendado: Upstash (crie um banco Redis grátis em upstash.com e copie a REST URL e o token)
   vercel env add UPSTASH_REDIS_REST_URL production
   vercel env add UPSTASH_REDIS_REST_TOKEN production
   ```
   Opcionais: `RATE_LIMIT_PER_MIN`, `MAX_USER_TURNS`, `ALLOWED_ORIGINS`.
4. **Publique:**
   ```bash
   vercel deploy            # preview
   vercel deploy --prod     # produção
   ```
   O comando imprime a URL (ex: `https://duo-fitness-api.vercel.app`).
5. **Teste:**
   ```bash
   BASE_URL=https://duo-fitness-api.vercel.app APP_KEY=<o APP_KEY> ./scripts/test.sh
   ```
6. **Aponte o app** para a API: no `.env` da raiz do app, `EXPO_PUBLIC_API_URL=https://duo-fitness-api.vercel.app` e `EXPO_PUBLIC_APP_KEY=<o APP_KEY>`.

Avisos:
- Deploys de *preview* ficam atrás da *Vercel Authentication* por padrão e o app não consegue chamá-los. Use a URL de produção, ou desative a proteção do projeto para testes.
- Em produção sem Upstash, o log da function mostra um aviso: rate limit e teto diário passam a valer só por instância (funções serverless não compartilham memória), então protegem apenas em parte.
- `maxDuration` da function está em 60 s (`vercel.json`).

## Validar o stream em aparelho real

Os testes automáticos usam um XMLHttpRequest falso. O que só um celular de verdade confirma é se o texto chega **aos poucos** (e não de uma vez no fim). Faça isto em um iPhone e em um Android, de preferência com build de desenvolvimento ou Expo Go.

1. **Antes do celular, confira o servidor.** Com `curl -N` (o `-N` desliga o buffer) em `scripts/test.sh`, o texto deve aparecer em pedaços durante a resposta, não todo de uma vez. Se aparecer tudo junto no fim, o problema é do servidor ou do proxy, não do app.
2. **Aponte o app para a API publicada.** No `.env` da raiz: `EXPO_PUBLIC_API_URL=https://<seu-projeto>.vercel.app` e `EXPO_PUBLIC_APP_KEY=<APP_KEY>`. Reinicie com `npx expo start -c` (as variáveis `EXPO_PUBLIC_*` são lidas no build do bundle). Use `https`: iOS e Android recusam `http` por padrão. Para testar com o backend local (`npm run dev`), o celular precisa estar na mesma rede e a URL será `http://<IP-do-PC>:3000`, o que exige liberar tráfego sem TLS no app de desenvolvimento.
3. **Caminho feliz.** Abra o Personal Trainer IA, responda os chips (combo, limitação, nível) e converse. Confira: o texto da IA aparece **palavra por palavra**; só há uma pergunta por mensagem; no fim aparece o cartão de plano e "Salvar meu plano de treino" funciona; os treinos salvos abrem com instruções e dicas.
4. **Queda de rede.** Ligue o modo avião antes de responder o último chip: o app deve avisar e seguir com o roteiro offline, sem repetir o que já respondeu. Repita desligando o Wi-Fi no meio de uma resposta da IA.
5. **Lentidão.** Para simular, aponte `EXPO_PUBLIC_API_URL` para um endereço que não responde (ex: `https://10.255.255.1`) ou use um `EXPO_PUBLIC_API_FIRST_TOKEN_TIMEOUT_MS` baixo (ex: `1500`): depois do tempo, o app cai no roteiro offline.
6. **Sair da tela.** Volte no meio de uma resposta e abra o chat de novo: não deve haver texto de uma conversa antiga nem erro; no log da Vercel (`vercel logs <url>`) a requisição anterior não deve continuar gastando tokens.
7. **Modo Demo.** Entre pelo "Modo Demo (vendedor)" e abra o chat: tudo é offline e **nenhuma** requisição aparece no log da Vercel.
8. **Limites.** Mande mais requisições que `RATE_LIMIT_PER_MIN` em um minuto, ou use `DAILY_SPEND_LIMIT_USD=0.01` por um instante: o app deve cair no roteiro offline, sem tela de erro.

Se o texto chegar todo de uma vez só no celular (e o `curl -N` estiver em pedaços), anote a plataforma e o modelo do aparelho: é o `onprogress` do XMLHttpRequest daquela plataforma e o cliente em `src/services/api.js` precisa de ajuste.

## Protocolo de `POST /api/ia/chat`

Headers: `content-type: application/json` e `x-app-key`.

```json
{
  "messages": [{ "role": "user", "content": "Oi!" }],
  "profile": {
    "combo": "duo",
    "limitation": "none",
    "level": "beginner",
    "weight": 78, "height": 175,
    "goals": ["gain_muscle"],
    "gender": "male", "ageGroup": "26-35"
  }
}
```

- `messages`: 1 a 20 mensagens, até 1000 caracteres cada; começa e termina com `user`. `profile.combo` é obrigatório (`uno|duo|triple|prime|elite`); o resto é opcional.
- Corpo máximo: 32 KB.
- Erros antes do stream, em JSON: `400 invalid_request`, `401 unauthorized`, `403 origin_not_allowed`, `413 body_too_large`, `429 rate_limited` / `daily_cap_reached`, `500 server_misconfigured`, `503 store_unavailable`.
- Resposta `200` em `text/event-stream` (`Cache-Control: no-cache, no-transform`), com estes eventos:

| evento | dados | quando |
|---|---|---|
| `delta` | `{ "text": "..." }` | pedaço de texto da IA |
| `plan` | `{ "plan": { "series": [...] }, "collected": {...} }` | plano já validado (ids permitidos, limites, ≥5 exercícios por série) |
| `done` | `{}` | fim normal |
| `error` | `{ "code", "message", "fallback"? }` | falha. `code`: `plan_invalid`, `no_plan`, `refusal`, `max_tokens`, `upstream_busy`, `upstream_error`. Em `plan_invalid`, `fallback` traz o que a IA coletou (peso, altura, objetivos, dias, tempo) |

Linhas que começam com `:` são comentários (keep-alive) e devem ser ignoradas.

O plano vem por **tool use** (ferramenta `criar_plano`), nunca como JSON dentro do texto. O formato é por ids: `{ serie, name, focus, exercises: [{ id, sets, reps, rest }] }`. O app preenche instruções, dicas etc. com `hydratePlan` (em `src/utils/workoutGenerator.js`).

## Regras de segurança do plano

- Só vão para o modelo os exercícios permitidos para aquele usuário: equipamentos do combo, nível, limitação física e faixa etária (menor de 18, 46+ e IMC de obesidade tiram polichinelo, burpee e corrida estacionária). A lista (`HIGH_IMPACT_IDS`) fica em um só lugar, `src/utils/workoutGenerator.js` no app, e chega aqui pelo `catalog.ts`; o gerador offline do app aplica a mesma regra.
- O servidor valida de novo o que o modelo devolve: id fora do subconjunto, `sets` fora de 1–6, `rest` fora de 0–180, `reps` longa ou id repetido são descartados. Série com menos de 5 exercícios depois disso invalida o plano, e o app gera o plano localmente com `generateWorkoutPlan`.
- O servidor **não usa `tool_choice` forçado** (os modelos novos recusam com 400). Quando a conversa passa de `MAX_USER_TURNS`, uma instrução extra pede o plano; se mesmo assim ele não vier, o servidor emite `error` com `code: "no_plan"`.

## Atualizar o catálogo de exercícios

`src/ia/catalog.ts` é gerado a partir do app. Quando mudar `src/utils/workoutGenerator.js` ou `src/data/combosEquipment.js`:

```bash
npm run sync-catalog
```

O teste de paridade e o CI (`npm run check-catalog`) falham se esquecer.

## Limites conhecidos

- `x-app-key` vai dentro do app: não é segredo, só reduz abuso casual.
- Sem Upstash, os limites são por instância.
- O teto diário é uma estimativa feita a partir do `usage` devolvido pela Anthropic e dos preços das variáveis; uma requisição cancelada no meio do stream pode não ser contabilizada.
