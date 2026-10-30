// Fotos de referência (posição inicial e final) dos exercícios. Junta o mapa COMMITADO (exerciseStills.js: só confiança alta) com o arquivo GERADO
// pelo scripts/preparar-fotos-exercicios.mjs (exerciseStillsImages.generated.js: require() estático só do que existe em assets/exercicios-ref/;
// NÃO versionado). Sem esse arquivo (build de CI, por exemplo) o carregamento falha em silêncio e o app cai no que já existe: vídeo ou o visual atual.
// O require fica DENTRO de um try/catch direto: é o formato que o Metro aceita como dependência opcional (o bundle não quebra se o arquivo não existir).
import { getStillFiles } from './exerciseStills';

let cache = null;
function loadImages() {
  if (cache) return cache;
  let mod = null;
  try { mod = require('./exerciseStillsImages.generated'); } catch (e) { mod = null; }
  cache = (mod && mod.STILL_IMAGES) || {};
  return cache;
}

// [fotoInicial, fotoFinal] (fontes de imagem) ou null: precisa estar no mapa E ter as duas imagens no arquivo gerado.
// `images` é injetável para os testes.
export function getExerciseStills(id, images) {
  const files = getStillFiles(id);
  if (!files) return null;
  const pair = (images || loadImages())[id];
  if (!Array.isArray(pair) || pair.length !== 2 || !pair[0] || !pair[1]) return null;
  return pair;
}
