# Plano de conta: verificação de e-mail

Resumo do comportamento da conta (opcional, desligada por padrão; ver `CLAUDE.md`) no que toca à verificação do e-mail.

## De onde vem o estado

- Há **uma única fonte**: o usuário recarregado pelo provedor (`reloadUser()`), guardado em `src/auth/verificationController.js` e exposto pelo
  `AuthContext` (`user`, `checking`, `checkFailed`, `checkedUid`, `refreshUser`). Nenhum valor de "verificado" é gravado no aparelho.
- Causa do bug "verifiquei e o Perfil diz que não": o Firebase **não avisa** (`onAuthStateChanged`) quando o link do e-mail é aberto, e o
  `emailVerified` do usuário em memória só muda depois de `reload()`. O resultado do `reloadUser()` também não entrava no estado global.
- Quando recarrega: ao entrar na conta, ao abrir e ao voltar ao foco do Perfil, ao voltar do segundo plano (`AppState` "active", só para quem ainda
  não verificou), no botão "Já verifiquei" e na tela "Verifique o seu e-mail". Chamadas simultâneas viram uma só.
- Ao passar a verificado, o `FirebaseAuthProvider` força um token novo (`getIdToken(true)`), porque o token só renova de hora em hora.

## O que o Perfil mostra (`verificationView` em `src/auth/authFlow.js`)

Sempre ícone **e** texto, nunca só cor.

| Situação | Texto |
|---|---|
| e-mail e senha, verificado | "E-mail verificado" |
| antes da primeira conferência, ou recarregando | "Verificando…" (nunca pisca "não verificado") |
| erro de rede na recarga | "Não foi possível verificar agora" |
| e-mail e senha, conferido e não verificado | "E-mail não verificado" + "Reenviar e-mail de verificação" (60 s entre reenvios) + "Já verifiquei" |
| Google ou Apple | "E-mail informado pelo Google" / "pela Apple" (sem perguntar nada) |
| Apple com e-mail privado (relay) | acrescenta que a Apple repassa as mensagens para o e-mail real |

## Regras do Firestore e do Storage

Qualquer recurso que exija e-mail verificado deve ler **`request.auth.token.email_verified`** (não um campo do documento). Esse valor vem do **token**
e só muda quando o token é renovado: por isso o app força `getIdToken(true)` assim que a recarga mostra o e-mail verificado. No app, os recursos que
dependam da verificação devem ler `user.emailVerified` do `AuthContext` (estado recarregado), nunca de um valor gravado.

Exemplo de regra (referência; as regras reais ficam em `firebase/`):

```
allow write: if request.auth != null && request.auth.token.email_verified == true;
```

Contas Google e Apple chegam com `email_verified` verdadeiro pelo provedor; e-mail privado da Apple conta como verificado.
