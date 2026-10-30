# Saúde e Duo Score

Área "Saúde" do app: **Duo Score**, relatório semanal, registro de peso e contador de água. Tudo fica **no aparelho**
(`@duo_health`), funciona offline e **não é aconselhamento médico**.

> Aviso fixo na tela: "O Duo Score mede hábitos. Não é uma avaliação médica."

## Dados (`@duo_health`)

Chave nova no AsyncStorage. As chaves `@duo_*` existentes não mudam. "Resetar todos os dados" (Perfil) remove também
esta chave.

```json
{
  "version": 1,
  "weights": [{ "date": "2026-06-10", "kg": 78.5 }],
  "water": { "2026-06-10": 6 },
  "waterGoal": 8
}
```

- Datas no dia **local** (`AAAA-MM-DD`). Um registro de peso por dia (gravar de novo no mesmo dia substitui).
- Peso: aceita vírgula ou ponto (`78,5`, `78.5`, `78 kg`), de 30 a 300 kg.
- Água: de 0 a 30 copos por dia; meta padrão 8, editável de 1 a 20.
- Lógica pura e testada em `src/utils/health.js` (`backend/test/health.test.ts`). O hook `src/hooks/useHealth.js` só lê e grava.

## Fórmula do Duo Score (0 a 100)

Média ponderada **só dos componentes que têm dados**:

```
score = Σ(peso × nota) / Σ(pesos dos componentes presentes)
```

| Componente | Peso | Nota (0 a 100) | Fica de fora (sem dados) quando |
|---|---|---|---|
| Consistência de treinos | 50 | dias distintos com treino concluído nos últimos 7 ÷ 3, no máximo 100 | nunca concluiu um treino |
| Sequência | 20 | dias seguidos com treino (contando de hoje ou de ontem) ÷ 7, no máximo 100 | nunca concluiu um treino |
| Hidratação | 15 | média de min(copos ÷ meta, 1) nos dias desde o primeiro registro dos últimos 7; dia em branco depois disso conta 0 | nenhum copo registrado nos últimos 7 dias |
| Tendência de peso | 15 | ver abaixo | menos de 2 registros em 30 dias, ou menos de 7 dias entre o primeiro e o último; **sempre** fora para menores de 18 |

**Componente ausente não é zero.** Se só houver treinos, o score considera só treinos e sequência (pesos 50 e 20).
A tela diz o que falta ("Falta registrar seus copos de água") e mostra "Por que este número?" com a nota, a fatia (%)
e os pontos de cada componente. Sem nenhum dado o score é "—" (sem dados ainda).

Se o morador treinou antes, mas nada nos últimos 7 dias, a consistência é **0 e conta** (é um dado, não uma ausência).

### Tendência de peso

Variação por semana (kg/semana) entre o primeiro e o último registro dos últimos 30 dias, lida conforme o objetivo:

| Objetivo | 100 | 70 | 60 | 40 |
|---|---|---|---|---|
| Baixar peso | queda de 0,25 a 1 kg/sem | quase estável (até +0,25) | queda acima de 1 kg/sem (variação grande) | subindo |
| Ganhar massa | subida de 0,1 a 0,5 kg/sem | subindo mais rápido, ou quase estável | n/a | descendo |
| Condicionamento, saúde ou sem objetivo | variação até 0,25 kg/sem | até 0,5 kg/sem | n/a | acima de 0,5 kg/sem |

Queda muito rápida **não** recebe nota máxima, de propósito. Nenhuma tela sugere meta de peso, dieta ou déficit.

### Faixas

0 a 39 "Dá para melhorar", 40 a 59 "Regular", 60 a 79 "Bom", 80 a 100 "Ótimo".

## Relatório semanal

Três categorias com nota (ou "Sem dados"): **Consistência**, **Hidratação** e **Progresso** (média de sequência e
tendência de peso, no que existir). Mais 2 ou 3 recomendações por regras (treinar o que falta para a meta, registrar
água, garrafa por perto, registrar o peso 1 vez por semana, elogio à sequência). Um teste varre todos os textos
em busca de termos proibidos (dieta, déficit, caloria, dose, emagrecimento etc.).

## Menores de 18 anos (`ageGroup: "under18"`)

Só hábitos: sem componente de peso, sem registro nem gráfico de peso, sem meta de peso, sem recomendações de
emagrecimento. O peso que existir no perfil não entra no score.

## Modo Demo

Sem nada gravado, a tela mostra um histórico de **exemplo** (5 semanas de peso e 7 dias de água), sempre com o selo
"Dados de exemplo" na tela e no cartão da Home. O que o vendedor registrar na demo também é de exemplo.

## Integração com Apple Saúde e Health Connect (futuro)

Hoje existe só a **estrutura**, desligada por `EXPO_PUBLIC_HEALTH_INTEGRATION=false` (padrão):

- `src/utils/healthProviders.js`: interface `HealthProvider` (`isAvailable`, `getSteps`, `getSleep`, `getHeartRate`
  por intervalo `{ from, to }`, todos devolvendo `null` sem dados e nunca lançando), `ManualProvider` (em uso),
  `HealthKitProvider` e `HealthConnectProvider` (**stubs**: indisponíveis, sem dados). Mesmo com a flag ligada, os stubs
  não leem nada; no Modo Demo a integração nunca é usada.
- O cartão "Conectar Apple Saúde / Health Connect: em breve" é desabilitado.

