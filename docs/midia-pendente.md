# Mídia pendente do marketplace

Toda a mídia do marketplace hoje é de **EXEMPLO**. Cada item traz o selo "Exemplo" no app (os 3 banners são peças da Duo Fitness e não têm o selo). Antes de publicar nas lojas,
cada arte abaixo precisa ser **trocada pelo material real do parceiro** (ou removida) e ter o **direito de uso confirmado**. O repositório é público.

## Regra de substituição

1. Quando existir um parceiro real, peça a ele a arte e a autorização de uso (por escrito).
2. Gere o arquivo no formato da tabela, com o **mesmo nome** (ou novo nome e a chave atualizada), em `assets/marketplace/`.
3. Troque o texto do item em `src/data/marketplace.js` (ou do banner em `src/data/marketplaceBanners.js`) e tire `exemplo: true`.
4. Rode `node scripts/check-pngs.mjs` (confere JPEG de verdade, PNG de verdade e arquivos ausentes) e `npm test` no `backend/`.
5. Nunca renomeie um JPEG para `.png` nem o contrário: o `check-pngs.mjs` falha (um JPEG com extensão `.png` já quebrou um build Android).

## Fotos dos itens (3:2, 1200x800, JPEG, até 200 KB)

| Arquivo | Item (id) | Observação |
|---|---|---|
| `kit-acessorios.jpg` | `acess-kit-treino` | arte com pessoas e texto embutido |
| `squeeze.jpg` | `acess-garrafa` | texto embutido |
| `corda.jpg` | `acess-corda` | pessoa e texto embutido |
| `whey.jpg` | `whey-po` | arte original (preto e amarelo): pote genérico com o rótulo "MARCA EXEMPLO" |
| `proteina.jpg` | `whey-vegetal` | arte original (preto e amarelo): pacote genérico, sem nome nem marca |
| `suplemento.jpg` | `supl-generico` | arte original (preto e amarelo): frasco genérico com o rótulo "MARCA EXEMPLO" |
| `nutri.jpg` | `nutri-consulta` | pessoa, texto e telefone fictício embutidos |
| `colecao-receitas.jpg` | `nutri-receitas` | texto embutido |
| `avaliacao.jpg` | `serv-avaliacao` | pessoa (de costas) e texto embutido |
| `personal-trainer.jpg` | `serv-personal` | pessoa (rosto visível) e texto embutido |

Origem: `whey`, `proteina` e `suplemento` são **artes originais** do projeto (formas geométricas, sem marca real nem rosto; o "MARCA EXEMPLO" é
nome genérico). As outras 7 são artes enviadas pelo dono do projeto como exemplo (originais em PNG fora do git, ~2 MB cada): **confirmar o direito de uso**
de cada uma (pessoas e textos) e trocar por arte própria antes de publicar se não houver confirmação. As artes que traziam nome de marca desenhado
foram substituídas antes do primeiro push, para a marca não entrar no histórico do repositório público.

## Banners do carrossel (3:2, 1200x800, JPEG, até 200 KB)

| Arquivo | Banner (id) | Texto desenhado na imagem |
|---|---|---|
| `banner-vitrine.jpg` | `banner-vitrine` | "Entre em contato e solicite seu espaço para anunciar" |
| `banner-treino.jpg` | `banner-treino` | "Anuncie seu produto e comece a vender" |
| `banner-anuncie.jpg` | `banner-anuncie` | "Seja um parceiro Duo Fitness" (dois braços se cumprimentando) |

Artes enviadas pelo dono do projeto, com o logotipo e o texto da Duo Fitness **desenhados na imagem** (por isso o texto também está em `titulo`, para o leitor de tela). Origem e licença: confirmar (docs/pendencias-usuario.md, seção 16). O banner toca e abre
"Anunciar em nosso marketplace" (`AnunciarMarketplace`). O carrossel não gira sozinho (respeita "Reduzir movimento"). Sem nenhuma imagem, a área some.
Para regravar as imagens: `python scripts/optimize-marketplace-images.py` (docs/marketplace.md).

## Onde mexer

- Itens: `src/data/marketplace.js` (campo `imagem`) e `src/data/marketplaceImages.js` (um `require` por arquivo).
- Banners: `src/data/marketplaceBanners.js` e `src/data/marketplaceBannerImages.js`.
- Item sem imagem mostra o placeholder (fundo escuro com o ícone da categoria).
