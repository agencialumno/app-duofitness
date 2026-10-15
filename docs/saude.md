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
- Não usar dados de saúde para publicidade nem compartilhar com a Loja ou parceiros.

## Testes

`cd backend && npm test` (`test/health.test.ts`): histórico, vírgula decimal, fórmula (componentes ausentes, limites
0 a 100, under18), relatório, termos proibidos, provedores e reset.
