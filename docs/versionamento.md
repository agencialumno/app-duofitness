# Versionamento do Duo Fitness (SemVer 2.0.0)

Referência: [Versionamento Semântico 2.0.0](https://semver.org/lang/pt-BR/). Este documento diz como a especificação é aplicada ao app. O histórico de mudanças fica em `CHANGELOG.md`.

## Onde está a versão (fonte única)

| Arquivo | Conteúdo | Quem muda |
|---|---|---|
| `app.json` > `expo.version` | **Núcleo** `MAJOR.MINOR.PATCH` (ex.: `1.0.0`). É o único valor que vai aos campos de versão das lojas | `scripts/bump-version.mjs` |
| `versao.json` | `{ "prerelease": "" | "beta.N" | "rc.N" }` | `scripts/bump-version.mjs` |
| `package.json` > `version` | Igual ao núcleo do `app.json` (sincronizado) | `scripts/bump-version.mjs` |
| `github.run_number` | **Build** de cada plataforma (`versionCode` no Android, `CFBundleVersion` no iOS) | o próprio workflow |

**Nome completo SemVer** = núcleo + `-prelançamento` + `+build`. Exemplo: `1.0.0-beta.1+33`. A build (`+33`) é metadado: não conta na precedência. Só o núcleo vai à `CFBundleShortVersionString` (iOS: só números e pontos) e ao `versionName` (Android).

## O que é a "API pública" deste app

A SemVer exige declarar a API pública. Para um app de consumo ela é o que a pessoa (e os dados dela) esperam que continue funcionando:

1. **A conta:** entrar com e-mail, Google ou Apple; a idade mínima (13) e a autorização do responsável; sair, excluir a conta.
2. **Os dados no aparelho:** as chaves `@duo_*`, os snapshots por conta (`@duoacct:<uid>:snapshot`) e a migração entre formatos (ex.: `@duo_health` para `@duo_health_v2`).
3. **As funcionalidades principais:** montar e seguir a série (A, B e C), o catálogo de exercícios e os combos de equipamentos, a Saúde (Duo Score, água, peso), o marketplace e as integrações de saúde (leitura apenas).

## Quando subir cada parte

| Parte | Quando | Exemplos |
|---|---|---|
| **MAJOR** | Mudança que **quebra** o que a pessoa ou os dados dela esperam: formato de dados sem migração segura, remover uma funcionalidade principal, mudar o modo de entrar na conta de forma incompatível | trocar o armazenamento sem migrar; tirar a série guiada |
| **MINOR** | Funcionalidade **nova** compatível, ou melhoria relevante | uma tela nova; Health Connect; novos exercícios com vídeo |
| **PATCH** | **Correção** compatível, sem funcionalidade nova | texto, acessibilidade, crash, ajuste de layout |

Regras da SemVer que valem aqui: `0.y.z` é desenvolvimento inicial (o app já está em `1.0.0`, então a API pública está declarada); ao subir MINOR zera o PATCH, ao subir MAJOR zera MINOR e PATCH (o `bump-version` faz isso).

## Ciclo beta, rc e versão final

```
1.0.0-beta.1 -> 1.0.0-beta.2 -> ... -> 1.0.0-rc.1 -> 1.0.0-rc.2 -> 1.0.0 (final) -> 1.0.1 ...
```

- **beta.N:** testes internos e de testadores. Pode mudar bastante.
- **rc.N** (candidata a lançamento): congelada, só correções. Se um rc passar sem problema, o **mesmo** conteúdo vira a versão final.
- **final:** sem prelançamento. É a que vai para a loja pública.
- Precedência (item 11 da SemVer): `alpha < beta < rc < versão final`; `beta.2 < beta.11` (número, não texto). **Não se volta** de rc para beta, e o script recusa.
- Comandos: `node scripts/bump-version.mjs beta | rc | release | patch | minor | major` (`--dry-run` só mostra).

## Canais de build e o que cada loja recebe

O canal aparece na tela **Sobre** do Perfil e é definido por `EXPO_PUBLIC_BUILD_CHANNEL` (injetada pelos workflows):

| Canal | Quando | Aparece no app |
|---|---|---|
| `dev` | testes da equipe | versão + nome SemVer completo + branch + commit |
| `beta` | execução manual (padrão) ou tag com `-beta.N` | idem |
| `rc` | tag com `-rc.N` | idem |
| `store` | tag da versão final | só "Versão X.Y.Z (build)" |

| Loja | O que recebe | Campo |
|---|---|---|
| **App Store / TestFlight** | núcleo `1.0.0`; build = `run_number` do `ios.yml` | `CFBundleShortVersionString` / `CFBundleVersion` |
| **Google Play** | núcleo `1.0.0`; build = `run_number` do `android.yml` | `versionName` / `versionCode` |

O prelançamento **não** vai às lojas (elas só aceitam números); ele fica no nome da tag, no `CHANGELOG.md` e na tela Sobre dos canais de teste. Cada loja tem a própria sequência de build, porque cada workflow tem o próprio `run_number`.

## Pisos de build

A build tem de ser **maior** que o piso da plataforma, senão o build falha em segundos (`scripts/check-version.mjs`):

| Plataforma | Piso | Por quê |
|---|---|---|
| iOS | **31** | a maior build já enviada ao TestFlight; as builds 1 a 31 foram testes internos anteriores ao SemVer |
| Android | **0** | nada enviado ainda; teto do Google Play: `versionCode` até 2.100.000.000 |

Sem `OFFSET`: a build é o `run_number` puro.

## Regra de ouro: nunca reutilizar uma versão lançada

Item 3 da SemVer: depois de lançada, a versão **não muda**. Na prática:

- Lançar = criar a tag `vX.Y.Z[-pre]`. Se a tag `vX.Y.Z` do núcleo atual já existe em **outro** commit, o `check-version` falha e manda subir a versão (`patch`, `minor` ou `major`).
- Uma correção depois do lançamento é sempre uma **nova** versão (ex.: `1.0.1`), nunca um retoque na `1.0.0`.
- As tags `v0.1.0` e `v0.1.1` são **anteriores** ao SemVer (apontam para um `app.json` com `1.0.0`, porque a versão vinha da tag): ficam como história e não entram na regra.
- Build number de loja nunca se repete na mesma versão: o `run_number` só cresce.

## Por que os workflows não podem ser renomeados

O `run_number` é contado **por arquivo de workflow**. Renomear `ios.yml` ou `android.yml` reinicia a contagem em 1 e a loja recusa uma build menor (ou repetida) para a mesma versão. Por isso os nomes são fixos e há um aviso no topo de cada arquivo (e um teste confere).

## A tag é só conferência

A versão das lojas vem **sempre do `app.json`**. A tag (`vX.Y.Z[-beta.N]` no Android, `ios-vX.Y.Z[-beta.N]` no iOS) é verificada contra o nome SemVer esperado (`app.json` + `versao.json`, sem o `+build`); se divergir, o build falha com a tag correta na mensagem. Exemplo: `versao.json` = `beta.3` e `app.json` = `1.0.0` exigem a tag `v1.0.0-beta.3`.

## Passo a passo de lançamento

1. **Escolha o tipo** pelo que mudou (tabela acima) e rode `node scripts/bump-version.mjs <tipo>` (ou `beta` / `rc` / `release` dentro do ciclo). Ele atualiza `app.json`, `package.json`, `versao.json` e o `CHANGELOG.md`.
2. **Revise** o `CHANGELOG.md` (a entrada nova sai de "[Não lançado]"): escreva o que mudou para a pessoa, em português.
3. `node scripts/check-version.mjs` (ou `npm run test:all`). Corrija o que falhar.
4. **Commit** e **tag**, com os comandos que o `bump-version` imprimiu: `git tag v<nome>` (Android) e `git tag ios-v<nome>` (iOS). Nada é enviado sozinho.
5. **Publique** (`git push --follow-tags`) só quando decidir. A tag dispara os workflows; o canal sai do prelançamento (final = `store`).
6. **Teste** o resultado: beta e rc no TestFlight / teste interno do Google Play; só então promova.
7. **Textos da loja:** copie o modelo "O que há de novo" do `CHANGELOG.md` ("Textos da loja"), em português, sem promessas de saúde.
8. **Versão final:** `bump-version release`, commit, tag `v<X.Y.Z>`. Depois disso a versão está lançada e **não muda** mais.

Variáveis da build usadas pela tela Sobre: `EXPO_PUBLIC_BUILD_CHANNEL`, `EXPO_PUBLIC_BUILD_BRANCH`, `EXPO_PUBLIC_BUILD_SHA` e `EXPO_PUBLIC_BUILD_PRERELEASE` (as quatro são injetadas pelos workflows; sem elas, em build local, a tela mostra só a versão).