### O que será necessário para ativar

**iOS (HealthKit)**
1. Biblioteca de HealthKit com módulo nativo (exige dev build/`expo prebuild`; não está no app hoje).
2. Capability **HealthKit** no projeto iOS (plugin do Expo, já que `ios/` é gerado) e o entitlement correspondente.
3. Textos de uso no `app.json` (`ios.infoPlist`): `NSHealthShareUsageDescription` (leitura) e, se for gravar,
   `NSHealthUpdateUsageDescription`, em português e dizendo exatamente quais dados e para quê.
4. Tela de **consentimento** no app antes de pedir a permissão, com opção de revogar.
5. Ficha de privacidade do App Store Connect (tipos de dado de saúde) e política de privacidade publicada.

**Android (Health Connect)**
1. Biblioteca do Health Connect (módulo nativo) e plugin do Expo para o manifesto.
2. Permissões `android.permission.health.READ_STEPS`, `READ_SLEEP`, `READ_HEART_RATE` (só as usadas) e a atividade que
   mostra a política de privacidade.
3. Declaração de uso de dados de saúde na Play Console (formulário de Health Connect e de segurança de dados).
4. Consentimento no app e política de privacidade publicada.

**Em qualquer plataforma**
- Dados lidos continuam no aparelho; qualquer envio a servidor exige consentimento próprio, base legal (LGPD) e revisão.
- Menores de 18 anos: não ligar integração de peso nem metas.
- Não usar dados de saúde para publicidade nem compartilhar com o marketplace ou parceiros.

## Testes

`cd backend && npm test` (`test/health.test.ts`): histórico, vírgula decimal, fórmula (componentes ausentes, limites
0 a 100, under18), relatório, termos proibidos, provedores e reset.


## Saúde por categorias (expansão)

A área Saúde ganhou categorias (composição corporal, atividade, sono, coração e recuperação, hidratação) sobre um modelo de dados
novo. O Duo Score "antigo" (`health.js`, `@duo_health`) **continua como está**; a tela usa o **Duo Score V2**, em arquivo novo.

### Modelo de dados (`src/utils/healthModel.js`)

Amostra: `{ metric, value, unit, date, tz, source, at? }`.

| Categoria | Métricas (unidade) | Como junta as amostras do mesmo dia |
|---|---|---|
| Composição corporal | peso (kg), % de gordura (%), massa magra (kg) | última do dia |
| Atividade | passos, distância (km), minutos de exercício (min) | soma |
| Sono | duração (min), hora de dormir, hora de acordar (min do dia) | soma / média do relógio (a hora de dormir atravessa a meia-noite: 23:30 e 00:30 dão 00:00) |
| Coração e recuperação | FC em repouso (bpm), variabilidade (ms) | média |
| Hidratação | água (copos) | soma |

- **Origem** (`source`): `manual`, `apple_saude`, `health_connect` ou `exemplo`. Se há mais de uma no mesmo dia, vale a de maior prioridade
  (aparelho, depois manual, depois exemplo), para nunca contar duas vezes.
- **Fuso** (`tz`): IANA do aparelho; `date` é o dia **local**. **Unidade** sempre a da métrica; valor fora da faixa válida é rejeitado.
- **Agregação**: por dia (um valor por dia com dado) e por semana (segunda a domingo: média dos dias que têm dado, total e nº de dias).
- **Dado ausente é ausente, nunca zero**: dia sem amostra não aparece, não entra em média e não vira 0. Zero só existe se foi registrado.
- **Tendência** (7 e 30 dias): média da metade mais antiga dos dias com dado contra a da metade mais nova; precisa de 2 dias com dado e
  3 dias entre o primeiro e o último; dentro da tolerância da métrica é "estável".

### Armazenamento e migração (`src/utils/healthStore.js`)

Chaves **novas**; `@duo_health` não muda de nome, não é alterado e não é apagado:

| Chave | Conteúdo |
|---|---|
| `@duo_health_v2` | `{ version: 2, samples: [...], waterGoal, migratedFromV1, clearedAt? }` |
| `@duo_health_connect` | consentimento por categoria e provedor (hoje nunca gravada: a conexão está desligada) |

Migração (uma vez, ao abrir a Saúde): sem `@duo_health_v2`, mas com `@duo_health`, o peso e a água do v1 viram amostras `manual` e o v2 é gravado;
o v1 fica intacto. Valor corrompido em qualquer chave vale "ausente", sem derrubar o app e sem apagar nada.
"Resetar tudo" e "Sair do demo" apagam tudo por prefixo `@duo_`. "Excluir conta" limpa as chaves **novas** (o v2 vira um marcador vazio
para o `@duo_health` antigo não ser migrado de novo e trazer os dados de volta).

### Notas por categoria (Duo Score V2, `src/utils/healthScores.js`)

Cada nota vai de 0 a 100. Janela de 7 dias (30 na composição). **Categoria sem dados não entra na conta e não penaliza**; a tela diz o que falta.

