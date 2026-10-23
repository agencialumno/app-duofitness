// Intervalo entre tentativas no próprio app (o servidor também limita): depois de `max` falhas seguidas,
// bloqueia por um tempo que cresce a cada nova rodada (30 s, 60 s, 120 s... até 5 min). Puro: o relógio é injetado.
export function createAttemptLimiter({ max = 5, baseMs = 30000, capMs = 300000, now = () => Date.now() } = {}) {
  let failures = 0;
  let rounds = 0;
  let lockedUntil = 0;
  return {
    // segundos que faltam (0 = liberado)
    remainingSeconds() {
      const left = lockedUntil - now();
      return left > 0 ? Math.ceil(left / 1000) : 0;
    },
    canTry() { return lockedUntil <= now(); },
    recordFailure() {
      failures += 1;
      if (failures >= max) {
        lockedUntil = now() + Math.min(baseMs * 2 ** rounds, capMs);
        rounds += 1;
        failures = 0;
      }
    },
    // força um bloqueio (ex.: o servidor respondeu "muitas tentativas")
    lock(ms = baseMs) { lockedUntil = Math.max(lockedUntil, now() + ms); },
    recordSuccess() { failures = 0; rounds = 0; lockedUntil = 0; },
  };
}
