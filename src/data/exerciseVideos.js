// GERADO por scripts/gen-exercise-media.mjs (npm run gen:media). Não edite à mão.
// Mapa do id do exercício (EXERCISE_DB) para a mídia de demonstração. Cada require é estático (exigência do
// Metro) e só existe para arquivos que estão em assets/exercicios/; sem arquivos, o mapa fica vazio e o app
// mostra o placeholder "Vídeo em breve". Padrão dos arquivos em docs/videos-exercicios.md.

export const EXERCISE_MEDIA = {
};

// Mídia de um exercício ({ video, poster, duracaoSeg, alt }) ou null quando ainda não há arquivo.
export function getExerciseMedia(id) {
  return EXERCISE_MEDIA[id] || null;
}