| Nota | Peso | Fórmula | Fica de fora quando |
|---|---|---|---|
| Consistência de treinos | 30 | igual ao Duo Score atual (dias com treino nos últimos 7 ÷ 3, máx. 100) | nunca concluiu um treino |
| Sequência | 10 | igual ao atual (dias seguidos ÷ 7, máx. 100) | nunca concluiu um treino |
| Atividade | 15 | média das partes disponíveis: **passos** = média/dia dos dias com dado ÷ 7.000; **exercício** = média/dia dos dias com dado × 7 ÷ 150 min (cada uma, máx. 100) | menos de 3 dias com passos **e** com minutos |
| Sono | 20 | 70% **duração** + 30% **regularidade** (ou 100% duração sem hora de dormir). Duração por noite: 100 entre 7 e 9 h (menores de 18: 8 a 10 h); abaixo cai em linha até 0 em 4 h (menores: 5 h); acima cai até 70 em 11 h (menores: 12 h). Regularidade: desvio-padrão da hora de dormir ≤ 30 min = 100, ≥ 120 min = 40 | menos de 3 noites com duração |
| Hidratação | 15 | média de min(copos ÷ meta, 1) **dos dias com registro** (um 0 registrado conta 0; dia sem registro não conta) | nenhum registro nos últimos 7 dias |
| Composição corporal | 10 | 50% **acompanhamento** (dias com peso em 30 ÷ 4, máx. 100) + 50% **estabilidade** (variação por semana entre o primeiro e o último registro: até 0,5 kg = 100; até 1 kg = 80; acima = 60) | menos de 2 registros com 7 dias ou mais entre eles; **sempre** fora para menores de 18 |

```
score = Σ(peso × nota) / Σ(pesos dos componentes presentes)
```

Diferenças deliberadas em relação ao Duo Score atual: a hidratação não conta como 0 o dia sem registro (ausente não é zero); e a composição
**não** tem direção de objetivo, meta de peso nem de gordura (mede o hábito de acompanhar e a estabilidade, igual para quem sobe ou desce).
% de gordura e massa magra aparecem nos cartões, mas **não entram na nota**. Coração e recuperação não tem nota: só valores e tendências.
"Por que este número" continua mostrando nota, peso (%) e pontos de cada componente presente.

### Sugestões de hábitos (`src/utils/healthCoach.js`, regras, não IA)

Até **3 sugestões** por vez (uma por categoria, da mais necessária à menos), cada uma com o **motivo** (com o número da pessoa, por exemplo
"Você dormiu em média 5h40 nos últimos 7 dias") e uma **ação pequena e concreta**. Textos em `src/data/healthCoachTexts.js`.

| Regra | Dispara quando | Ação (resumo) |
|---|---|---|
| Sono curto | média de 7 dias abaixo de 7 h (menores de 18: 8 h), com 3 noites ou mais | apagar a luz 15 min mais cedo (menores: celular longe da cama) |
| Horário de dormir irregular | desvio-padrão de 60 min ou mais | fixar um horário por 3 noites |
| Hidratação baixa | nota de hidratação abaixo de 70 | garrafa por perto e um copo ao acordar |
| Passos baixos | média abaixo de 6.000, 3 dias ou mais | caminhada de 10 min |
| Exercício baixo | ritmo semanal estimado abaixo de 100 min | 15 min hoje (uma série curta conta) |
| Treinos do app | menos de 3 dias de treino nos últimos 7 (e já treinou antes) | marcar um treino curto (com "ganhar massa": separar os dias de força) |
| Recuperação | FC em repouso 5 bpm ou mais acima da semana anterior (3 dias em cada) | treino mais leve e horário de dormir de sempre (sem alerta) |

Os **objetivos** do perfil (um ou mais) só mudam a **ordem** (ganhar massa puxa sono e treino; condicionamento e saúde puxam água e atividade;
"emagrecer" é tratado como hábitos gerais). O coach **nunca usa** peso, gordura nem composição, e nunca cita dieta, calorias, déficit,
metas de peso ou de gordura, prazos, suplementos, doses, diagnóstico ou alerta clínico; o tom é neutro e sem culpa. Sem dados suficientes
ele diz isso ("Ainda não há dados suficientes para sugerir algo..."). Tudo em dia: uma mensagem positiva. Menores de 18: só hábitos (sono na faixa de 8 a 10 h).
Um teste (`healthcoach.test.ts`) varre os textos e as sugestões geradas em centenas de cenários, objetivos e idades.

### Tela Saúde, detalhe e conexão

- **Saúde**: Resumo (Duo Score V2, notas por categoria, "o que falta" e "por que este número"), sugestões, e um cartão por categoria na ordem
  **Composição corporal, Atividade, Sono, Coração e recuperação, Hidratação**. Cada cartão: valor atual, tendência de 7 e 30 dias (texto neutro:
  "subindo", "estável", "caindo"), gráfico de 7 dias feito só com Views (dia sem dado = ponto pequeno, nunca barra zero; o leitor de tela recebe uma
  alternativa em texto com média, mínimo, máximo e dias sem registro), a origem do dado e, sem dados, o que falta e a ação certa (registrar, ou
  conectar quando a integração existir e estiver ligada).
- **Detalhe** (toque no cartão): explicação ("i"), valor atual e origem, tendências, histórico (com "remover" para o que é manual ou de exemplo) e o
  registro manual (peso, % de gordura, massa magra; passos, distância, minutos de exercício; duração do sono, hora de dormir e de acordar; FC em
  repouso e variabilidade; água por botões). O campo focado fica visível com o teclado aberto.
