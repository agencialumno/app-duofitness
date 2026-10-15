// Flag EXPO_PUBLIC_EXERCISE_VIDEOS: a área "Como fazer" (vídeo/capa/placeholder) do detalhe do exercício.
// Ligada por padrão; com "false" (ou "0") a área inteira some. Não é segredo: vai dentro do app.
export function isExerciseVideosEnabled(value) {
  const v = String(value ?? '').trim().toLowerCase();
  return v !== 'false' && v !== '0';
}

export const EXERCISE_VIDEOS_ENABLED = isExerciseVideosEnabled(process.env.EXPO_PUBLIC_EXERCISE_VIDEOS);
