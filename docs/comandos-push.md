# Comandos de push (NÃO executados; rode você, na ordem)

Ordem de empilhamento: `ajuda-textos` -> `conta-ui` -> `conta-firebase`.

## 1. ajuda-textos

```
git push -u origin ajuda-textos
```
Depois: disparar o workflow **android** nessa branch. Conferir no resumo do job: versão/`run_number`, APK publicado, sem erro de PNG/autolinking.
Só depois de o Android passar: **ios** com `upload=false`; conferir no resumo que o archive foi gerado.

## 2. conta-ui (empilhada na ajuda-textos)

```
git push -u origin conta-ui
```
Depois: disparar o workflow **android** nessa branch. Conferir no resumo do job: a linha "Contas (EXPO_PUBLIC_AUTH_ENABLED): **desligadas**" (a menos que você tenha criado a variável `EXPO_PUBLIC_AUTH_ENABLED=true`), APK publicado, PNGs e autolinking ok.
Para ver as telas de conta num aparelho, crie antes a variável de repositório `EXPO_PUBLIC_AUTH_ENABLED=true`; sem Firebase (conta-ui) as telas aparecem, mas entrar/criar conta responde "Conta indisponível nesta versão".
Só depois de o Android passar: **ios** com `upload=false`; conferir no resumo que o archive foi gerado.