- **Não existem**: medidas por membro, gordura visceral, idade metabólica nem "idade biológica".
- **Menores de 18**: sem o cartão de composição, sem a conexão e com o aviso "Só hábitos".
- **Conectar dispositivos** (iOS: Apple Saúde; Android: Health Connect): explica o que será lido e para quê, as permissões (só leitura), que os dados
  ficam no aparelho, pede **consentimento explícito por categoria** (nada vem marcado) e oferece **desconectar e apagar o que foi importado**.
  Tudo **desligado** enquanto `EXPO_PUBLIC_HEALTH_INTEGRATION` não for `true`: aviso "Em breve", botão "Conectar" desabilitado, nenhuma permissão pedida.
  Os stubs nativos continuam desligados e **nenhum módulo nativo novo** foi adicionado.
- **Modo Demo**: dados de exemplo em **todas** as categorias, sempre rotulados "Dados de exemplo" (selo na tela e origem nos cartões). O que o vendedor
  registra no demo também é de exemplo.

### Privacidade dos dados de saúde

Aviso fixo na tela: **"O Duo Score mede hábitos. Não é uma avaliação médica."** e **"Seus dados de saúde ficam só neste aparelho."**

- Os dados de saúde **nunca** são usados no marketplace (nem para ordenar, segmentar ou mostrar itens), **nunca** são enviados ao backend nem à conta,
  e **nunca** são gravados em log. Testes (`healthui.test.ts`) conferem: os arquivos de saúde não usam `console`, `fetch`, `XMLHttpRequest`,
  `WebSocket` nem `Share`; marketplace, anunciar, API, SSE, lotação e conta não importam nada de saúde; o backend não conhece essas chaves.
- Chaves: `@duo_health_v2` e `@duo_health_connect` (novas); `@duo_health` não é alterado.
- **Resetar tudo** e **Sair do demo** apagam tudo por prefixo `@duo_`. **Excluir conta** limpa as chaves novas de saúde (o v2 vira um marcador vazio, a
  conexão some) e não toca nas outras. Sair da conta continua sem apagar dados locais.
- Integração futura: os dados lidos continuam no aparelho; qualquer envio exige consentimento próprio, base legal e revisão; nunca para publicidade
  nem para o marketplace.

### Layout da tela Saúde (branch `saude-ux`, só apresentação)

Nenhum dado, fórmula, regra do coach, armazenamento nem chave `@duo_*` mudou. Escalas fixas em `src/utils/theme.js` (`HEALTH_UI`): espaçamento em
múltiplos de 4, padding do cartão 16, entre cartões 12, entre seções 24, tipografia em 4 níveis (título da seção 18, valor 32, rótulo 15, apoio 13) mais
a legenda de 12, raio 16 e borda 1, alvo de toque mínimo de 44.

De cima para baixo:

1. **Duo Score** em destaque (barra de Views), nota e uma frase curta (`scorePhrase`, neutra); "i" do Duo Score.
2. **Ações rápidas**: "Registrar peso" (menor de 18: "Registrar sono"), "Água +1" (mostra "Hoje: N de M copos") e "Conectar" (em breve; menor não vê).
3. **Chips** horizontais (Composição, Atividade, Sono, Coração, Hidratação) que rolam até o cartão; sem animação com "Reduzir movimento".
4. **Sugestões**: no máximo 3, com a ação visível e o motivo recolhido ("Por quê?").
5. **Cartões por categoria COM dados**: um valor principal grande com a unidade, a variação de 7 dias (ícone e texto), uma mini-tendência e a origem em texto
   pequeno. O VoiceOver lê cada cartão como um item ("Sono, 6 horas e 24 minutos, abaixo da sua média de 7 dias, atualizado hoje. Origem: ...").
6. **"Sem dados ainda · N"**: as categorias sem dados ficam agrupadas e recolhidas; cada linha tem UMA ação ("Registrar").
7. **Relatório semanal** (recolhido): nota por categoria, "o que falta" e "Por que este número?".
8. **Avisos pequenos**: "O Duo Score mede hábitos. Não é uma avaliação médica." e a privacidade.

**Detalhe da categoria**: valor atual com variação e origem, seletor de período (7 ou 30 dias) com o gráfico, registros com data e origem, a ação
"Registrar hoje" (o formulário fica recolhido quando já há dados; "Registrar peso" abre direto) e a explicação ("i" no cabeçalho e texto no fim).
Fonte dinâmica até 150% em 320 e 390 de largura sem cortar nem sobrepor (os botões rápidos passam para uma coluna).


### Dados por conta e snapshots (só no aparelho)

O app só entra com conta e cada conta tem os próprios dados. **Nada disto vai a servidor**: ficam no AsyncStorage do aparelho.

- Ao **sair da conta**, o app salva um **snapshot** de todas as chaves `@duo_*` (treinos, XP, **saúde** (`@duo_health`, `@duo_health_v2`, `@duo_health_connect`), a **idade** (`@duo_age`) e a confirmação do responsável) em `@duoacct:<uid>:snapshot` (uid do Firebase), limpa as `@duo_*` ativas e zera o estado em memória. Sem Alert.
- Ao **entrar**, restaura o snapshot do uid e vai direto à Home, sem refazer a etapa de idade nem o onboarding. Sem snapshot: etapa de idade e onboarding. Dados de antes das contas (`@duo_onboarded` presente e sem dono) são adotados pela primeira conta que entrar, que ainda passa pela etapa de idade.
- Contas diferentes no mesmo celular não veem dados uma da outra (`@duo_owner` guarda de quem são as chaves ativas).
- Um snapshot corrompido é **ignorado** (nunca apagado). **Excluir a conta** apaga o snapshot do uid e as chaves ativas.
- A **idade** (`@duo_age`) nunca é enviada a servidor, ao marketplace nem a log. Menores de 18: só hábitos, sem peso nem meta de peso, e a conexão com Apple Saúde/Health Connect fica indisponível (`selectHealthProvider` devolve o manual para `under18`).


