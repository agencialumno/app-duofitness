# Duo Fitness

App mobile das academias container da Duo Fitness: o morador monta e segue a própria série de treino (A, B e C), de acordo com o combo de equipamentos do condomínio (UNO, DUO, TRIPLE, PRIME, ELITE).

## Stack e identidade

- React Native + Expo, React Navigation, AsyncStorage. Local-first: tudo funciona offline.
- Cores `#fed205` (amarelo), `#000000`, `#ffffff`; fonte Roboto; tema escuro. Tokens em `src/utils/theme.js`.
- Bundle id: `com.duofitness.app` (Android e iOS).
- Meta de build: sem Expo Go e sem EAS Build no fluxo final. Builds via GitHub Actions, com projetos nativos gerados por `expo prebuild`; as pastas `android/` e `ios/` não entram no git. (Ainda não implementado nesta branch.)
- Atenção: o `package.json` declara `expo ^57` junto com `react-native 0.74.5` e libs de SDK 51. Está desalinhado; rode `npx expo-doctor` e `npx expo install --check` antes de mexer em dependências.

## Regras do projeto

- **Nunca** colocar segredos no repositório. Variáveis `EXPO_PUBLIC_*` vão dentro do app e qualquer pessoa consegue lê-las: a chave da Anthropic existe só no backend.
- **O app funciona 100% offline.** Se a API falhar, demorar ou não estiver configurada, o app cai no roteiro offline. Nunca deixe uma tela depender da API para funcionar.
- **Modo Demo (feira) é 100% offline.** `DEMO_USER.isDemo === true` desliga qualquer chamada de rede.
- Mudanças pequenas e explicadas; não alterar telas e funcionalidades sem pedido.
- Textos do app em português do Brasil.

## Estrutura

- `src/screens/`, `src/context/AppContext.js` (estado e AsyncStorage), `src/data/` (combos, dados do demo).
- `src/utils/workoutGenerator.js`: catálogo `EXERCISE_DB`, gerador offline `generateWorkoutPlan` e `hydratePlan` (completa um plano por ids vindo da IA).
- `src/utils/imc.js`: IMC e recomendações (`avoidHighImpact` etc.).
- `src/services/api.js` e `src/utils/sse.js`: cliente da API (SSE por XMLHttpRequest, porque o `fetch` do RN no SDK 51 não faz streaming).
- `backend/`: API na Vercel (Hono + Zod + SDK da Anthropic). Projeto separado, com `package.json` e lockfile próprios, sem workspaces. Documentação em `backend/README.md`.

## Chat do Personal Trainer IA (`AIPersonalTrainerScreen`)

1. Offline (padrão): roteiro de perguntas no aparelho + `generateWorkoutPlan`.
2. Online (só se `EXPO_PUBLIC_API_URL` estiver definida e não for Modo Demo): o app pergunta combo, limitação e (se faltar) nível por chips; depois a conversa segue com a IA em streaming (`POST /api/ia/chat`). A IA entrega o plano pela ferramenta `criar_plano`, no formato por ids; o app completa com `hydratePlan`.
3. Qualquer falha online (rede, 10 s sem primeiro token, erro do servidor, plano inválido, `no_plan`) cai no roteiro offline, aproveitando o que já foi respondido.

## Variáveis de ambiente

App (arquivo `.env` na raiz, modelo em `.env.example`):

| Variável | Para quê |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL do backend, sem barra no fim. Vazio = app 100% offline |
| `EXPO_PUBLIC_APP_KEY` | mesmo valor do `APP_KEY` do backend (não é segredo de verdade) |
| `EXPO_PUBLIC_API_FIRST_TOKEN_TIMEOUT_MS` | opcional, padrão 10000 |

Backend: ver `backend/.env.example` e a tabela no `backend/README.md` (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, preços por token, `APP_KEY`, teto diário, Upstash...).

## Comandos

- App: `npx expo start`.
- Backend (`cd backend`): `npm run dev`, `npm test`, `npm run typecheck`, `npm run check-catalog`.
- Mudou `workoutGenerator.js` ou `combosEquipment.js`? Rode `npm run sync-catalog` no `backend/` (o teste de paridade e o CI falham se esquecer).

## Roadmap

Backend no Vercel (fase 1 feita: health e chat IA; próximas: Auth e Postgres/Neon), vídeos dos exercícios, IA real em produção, HealthKit/Health Connect, Apple Watch, marketplace.
