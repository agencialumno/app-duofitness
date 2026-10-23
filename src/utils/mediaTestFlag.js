// Flag de TESTE (só web, pela URL) para validar o player de vídeo dos exercícios no smoke do Playwright sem
// guardar um vídeo no repositório: ?duoTestVideo=1 usa o endereço de um vídeo de teste que o próprio teste cria
// no navegador (window.__duoTestVideoUri). Em iOS e Android nunca liga (não há URL) e nenhuma variável de
// ambiente a ativa. Mesmo padrão do ?duoForceError (src/utils/errorTestFlag.js).
export function parseTestVideo(search) {
  return /[?&]duoTestVideo=1\b/.test(String(search || ''));
}

// Devolve { uri } ou null. `env` = { platformOS, search, uri } (injetável nos testes).
export function getTestVideoSource({ platformOS, search, uri } = {}) {
  if (platformOS !== 'web' || !parseTestVideo(search)) return null;
  return typeof uri === 'string' && uri.length > 0 ? { uri } : null;
}
