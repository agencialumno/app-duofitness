// Banners do topo do marketplace (carrossel). Dados puros, sem React nem imagens, para os testes rodarem em Node.
// As imagens ficam em marketplaceBannerImages.js (BANNER_IMAGES, cada require explícito) e o arquivo vive em assets/marketplace/.
//
// As artes são PEÇAS DA DUO FITNESS COM O TEXTO DESENHADO NA IMAGEM (3:2, 1200x800 JPEG). Por isso o texto da imagem precisa estar
// em `titulo` (é o que o leitor de tela lê) e a legenda sob a imagem não aparece (`textoNaImagem: true`), para não repetir o texto.
// Troque pelo material do parceiro quando existir (docs/midia-pendente.md).
//
// Campos: id, imagem (chave em BANNER_IMAGES), titulo (EXATAMENTE o texto da imagem), alt (descrição da arte), textoNaImagem,
//   destino ({ rota, params? } do React Navigation), exemplo (true mostra o selo "Exemplo"; as peças de chamada para anunciantes são
//   da própria Duo Fitness, então false).
// Atenção: o NOME do arquivo não combina com o texto de dois deles (veja docs/marketplace.md); o texto abaixo é o que está na imagem.
export const MARKETPLACE_BANNERS = [
  {
    id: 'banner-vitrine',
    imagem: 'banner-vitrine',
    titulo: 'Entre em contato e solicite seu espaço para anunciar',
    alt: 'Arte da Duo Fitness: logotipo e o texto "Entre em contato e solicite seu espaço para anunciar", em branco e amarelo sobre fundo escuro com listras amarelas.',
    textoNaImagem: true,
    destino: { rota: 'AnunciarMarketplace' },
    exemplo: false,
  },
  {
    id: 'banner-treino',
    imagem: 'banner-treino',
    titulo: 'Anuncie seu produto e comece a vender',
    alt: 'Arte da Duo Fitness: logotipo e o texto "Anuncie seu produto e comece a vender", em branco e amarelo sobre fundo escuro.',
    textoNaImagem: true,
    destino: { rota: 'AnunciarMarketplace' },
    exemplo: false,
  },
  {
    id: 'banner-anuncie',
    imagem: 'banner-anuncie',
    titulo: 'Seja um parceiro Duo Fitness',
    alt: 'Arte da Duo Fitness: logotipo, o texto "Seja um parceiro Duo Fitness" e dois braços se cumprimentando em uma academia escura.',
    textoNaImagem: true,
    destino: { rota: 'AnunciarMarketplace' },
    exemplo: false,
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