## Apple Saúde (HealthKit): biblioteca escolhida (branch `saude-healthkit`)

**Escolhida: `@kingstinct/react-native-healthkit` 16.2.0** (com `@react-native-healthkit/core` 16.2.0 e `react-native-nitro-modules` 0.35.10, todas com versão EXATA em `healthkit/native-deps.json`).

Por que, depois de ler o código dos pacotes (não só o README):
- **Compatível com a nossa pilha:** o `package.json` dela lista como devDependencies `react-native 0.81.5`, `react 19.1.0` e `react-native-nitro-modules ^0.35.0`, exatamente o Expo SDK 54. Usa Nitro Modules (JSI), que não depende da ponte antiga nem exige a nova arquitetura desligada; o podspec define `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES` e já traz o remédio do Swift 6.2/Xcode 26 (o `macos-26` do `ios.yml`).
- **Mantida:** última publicação em out/2026; API em TypeScript (estatísticas por dia, sono por categoria, treinos). O `react-native-health` (1.19.0) não recebe publicação desde out/2024, é da ponte antiga e não é a escolha para RN 0.81.
- **Plugin do Expo próprio nosso:** o plugin da biblioteca liga por padrão o *background delivery* e pede `NSHealthUpdateUsageDescription`; aqui isso é proibido (só leitura). Por isso o app usa o **seu próprio plugin** (`plugins/withHealthKitOptional.js`), que escreve só o entitlement do HealthKit e `NSHealthShareUsageDescription`.
- **Exige módulos extras:** o `react-native-nitro-modules` e o `@react-native-healthkit/core` (o podspec da biblioteca exige o core na MESMA versão). O core precisa estar como dependência direta na raiz, senão o autolinking não enxerga o pod dele.
- **Não está no `package.json` do repositório:** como o Firebase, `scripts/install-healthkit-deps.mjs` grava os três no `package.json` do workspace do CI só com `HEALTH_INTEGRATION_ENABLED=true`. Sem a flag o app e o iOS gerado ficam idênticos aos de antes. Em Android nada muda.
- **Risco que só o Mac resolve:** o app usa frameworks estáticos por causa do Firebase (`useFrameworks static`). Nitro + frameworks estáticos + React Native pré-compilado não foi compilado aqui. Se o `ios.yml` falhar com "non-modular header" ou erro de Swift/Nitro, o `ios-log-hints` classifica o erro; o primeiro remédio a testar é acrescentar `ReactNativeHealthkit`, `ReactNativeHealthkitCore` e `NitroModules` ao `forceStaticLinking` do plugin do Firebase.


### Apple Saúde (HealthKit): o que é lido, limites e como testar

**Só leitura.** O app nunca grava no HealthKit: a autorização é pedida com a lista de escrita (`toShare`) **sempre vazia** e só com `toRead`; não usa `save*` nem `deleteObjects` (um teste varre TODO o código e falha se qualquer tipo de escrita for solicitado em qualquer lugar). Sem registros clínicos (Clinical Health Records), sem background delivery. Tudo atrás de `HEALTH_INTEGRATION_ENABLED=true` (uma só variável: liga o plugin, instala os módulos, liga o JavaScript e exige o entitlement no `.ipa`); sem ela o app e o iOS gerado ficam idênticos aos de antes. Menores de 18 anos: `selectHealthProvider` devolve o provedor manual, a conexão fica indisponível e nada é lido. Android não muda.

**Tipos lidos (últimos 30 dias, dia LOCAL do aparelho):**

| HealthKit | Vira (healthModel) | Como |
|---|---|---|
| Passos | `steps` (Atividade) | soma por dia (estatística do próprio HealthKit: já junta iPhone e Watch sem contar em dobro) |
| Energia ativa | `active_energy` (Atividade, kcal) | soma por dia |
| Treinos (workouts) | `exercise_minutes` (Atividade) | soma das durações por dia |
| Frequência cardíaca | `heart_rate` (Coração) | média por dia |
| Frequência cardíaca em repouso | `resting_hr` | média por dia |
| Variabilidade (SDNN) | `hrv` | média por dia |
| VO₂ máx. | `vo2max` | último valor do dia |
| Sono (análise do sono) | `sleep_duration`, `bedtime`, `wake_time` (Sono) | fases dormidas (núcleo, profundo, REM, sem detalhe) somadas por noite; "na cama" ignorado quando há fases detalhadas; intervalos sobrepostos (iPhone + Watch) não contam em dobro; a noite é o dia local em que acaba; pausas de até 2 h continuam a mesma noite |
| Massa corporal | `weight` (Composição) | último valor do dia |
| Percentual de gordura | `body_fat` | último valor do dia (o HealthKit entrega fração; vira %) |
| Água | `water` (Hidratação) | mL por dia / 250 = copos |

Origem: **Apple Watch** quando o dado veio de um relógio, senão **Apple Saúde**. O nome do dispositivo/fonte só decide o rótulo e **nunca é guardado**. Os dados vão em `@duo_health_v2` (origens `apple_saude`/`apple_watch`) e a conexão em `@duo_health_connect`; ambos entram no snapshot da conta, ficam só no aparelho e são apagados ao excluir a conta. Nenhum valor de saúde vai a servidor, log, analytics ou marketplace.

