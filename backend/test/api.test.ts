import { describe, expect, it, vi } from 'vitest';
import { MemoryStore, UpstashStore, createStore } from '../src/lib/store.js';
import { costUsd, recordSpend } from '../src/middleware/security.js';
import { APP_VERSION } from '../src/version.js';
import { APP_KEY, fakeClient, makeApp, parseSse, post, testConfig, textDelta, validBody, validToolInput } from './helpers.js';

describe('GET /api/health', () => {
  it('responde ok e versão, sem exigir chave', async () => {
    const { app } = makeApp();
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, version: APP_VERSION });
  });

  it('rota inexistente dá 404 em JSON', async () => {
    const { app } = makeApp();
    const res = await app.request('/api/nada');
    expect(res.status).toBe(404);
  });
});

describe('proteções de /api/ia/chat', () => {
  it('sem x-app-key ou com chave errada: 401', async () => {
    const { app } = makeApp({ client: fakeClient([], { stop_reason: 'end_turn' }) });
    expect((await post(app, validBody(), { 'x-app-key': '' })).status).toBe(401);
    expect((await post(app, validBody(), { 'x-app-key': 'errada' })).status).toBe(401);
  });

  it('corpo acima de 32 KB: 413', async () => {
    const { app } = makeApp({ client: fakeClient([], { stop_reason: 'end_turn' }) });
    const big = JSON.stringify(validBody({ messages: [{ role: 'user', content: 'a'.repeat(40_000) }] }));
    expect((await post(app, big)).status).toBe(413);
  });

  it('corpo inválido: 400 (JSON quebrado, mensagem grande, combo inexistente, última mensagem do assistente)', async () => {
    const { app } = makeApp({ client: fakeClient([], { stop_reason: 'end_turn' }) });
    expect((await post(app, '{nao e json')).status).toBe(400);
    expect((await post(app, validBody({ messages: [{ role: 'user', content: 'a'.repeat(1001) }] }))).status).toBe(400);
    expect((await post(app, validBody({ profile: { combo: 'mega' } }))).status).toBe(400);
    expect((await post(app, validBody({ messages: [{ role: 'user', content: 'Oi' }, { role: 'assistant', content: 'Olá' }] }))).status).toBe(400);
    const many = Array.from({ length: 21 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x' }));
    expect((await post(app, validBody({ messages: many }))).status).toBe(400);
  });

  it('rate limit por IP: excedeu, 429 com Retry-After; outro IP passa', async () => {
    const config = testConfig({ RATE_LIMIT_PER_MIN: '2' });
    const { app } = makeApp({ config, client: fakeClient([textDelta('oi')], { stop_reason: 'end_turn' }) });
    const ip = { 'x-real-ip': '1.1.1.1' };
    expect((await post(app, validBody(), ip)).status).toBe(200);
    expect((await post(app, validBody(), ip)).status).toBe(200);
    const blocked = await post(app, validBody(), ip);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBeTruthy();
    expect((await post(app, validBody(), { 'x-real-ip': '2.2.2.2' })).status).toBe(200);
  });

  it('CORS: origem fora da lista 403; dentro recebe header; preflight 204; app nativo (sem Origin) passa', async () => {
    const { app } = makeApp({ client: fakeClient([textDelta('oi')], { stop_reason: 'end_turn' }) });
    expect((await post(app, validBody(), { origin: 'https://evil.example' })).status).toBe(403);
    const ok = await post(app, validBody(), { origin: 'https://ok.example' });
    expect(ok.status).toBe(200);
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://ok.example');
    const pre = await app.request('/api/ia/chat', { method: 'OPTIONS', headers: { origin: 'https://ok.example' } });
    expect(pre.status).toBe(204);
    expect(pre.headers.get('access-control-allow-headers')).toContain('x-app-key');
    const bad = await app.request('/api/ia/chat', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } });
    expect(bad.status).toBe(403);
    expect((await post(app, validBody())).status).toBe(200);
  });

  it('sem variáveis obrigatórias: 500 server_misconfigured (health continua)', async () => {
    const { app } = makeApp({ config: testConfig({ ANTHROPIC_API_KEY: '', MODEL_INPUT_USD_PER_MTOK: undefined }) });
    const res = await post(app, validBody());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'server_misconfigured' });
    expect((await app.request('/api/health')).status).toBe(200);
  });

  it('teto diário atingido: 429 daily_cap_reached, sem chamar a IA', async () => {
    const client = fakeClient([textDelta('oi')], { stop_reason: 'end_turn' });
    const config = testConfig({ DAILY_SPEND_LIMIT_USD: '1' });
    const { app, store } = makeApp({ config, client });
    await recordSpend(store, 1.0);
    const res = await post(app, validBody());
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'daily_cap_reached' });
    expect(client.calls).toHaveLength(0);
  });

  it('falha no armazenamento: 503 (não arrisca estourar o teto)', async () => {
    const store = { incrBy: async () => 1, get: async () => { throw new Error('boom'); } };
    const { app } = makeApp({ store, client: fakeClient([], { stop_reason: 'end_turn' }) });
    expect((await post(app, validBody())).status).toBe(503);
  });
});

