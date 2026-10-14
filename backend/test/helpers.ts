import { createApp } from '../src/app.js';
import { loadConfig, type Config } from '../src/config.js';
import { allowedExercises, type FilterContext } from '../src/ia/filters.js';
import { MemoryStore, type Store } from '../src/lib/store.js';
import type { ChatClient } from '../src/routes/iaChat.js';

export const APP_KEY = 'test-app-key';

export function testConfig(overrides: Record<string, string | undefined> = {}): Config {
  return loadConfig({
    ANTHROPIC_API_KEY: 'sk-test',
    ANTHROPIC_MODEL: 'test-model',
    APP_KEY,
    MODEL_INPUT_USD_PER_MTOK: '4',
    MODEL_OUTPUT_USD_PER_MTOK: '20',
    ALLOWED_ORIGINS: 'https://ok.example',
    ...overrides,
  });
}

export interface FakeFinal {
  stop_reason: string;
  content?: unknown[];
  usage?: Record<string, number>;
}

export function fakeClient(events: unknown[], final: FakeFinal): ChatClient & { calls: any[] } {
  const calls: any[] = [];
  return {
    calls,
    messages: {
      stream(params: unknown) {
        calls.push(params);
        return {
          async *[Symbol.asyncIterator]() {
            for (const e of events) yield e;
          },
          finalMessage: async () => ({ content: [], usage: {}, ...final }),
        };
      },
    },
  };
}

export function textDelta(text: string) {
  return { type: 'content_block_delta', delta: { type: 'text_delta', text } };
}

export function makeApp(opts: { config?: Config; store?: Store; client?: ChatClient } = {}) {
  const config = opts.config ?? testConfig();
  const store = opts.store ?? new MemoryStore();
  const app = createApp({ config, store, ...(opts.client ? { anthropic: opts.client } : {}) });
  return { app, config, store };
}

export const validBody = (over: Record<string, unknown> = {}) => ({
  messages: [{ role: 'user', content: 'Oi' }],
  profile: { combo: 'elite' },
  ...over,
});

export function post(app: ReturnType<typeof makeApp>['app'], body: unknown, headers: Record<string, string> = {}) {
  return app.request('/api/ia/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-app-key': APP_KEY, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

export interface SseEvent {
  event: string;
  data: any;
}

export function parseSse(text: string): SseEvent[] {
  return text
    .split('\n\n')
    .map((block) => block.trim())
    .filter((block) => block && !block.startsWith(':'))
    .map((block) => {
      let event = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      return { event, data: data ? JSON.parse(data) : null };
    });
}

/** Plano válido: `perSeries` exercícios permitidos (ids diferentes por série). */
export function validToolInput(ctx: FilterContext, perSeries = 6, perfil: Record<string, unknown> = { weight: 78, height: 175, goals: ['gain_muscle'], days: 3, time: 45 }) {
  const ids = allowedExercises(ctx).map((e) => e.id);
  const mk = (serie: string, from: number) => ({
    serie,
    name: `Série ${serie}`,
    focus: 'Foco',
    exercises: ids.slice(from, from + perSeries).map((id) => ({ id, sets: 3, reps: '10–12', rest: 60 })),
  });
  return { perfil, series: [mk('A', 0), mk('B', perSeries), mk('C', perSeries * 2)] };
}
