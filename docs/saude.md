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
