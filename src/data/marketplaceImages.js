// Imagens da vitrine. Cada require precisa ser explícito (o Metro resolve na hora do bundle), então um
// arquivo que não existir quebra o build: só adicione aqui o que estiver em assets/marketplace/.
// Itens sem imagem (imagem: null em marketplace.js) mostram o placeholder (MarketplaceImage).
//
// Como adicionar: coloque o PNG em assets/marketplace/ (até ~200 KB, 8 bits, sem entrelaçamento,
// proporção 16:9, ex.: 640x360), acrescente a linha abaixo e use a chave em `imagem`.
// "node scripts/check-pngs.mjs" confere o arquivo.
export const MARKETPLACE_IMAGES = {
  'exemplo-acessorios': require('../../assets/marketplace/exemplo-acessorios.png'),
};

export function getMarketplaceImage(key) {
  return (key && MARKETPLACE_IMAGES[key]) || null;
}