describe('custo', () => {
  it('usa os preços das variáveis e os multiplicadores de cache', () => {
    const config = testConfig(); // 4 / 20, cache escrita 5, leitura 0,4
    const usd = costUsd({ input_tokens: 1_000_000, output_tokens: 500_000, cache_creation_input_tokens: 1_000_000, cache_read_input_tokens: 1_000_000 }, config);
    expect(usd).toBeCloseTo(4 + 10 + 5 + 0.4, 6);
  });

  it('preços de cache podem ser sobrescritos', () => {
    const config = testConfig({ MODEL_CACHE_READ_USD_PER_MTOK: '0.2' });
    expect(costUsd({ cache_read_input_tokens: 1_000_000 }, config)).toBeCloseTo(0.2, 6);
  });
});

describe('POST /api/ia/chat (streaming)', () => {
  it('envia headers de SSE e eventos delta + done', async () => {
    const client = fakeClient([textDelta('Olá, '), textDelta('aluno!')], { stop_reason: 'end_turn', usage: { input_tokens: 1000, output_tokens: 100 } });
    const { app, store } = makeApp({ client });
    const res = await post(app, validBody());
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    expect(res.headers.get('cache-control')).toBe('no-cache, no-transform');
    expect(res.headers.get('x-accel-buffering')).toBe('no');
    const events = parseSse(await res.text());
    expect(events.map((e) => e.event)).toEqual(['delta', 'delta', 'done']);
    expect(events[0]!.data.text).toBe('Olá, ');
    // gasto registrado: (1000*4 + 100*20) / 1e6 = 0,006 USD
    expect(await store.get(`spend:${new Date().toISOString().slice(0, 10)}`)).toBe(6000);
  });

  it('manda ao modelo: prompt só com ids permitidos, ferramenta criar_plano e modelo do ambiente', async () => {
    const client = fakeClient([textDelta('oi')], { stop_reason: 'end_turn' });
    const { app } = makeApp({ client });
    await (await post(app, validBody({ profile: { combo: 'uno', limitation: 'knee', level: 'beginner' } }))).text();
    const call = client.calls[0];
    expect(call.model).toBe('test-model');
    expect(call.tools[0].name).toBe('criar_plano');
    expect(call).not.toHaveProperty('tool_choice'); // tool_choice forçado dá 400 nos modelos novos
    const system: string = call.system[0].text;
    expect(system).toContain('pushup |'); // flexão: bodyweight e iniciante, sem bloqueio de joelho
    expect(system).not.toContain('leg_press_ex |'); // combo UNO não tem leg press
    expect(system).not.toContain('squat |'); // bloqueado por joelho
    expect(system).not.toContain('smith_bench_press |'); // não é iniciante e nem tem Smith no UNO
    expect(call.system[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('plano válido vira evento plan (e depois done)', async () => {
    const ctx = { combo: 'elite' as const, limitation: 'none' as const };
    const client = fakeClient([textDelta('Montando seu plano!')], {
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', name: 'criar_plano', input: validToolInput(ctx) }],
    });
    const { app } = makeApp({ client });
    const events = parseSse(await (await post(app, validBody())).text());
    expect(events.map((e) => e.event)).toEqual(['delta', 'plan', 'done']);
    const plan = events[1]!.data;
    expect(plan.plan.series).toHaveLength(3);
    expect(plan.collected).toMatchObject({ weight: 78, days: 3 });
  });

  it('plano inválido: evento error plan_invalid com o que foi coletado, sem done', async () => {
    const ctx = { combo: 'elite' as const, limitation: 'none' as const };
    const input = validToolInput(ctx, 3);
    const client = fakeClient([], { stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'criar_plano', input }] });
    const { app } = makeApp({ client });
    const events = parseSse(await (await post(app, validBody())).text());
    expect(events.map((e) => e.event)).toEqual(['error']);
    expect(events[0]!.data.code).toBe('plan_invalid');
    expect(events[0]!.data.fallback).toMatchObject({ days: 3, time: 45 });
  });

  it('turnos demais sem plano: avisa o modelo e, se não vier plano, emite error no_plan', async () => {
    const client = fakeClient([textDelta('mais uma pergunta')], { stop_reason: 'end_turn' });
    const config = testConfig({ MAX_USER_TURNS: '2' });
    const { app } = makeApp({ config, client });
    const messages = [
      { role: 'user', content: 'Oi' },
      { role: 'assistant', content: 'Qual seu peso?' },
      { role: 'user', content: '80' },
    ];
    const events = parseSse(await (await post(app, validBody({ messages }))).text());
    expect(events.at(-1)!.event).toBe('error');
    expect(events.at(-1)!.data.code).toBe('no_plan');
    const last = client.calls[0].messages.at(-1);
    expect(JSON.stringify(last.content)).toContain('Instrução do sistema');
  });

  it('abaixo do limite de turnos, texto sem plano é normal (done)', async () => {
    const client = fakeClient([textDelta('Qual seu peso?')], { stop_reason: 'end_turn' });
    const { app } = makeApp({ client });
    const events = parseSse(await (await post(app, validBody())).text());
    expect(events.map((e) => e.event)).toEqual(['delta', 'done']);
  });

  it('erro da Anthropic vira evento error sem vazar detalhes', async () => {
    const client = {
      messages: {
        stream: () => ({
          async *[Symbol.asyncIterator]() {
            throw Object.assign(new Error('sk-secret exploded'), { status: 529 });
          },
          finalMessage: async () => ({}),
        }),
      },
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { app } = makeApp({ client });
    const text = await (await post(app, validBody())).text();
    spy.mockRestore();
    const events = parseSse(text);
    expect(events[0]!.event).toBe('error');
    expect(events[0]!.data.code).toBe('upstream_error');
    expect(text).not.toContain('sk-secret');
  });

  it('recusa (refusal) e corte por tokens viram error', async () => {
    for (const [stop, code] of [['refusal', 'refusal'], ['max_tokens', 'max_tokens']] as const) {
      const { app } = makeApp({ client: fakeClient([], { stop_reason: stop }) });
      const events = parseSse(await (await post(app, validBody())).text());
      expect(events[0]!.data.code).toBe(code);
    }
  });
});

describe('Store', () => {
  it('MemoryStore soma e expira', async () => {
    let t = 0;
    const s = new MemoryStore(() => t);
    expect(await s.incrBy('k', 1, 10)).toBe(1);
    expect(await s.incrBy('k', 2, 10)).toBe(3);
    expect(await s.get('k')).toBe(3);
    t = 11_000;
    expect(await s.get('k')).toBe(0);
    expect(await s.incrBy('k', 1, 10)).toBe(1);
  });

  it('UpstashStore fala o protocolo REST (pipeline com INCRBY + EXPIRE NX)', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([{ result: 5 }, { result: 1 }]), { status: 200 }));
    const s = new UpstashStore('https://redis.example/', 'tok', fetchImpl as unknown as typeof fetch);
    expect(await s.incrBy('chave', 2, 60)).toBe(5);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://redis.example/pipeline');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body as string)).toEqual([['INCRBY', 'chave', 2], ['EXPIRE', 'chave', 60, 'NX']]);
  });

  it('createStore avisa em produção sem Upstash e fica quieto com Upstash ou fora de produção', () => {
    const warn = vi.fn();
    createStore(null, { isProduction: true, warn });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]![0]).toContain('UPSTASH');
    createStore(null, { isProduction: false, warn });
    createStore({ url: 'u', token: 't' }, { isProduction: true, warn });
    expect(warn).toHaveBeenCalledOnce();
  });
});

void APP_KEY;