**Regras que importam**
- **Deduplicação:** reler a janela substitui as amostras do HealthKit dela (não duplica). Peso/gordura/VO₂ do HealthKit no mesmo dia e com valor **próximo** (dentro da tolerância da métrica) do registro manual é descartado (é o mesmo registro); valor diferente entra e, na agregação do dia, o aparelho vence o manual. Em somas (passos, minutos, água) o aparelho vence o manual do mesmo dia: nunca soma duas vezes.
- **Falha isolada:** cada categoria é lida e gravada separadamente; falhar numa mantém o que já havia e atualiza as outras.
- **Duo Score:** os dados do HealthKit alimentam os mesmos componentes (atividade, sono, hidratação, composição); fórmulas e pesos não mudaram; categoria sem dados continua fora do cálculo, sem penalizar.
- **Quando sincroniza:** ao abrir a tela Saúde (no mínimo 30 s entre chamadas automáticas, uma de cada vez, sem bloquear a interface) e no puxar para atualizar; a tela mostra "Atualizado às HH:MM".

**Limite do HealthKit: a negação é invisível.** O iOS NÃO informa se a pessoa negou a leitura de um tipo: a consulta simplesmente volta vazia. Por isso o app **não trata vazio como "negado" nem como erro**: mostra "Sem dados ainda" e, na tela Conectar, "Se nada aparecer, confira em Ajustes › Saúde › Acesso a dados e dispositivos › Duo Fitness." Também por isso `getPermissions` nunca devolve "negado". Desconectar para de ler e apaga o que veio do HealthKit (o registro manual fica); a **revogação da permissão em si** só se faz em Ajustes › Saúde › Acesso a dados e dispositivos › Duo Fitness.

**Só dá para validar com um iPhone (e um Apple Watch pareado):** compilar com Nitro + frameworks estáticos, a folha de autorização, que a consulta devolve dados reais, o rótulo "Apple Watch", o sono por noite com as fases do Watch, o fuso/virada de dia reais, e o comportamento quando uma permissão é negada.

**Roteiro de teste (iPhone com Apple Watch pareado)**
1. No GitHub, crie a variável `HEALTH_INTEGRATION_ENABLED=true` e rode o `ios.yml` com `sign_archive=true` (`upload=true` para o TestFlight). Confira no resumo o entitlement do HealthKit.
2. Antes de abrir o app: no iPhone, o app Saúde deve ter dados (passos, sono do Watch, frequência cardíaca). Use o Watch por algumas horas e durma com ele uma noite.
3. Abra o Duo Fitness com uma conta **maior de 18 anos**. Perfil > Saúde > "Conectar" (ou Saúde > Conectar). Leia o que será lido; marque as categorias; toque em **Conectar ao Apple Saúde**. A folha do iOS lista os tipos de leitura (e **não** os de gravação). Permita tudo.
4. Volte à Saúde: devem aparecer passos, energia ativa, FC e FC em repouso, sono da noite (com "Origem: Apple Watch" quando vier do relógio). Confira "Atualizado às HH:MM".
5. Puxe a tela para atualizar: o horário muda e nada duplica.
6. Registre um peso à mão e, se o Apple Saúde tiver um peso do mesmo dia com valor próximo, confirme que aparece uma vez só.
7. Negação invisível: em Ajustes › Saúde › Acesso a dados e dispositivos › Duo Fitness, desligue "Passos" e puxe a Saúde: a categoria vira "Sem dados ainda" **sem erro**; a tela Conectar mostra onde conferir.
8. Desconectar (tela Conectar): os dados importados somem, o peso manual fica, "Atualizado às" some. Em Ajustes › Saúde, a permissão continua (o app avisa que a revogação é lá).
9. Crie uma conta de menor de 18 anos: a Saúde não mostra "Conectar" nem lê nada.
10. Saia da conta e entre com outra: ela não vê os dados do HealthKit da primeira; ao voltar à primeira, eles voltam (snapshot no aparelho).


**Por que o Info.plist tem `NSHealthUpdateUsageDescription` mesmo o app não gravando (erro 90683).** A validação do `altool` falhou com `Missing purpose string in Info.plist ... NSHealthUpdateUsageDescription ... (90683)`. A Apple exige a "purpose string" de uma API sempre que o **binário referencia essa API**, mesmo que o app nunca a use, e a biblioteca do HealthKit referencia as APIs de leitura **e de escrita**. Por isso, com `HEALTH_INTEGRATION_ENABLED=true`, o plugin `plugins/withHealthKitOptional.js` escreve as duas chaves:
- `NSHealthShareUsageDescription` (leitura): "O Duo Fitness lê seus dados de atividade, sono e batimentos do app Saúde para mostrar sua evolução. Os dados ficam no seu aparelho.";
- `NSHealthUpdateUsageDescription` (só para a Apple aceitar o .ipa): "O Duo Fitness não grava dados no app Saúde. Ele apenas lê os dados que você autorizar. Esta permissão não é usada."

**O app continua sem gravar:** a chave de escrita é só um texto; o app **não pede nenhuma permissão de escrita** (`toShare: []`), o iOS nunca mostra a folha de gravação e não há `save*` no código. Continuam proibidos o background delivery e os registros clínicos (o `check-ios-project` falha se aparecerem). O `check-ios-project` agora **exige** a chave de escrita com o texto "não grava" (sem ela a Apple recusa o .ipa).

