// Recuperação de erros de render (usada pelo ErrorBoundary da raiz). Módulo puro, sem React Native e sem
// navegação nem AppContext: a tela de recuperação precisa funcionar mesmo quando eles estão quebrados.
import { clearAllDuoData } from './demoSession';

// Se o erro volta dentro desta janela depois de "Tentar novamente", é "repetido" e aparece "Recomeçar do zero".
export const REPEAT_WINDOW_MS = 15000;

export function initialState() {
  return { error: null, attempt: 0, retriedAt: null, repeated: false };
}

// getDerivedStateFromError: guarda o erro e marca como repetido se veio logo depois de uma nova tentativa.
export function onCatch(state, error, now = Date.now()) {
  const repeated = state.repeated || (state.retriedAt !== null && now - state.retriedAt <= REPEAT_WINDOW_MS);
  return { ...state, error: error ?? new Error('Erro desconhecido'), repeated };
}

// "Tentar novamente": limpa o erro e remonta a árvore (attempt é a key).
export function onRetry(state, now = Date.now()) {
  return { ...state, error: null, attempt: state.attempt + 1, retriedAt: now };
}

export function offerReset(state) {
  return !!state.error && state.repeated;
}

// Texto do erro para o log (nunca enviado a lugar nenhum).
export function describeError(error) {
  if (!error) return 'erro desconhecido';
  const msg = error.message || String(error);
  return error.name && error.name !== 'Error' ? `${error.name}: ${msg}` : msg;
}

// "Recomeçar do zero": apaga TODAS as chaves @duo_* (e só elas). Devolve as chaves removidas.
export async function resetAppData(storage) {
  return clearAllDuoData(storage);
}
