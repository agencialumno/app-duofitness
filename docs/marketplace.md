# Loja (vitrine de parceiros)

A Loja é uma **vitrine**: o app mostra anúncios de parceiros e leva o morador ao WhatsApp ou ao site do parceiro.
**Não há pagamento, carrinho nem entrega no app.** Tudo é local e funciona offline e no Modo Demo.

## Onde fica

- `src/data/marketplace.js`: categorias, itens e funções puras (filtro, destaques, link do WhatsApp). Todos os itens atuais são **exemplos** (`exemplo: true`, título termina com "(exemplo)"). Troque pelos anúncios reais.
- `src/data/marketplaceConfig.js`: número do WhatsApp (`EXPO_PUBLIC_MARKETPLACE_WHATSAPP`, só dígitos com DDI, ex.: `5511999999999`), mensagem pré-preenchida e aviso do parceiro.
- `src/data/marketplaceImages.js`: mapa chave → `require` das imagens em `assets/marketplace/`.
- `src/screens/StoreScreen.js` (Loja, chips por categoria), `StoreDetailScreen.js` (detalhe + botão), `src/components/MarketplaceImage.js` (imagem ou placeholder).
- Navegação: a aba Início é uma pilha (`HomeMain`, `Loja`, `LojaDetalhe`) dentro do `MainNavigator`, para existir também no Modo Demo.
- Home: seção "Para você" (itens com `destaque: true`) e botão "Ver loja".

## Regras

- Sem número configurado, o botão avisa "Contato ainda não configurado" (nada quebra).
- Textos sem promessa de saúde, dosagem ou resultado: o teste `backend/test/marketplace.test.ts` barra termos proibidos.
- Imagens: PNG 16:9 (ex.: 640x360), até ~200 KB, 8 bits, sem entrelaçamento (`node scripts/check-pngs.mjs`). Sem imagem, `imagem: null` mostra o placeholder.
- Não vender nem entregar pelo app: o aviso "Anúncio de parceiro. O Duo Fitness não vende nem entrega estes itens." aparece na Loja e no detalhe.

## Testes

`cd backend && npm test` (inclui `marketplace.test.ts`). Smoke web (Playwright) cobre Home → Loja → filtro → detalhe → WhatsApp.