**Notas de revisão da App Store:** no envio à App Store, escreva nas notas de revisão: "O Duo Fitness usa o HealthKit **somente para leitura** (atividade, sono, frequência cardíaca, peso e água) para mostrar a evolução do usuário no próprio aparelho. O app não grava dados no app Saúde: a chave NSHealthUpdateUsageDescription existe apenas porque a biblioteca de leitura referencia essas APIs, e ela não é usada."

**Erros do altool no CI:** o `ios-log-hints.mjs --stage altool` (chamado pelo `ios-upload.sh`) classifica a saída do altool: ITMS-90683 (diz qual chave faltou, só o nome), build number repetido, ícone inválido, entitlement fora do perfil e permissão da chave de API, sempre com causa e ação, e nunca manda procurar no log do xcodebuild. A saída completa do altool (sem chave nem JWT) fica em `ipa-validate.log` e `ipa-upload.log` no artifact `xcodebuild-logs-<execução>`.


## Health Connect (Android): biblioteca escolhida (branch `saude-healthconnect`)

Só leitura, atrás de `HEALTH_INTEGRATION_ENABLED=true` (a mesma variável do HealthKit; o `android.yml` recebe `HEALTH_INTEGRATION_ENABLED` e `EXPO_PUBLIC_HEALTH_INTEGRATION`, como o `ios.yml`). Sem a variável o Android gerado (manifest e gradle) é o mesmo de antes; o iOS não mudou.

**Biblioteca: `react-native-health-connect` 4.1.3** (versão exata em `healthconnect/native-deps.json`, instalada só no CI por `scripts/install-healthconnect-deps.mjs`, que grava no `package.json` do workspace do runner; o `package.json` do repositório não muda). Lido no código e no README do pacote (tarballs 3.5.3 e 4.1.3 do npm):

| Critério | 4.1.3 (escolhida) | 3.5.3 (anterior) |
|---|---|---|
| Cliente do Android | `androidx.health.connect:connect-client` **1.1.0 (estável)** | 1.1.0-**alpha11** |
| Nova arquitetura | TurboModule (codegen `RNHealthConnectSpec`); o `build.gradle` trata `newArchEnabled` | idem |
| Expo | integração **dentro do pacote**: um módulo Expo (`expo-module.config.json`, `android-expo/`) registra sozinho o delegate de permissões, **sem editar o `MainActivity`**; o autolinking do Expo o enxerga | exigia editar o `MainActivity` à mão |
| minSdk | **26** (o README confirma; o app tem 24) | 26 |
| Plugin de config | `app.plugin.js`: só acrescenta o filtro de justificativa e o alias; **não declara permissões** | idem |
| Módulos extras | nenhum (peer: `expo`, `react`, `react-native`, `@expo/config-plugins`) | nenhum |
| API usada | `getSdkStatus`, `initialize`, `requestPermission`, `getGrantedPermissions`, `readRecords` (com `pageToken`), `revokeAllPermissions`, `openHealthConnectSettings` | idem |

Motivos: cliente estável (não alpha), o delegate de permissões entra pelo módulo Expo (menos código nativo nosso e nada a patchar), e a API de revogação existe. Risco: a linha 4.x saiu em 1-6/ago/2026 (poucas semanas de uso quando foi fixada), por isso a versão é exata e o primeiro build precisa ser testado num Android real. O fallback é fixar a 3.5.3 (mudaria o `MainActivity`).

**Plugin próprio (`plugins/withHealthConnectOptional.js`)**, só com a flag e só Android. Não usamos o `app.plugin.js` do pacote porque ele não declara permissões e queremos garantir que só existam `READ_*`. Escreve:
- as 11 permissões de leitura: `READ_STEPS`, `READ_ACTIVE_CALORIES_BURNED`, `READ_EXERCISE`, `READ_HEART_RATE`, `READ_RESTING_HEART_RATE`, `READ_HEART_RATE_VARIABILITY`, `READ_VO2_MAX`, `READ_SLEEP`, `READ_WEIGHT`, `READ_BODY_FAT`, `READ_HYDRATION` (todas `android.permission.health.*`);
- **nunca** `WRITE_*`, `READ_HEALTH_DATA_IN_BACKGROUND` (leitura em segundo plano) nem `READ_HEALTH_DATA_HISTORY` (fica o padrão: só os 30 dias anteriores à concessão);
- `<queries>` do pacote `com.google.android.apps.healthdata` (visibilidade de pacote no Android 11 a 13);
- as exigências da tela de justificativa de permissões: o intent filter `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE` na activity principal (Android 13 e abaixo) e o `activity-alias` `ViewPermissionUsageActivity` com `android.intent.action.VIEW_PERMISSION_USAGE` + categoria `android.intent.category.HEALTH_PERMISSIONS`, protegido por `android.permission.START_VIEW_PERMISSION_USAGE` (Android 14 e acima);
- `android.minSdkVersion=26` em `gradle.properties` (só com a flag).

