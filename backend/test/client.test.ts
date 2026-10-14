// Testes do cliente do app (src/utils/sse.js e src/services/api.js), que não
// tem runner próprio. Rodam aqui com um XMLHttpRequest falso.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { createSseParser } from '../../src/utils/sse.js';

describe('createSseParser', () => {
  const collect = () => {
    const events: { event: string; data: any }[] = [];
    return { events, parser: createSseParser((e: { event: string; data: any }) => events.push(e)) };
  };

  it('lê eventos completos e ignora comentários', () => {
    const { events, parser } = collect();
    parser.push(': connected\n\nevent: delta\ndata: {"text":"Oi"}\n\nevent: done\ndata: {}\n\n');
    expect(events).toEqual([{ event: 'delta', data: { text: 'Oi' } }, { event: 'done', data: {} }]);
  });

  it('junta evento partido em vários pedaços (inclusive no meio do JSON e do separador)', () => {
    const { events, parser } = collect();
    const full = 'event: delta\ndata: {"text":"Olá, aluno"}\n\nevent: delta\ndata: {"text":"!"}\n\n';
    for (const ch of full) parser.push(ch); // um caractere por vez
    expect(events.map((e) => e.data.text)).toEqual(['Olá, aluno', '!']);
  });

  it('aceita \\r\\n, mesmo quando o \\r e o \\n chegam separados', () => {
    const { events, parser } = collect();
    parser.push('event: delta\r\ndata: {"text":"a"}\r\n\r');
    expect(events).toHaveLength(0);
    parser.push('\n');
    expect(events).toEqual([{ event: 'delta', data: { text: 'a' } }]);
  });

  it('ignora JSON inválido e processa o último evento no flush', () => {
    const { events, parser } = collect();
    parser.push('event: delta\ndata: {quebrado\n\nevent: done\ndata: {}');
    expect(events).toHaveLength(0);
    parser.flush();
    expect(events).toEqual([{ event: 'done', data: {} }]);
  });
});

class FakeXhr {
  static last: FakeXhr;
  status = 0;
  readyState = 0;
  responseText = '';
  aborted = false;
  sent: string | null = null;
  headers: Record<string, string> = {};
  url = '';
  onprogress: (() => void) | null = null;
  onreadystatechange: (() => void) | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  constructor() {
    FakeXhr.last = this;
  }
  open(_m: string, url: string) { this.url = url; }
  setRequestHeader(k: string, v: string) { this.headers[k] = v; }
  send(body: string) { this.sent = body; }
  abort() { this.aborted = true; }
  // helpers dos testes
  chunk(text: string) {
    this.status = 200;
    this.readyState = 3;
    this.responseText += text;
    this.onprogress?.();
  }
  end(status = 200, body?: string) {
    this.status = status;
    if (body !== undefined) this.responseText += body;
    this.readyState = 4;
    this.onload?.();
  }
}

async function loadApi(env: Record<string, string> = {}) {
  vi.resetModules();
  vi.stubEnv('EXPO_PUBLIC_API_URL', 'https://api.example/');
  vi.stubEnv('EXPO_PUBLIC_APP_KEY', 'k123');
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  // @ts-expect-error módulo JS do app, sem tipos
  return (await import('../../src/services/api.js')) as {
    isApiConfigured(): boolean;
    checkHealth(ms?: number): Promise<boolean>;
    chatStream(opts: any): { abort(): void };
  };
}

