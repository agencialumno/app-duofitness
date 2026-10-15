# Duo Fitness

App mobile das academias container da Duo Fitness: o morador monta e segue a própria série de treino (A, B e C), de acordo com o combo de equipamentos do condomínio (UNO, DUO, TRIPLE, PRIME, ELITE).

## Estado atual

- A IA online **não está em uso** (sem crédito na API). O app funciona 100% offline.
- O backend (`backend/`) está pronto e testado, **sem deploy**.
- Expo SDK 54 (React Native 0.81.5, React 19.1, nova arquitetura ligada, edge-to-edge obrigatório no Android). Node >= 20.19.4 (CI em Node 22), Gradle 8.14.x e JDK 17. Os saltos 55, 56 e 57 ficam para depois, um SDK por vez, sem pular. React Navigation segue na v6.

## Stack e identidade

- React Native + Expo, React Navigation, AsyncStorage. Local-first: tudo funciona offline.
- Cores `#fed205` (amarelo), `#000000`, `#ffffff`; fonte Roboto; tema escuro. Tokens em `src/utils/theme.js`.
- Bundle id: `com.duofitness.app` (Android e iOS).
- Builds: via GitHub Actions, com projetos nativos gerados por `expo prebuild`. As pastas `android/` e `ios/` ficam **fora do git** (estão no `.gitignore`). O build Android é o `.github/workflows/android.yml` (tag `v*` ou manual; guia em `docs/android.md`; **não renomear**, por causa do `run_number`); o `ci.yml` só valida o código. A assinatura e a versão são aplicadas pelo plugin `plugins/withAndroidRelease.js`, sem commitar nada em `android/`. Antes do cache e do `npm ci`, o `android.yml` valida os PNGs (`scripts/check-pngs.mjs`) e o keystore (alias, senha do keystore e da chave, sem imprimir senhas), para falhar em segundos. O build iOS é o `.github/workflows/ios.yml` (runner `macos-26` com Xcode 26, assinatura automática pela chave da API do App Store Connect, envio ao TestFlight; execução manual ou tag `ios-v*`; guia em `docs/testflight.md`; **não renomear**, por causa do `run_number`). Secrets da Apple: `APPLE_TEAM_ID`, `APPSTORE_ISSUER_ID`, `APPSTORE_KEY_ID` e `APPSTORE_PRIVATE_KEY`. O job `ios-prebuild` do `ci.yml` confere em Linux que o projeto iOS é gerado. `eas.json`, `extra.eas` e `owner` do `app.json` ficam por enquanto como plano B.

## Estrutura do repositório

- App na raiz: `App.js`, `src/`, `assets/`, `app.json`, `package.json` e `package-lock.json` próprios.
- `backend/`: API na Vercel (Hono + Zod + SDK da Anthropic), projeto **separado**, com `package.json` e lockfile próprios. **Sem npm workspaces** e sem alterar o `package.json` da raiz. Root Directory = `backend` na Vercel. Documentação em `backend/README.md`.
- `src/screens/`, `src/context/AppContext.js` (estado e AsyncStorage), `src/data/` (combos, dados do demo).
- `src/utils/workoutGenerator.js`: catálogo `EXERCISE_DB`, gerador offline `generateWorkoutPlan`, `hydratePlan` (completa um plano por ids vindo da IA) e `HIGH_IMPACT_IDS`.
- Loja (vitrine de parceiros, sem pagamento): `src/data/marketplace.js` (itens de exemplo e funções), `marketplaceConfig.js` (WhatsApp via `EXPO_PUBLIC_MARKETPLACE_WHATSAPP`, opcional), `marketplaceImages.js`, `src/screens/Store*Screen.js`; aba Início é uma pilha com `Loja` e `LojaDetalhe`. Guia em `docs/marketplace.md`.
- Academia agora (lotação, só números agregados): `src/utils/occupancy.js` (puro: faixas, MockProvider, RemoteProvider, melhor horário), `src/data/occupancyConfig.js`, `src/hooks/useOccupancy.js`, `OccupancyCard` e `GymNowScreen` (rota `AcademiaAgora` na pilha da aba Início). Hoje só dados de exemplo, sempre com o selo "Dados de exemplo". Contrato do endpoint futuro em `docs/catraca.md`.
- Série guiada (substitui o chat nos atalhos): `src/screens/GuidedPlanScreen.js`, `src/components/guided/`, `src/utils/guidedPlan.js` (lógica pura e testada), `src/utils/planOptions.js` (palavras-chave compartilhadas com o chat), `src/data/guidedConfig.js` (`AI_BADGE_ENABLED`, desligada). Guia em `docs/serie-guiada.md`.
- Saúde (Duo Score de hábitos, peso e água, não é aconselhamento médico): `src/utils/health.js` (puro, chave nova `@duo_health`), `healthProviders.js` (Manual em uso; HealthKit e Health Connect só stubs, flag `EXPO_PUBLIC_HEALTH_INTEGRATION=false`), `src/hooks/useHealth.js`, `src/screens/HealthScreen.js` (rota `Saude` na pilha da aba Início). Menores de 18: só hábitos, sem peso. Fórmula e integração futura em `docs/saude.md`.
- Modo Demo (feira): faixa "Modo Demo: dados de exemplo" na Home e cartão no Perfil, com "Reiniciar demo" (apaga as `@duo_*` e recarrega o exemplo com datas de hoje) e "Sair" (apaga todas as `@duo_*`, zera o estado e volta às boas-vindas, sem Alert). Lógica pura em `src/utils/demoSession.js`; navegação em `src/navigation/resetNavigation.js`; a raiz registra `Onboarding` e `Main` sempre. O link do demo nas boas-vindas só aparece sem perfil real salvo e `loadDemoData` recusa gravar sobre perfil real.
- `src/utils/imc.js`: IMC e recomendações (`avoidHighImpact` etc.).
- `plugins/` (config plugins do Expo), `scripts/` (utilitários do CI: `publish-apk.mjs`, `check-pngs.mjs`, `check-autolinking.mjs`, `check-appstore-key.mjs`, `ios-log-hints.mjs`, `check-ios-project.mjs`, `set-ios-version.sh`, `ios-upload.sh`), `docs/` (guias, ex.: `android.md`).
- `src/services/api.js` e `src/utils/sse.js`: cliente da API (SSE por XMLHttpRequest, porque o `fetch` do React Native não expõe o corpo da resposta em streaming).

