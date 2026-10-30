# Marketplace (vitrine de parceiros)

O marketplace é uma **vitrine**: o app mostra anúncios de parceiros e leva o morador ao WhatsApp ou ao site do parceiro.
**Não há pagamento, carrinho nem entrega no app.** Tudo é local e funciona offline.

## Onde fica

- `src/data/marketplace.js`: categorias, itens e funções puras (filtro, destaques, link do WhatsApp). Todos os itens atuais são **exemplos** (`exemplo: true`, título termina com "(exemplo)"). Troque pelos anúncios reais.
- `src/data/marketplaceConfig.js`: número do WhatsApp (`EXPO_PUBLIC_MARKETPLACE_WHATSAPP`, só dígitos com DDI, ex.: `5511999999999`), mensagem pré-preenchida e aviso do parceiro.
- `src/data/marketplaceImages.js`: mapa chave → `require` das imagens em `assets/marketplace/`.
- `src/screens/StoreScreen.js` (Marketplace, chips por categoria), `StoreDetailScreen.js` (detalhe + botão), `src/components/MarketplaceImage.js` (imagem ou placeholder).
- Navegação: a aba Início é uma pilha (`HomeMain`, `Loja`, `LojaDetalhe`; os nomes das rotas e dos arquivos continuam "Loja"/"Store" por dentro, só os textos mudaram) dentro do `MainNavigator`.
- Home: seção "Para você" (itens com `destaque: true`, logo abaixo da Academia agora) e botão "Ver marketplace". A linha de ação rápida **não** tem atalho do marketplace (só Gerador rápido e Criar manualmente): o acesso é pela seção "Para você" e pelo botão "Ver marketplace".

## Regras

- Sem número configurado, o botão avisa "Contato ainda não configurado" (nada quebra).
- Textos sem promessa de saúde, dosagem ou resultado: o teste `backend/test/marketplace.test.ts` barra termos proibidos.
- Imagens dos itens: JPEG 3:2 (1200x800), até ~200 KB, extensão `.jpg` (PNG só para ilustração com transparência; `node scripts/check-pngs.mjs` confere os dois e falha se a extensão não bater com o conteúdo). Sem imagem, `imagem: null` mostra o placeholder.
- Banners do topo (carrossel paginado, sem giro automático): `src/data/marketplaceBanners.js`, `marketplaceBannerImages.js`, `src/components/MarketplaceBanners.js`; JPEG 3:2 (1200x800) com o texto desenhado na imagem, sem legenda repetida, o toque abre `AnunciarMarketplace`. Mídia de exemplo e regra de troca: `docs/midia-pendente.md`.
- Mapa das imagens, proporção e otimização: seção "Mapa das 6 imagens" abaixo.
- Não vender nem entregar pelo app: o aviso "Anúncio de parceiro. O Duo Fitness não vende nem entrega estes itens." aparece no marketplace e no detalhe.

## Testes

`cd backend && npm test` (inclui `marketplace.test.ts`). Smoke web (Playwright) cobre Home → Marketplace → filtro → detalhe → WhatsApp.

## Anunciar em nosso marketplace

Botão destacado no topo e no fim da lista do marketplace. Abre um formulário (rota interna `AnunciarMarketplace`,
`src/screens/AdvertiseScreen.js`) e, depois de "Confira os dados", monta um **e-mail** para a equipe.

- Campos: nicho (nutrição, suplementos, whey e alimentação, acessórios, serviços e personal, ou "Outro" com campo livre),
  nome do responsável, empresa ou marca, WhatsApp, e-mail, cidade ou condomínio de interesse, descrição (até 600
  caracteres, com contador) e link ou Instagram. Obrigatórios: nicho, nome, descrição (mínimo de 20 caracteres) e pelo
  menos um entre WhatsApp e e-mail. O WhatsApp aceita DDD com ou sem máscara (também com +55 ou 0 na frente).
- Destinatário: `MARKETPLACE_CONTACT_EMAIL` em `src/data/advertiseConfig.js` (`contato@duofitnessoficial.com.br`).
- Assunto: `[Marketplace] Pedido de anúncio - <nicho> - <nome>`. Corpo em português com todos os campos.
- "Confirmar" abre `mailto:` com `Linking.openURL` (sem `canOpenURL`). Se falhar, abre a folha de compartilhamento
  (`Share.share`) com o mesmo texto. A URL é mantida abaixo de ~1900 caracteres: se a descrição não couber, ela é
  resumida no e-mail (o app avisa) e a folha de compartilhamento leva o texto completo.
- **Nada é gravado no aparelho** e o app não envia nada por servidor: o usuário envia o e-mail no próprio aplicativo.
- Avisos fixos na tela: análise dos anúncios (sem promessa de cura, resultado garantido ou indicação de dose) e envio
  dos dados por e-mail à equipe Duo Fitness.
- Lógica pura e testada: `src/utils/advertise.js` (`backend/test/advertise.test.ts`).

## Mapa das 6 imagens (branch `marketplace-banners`)

