// Imagens dos banners do carrossel (marketplaceBanners.js). Cada require precisa ser explícito (o Metro resolve
// na hora do bundle): só adicione aqui o que estiver em assets/marketplace/. Formato: JPEG 3:2, 1200x800,
// até ~200 KB (teto 300 KB), extensão .jpg e conteúdo JPEG de verdade ("node scripts/check-pngs.mjs" confere).
// Reproduza com: python scripts/optimize-marketplace-images.py (docs/marketplace.md).
export const BANNER_IMAGES = {
  'banner-vitrine': require('../../assets/marketplace/banner-vitrine.jpg'),
  'banner-treino': require('../../assets/marketplace/banner-treino.jpg'),
  'banner-anuncie': require('../../assets/marketplace/banner-anuncie.jpg'),
};

export function getBannerImage(key) {
  return (key && BANNER_IMAGES[key]) || null;
}
