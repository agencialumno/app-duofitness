// Recuperação de erros de render (usada pelo ErrorBoundary da raiz). Módulo puro, sem React Native e sem
// navegação nem AppContext: a tela de recuperação precisa funcionar mesmo quando eles estão quebrados.
import { clearAllDuoData } from './duoStorage';

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

// Texto do erro para o log (nunca enviado a lugar nenhum). SÓ o NOME do erro e o CÓDIGO, nunca a mensagem crua: uma exceção pode carregar
// um valor de saúde (peso, batimentos) ou dado da conta na mensagem, e o app não grava isso em log. Nome e código só entram se tiverem o formato
// de um identificador ("TypeError", "auth/network-request-failed"); qualquer outra coisa é descartada.
const SAFE_ID = /^[A-Za-z][\w.:/-]{0,59}$/;
export function describeError(error) {
  if (!error) return 'erro desconhecido';
  if (typeof error !== 'object') return 'erro (valor que não é um Error)';
  const name = typeof error.name === 'string' && SAFE_ID.test(error.name) ? error.name : 'Error';
  const rawCode = error.code;
  const code = (typeof rawCode === 'string' || typeof rawCode === 'number') && SAFE_ID.test(String(rawCode)) ? String(rawCode) : '';
  return code ? `${name} (${code})` : name;
}

// "Recomeçar do zero": apaga TODAS as chaves @duo_* (e só elas). Devolve as chaves removidas.
export async function resetAppData(storage) {
  return clearAllDuoData(storage);
}
