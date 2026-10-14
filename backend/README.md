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

- Só vão para o modelo os exercícios permitidos para aquele usuário: equipamentos do combo, nível, limitação física e faixa etária (menor de 18, 46+ e IMC de obesidade tiram polichinelo, burpee e corrida estacionária).
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