As 6 imagens novas chegaram como **PNG com extensão `.jpg`** (1536x1024, 1,2 a 2,1 MB; o `check-pngs` as recusaria e o AAPT2 também). Foram regravadas como JPEG de verdade, 1200x800 (3:2), baseline, 4:4:4, com `python scripts/optimize-marketplace-images.py --src <pasta dos originais>` (reproduzível; os originais grandes **não** vão para o git). Qualidade 86 a 90 coube no alvo de 200 KB em todas, então o texto ficou nítido e nenhuma precisou do teto de 300 KB.

| Arquivo | Tamanho final | O que a imagem mostra (lido nos pixels) | Onde aparece | Caixa e proporção |
|---|---|---|---|---|
| `banner-vitrine.jpg` | 160 KB | "Entre em contato e solicite seu espaço para anunciar" | Marketplace (`StoreScreen`), carrossel de banners, **1ª página**; toque abre `AnunciarMarketplace` | largura da tela menos as margens, **3:2**, `resizeMode="contain"` |
| `banner-treino.jpg` | 101 KB | "Anuncie seu produto e comece a vender" | idem, 2ª página | idem |
| `banner-anuncie.jpg` | 187 KB | "Seja um parceiro Duo Fitness" (com dois braços se cumprimentando) | idem, 3ª página | idem |
| `suplemento.jpg` | 175 KB | suplemento alimentar em cápsulas ("Compre agora") | item `supl-generico`: lista do Marketplace (cartão 3:2), detalhe do item (3:2, largura cheia) | `MarketplaceImage`, **3:2**, `cover` |
| `proteina.jpg` | 192 KB | "Proteína vegetal" | item `whey-vegetal`: lista, detalhe | idem |
| `whey.jpg` | 190 KB | "Whey Protein" (frasco "PRO NUTRITION", "Garanta o seu") | item `whey-po` (em destaque): lista, detalhe e Home > "Para você" (cartão de 220 pt de largura) | idem |

**O nome do arquivo não combina com o texto de dois banners (nada foi renomeado).** O texto que você atribuiu a `banner-anuncie` ("Entre em contato…") está em `banner-vitrine.jpg`, e o de `banner-vitrine` ("Seja um parceiro…") está em `banner-anuncie.jpg`; `banner-treino` ("Anuncie seu produto…") confere com a atribuição, mas o nome "treino" não descreve o texto. As legendas e os rótulos de acessibilidade seguem o **texto que está na imagem**. Na tela do marketplace os três levam ao formulário de anúncio, então os três textos combinam com a ação; o único problema é de nome. **Proposta de troca de nomes** (arquivos, chaves em `marketplaceBannerImages.js` e ids em `marketplaceBanners.js`): `banner-vitrine` -> `banner-contato`, `banner-treino` -> `banner-anuncie` e `banner-anuncie` -> `banner-parceiro`. Como a ordem do carrossel é a do array, também vale começar por "Seja um parceiro Duo Fitness" (hoje é a 3ª página).

### Proporção e corte

Antes, a caixa do banner era **2:1** com `resizeMode="cover"`: uma imagem 3:2 perderia 25% da altura (12,5% em cima e embaixo), cortando o texto. Agora a caixa é **3:2** com `resizeMode="contain"` (nada é cortado, nem se um arquivo futuro tiver outra proporção, que ganharia só faixas pretas). As fotos de produto já eram 3:2 (`MarketplaceImage`, `cover`): sem corte. Na Home o cartão tem 220 pt de largura, então o texto pequeno da arte (por exemplo as alegações do whey) fica ilegível ali; o cartão traz o título e a descrição em texto. Banners: o texto está desenhado na imagem, então a legenda sob a imagem foi removida (`textoNaImagem: true`) para não repetir; o leitor de tela lê o texto da imagem (`accessibilityLabel`), e o toque abre o formulário de anúncio (`accessibilityHint`).

### Selo "Exemplo"

- Os 3 produtos (`whey-po`, `whey-vegetal`, `supl-generico`) continuam `exemplo: true`: etiqueta "Exemplo" no cartão da lista, "Item de exemplo" no detalhe e, **novo**, o selo "Exemplo" sobre a foto na Home (lá o cartão não tinha etiqueta).
- Os 3 banners passaram a `exemplo: false`: são peças da própria Duo Fitness (logotipo e chamada para anunciantes), então o selo "Banner de exemplo" ficaria errado e cobriria o logotipo. É só voltar `exemplo: true` em `marketplaceBanners.js` se preferir.

### Otimização (limites)

`python scripts/optimize-marketplace-images.py [--src PASTA] [--dst assets/marketplace]` (Pillow): máx. 1200 px de largura, JPEG baseline, 4:4:4, a maior qualidade que cabe em 200 KB; teto de 300 KB se o texto ficar com artefato (o script avisa). O `check-pngs.mjs` já conferia JPEG de verdade; agora também **avisa** acima de 200 KB e **falha** acima de 300 KB para JPEG em `assets/marketplace/` (teste em `pngcheck.test.ts`), porque as imagens enviadas tinham 1 a 2 MB e iriam inteiras para o app.
