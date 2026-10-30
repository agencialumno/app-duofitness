# Fluxo de cadastro: idade, nome e senha

Mapa do que o app pergunta e em que ordem, feito lendo o código (branch `ajustes-cadastro`). O portão que escolhe a tela é `AppContext.gate` (`src/utils/accountFlow.js`): **sem conta -> etapa de idade -> onboarding -> app**, sem `navigation.reset`.

## 1. Quem coleta idade ou faixa etária

| Tela / campo | Arquivo | Pergunta? | O que faz |
|---|---|---|---|
| Boas-vindas | `onboarding/WelcomeScreen.js` | Não | Só leva a "Criar conta" / "Entrar". |
| Criar conta (e-mail) | `auth/SignUpScreen.js` | Não | Nome completo, e-mail, senha, termos. A idade **não** é pedida aqui. |
| Entrar | `auth/SignInScreen.js` | Não | — |
| Google / Apple | `auth/SocialButtons.js` | Não | — |
| **Etapa de idade da conta** | `auth/AgeGateScreen.js` (lógica em `utils/accountAge.js`) | **Sim, o único campo de idade** | Aplica a regra: menos de 13 bloqueia (a conta recém-criada é excluída); 13 a 17 exige a autorização do responsável; 18+ segue. Grava `@duo_age` (só no aparelho; entra no snapshot da conta). |
| Onboarding: perfil | `onboarding/ProfileSetupScreen.js` | Não (nome e objetivos) | — |
| Onboarding: medidas | `onboarding/BodyDataScreen.js` | **Não**: a faixa etária é **só leitura** (vem de `@duo_age`) | — |
| Perfil > editar medidas | `EditBodyDataScreen.js` | **Não**: faixa etária só leitura | — |
| Perfil | `ProfileScreen.js` | Não (mostra a faixa) | — |

**Fonte da verdade:** `@duo_age` (`{ age, ageGroup, guardianConfirmed }`), gravada só pela etapa de idade (`AppContext.saveAge`). Nenhuma outra tela tem campo de idade; um teste (`accountname.test.ts`) confere isso.

## 2. Ordem por método e por situação

Em todos os casos o portão decide pelo estado: `conta?` -> `@duo_age?` -> `@duo_user?`.

| Situação | Sequência |
|---|---|
| **E-mail, conta nova** | Boas-vindas -> Criar conta -> **Idade (1x)** -> Onboarding (nome só se desconhecido) -> App |
| **Google, conta nova** | Boas-vindas -> Google -> **Idade (1x)** -> Onboarding (nome do Google) -> App |
| **Apple, conta nova** | Boas-vindas -> Apple -> **Idade (1x)** -> Onboarding (nome da Apple, ou pergunta 1x se não vier) -> App |
| **Qualquer método, conta COM snapshot** (já usou neste aparelho e saiu) | Entrar -> `bindAccount` restaura o snapshot (inclui `@duo_age`, `@duo_user`, nome) -> **direto no App**. Nenhuma pergunta. |
| **Reabrir o app com a sessão ativa** | As chaves ativas já são da conta (`owner`) -> App. Nenhuma pergunta. |
| **Conta SEM snapshot em aparelho com dados de antes das contas** (`adopted`) | Idade (1x, porque não há `@duo_age`) -> App (o perfil antigo é mantido). |
| **Conta nova em aparelho que já teve OUTRA conta** | As chaves da outra conta vão para o snapshot dela; esta começa do zero: Idade (1x) -> Onboarding. Nada da outra conta aparece. |

Cada **pessoa/conta** é perguntada uma vez; uma segunda conta no mesmo aparelho é outra pessoa e passa pela própria etapa de idade (a regra de menores não pode ser pulada por reaproveitar a idade de outra conta).

## 3. Por que a idade pareceu ser pedida duas vezes

O código só tem **uma** pergunta de idade, então o mapa acima não explica sozinho o que apareceu no iPhone. As causas que o código permite e o que foi feito:

1. **Sessão antiga aberta na etapa de idade.** Se o app é fechado na etapa de idade de uma conta de teste, a sessão do Firebase continua ativa; ao abrir, o app vai direto para a etapa de idade ("antes de entrar") e, ao criar a conta nova, aparece de novo. Antes não havia como sair dali. **Correção:** a etapa de idade ganhou o link "Usar outra conta" (sai da conta sem apagar nada e volta às boas-vindas). A regra de 13/18 não mudou.
2. **Build antigo no aparelho.** Um build anterior à conta obrigatória tinha a faixa etária no onboarding. Neste código ela é só leitura.

Se acontecer de novo, anote a ordem exata das telas e se a conta era nova: o teste `accountname.test.ts` cobre os três métodos (uma pergunta; sair e entrar não pergunta) e aponta onde olhar.

## 4. Nome

- **E-mail:** o campo "Nome completo" do cadastro. A tela avisa o AppContext (`rememberSignupName`) **antes** de criar a conta, porque o Firebase só devolve o `displayName` depois (a conta é criada, o estado muda e só então o perfil é atualizado). O vínculo da conta guarda o nome em `@duo_account_name`.
- **Google / Apple:** o `displayName` que vier no momento do vínculo. A Apple pode não enviar nome (principalmente com "Ocultar meu e-mail") e o Google pode vir vazio.
- **Onboarding:** nome conhecido = a pergunta é pulada (mostra "Olá, Nome!"); desconhecido = pergunta uma vez, com o campo vazio. O nome do perfil é `@duo_user.name`.
- **Perfil:** o nome pode ser editado (ícone de lápis). Persiste ao sair e entrar, porque `@duo_user` entra no snapshot da conta.
- **Contas diferentes não misturam nomes:** sair salva o snapshot e limpa as chaves ativas (`@duo_account_name` inclusa); a próxima conta começa do zero ou restaura o próprio snapshot.
- **Privacidade:** o nome fica só no aparelho (`@duo_account_name`, `@duo_user`) e no que o Firebase Authentication já guarda para a conta. Nenhum módulo do nome usa `console` nem rede (um teste confere).

## 5. Senha: níveis do medidor

Definidos pelos 7 requisitos obrigatórios (`strengthFromRules` em `utils/passwordPolicy.js`):

| Requisitos atendidos | Nível | Rótulo | Barra |
|---|---|---|---|
| 0 a 2 | 1 | Fraca | 1 de 4 |
| 3 a 5 | 2 | Razoável | 2 de 4 |
| 6 (falta um) | 3 | Boa | 3 de 4 |
| 7 (todos) | 4 | **Muito forte** | **cheia** |

O nível máximo existe só com todos os requisitos atendidos, e a senha só é aceita com todos atendidos (a política não mudou). O rótulo é lido pelo VoiceOver ("Força da senha: Muito forte, nível 4 de 4"); o texto é branco sobre fundo escuro (contraste acima de 4,5:1) e o nível nunca depende só da cor. O aviso de "senha comum" (`common`) continua calculado, mas não rebaixa o nível.
