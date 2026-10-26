// Imagens dos banners do carrossel (marketplaceBanners.js). Cada require precisa ser explícito (o Metro resolve
// na hora do bundle): só adicione aqui o que estiver em assets/marketplace/. Formato: JPEG 2:1, 1080x540,
// até ~200 KB, extensão .jpg e conteúdo JPEG de verdade ("node scripts/check-pngs.mjs" confere).
// Hoje são artes de EXEMPLO (docs/midia-pendente.md).
export const BANNER_IMAGES = {
  'banner-vitrine': require('../../assets/marketplace/banner-vitrine.jpg'),
  'banner-treino': require('../../assets/marketplace/banner-treino.jpg'),
  'banner-anuncie': require('../../assets/marketplace/banner-anuncie.jpg'),
};

export function getBannerImage(key) {
  return (key && BANNER_IMAGES[key]) || null;
}
