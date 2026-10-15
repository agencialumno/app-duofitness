# Duo Fitness

App mobile das academias container da Duo Fitness: o morador monta e segue a própria série de treino (A, B e C), de acordo com o combo de equipamentos do condomínio (UNO, DUO, TRIPLE, PRIME, ELITE).

## Estado atual

- A IA online **não está em uso** (sem crédito na API). O app funciona 100% offline.
- O backend (`backend/`) está pronto e testado, **sem deploy**.
- Expo SDK 51 (React Native 0.74.5). Não subir de SDK sem pedido: a escada de upgrade (52 a 57) será feita em outra branch, um SDK por vez.

## Stack e identidade

- React Native + Expo, React Navigation, AsyncStorage. Local-first: tudo funciona offline.
- Cores `#fed205` (amarelo), `#000000`, `#ffffff`; fonte Roboto; tema escuro. Tokens em `src/utils/theme.js`.
- Bundle id: `com.duofitness.app` (Android e iOS).
- Builds: via GitHub Actions, com projetos nativos gerados por `expo prebuild`. As pastas `android/` e `ios/` ficam **fora do git** (estão no `.gitignore`). O build Android é o `.github/workflows/android.yml` (tag `v*` ou manual; guia em `docs/android.md`; **não renomear**, por causa do `run_number`); o `ci.yml` só valida o código. A assinatura e a versão são aplicadas pelo plugin `plugins/withAndroidRelease.js`, sem commitar nada em `android/`. Antes do cache e do `npm ci`, o `android.yml` valida os PNGs (`scripts/check-pngs.mjs`) e o keystore (alias, senha do keystore e da chave, sem imprimir senhas), para falhar em segundos. Build iOS ainda não existe. `eas.json`, `extra.eas` e `owner` do `app.json` ficam por enquanto como plano B.

## Estrutura do repositório

- App na raiz: `App.js`, `src/`, `assets/`, `app.json`, `package.json` e `package-lock.json` próprios.
- `backend/`: API na Vercel (Hono + Zod + SDK da Anthropic), projeto **separado**, com `package.json` e lockfile próprios. **Sem npm workspaces** e sem alterar o `package.json` da raiz. Root Directory = `backend` na Vercel. Documentação em `backend/README.md`.
- `src/screens/`, `src/context/AppContext.js` (estado e AsyncStorage), `src/data/` (combos, dados do demo).
- `src/utils/workoutGenerator.js`: catálogo `EXERCISE_DB`, gerador offline `generateWorkoutPlan`, `hydratePlan` (completa um plano por ids vindo da IA) e `HIGH_IMPACT_IDS`.
- `src/utils/imc.js`: IMC e recomendações (`avoidHighImpact` etc.).
- `plugins/` (config plugins do Expo), `scripts/` (utilitários do CI: `publish-apk.mjs`, `check-pngs.mjs`), `docs/` (guias, ex.: `android.md`).
- `src/services/api.js` e `src/utils/sse.js`: cliente da API (SSE por XMLHttpRequest, porque o `fetch` do RN no SDK 51 não faz streaming).

## Regras do projeto

- **Nenhum segredo no repositório.** Variáveis `EXPO_PUBLIC_*` vão dentro do app e qualquer pessoa consegue lê-las: a chave da Anthropic existe só no backend (variável de ambiente da Vercel).
- **O app funciona offline se a API falhar**, demorar ou não estiver configurada. Nenhuma tela pode depender da API para funcionar.
- **O Modo Demo (feira) nunca chama a API.** `DEMO_USER.isDemo === true` desliga qualquer chamada de rede.
- Mudanças pequenas e explicadas; não alterar telas e funcionalidades sem pedido.
- Textos do app em português do Brasil.
- **Imagens PNG** (`assets/` e as citadas no `app.json` ou importadas em `src/`) precisam ser PNG de verdade, 8 bits por canal e sem entrelaçamento; o `logo.png` já quebrou o AAPT2 por ser um JPEG com extensão `.png`. Confira com `node scripts/check-pngs.mjs` (roda também no `ci.yml`).

## Chat do Personal Trainer IA (`AIPersonalTrainerScreen`)

1. Offline (padrão e único modo em uso hoje): roteiro de perguntas no aparelho + `generateWorkoutPlan`.
2. Online (só se `EXPO_PUBLIC_API_URL` estiver definida e não for Modo Demo): o app pergunta combo, limitação e (se faltar) nível por chips; depois a conversa segue com a IA em streaming (`POST /api/ia/chat`). A IA entrega o plano pela ferramenta `criar_plano`, no formato por ids; o app completa com `hydratePlan`.
3. Qualquer falha online (rede, 10 s sem primeiro token, erro do servidor, plano inválido, `no_plan`) cai no roteiro offline, aproveitando o que já foi respondido.

## Variáveis de ambiente

**App** (`.env` na raiz, modelo em `.env.example`). Todas **opcionais**: vazias = app 100% offline.

| Variável | Para quê |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL do backend, sem barra no fim |
| `EXPO_PUBLIC_APP_KEY` | mesmo valor do `APP_KEY` do backend (não é segredo de verdade) |
| `EXPO_PUBLIC_API_FIRST_TOKEN_TIMEOUT_MS` | tempo até o primeiro token antes de cair no offline; padrão 10000 |

**Backend** (modelo em `backend/.env.example`; detalhes na tabela do `backend/README.md`). Obrigatórias para `/api/ia/chat`: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `MODEL_INPUT_USD_PER_MTOK`, `MODEL_OUTPUT_USD_PER_MTOK`, `APP_KEY`. Opcionais: `DAILY_SPEND_LIMIT_USD`, `RATE_LIMIT_PER_MIN`, `MAX_USER_TURNS`, `MAX_OUTPUT_TOKENS`, `ALLOWED_ORIGINS`, `MODEL_CACHE_WRITE_USD_PER_MTOK`, `MODEL_CACHE_READ_USD_PER_MTOK`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

## Comandos

- App: `npx expo start`; checagens: `npx expo-doctor`, `npx expo install --check` e `node scripts/check-pngs.mjs`.
- Backend (`cd backend`): `npm run dev`, `npm test`, `npm run typecheck`, `npm run check-catalog`.
- Mudou `workoutGenerator.js` ou `combosEquipment.js`? Rode `npm run sync-catalog` no `backend/` (o teste de paridade e o CI falham se esquecer).

## Roadmap

Backend no Vercel (fase 1 feita: health e chat IA; próximas: Auth e Postgres/Neon), vídeos dos exercícios, IA real em produção, HealthKit/Health Connect, Apple Watch, marketplace.
