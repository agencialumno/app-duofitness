# Pendências do usuário (passos SEUS, em ordem)

Nada abaixo foi feito por mim: exige as suas contas (Firebase, Google Cloud, Apple, GitHub), o seu aparelho ou o seu advogado.
Os builds de hoje seguem idênticos enquanto `EXPO_PUBLIC_AUTH_ENABLED` e `FIREBASE_ENABLED` estiverem vazias.
Os módulos nativos do Firebase NÃO estão no `package.json` do repositório: com `FIREBASE_ENABLED=true` o workflow os grava no `package.json` do runner (`scripts/install-firebase-deps.mjs`, antes do prebuild e do check-autolinking; nada é commitado). Se o passo "Conferir autolinking" falhar com Firebase ligado, a mensagem mostra a causa e a ordem esperada: `npm ci -> firebase-prepare -> install-firebase-deps -> expo prebuild -> check-autolinking`.

## 1. Console do Firebase (projeto `duofitness-app`)

1. Authentication > Sign-in method: ativar **E-mail/senha** (e deixar "Link por e-mail" desligado). O Google e a Apple você já configurou.
2. Authentication > Settings > **Proteção contra enumeração de e-mails**: ligar.
3. Authentication > Settings > **Política de senha**: comprimento mínimo 10; exigir maiúscula, minúscula, número e caractere especial (o servidor impõe; "sem espaços" e "sem e-mail/nome" ficam só no app). Se a opção não aparecer no seu plano, anotar e me avisar.
4. Authentication > Templates: traduzir para português o e-mail de **verificação**, **redefinição de senha** e **alteração de e-mail** (nome exibido: Duo Fitness). Domínio próprio para os e-mails fica para depois do primeiro build interno.
5. Authentication > Settings > Domínios autorizados: conferir a lista (remover o que não usa).
6. App Check: registrar os apps em modo **monitoramento** (Android: Play Integrity; iOS: App Attest). NÃO impor ainda (o APK avulso não passa no Play Integrity).
7. Não criar Firestore nem Storage agora. As regras de referência estão em `firebase/` e NÃO foram aplicadas.
8. Conferir se os **alertas de orçamento** do projeto cortam ou só avisam (só avisam, em regra); criar alertas em valores baixos.

## 2. Google Cloud (mesmo projeto)

1. Credenciais: **restringir as chaves de API** do Android (pacote `com.duofitness.app` + SHA-1) e do iOS (bundle id). Não é segredo, mas a restrição reduz abuso.
2. Tela de consentimento OAuth: nome do app "Duo Fitness", e-mail de suporte, links da política e dos termos (quando houver).
3. Orçamento e alertas de faturamento em valor baixo.

## 3. Apple Developer

1. App ID `com.duofitness.app`: confirmar a capability **Sign in with Apple** (você disse que já marcou).
2. Na primeira execução do `ios.yml` com Firebase ligado, o perfil gerenciado é regenerado com o entitlement: conferir no resumo do job. Se falhar, ativar manualmente no portal.
3. App Store Connect > Privacidade do app: preencher conforme `docs/plano-conta.md` (seção 10) e informar a URL da política de privacidade.
4. Conta de teste para o revisor: criar uma conta e-mail/senha já verificada e colocar nas notas de revisão.

## 4. GitHub (repositório)

Variáveis (Settings > Secrets and variables > Actions > **Variables**), todas opcionais:

| Variável | Valor | Para quê |
|---|---|---|
| `EXPO_PUBLIC_AUTH_ENABLED` | `true` | liga as telas de conta (vazio = desligadas) |
| `EXPO_PUBLIC_TERMS_URL` | URL dos termos | link na tela de cadastro (vazio = "em revisão") |
| `EXPO_PUBLIC_PRIVACY_URL` | URL da política | idem |
| `FIREBASE_ENABLED` | `true` | inclui o Firebase no build; cada plataforma só liga se o secret dela existir (sem secret: aviso e build normal) |

Secrets (Settings > Secrets and variables > Actions > **Secrets**), em base64 de uma linha:

```
base64 -w0 google-services.json      # -> FIREBASE_GOOGLE_SERVICES_JSON_B64
base64 -w0 GoogleService-Info.plist  # -> FIREBASE_GOOGLE_SERVICE_INFO_PLIST_B64
```
(no Windows/PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("google-services.json"))`). Não cole esses valores em nenhum chat, issue ou arquivo do repositório.
Ative também a **push protection** do repositório (Settings > Code security).

## 4b. Antes de ligar o Firebase nos builds

Rode o workflow **firebase-spike** (não usa secrets) e preencha `docs/medicoes-fase0.md`. Se o iOS ficar mais de 2x mais lento ou quebrar, me avise antes de seguir.
Ordem dos disparos e comandos de push: `docs/comandos-push.md`.

## 5. Revisões

1. **Jurídico:** termos de uso e política de privacidade (rascunhos em `docs/juridico/`, marcados "NÃO PUBLICAR"). Publique as páginas e preencha `EXPO_PUBLIC_TERMS_URL` e `EXPO_PUBLIC_PRIVACY_URL`. Decidir com o advogado quem é o **controlador** dos dados (Duo Fitness ou Lumno), a base legal e o tratamento de menores (a conta é só para 18+).
2. **Profissional de saúde:** revisar os textos de `src/data/infoContent.js` e as notas de `src/utils/imc.js` (hábitos, sem dieta/meta), a frase para menores de 18 e o tratamento de "Emagrecer" para menores.

## 6. Testes em aparelho (roteiro)

Pré-requisito: um build com `EXPO_PUBLIC_AUTH_ENABLED=true` e, para Firebase real, `FIREBASE_ENABLED=true` com os dois secrets.

1. **Sem a flag:** instalar o build normal. As boas-vindas têm "Começar agora" como sempre. Tudo igual.
2. **Com a flag, sem Firebase** (conta-ui): "Criar conta" e "Entrar" aparecem; ao tentar entrar, a mensagem diz que a conta está indisponível nesta versão; "Continuar sem conta" funciona.
3. **Cadastro (conta-firebase):** a checklist ticka a cada tecla (ícone e texto); o botão só habilita com tudo; "tenho 18 anos" e termos; o e-mail de verificação chega em português; "Já verifiquei" funciona.
4. **Entrar** com senha errada e com e-mail inexistente: mesma mensagem. Cinco erros seguidos: espera.
5. **Esqueci a senha:** mensagem neutra; o e-mail chega.
6. **Google** (iOS e Android) e **Apple** (só iOS; não deve aparecer no Android). Testar também o conflito: criar conta por e-mail e entrar com Google do mesmo e-mail.
7. **VoiceOver/TalkBack:** a checklist anuncia "N de 7 requisitos" sem repetir a cada tecla; o campo focado fica visível com o teclado aberto; fonte grande no sistema não corta nada.
8. **Perfil > Conta:** e-mail e status; "Sair da conta" mantém os treinos; "Excluir conta" pede senha e a palavra EXCLUIR; depois a conta não entra mais. Com Apple: a exclusão revoga o token (conferir em Ajustes > Apple ID > Entrar com Apple).
9. **Modo Demo:** nenhum cartão de conta, nenhuma chamada de rede.
