# Revisão da App Store: notas e checklist

Documento de apoio para o envio do Duo Fitness à App Store (iOS). Nada aqui é enviado automaticamente: copie o que precisar para o App Store Connect. Itens marcados **PENDENTE** ou **conferir** dependem do Victor.

## a) Conta de teste para o revisor

O app exige conta (e-mail e senha, Google ou Apple). A Apple precisa de uma conta pronta, já verificada, para entrar sem criar nada.

| Campo | Valor |
|---|---|
| E-MAIL | **PENDENTE** |
| SENHA | **PENDENTE** |

Como preparar (passos do Victor, **não invente credenciais aqui**; este arquivo é público):
1. Crie a conta de teste pelo próprio app (Criar conta), com um e-mail que você controle, e **verifique o e-mail** pelo link recebido.
2. Informe uma idade de **18 anos ou mais** na etapa de idade e conclua o onboarding, para o revisor cair direto no app (sem a etapa de menor de idade).
3. Preencha os dois campos acima **só no App Store Connect** (App Information > "Sign-in required" > User name / Password). Não coloque a senha neste repositório nem no código.
4. Se for usar HealthKit na revisão, deixe a conta de teste com o aparelho pareado ou explique que sem dados o app mostra "Sem dados ainda" (não é erro).

## b) Texto para "Notes for Review" (inglês, para colar)

```
Duo Fitness is a free app. No in-app purchases, no payments, no ads.

An account is required (email and password, Sign in with Apple, or Google). A test account is provided in the "Sign-in required" fields. Minimum age is 13; users aged 13-17 must confirm guardian authorization during sign-up, and the minor experience has no weight tracking.

Account deletion: Profile tab > scroll to the bottom > "Excluir minha conta" (Delete my account). It deletes the account online and all data on the device. The app is in Brazilian Portuguese.

HealthKit is READ-ONLY. The app never writes to Apple Health: the authorization request is always made with an empty "toShare" list and only "toRead" types (steps, active energy, workouts, heart rate, resting heart rate, HRV, VO2 max, sleep, body mass, body fat percentage, dietary water). Health data stays on the device. It is never sent to any server, analytics, or log, and is never used for advertising or the marketplace. Health access is optional and off until the user opts in (Health tab > Connect). It is not available to users under 18.

The Info.plist contains NSHealthUpdateUsageDescription only because the HealthKit library we use references the write APIs; the string says the app does not write to Health. The app never requests write permission (a unit test fails if any write type is requested).

The marketplace is a showcase of partner listings with example items; the app does not sell or deliver anything. The app does not provide medical advice; health features are habit tracking only.
```

## c) Onde achar cada coisa no app

| O quê | Onde |
|---|---|
| Login / criar conta | Primeira tela (Boas-vindas): "Criar conta" ou "Entrar". Google e, no iPhone, "Continuar com a Apple" aparecem nas duas telas (na criação, depois de aceitar os termos). |
| Verificação do e-mail | Perfil > cartão "Conta" (só para quem entra por e-mail e senha). |
| Idade mínima (13+) | Logo depois do primeiro login de uma conta nova, tela "Qual é a sua idade?". Menos de 13: mensagem, a conta recém-criada é excluída e volta às boas-vindas. |
| Confirmação do responsável (13 a 17) | Na mesma tela, ao informar de 13 a 17: caixa "Confirmo que tenho autorização do meu responsável legal para usar o app" + link da Política de Privacidade. Sem marcar, não avança. |
| Excluir conta | Perfil > rolar até o fim > link discreto "Excluir minha conta" (pede confirmação; e-mail e senha pedem a senha de novo; Apple revoga o token). |
| Sair da conta | Perfil > fim > "Sair da conta" (os dados ficam guardados no aparelho para essa conta). |
| Conectar saúde (HealthKit) | Aba Início > cartão Saúde > botão "Conectar" > tela "Conectar dispositivos": explica o que é lido, consentimento por categoria (nada vem marcado) e "Conectar ao Apple Saúde". Só aparece com a integração ligada no build. |
| Desconectar saúde | Mesma tela > "Desconectar e apagar o que foi importado". |
| Termos e Privacidade | Criar conta (links) e etapa de idade. Precisam das URLs publicadas (`EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`). |

**Conferir antes de enviar:** o botão "Conectar" da Saúde mostra o texto fixo "Em breve" e o rótulo "indisponível" mesmo com a integração ligada (`HealthParts.js`). O revisor pode achar que o recurso não existe. Vale ajustar o texto do botão quando a integração estiver ligada, ou avisar nas notas de revisão onde tocar. (Não alterado neste commit, que é só documentação.)

## d) Questionário de classificação etária (App Store Connect)

Respostas **sugeridas**, todas para **conferir** contra o questionário vigente no momento do envio (a Apple altera as perguntas e as faixas etárias). Responda com o que o app tem hoje, não com o que se pretende ter.

| Pergunta (resumo) | Sugestão | Observação |
|---|---|---|
| Violência (desenhada, realista, armas) | Nenhuma | conferir |
| Conteúdo sexual ou nudez | Nenhum | conferir |
| Linguagem vulgar ou humor impróprio | Nenhum | conferir |
| Referências a drogas, álcool ou tabaco | Nenhuma | o marketplace mostra suplementos de exemplo; conferir se isso entra como "referências a substâncias" |
| Jogos de azar simulados ou reais | Nenhum | conferir |
| Temas de terror ou medo | Nenhum | conferir |
| Temas maduros ou sugestivos | Nenhum | conferir |
| Temas médicos ou de saúde | Sim, só informativos/hábitos (sem diagnóstico nem tratamento) | conferir: a pergunta existe nas versões novas; o app tem Duo Score de hábitos, IMC e dados do HealthKit |
| Acesso irrestrito à web | Não | os links abrem Termos e Privacidade; conferir |
| Conteúdo gerado por usuários / conversa entre usuários | Não | não há chat entre pessoas; a IA do chat não está em uso; conferir |
| Compras dentro do app ou loot boxes | Não | conferir |
| Anúncios | Não | conferir |
| Controle dos pais / limite de idade na própria conta | Sim: mínimo de 13 anos com confirmação do responsável de 13 a 17 | conferir como declarar |
| Faixa etária resultante esperada | 4+ ou 9+ (sem conteúdo sensível); a Apple calcula | conferir; se aparecer 12+ ou mais por causa de "temas médicos" ou suplementos, avalie se aceita |

Outros campos do envio (conferir): categoria "Saúde e fitness"; Política de Privacidade com URL pública; "App Privacy" (rótulos de dados: e-mail e nome da conta pelo Firebase Authentication, **dados de saúde coletados mas tratados só no aparelho**, sem rastreamento); declaração de criptografia (`ITSAppUsesNonExemptEncryption = false` já está no app); Sign in with Apple oferecido junto do Google (exigido pela diretriz 4.8).
