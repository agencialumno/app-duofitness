# Comandos de push da correção do fundo das telas de conta (NÃO executados)

Branch: `fix-auth-fundo`, criada a partir de `conta-firebase` (a única branch que contém a `conta-firebase`, ou seja, o topo da escada).
Escada: `ajuda-textos` -> `conta-ui` -> `conta-firebase` -> `fix-auth-fundo`.

```
git push -u origin fix-auth-fundo
```

Depois: disparar o workflow **android** nessa branch ("Use workflow from" = `fix-auth-fundo`). Para ver as telas de conta no aparelho, a variável
de repositório `EXPO_PUBLIC_AUTH_ENABLED=true` precisa estar criada (sem ela as telas de conta nem aparecem; o fundo escuro vale para o app inteiro).
Conferir no resumo do job: APK publicado e a linha "Contas (EXPO_PUBLIC_AUTH_ENABLED)".

Só depois de o Android passar: **ios** com `upload=false` (archive sem assinatura por padrão; confira "entitlements do .ipa conferidos").

## O que mudou (resumo)

- Causa raiz: o `NavigationContainer` não tinha `theme`, então usava o tema CLARO do React Navigation (card branco/cinza claro). Telas sem fundo próprio (as de conta) mostravam esse fundo.
- `src/navigation/navTheme.js`: tema escuro (partindo do `DarkTheme`) com `background` e `card` = `COLORS.bg`; `cardStyle` nos Stacks e `sceneContainerStyle` nas abas.
- `AuthScreen`: fundo escuro no `KeyboardAvoidingView`, no `ScrollView` e no conteúdo (área atrás do teclado e bounce).
- Campos com `keyboardAppearance="dark"` e cursor amarelo; botão da Apple branco (aparência da Apple para fundo escuro) e botão do Google no tema escuro.
- `app.json` já tinha `"userInterfaceStyle": "dark"`; não foi preciso mudar.

## O que testar no iPhone

1. **Teclado:** abrir Criar conta e tocar em cada campo. O teclado deve ser escuro, o campo focado continua visível e a área atrás do teclado fica escura (sem faixa branca).
2. **Puxar a tela:** em cada tela de conta (cadastro, entrar, esqueci a senha, verificar e-mail), puxar para baixo e para cima (bounce): o fundo continua escuro.
3. **Voltar entre telas:** Boas-vindas > Criar conta > Entrar > Esqueci a senha, e voltar pelo botão e pelo gesto de borda: nenhuma transição pisca em branco.
4. **Botões sociais:** "Continuar com a Apple" aparece branco com texto preto (só no iOS); "Continuar com Google" escuro com contorno cinza. O "G" ainda é o ícone monocromático (trocar pelo oficial antes da loja).
5. **Resto do app:** Início, Treinos, Perfil, Saúde e marketplace continuam como antes (o tema escuro só reforça o fundo).