describe('chatStream (XHR + SSE)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const handlers = () => ({
    onDelta: vi.fn(),
    onPlan: vi.fn(),
    onDone: vi.fn(),
    onError: vi.fn(),
  });

  it('envia URL, chave e corpo; entrega deltas e done, com eventos partidos entre chunks', async () => {
    const api = await loadApi();
    const h = handlers();
    api.chatStream({ messages: [{ role: 'user', content: 'Oi' }], profile: { combo: 'duo' }, ...h });
    const x = FakeXhr.last;
    expect(x.url).toBe('https://api.example/api/ia/chat'); // barra final removida
    expect(x.headers['x-app-key']).toBe('k123');
    expect(JSON.parse(x.sent!)).toEqual({ messages: [{ role: 'user', content: 'Oi' }], profile: { combo: 'duo' } });

    x.chunk(': connected\n\nevent: delta\ndata: {"text":"Ol');
    expect(h.onDelta).not.toHaveBeenCalled();
    x.chunk('á"}\n\nevent: delta\ndata: {"text":"!"}\n\nevent: done\ndata: {}\n\n');
    expect(h.onDelta.mock.calls.map((c) => c[0])).toEqual(['Olá', '!']);
    expect(h.onDone).toHaveBeenCalledOnce();
    expect(h.onError).not.toHaveBeenCalled();
    x.end(); // fechamento depois do done não vira erro
    expect(h.onError).not.toHaveBeenCalled();
  });

  it('entrega o evento plan', async () => {
    const api = await loadApi();
    const h = handlers();
    api.chatStream({ messages: [], profile: {}, ...h });
    FakeXhr.last.chunk('event: plan\ndata: {"plan":{"series":[]},"collected":{"days":3}}\n\nevent: done\ndata: {}\n\n');
    expect(h.onPlan).toHaveBeenCalledWith({ plan: { series: [] }, collected: { days: 3 } });
  });

  it('timeout de 10 s sem primeiro token (comentário de keep-alive não conta)', async () => {
    const api = await loadApi();
    const h = handlers();
    api.chatStream({ messages: [], profile: {}, ...h });
    FakeXhr.last.chunk(': connected\n\n');
    vi.advanceTimersByTime(9_999);
    expect(h.onError).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(h.onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'timeout' }));
    expect(FakeXhr.last.aborted).toBe(true);
  });

  it('timeout do primeiro token é configurável', async () => {
    const api = await loadApi({ EXPO_PUBLIC_API_FIRST_TOKEN_TIMEOUT_MS: '3000' });
    const h = handlers();
    api.chatStream({ messages: [], profile: {}, ...h });
    vi.advanceTimersByTime(3_001);
    expect(h.onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'timeout' }));
  });

  it('depois do primeiro token o timeout é de inatividade (20 s) e é reiniciado a cada evento', async () => {
    const api = await loadApi();
    const h = handlers();
    api.chatStream({ messages: [], profile: {}, ...h });
    const x = FakeXhr.last;
    x.chunk('event: delta\ndata: {"text":"a"}\n\n');
    vi.advanceTimersByTime(15_000);
    x.chunk('event: delta\ndata: {"text":"b"}\n\n');
    vi.advanceTimersByTime(15_000);
    expect(h.onError).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5_001);
    expect(h.onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'stalled' }));
  });

  it('erro HTTP vira onError com o código do servidor', async () => {
    const api = await loadApi();
    const h = handlers();
    api.chatStream({ messages: [], profile: {}, ...h });
    FakeXhr.last.end(429, '{"error":"daily_cap_reached"}');
    expect(h.onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'daily_cap_reached', status: 429 }));
  });

  it('evento error do servidor traz o fallback', async () => {
    const api = await loadApi();
    const h = handlers();
    api.chatStream({ messages: [], profile: {}, ...h });
    FakeXhr.last.chunk('event: error\ndata: {"code":"plan_invalid","message":"x","fallback":{"days":3,"time":45}}\n\n');
    expect(h.onError).toHaveBeenCalledWith({ code: 'plan_invalid', message: 'x', fallback: { days: 3, time: 45 } });
    expect(h.onDone).not.toHaveBeenCalled();
  });

  it('error no_plan chega ao app com o código (a tela cai no roteiro offline)', async () => {
    const api = await loadApi();
    const h = handlers();
    api.chatStream({ messages: [], profile: {}, ...h });
    FakeXhr.last.chunk('event: delta\ndata: {"text":"Vamos lá"}\n\nevent: error\ndata: {"code":"no_plan","message":"A conversa terminou sem plano."}\n\n');
    expect(h.onDelta).toHaveBeenCalledWith('Vamos lá');
    expect(h.onError).toHaveBeenCalledWith({ code: 'no_plan', message: 'A conversa terminou sem plano.', fallback: undefined });
    expect(h.onDone).not.toHaveBeenCalled();
  });

  it('conexão fechada sem done nem error vira erro; falha de rede também', async () => {
    const api = await loadApi();
    const h1 = handlers();
    api.chatStream({ messages: [], profile: {}, ...h1 });
    FakeXhr.last.chunk('event: delta\ndata: {"text":"a"}\n\n');
    FakeXhr.last.end();
    expect(h1.onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'stream_ended' }));

    const h2 = handlers();
    api.chatStream({ messages: [], profile: {}, ...h2 });
    FakeXhr.last.onerror?.();
    expect(h2.onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'network' }));
  });

  it('abort() cancela sem chamar nenhum callback', async () => {
    const api = await loadApi();
    const h = handlers();
    const s = api.chatStream({ messages: [], profile: {}, ...h });
    s.abort();
    expect(FakeXhr.last.aborted).toBe(true);
    vi.advanceTimersByTime(60_000);
    FakeXhr.last.chunk('event: delta\ndata: {"text":"a"}\n\n');
    FakeXhr.last.onerror?.();
    expect(h.onDelta).not.toHaveBeenCalled();
    expect(h.onError).not.toHaveBeenCalled();
    expect(h.onDone).not.toHaveBeenCalled();
  });

  it('isApiConfigured é false sem EXPO_PUBLIC_API_URL e checkHealth devolve false sem rede', async () => {
    vi.resetModules();
    vi.stubEnv('EXPO_PUBLIC_API_URL', '');
    // @ts-expect-error módulo JS do app, sem tipos
    const api = await import('../../src/services/api.js');
    expect(api.isApiConfigured()).toBe(false);
    expect(await api.checkHealth()).toBe(false);
  });

  it('checkHealth: true com {ok:true}, false com erro ou rede caída', async () => {
    const api = await loadApi();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, version: '0.1.0' }))));
    expect(await api.checkHealth()).toBe(true);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
    expect(await api.checkHealth()).toBe(false);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await api.checkHealth()).toBe(false);
  });
});
