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

---

# saude-categorias (Saúde por categorias; empilhada na fix-auth-fundo)

Escada: `ajuda-textos` -> `conta-ui` -> `conta-firebase` -> `fix-auth-fundo` -> `saude-categorias`. Nada foi executado (sem push, tag nem deploy).

```
git push -u origin saude-categorias
```

Depois: disparar o workflow **android** nessa branch ("Use workflow from" = `saude-categorias`). A Saúde por categorias não depende de nenhuma variável
(a integração com Apple Saúde / Health Connect continua desligada). Conferir no resumo do job: APK publicado, "Contas (...)" como você configurou, e que
nenhum módulo nativo novo apareceu no autolinking (`check-autolinking` passa sem mudanças). Só depois de o Android passar: **ios** com `upload=false`.

## O que testar no iPhone

1. **Saúde** (Início > cartão Saúde): Resumo com o Duo Score, sugestões e os 5 cartões na ordem (Composição, Atividade, Sono, Coração e recuperação, Hidratação).
2. **Sem dados** (perfil real, sem registros): cada cartão diz o que falta e mostra "Registrar"; o score fica em branco e diz o que falta; nada penaliza.
3. **Detalhe**: toque em cada cartão; confira o "i", o valor atual, as tendências de 7 e 30 dias e o histórico. Com o VoiceOver ligado, o gráfico lê média, mínimo, máximo e dias sem registro.
4. **Registrar**: no detalhe do Sono, registre "7:30", "23:30" e "7h00"; no de Composição, o peso com vírgula (78,5). Abra o teclado: o campo focado continua visível e o teclado é escuro.
5. **Hidratação**: botões de copo e meta. **Conectar dispositivos**: tudo desabilitado, "Em breve", nada marcado.
6. **Menor de 18**: sem o cartão de Composição e sem a conexão; só hábitos.
7. **Migração**: quem já tinha peso e água registrados vê os mesmos dados (origem "Registro manual"); o app antigo não perdeu nada.
8. **Modo Demo**: todas as categorias com "Dados de exemplo". "Reiniciar demo" e "Sair" limpam tudo.
9. **Excluir conta** (com as contas ligadas): os dados de saúde novos são limpos; o resto do app fica.
