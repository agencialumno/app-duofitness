# Comandos de push (NÃO executados; rode você, na ordem)

Ordem de empilhamento: `ajuda-textos` -> `conta-ui` -> `conta-firebase`.

## 1. ajuda-textos

```
git push -u origin ajuda-textos
```
Depois: disparar o workflow **android** nessa branch. Conferir no resumo do job: versão/`run_number`, APK publicado, sem erro de PNG/autolinking.
Só depois de o Android passar: **ios** com `upload=false`; conferir no resumo que o archive foi gerado.
