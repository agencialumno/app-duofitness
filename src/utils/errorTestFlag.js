// Flag de TESTE para provocar um erro de render e conferir a tela de recuperação (smoke test do Playwright).
// Só existe na WEB, pela URL (?duoForceError=once ou twice). Em iOS e Android nunca liga (não há URL), e
// nenhuma variável de ambiente a ativa: um build de produção do app não consegue ser colocado nesse modo.
// "once": o primeiro erro é provocado e a nova tentativa funciona. "twice": o erro se repete uma vez.
export function parseForceError(search) {
  const m = /[?&]duoForceError=(once|twice)\b/.exec(String(search || ''));
  if (!m) return 0;
  return m[1] === 'twice' ? 2 : 1;
}

export function createForcedError(platformOS, search) {
  let remaining = platformOS === 'web' ? parseForceError(search) : 0;
  return {
    shouldThrow: () => remaining > 0,
    // chamado uma vez por erro capturado pelo boundary (o React pode renderizar de novo antes de capturar)
    consume: () => { if (remaining > 0) remaining -= 1; },
    get remaining() { return remaining; },
  };
}
