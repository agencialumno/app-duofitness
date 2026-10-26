// Imagens da vitrine. Cada require precisa ser explícito (o Metro resolve na hora do bundle), então um
// arquivo que não existir quebra o build: só adicione aqui o que estiver em assets/marketplace/.
// Itens sem imagem (imagem: null em marketplace.js) mostram o placeholder (MarketplaceImage).
//
// Como adicionar: coloque o JPEG em assets/marketplace/ (até ~200 KB, extensão .jpg e conteúdo JPEG de verdade,
// proporção 3:2, ex.: 1200x800; PNG só para ilustração com transparência), acrescente a linha abaixo e use a
// chave em `imagem`. "node scripts/check-pngs.mjs" confere o arquivo. Hoje todas são artes de EXEMPLO
// (docs/midia-pendente.md): troque pelo material do parceiro quando existir.
export const MARKETPLACE_IMAGES = {
  'kit-acessorios': require('../../assets/marketplace/kit-acessorios.jpg'),
  'squeeze': require('../../assets/marketplace/squeeze.jpg'),
  'corda': require('../../assets/marketplace/corda.jpg'),
  'whey': require('../../assets/marketplace/whey.jpg'),
  'proteina': require('../../assets/marketplace/proteina.jpg'),
  'suplemento': require('../../assets/marketplace/suplemento.jpg'),
  'nutri': require('../../assets/marketplace/nutri.jpg'),
  'colecao-receitas': require('../../assets/marketplace/colecao-receitas.jpg'),
  'avaliacao': require('../../assets/marketplace/avaliacao.jpg'),
  'personal-trainer': require('../../assets/marketplace/personal-trainer.jpg'),
};

export function getMarketplaceImage(key) {
  return (key && MARKETPLACE_IMAGES[key]) || null;
}