**Limite conhecido da tela de justificativa:** o filtro e o alias abrem o app (a activity principal), não uma tela dedicada: sem código nativo próprio não dá para o React Native saber que a abertura veio do Health Connect. A política de privacidade e o texto do que é lido estão na tela **Saúde > Conectar** (cartão "Política de privacidade", `EXPO_PUBLIC_PRIVACY_URL`). Se a revisão da Play pedir que o link do Health Connect abra a política direto, o próximo passo é uma activity nativa mínima (registrar no relatório de pendências).

### Health Connect: o que é lido, limites e como testar

**Tipos lidos (últimos 30 dias, só com o app aberto):** passos, energia ativa, sessões de exercício (minutos), frequência cardíaca (média do dia), em repouso, variabilidade (o Health Connect só tem RMSSD; o HealthKit usa SDNN, e o app mostra o valor em ms como vier), VO₂ máx., sono (sessões e fases), peso, % de gordura e hidratação (copos de 250 mL). Mapeamento em `src/utils/healthConnectMapping.js`; provedor em `healthConnectProvider.js` (interface `HealthProvider`); sincronização genérica em `healthSync.js` (`syncHealth`, o mesmo código do HealthKit).

**Regras do mapeamento:** o dia é o **dia local do aparelho**; passos, energia e água somam **por fonte** e vale a fonte de maior total no dia (celular e relógio gravando os mesmos passos não são somados em dobro); sono de duas fontes que se sobrepõem conta uma vez (união dos intervalos), na noite que termina naquele dia; a mesma sessão de treino gravada por dois apps conta uma vez; dia sem dado nunca vira zero; peso e % de gordura iguais ao registro **manual** do mesmo dia (dentro da tolerância) são descartados. A origem é `health_connect` ("Health Connect") ou `health_connect_watch` ("Relógio"), quando o metadata do registro diz que o dispositivo é um relógio (`device.type` 1). **Nome de dispositivo e pacote de origem nunca são guardados** (o pacote só existe na memória durante a leitura).

**Disponibilidade:** `getSdkStatus` -> disponível (Android 14+ ou app instalado), "precisa instalar/atualizar" (botão "Abrir a Play Store") ou indisponível (texto claro; o registro manual segue). **Permissões:** aqui o app sabe o que foi concedido (`getGrantedPermissions`): a tela mostra "Ativa"/"Sem permissão" por categoria; permissão parcial é normal, e categoria concedida sem registros é "Sem dados ainda", nunca erro. **Atraso:** dados de relógios chegam quando o app do fabricante sincroniza; a Saúde mostra "Atualizado às HH:MM" e a dica "abra o app do relógio para sincronizar". **Leitura paginada:** `readRecords` com `pageToken`, páginas de 1000, no máximo 30 páginas por tipo (trava de segurança). **Desconectar:** apaga do aparelho só o que veio do Health Connect (manual e dados de outras origens ficam) e chama `revokeAllPermissions`. Limite documentado da biblioteca e da plataforma: **a revogação só vale depois que o app é reiniciado**, então a tela avisa isso e oferece "Abrir as configurações do Health Connect" (Permissões do app > Duo Fitness) para retirar na hora.

**Menores de 18:** `selectHealthProvider` devolve o provedor manual também no Android (testado). Web: indisponível. Os dados importados ficam em `@duo_health_v2` e `@duo_health_connect`, entram no snapshot por conta e somem ao excluir a conta; nada vai a servidor, log, analytics nem ao marketplace (testes varrem o código; nenhum arquivo do Health Connect usa `console`, rede ou `Linking`).

**Só leitura, garantido em quatro camadas:** (1) o manifest só tem `READ_*` (o `check-android-project.mjs` falha no CI com qualquer `WRITE_*`, segundo plano ou histórico); (2) o provedor só pede `accessType: 'read'`; (3) uma varredura de testes falha se existir `insertRecords`, `deleteRecords` ou `WRITE_` no código do app; (4) a biblioteca contém código de escrita, mas sem a permissão no manifest o Android recusa qualquer escrita.

**Só dá para validar num Android real (com um relógio):** a folha de permissões do Health Connect; o delegate de permissões do módulo Expo; o build Gradle com o minSdk 26; dados de Pixel Watch/Galaxy Watch/Fitbit/Garmin chegando pelos apps deles (e o atraso); o rótulo "Relógio" (depende do `device.type` que o app do fabricante grava); sono com duas fontes; a revogação e o aviso de reinício; o botão da Play Store (Android 13 ou menos); os filtros da justificativa abrindo o app; e a aprovação da Play.

**Roteiro de teste (Android 14, depois Android 13 sem o Health Connect):**
1. Build com `HEALTH_INTEGRATION_ENABLED=true`; instale; conta de adulto; abra Saúde > Conectar.
2. Android 13 sem o app: aparece "Instale ou atualize o Health Connect"; o botão abre a Play Store. Instale e volte.
3. Marque todas as categorias, "Conectar ao Health Connect", conceda **só** passos e sono: a tela mostra Atividade e Sono "Ativa", as demais "Sem permissão", sem erro.
4. Com o relógio pareado, sincronize o app dele; puxe a tela Saúde para atualizar: passos, sono e FC; origem "Relógio"; "Atualizado às" aparece e a dica do relógio também.
5. Registre um peso manual igual ao do Health Connect no mesmo dia: não duplica.
6. Desconectar: os dados importados somem, o manual fica; leia o aviso; abra as configurações do Health Connect e confira que a permissão foi retirada (ou retire à mão).
7. Conta de menor de 18: a tela Conectar diz que não está disponível e nenhuma permissão é pedida.
