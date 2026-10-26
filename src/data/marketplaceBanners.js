// Banners do topo do marketplace (carrossel). Dados puros, sem React nem imagens, para os testes rodarem em Node.
// As imagens ficam em marketplaceBannerImages.js (BANNER_IMAGES, cada require explícito) e o arquivo vive em assets/marketplace/.
//
// ⚠️ TODOS OS BANNERS SÃO ARTES DE EXEMPLO (exemplo: true): formas geométricas originais, sem texto desenhado,
// sem logos, marcas, rostos nem fotos de terceiros. Troque pelo material do parceiro quando existir
// (docs/midia-pendente.md). Os textos ficam no app (não na imagem), para leitor de tela e tradução.
//
// Campos: id, imagem (chave em BANNER_IMAGES; 2:1, 1080x540 JPEG), titulo, subtitulo (opcional),
//   alt (descrição da arte para o leitor de tela), destino ({ rota, params? } do React Navigation), exemplo.
export const MARKETPLACE_BANNERS = [
  {
    id: 'banner-vitrine',
    imagem: 'banner-vitrine',
    titulo: 'Vitrine de parceiros',
    subtitulo: 'Itens e serviços para o seu treino',
    alt: 'Arte de exemplo: sacola amarela dentro de um círculo, sobre fundo preto com listras amarelas.',
    destino: { rota: 'AnunciarMarketplace' },
    exemplo: true,
  },
  {
    id: 'banner-treino',
    imagem: 'banner-treino',
    titulo: 'Acessórios para treinar',
    subtitulo: 'Anuncie o seu produto aqui',
    alt: 'Arte de exemplo: halter amarelo dentro de um círculo, sobre fundo preto com listras amarelas.',
    destino: { rota: 'AnunciarMarketplace' },
    exemplo: true,
  },
  {
    id: 'banner-anuncie',
    imagem: 'banner-anuncie',
    titulo: 'Anuncie em nosso marketplace',
    subtitulo: 'Peça o seu espaço de parceiro',
    alt: 'Arte de exemplo: megafone amarelo emitindo ondas, sobre fundo preto.',
    destino: { rota: 'AnunciarMarketplace' },
    exemplo: true,
  },
];

/**
 * Banners que podem aparecer: só os que têm imagem (`resolveImage(chave)` devolve algo). Sem nenhum,
 * a área inteira some (lista vazia). Nunca lança: entrada inválida vira lista vazia.
 */
export function getVisibleBanners(banners, resolveImage) {
  if (!Array.isArray(banners) || typeof resolveImage !== 'function') return [];
  return banners.filter((b) => b && b.id && b.titulo && b.imagem && resolveImage(b.imagem));
}
