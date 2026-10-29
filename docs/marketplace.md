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
- Banners do topo (carrossel paginado, sem giro automático): `src/data/marketplaceBanners.js`, `marketplaceBannerImages.js`, `src/components/MarketplaceBanners.js`; JPEG 2:1 (1080x540), selo "Exemplo", o toque abre `AnunciarMarketplace`. Mídia de exemplo e regra de troca: `docs/midia-pendente.md`.
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

