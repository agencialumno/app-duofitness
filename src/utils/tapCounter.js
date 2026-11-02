// Contador de toques seguidos (puro): `hit()` devolve true quando completa `count` toques, cada um a no máximo `gapMs` do anterior; depois reinicia.
// Usado no texto da versão da tela Sobre (7 toques revelam ou ocultam os detalhes). `now` é injetável nos testes.
export function createTapCounter({ count = 7, gapMs = 2000, now = () => Date.now() } = {}) {
  let n = 0;
  let last = 0;
  return {
    hit() {
      const t = now();
      n = n > 0 && t - last <= gapMs ? n + 1 : 1;
      last = t;
      if (n >= count) { n = 0; return true; }
      return false;
    },
    reset() { n = 0; },
  };
}
