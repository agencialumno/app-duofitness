# Comandos de push e ordem de build (NADA disto foi executado; rode você)

Branches empilhadas: `ajuda-textos` -> `conta-ui` -> `conta-firebase`. Cada uma contém a anterior; empurrar a de cima já leva as de baixo,
mas empurre uma a uma para os workflows rodarem na ordem. **Não mexi na `main`, não criei tags e não usei `gh`.**

## 1. ajuda-textos

```
git push -u origin ajuda-textos
```
Depois: disparar o workflow **android** nessa branch ("Use workflow from" = `ajuda-textos`).
Conferir no resumo do job: versão e `run_number`, APK publicado, e **"Contas (EXPO_PUBLIC_AUTH_ENABLED): desligadas"**.
Só depois de o Android passar: **ios** com `upload=false`; conferir no resumo que o archive foi gerado e a assinatura validada.

## 2. conta-ui  (candidata a build de teste das telas de conta)

```
git push -u origin conta-ui
```
Depois: **android** na `conta-ui`. Para ver as telas de conta, crie antes a variável de repositório `EXPO_PUBLIC_AUTH_ENABLED=true`
(Settings > Secrets and variables > Actions > Variables). Sem Firebase, entrar e criar conta respondem "Conta indisponível nesta versão",
e "Continuar sem conta" funciona. Sem a variável, o app é idêntico ao de hoje.
Conferir no resumo: a linha de Contas (ligadas ou desligadas, conforme a variável).
Só depois: **ios** com `upload=false`, mesma conferência.

## 3. conta-firebase  (NÃO é a candidata a build)

```
git push -u origin conta-firebase
```
**Por que não é a candidata:** o login real (Firebase, Google, Apple) nunca foi compilado em CI nem testado em aparelho, e o Firebase no iOS
(frameworks estáticos) tem relatos de falha com o Xcode 26. Só passou em testes automáticos, prebuild do Android e bundle JS.
Sem a variável `FIREBASE_ENABLED` e sem os secrets, o build desta branch é **igual ao da `conta-ui`** (os módulos do Firebase nem são instalados).

Ordem recomendada para validar a `conta-firebase`:
1. Disparar **firebase-spike** (Actions > firebase-spike > plataforma `both`). Não usa secrets. Preencha a tabela em `docs/medicoes-fase0.md`.
   Se o iOS "on" ficar mais de 2x mais lento ou quebrar, **pare** e me mostre (critério combinado).
2. Só se o spike passar: configurar variáveis e secrets (ver `docs/pendencias-usuario.md`, seção 4) e disparar **android** na `conta-firebase`.
   Conferir no resumo: "Firebase (conta) em android: ligado" e que o APK foi publicado.
3. Só depois de o Android passar: **ios** com `upload=false` (conferir "Firebase (conta) em ios: ligado", o archive e o entitlement
   `com.apple.developer.applesignin` no perfil). Upload ao TestFlight só depois de você ler o resumo.

Ao fim de cada job, o passo "Firebase (opcional) - apagar os arquivos de configuração" roda sempre; confira que ele aparece no log.
