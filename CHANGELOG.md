# Registro de mudanças

Todas as mudanças relevantes do Duo Fitness ficam aqui. O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota o [Versionamento Semântico 2.0.0](https://semver.org/lang/pt-BR/) (convenção do app em `docs/versionamento.md`).

> **As builds 1 a 31 foram testes internos anteriores ao versionamento SemVer.** A numeração de build de cada loja segue o `github.run_number` do workflow de cada plataforma (iOS com piso 31, Android com piso 0); a versão pública começa em 1.0.0.

## [Não lançado]

- Versionamento SemVer 2.0.0: versão em `app.json`, prelançamento em `versao.json`, scripts `bump-version` e `check-version`, tela "Sobre" no Perfil e canais de build (dev, beta, rc, store).

## Textos da loja

Modelo do "O que há de novo" (App Store e Google Play). Escreva em português, curto, sem promessas de saúde nem de resultado, e só o que a pessoa percebe no app.

```
Novidades da versão X.Y.Z

• O que ficou melhor: <uma frase>
• O que é novo: <uma frase>
• Correções: <uma frase>

Dúvidas ou sugestões? Fale com a gente pelo suporte do app.
```

Para versões de teste (beta e rc), use: "Versão de teste X.Y.Z-beta.N. Conte o que achou." Veja a regra de cada loja em `docs/versionamento.md`.