## Regras do projeto

- **Nenhum segredo no repositório.** Variáveis `EXPO_PUBLIC_*` vão dentro do app e qualquer pessoa consegue lê-las: a chave da Anthropic existe só no backend (variável de ambiente da Vercel).
- **O app funciona offline se a API falhar**, demorar ou não estiver configurada. Nenhuma tela pode depender da API para funcionar.
- **O Modo Demo (feira) nunca chama a API.** `DEMO_USER.isDemo === true` desliga qualquer chamada de rede.
- Mudanças pequenas e explicadas; não alterar telas e funcionalidades sem pedido.
- Textos do app em português do Brasil.
- **Módulos nativos Expo no topo de `node_modules`.** O autolinking não vê módulos aninhados (no SDK 52 o `expo-file-system` aninhado fez os ícones sumirem). Mantenha `expo-file-system`, `expo-asset`, `expo-font` e `expo-keep-awake` como dependências diretas; `scripts/check-autolinking.mjs` confere (roda no `ci.yml` e no `android.yml`).
- **Imagens PNG** (`assets/` e as citadas no `app.json` ou importadas em `src/`) precisam ser PNG de verdade, 8 bits por canal e sem entrelaçamento; o `logo.png` já quebrou o AAPT2 por ser um JPEG com extensão `.png`. Confira com `node scripts/check-pngs.mjs` (roda também no `ci.yml`).

## Chat do Personal Trainer IA (`AIPersonalTrainerScreen`)

Os atalhos "Personal Trainer IA" (rota `AIPersonalTrainer`) abrem a **série guiada** (`GuidedPlanScreen`, sempre offline). O chat descrito abaixo continua na rota alternativa `AIPersonalTrainerChat` até a validação.

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
| `EXPO_PUBLIC_OCCUPANCY_REMOTE` | `true` liga a lotação real (precisa de `EXPO_PUBLIC_API_URL`); vazio = dados de exemplo. Nunca no Modo Demo |
| `EXPO_PUBLIC_MARKETPLACE_WHATSAPP` | número do WhatsApp da Loja (dígitos com DDI); vazio = botão avisa que falta configurar |
| `EXPO_PUBLIC_HEALTH_INTEGRATION` | `false` (padrão): integração com Apple Saúde / Health Connect desligada (só stubs) |

**Backend** (modelo em `backend/.env.example`; detalhes na tabela do `backend/README.md`). Obrigatórias para `/api/ia/chat`: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `MODEL_INPUT_USD_PER_MTOK`, `MODEL_OUTPUT_USD_PER_MTOK`, `APP_KEY`. Opcionais: `DAILY_SPEND_LIMIT_USD`, `RATE_LIMIT_PER_MIN`, `MAX_USER_TURNS`, `MAX_OUTPUT_TOKENS`, `ALLOWED_ORIGINS`, `MODEL_CACHE_WRITE_USD_PER_MTOK`, `MODEL_CACHE_READ_USD_PER_MTOK`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

## Comandos

- App: `npx expo start`; checagens: `npx expo-doctor`, `npx expo install --check` e `node scripts/check-pngs.mjs` e `node scripts/check-autolinking.mjs`.
- Backend (`cd backend`): `npm run dev`, `npm test`, `npm run typecheck`, `npm run check-catalog`.
- Mudou `workoutGenerator.js` ou `combosEquipment.js`? Rode `npm run sync-catalog` no `backend/` (o teste de paridade e o CI falham se esquecer).

## Roadmap

Backend no Vercel (fase 1 feita: health e chat IA; próximas: Auth e Postgres/Neon), vídeos dos exercícios, IA real em produção, HealthKit/Health Connect, Apple Watch, marketplace.
