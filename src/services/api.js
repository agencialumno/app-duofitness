// Cliente da API do Duo Fitness (backend/ no Vercel).
//
// O app funciona 100% offline: tudo aqui é opcional. Quem chama deve tratar
// qualquer erro caindo no fluxo offline. Se EXPO_PUBLIC_API_URL não estiver
// definida, isApiConfigured() é false e nada de rede é feito.
//
// A chave (EXPO_PUBLIC_APP_KEY) fica dentro do app, então NÃO é segredo: só
// reduz abuso casual. Nunca coloque aqui a chave da Anthropic.
import { createSseParser } from '../utils/sse';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
const APP_KEY = (process.env.EXPO_PUBLIC_APP_KEY || '').trim();

const DEFAULT_FIRST_TOKEN_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_API_FIRST_TOKEN_TIMEOUT_MS) || 10000;
// Depois do primeiro token, se nada chegar por este tempo a conexão é considerada travada.
const IDLE_TIMEOUT_MS = 20000;

export function isApiConfigured() {
  return BASE_URL.length > 0;
}

// Verifica rapidamente se a API responde. Nunca lança: devolve true ou false.
export async function checkHealth(timeoutMs = 4000) {
  if (!isApiConfigured()) return false;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}/api/health`, {
      headers: APP_KEY ? { 'x-app-key': APP_KEY } : {},
      signal: controller?.signal,
    });
    if (!res.ok) return false;
    const json = await res.json();
    return json?.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Conversa em streaming com o personal trainer IA (POST /api/ia/chat, SSE).
 *
 * Usa XMLHttpRequest porque o fetch do React Native (Expo SDK 51) não expõe o
 * corpo da resposta em streaming.
 *
 * Callbacks:
 *   onDelta(text)                 pedaço de texto da IA
 *   onPlan({ plan, collected })   plano já validado pelo servidor
 *   onDone()                      fim normal
 *   onError({ code, message, status?, fallback? })   qualquer falha; chamado no máximo uma vez
 *
 * onDone/onError são mutuamente exclusivos. Se nenhum token chegar em
 * firstTokenTimeoutMs, dispara onError({ code: 'timeout' }).
 * Retorna { abort() }: cancela sem chamar nenhum callback.
 */
export function chatStream({
  messages,
  profile,
  onDelta,
  onPlan,
  onDone,
  onError,
  firstTokenTimeoutMs = DEFAULT_FIRST_TOKEN_TIMEOUT_MS,
}) {
  let finished = false;
  let gotFirstToken = false;
  let offset = 0;
  let timer = null;

  const xhr = new XMLHttpRequest();

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const closeConnection = () => {
    try {
      xhr.abort();
    } catch {
      // ignora
    }
  };
  const fail = (error) => {
    if (finished) return;
    finished = true;
    clear();
    closeConnection();
    onError?.(error);
  };
  const succeed = () => {
    if (finished) return;
    finished = true;
    clear();
    closeConnection();
    onDone?.();
  };
  const armTimer = () => {
    clear();
    const ms = gotFirstToken ? IDLE_TIMEOUT_MS : firstTokenTimeoutMs;
    timer = setTimeout(
      () => fail({ code: gotFirstToken ? 'stalled' : 'timeout', message: 'A IA demorou para responder.' }),
      ms,
    );
  };

  const parser = createSseParser(({ event, data }) => {
    if (finished) return;
    if (event === 'delta') {
      gotFirstToken = true;
      armTimer();
      if (data?.text) onDelta?.(data.text);
    } else if (event === 'plan') {
      gotFirstToken = true;
      armTimer();
      onPlan?.(data);
    } else if (event === 'done') {
      succeed();
    } else if (event === 'error') {
      fail({ code: data?.code || 'upstream_error', message: data?.message || '', fallback: data?.fallback });
    }
  });

  const consumeNewText = () => {
    if (finished || xhr.status !== 200) return;
    const text = xhr.responseText || '';
    if (text.length > offset) {
      const chunk = text.slice(offset);
      offset = text.length;
      parser.push(chunk);
    }
  };

  xhr.onprogress = consumeNewText;
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 3) consumeNewText();
  };
  xhr.onload = () => {
    if (finished) return;
    if (xhr.status !== 200) {
      let code = `http_${xhr.status}`;
      try {
        code = JSON.parse(xhr.responseText)?.error || code;
      } catch {
        // corpo que não é JSON
      }
      fail({ code, status: xhr.status, message: '' });
      return;
    }
    consumeNewText();
    parser.flush();
    // A conexão fechou sem evento "done" nem "error".
    fail({ code: 'stream_ended', message: 'A conexão com a IA foi encerrada.' });
  };
  xhr.onerror = () => fail({ code: 'network', message: 'Sem conexão com a IA.' });
  xhr.ontimeout = () => fail({ code: 'timeout', message: 'A IA demorou para responder.' });

  xhr.open('POST', `${BASE_URL}/api/ia/chat`);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Accept', 'text/event-stream');
  if (APP_KEY) xhr.setRequestHeader('x-app-key', APP_KEY);
  armTimer();
  xhr.send(JSON.stringify({ messages, profile }));

  return {
    abort() {
      if (finished) return;
      finished = true;
      clear();
      closeConnection();
    },
  };
}
