// Regras compartilhadas dos testes de texto (notes, dicas, exibição de notas antigas).
// Notes e dicas: rígido (também barra promessas e adjetivos de resultado)
export const PROIBIDOS_NOTAS =
  /dieta|calor[ií]a|kcal|d[eé]ficit|emagre|perder peso|perda de peso|queim|jejum|\bdose\b|dosag|suplement|resultado|progredir r[aá]pid|mais r[aá]pid[oa] que|r[aá]pidamente|garant|milagr|excelente|essencial|\bideal\b|ideais|perfeit|melhora (o|a|seu|sua)|mais efic|gera mais|transform|em \d+ (dias|semanas|meses)/i;
// Textos de exercício (dicas e passo a passo): só o núcleo (aqui "ideal para começar" é orientação, não promessa)
export const PROIBIDOS_NUCLEO = /dieta|calor[ií]a|kcal|d[eé]ficit|emagre|perder peso|queim|jejum|\bdose\b|dosag|suplement|resultado|garant|milagr/i;

