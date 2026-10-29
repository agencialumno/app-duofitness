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

---

# ajustes-perfil (verificação de e-mail, Saúde no Perfil e HealthKit nos entitlements; empilhada na saude-categorias)

Escada: `ajuda-textos` -> `conta-ui` -> `conta-firebase` -> `fix-auth-fundo` -> `saude-categorias` -> `ajustes-perfil`. Nada foi executado (sem push, tag nem deploy).

```
git push -u origin ajustes-perfil
```

Depois: disparar o workflow **android** nessa branch ("Use workflow from" = `ajustes-perfil`) e, só depois de passar, o **ios** com `upload=false`. Para o HealthKit (ainda stub): se criar a variável `HEALTH_INTEGRATION_ENABLED=true`, rode o ios com `sign_archive=true` (veja `docs/testflight.md`).

## O que testar no iPhone

1. **E-mail**: crie uma conta por e-mail, abra o link de verificação no app de e-mail e volte ao Duo Fitness: o Perfil deve passar sozinho de "Verificando…" para "E-mail verificado" (ícone e texto), sem reiniciar. Antes de abrir o link: "E-mail não verificado", "Reenviar e-mail de verificação" (espera de 60 s) e "Já verifiquei".
2. **Sem rede**: com o modo avião, "Já verifiquei" mostra "Não foi possível verificar agora" (nunca "não verificado").
3. **Google e Apple**: o Perfil mostra "E-mail informado pelo Google" / "pela Apple", sem perguntar nada; com "Ocultar meu e-mail" aparece a explicação do e-mail privado.
4. **Perfil > Saúde**: o cartão mostra o Duo Score e o registro mais recente (ou "Registrar primeiro dado"); toque abre a Saúde e o voltar retorna ao Perfil. Confira também no Modo Demo e como convidado; para menor de 18, "Só hábitos".
5. **Nada quebrou**: Resetar todos os dados, Sair do demo, Excluir conta e os atalhos da Home.

---

# saude-ux (redesenho da tela Saúde; empilhada na ajustes-perfil)

Escada: `ajuda-textos` -> `conta-ui` -> `conta-firebase` -> `fix-auth-fundo` -> `saude-categorias` -> `ajustes-perfil` -> `saude-ux`. Nada foi executado (sem push, tag nem deploy).

```
git push -u origin saude-ux
```

Depois: workflow **android** nessa branch e, passando, **ios** com `upload=false`. Não há variável nem módulo nativo novo.

## O que testar no iPhone

1. **Saúde** (Início > cartão Saúde e Perfil > cartão Saúde): Duo Score no topo, três ações rápidas, chips, sugestões (motivo recolhido), cartões enxutos e "Relatório semanal" recolhido. Os chips rolam até o cartão.
2. **Água +1** soma um copo e mostra "Hoje: N de M copos". **Registrar peso** abre o detalhe de composição com o formulário aberto.
3. **Perfil sem dados**: só "Sem dados ainda · 5" (recolhido); ao abrir, uma ação "Registrar" por categoria.
4. **Detalhe**: seletor de 7 e 30 dias, gráfico, registros com data e origem, "Registrar hoje" (teclado escuro, campo sempre visível), explicação no "i" e no fim.
5. **Texto maior** (Ajustes > Acessibilidade > Tamanho do texto, até 150%) e iPhone pequeno: nada cortado nem sobreposto.
6. **VoiceOver**: cada cartão é lido como um item (categoria, valor, relação com a média, atualizado); com "Reduzir movimento" a rolagem dos chips não anima.
7. **Menor de 18**: sem Composição, sem "Conectar", "Registrar sono" no lugar do peso, só hábitos.


---

# conta-obrigatoria (conta obrigatória, menores a partir de 13 anos e dados por conta; empilhada na google-ios-fix)

Escada: `ajuda-textos` -> `conta-ui` -> `conta-firebase` -> `fix-auth-fundo` -> `saude-categorias` -> `ajustes-perfil` -> `saude-ux` -> `google-ios-fix` -> `conta-obrigatoria`. Nada foi executado (sem push, tag nem deploy).

```
git push -u origin conta-obrigatoria
```

Depois: workflow **android** nessa branch e, passando, **ios** com `upload=false`. O build precisa de `EXPO_PUBLIC_AUTH_ENABLED=true` e `FIREBASE_ENABLED=true` (a conta é obrigatória). Leia a seção 10 de `docs/pendencias-usuario.md` antes de enviar ao TestFlight (conta de teste do revisor, revisão jurídica, política de privacidade).

## O que testar no iPhone

1. **Boas-vindas:** só "Criar conta" e "Entrar" (nenhum "Modo Demo" nem "Continuar sem conta").
2. **Etapa de idade (os três métodos):** crie conta por e-mail, por Google e pela Apple (contas novas). Em todos, a tela "Qual é a sua idade?" vem logo depois do primeiro login e antes do perfil. Teste 12 (mensagem, conta excluída, volta às boas-vindas), 13 e 17 (precisa marcar a autorização; o link abre a Política de Privacidade), 18 e valores inválidos (vazio, letras, 0, 120).
3. **Onboarding:** nome e objetivos, depois medidas **sem** a pergunta de faixa etária, depois nível.
4. **Menor de 18:** na Saúde, só hábitos, sem "Conectar", sem peso; Perfil mostra "Menor de 18 anos".
5. **Sair e entrar:** com dados na conta A (treino, água), "Sair da conta" leva às boas-vindas sem Alert. Entre com a conta B (nova): ela não vê nada de A. Saia, entre de novo com A: volta direto à Home com tudo de A.
6. **Reabrir o app** com a sessão ativa entra direto na Home.
7. **Perfil:** sem "Resetar todos os dados". No fim, "Sair da conta" e, abaixo, o link pequeno "Excluir minha conta" (VoiceOver, texto grande e área de toque de 44 pt). Excluir pede senha (e-mail) ou reautentica (Google/Apple; a Apple revoga o token) e depois volta às boas-vindas.
8. **Quem já usava o app sem conta:** ao entrar pela primeira vez, os treinos de antes aparecem (depois da etapa de idade).


---

# saude-healthkit (Apple Saúde / HealthKit, só leitura; empilhada na conta-obrigatoria)

```
git push -u origin saude-healthkit
```

Depois: crie a variável `HEALTH_INTEGRATION_ENABLED=true` e ligue a capability HealthKit do App ID (seção 12 de `docs/pendencias-usuario.md`); rode o **ios.yml com `sign_archive=true`**. O **android.yml não muda** e não recebe a flag. O job `ios-prebuild-healthkit` do `ci.yml` roda sozinho no push. Roteiro de teste com iPhone + Apple Watch: `docs/saude.md`.
