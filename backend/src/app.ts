import Anthropic from '@anthropic-ai/sdk';
import { Hono } from 'hono';
import { anonymousAuthenticator, type Authenticator } from './auth/index.js';
import type { Config } from './config.js';
import { MAX_BODY_BYTES } from './ia/request.js';
import type { Store } from './lib/store.js';
import { corsGuard, limitBody, rateLimit, requireAppKey } from './middleware/security.js';
import { iaChatHandler, type ChatClient } from './routes/iaChat.js';
import { APP_VERSION } from './version.js';

export interface AppDeps {
  config: Config;
  store: Store;
  /** Injetável nos testes. Em produção cria o cliente real na primeira chamada. */
  anthropic?: ChatClient;
  auth?: Authenticator;
  now?: () => number;
}

export function createApp(deps: AppDeps): Hono {
  const { config, store } = deps;
  const now = deps.now ?? Date.now;
  const auth = deps.auth ?? anonymousAuthenticator;
  void auth; // fase 2: autenticação de usuário entra aqui

  let real: ChatClient | undefined;
  const getClient = (): ChatClient => {
    if (deps.anthropic) return deps.anthropic;
    real ??= new Anthropic({ apiKey: config.anthropicApiKey }) as unknown as ChatClient;
    return real;
  };

  const app = new Hono();

  app.use('/api/*', corsGuard(config));

  app.get('/api/health', (c) => c.json({ ok: true, version: APP_VERSION }));

  app.post(
    '/api/ia/chat',
    limitBody(MAX_BODY_BYTES),
    requireAppKey(config),
    rateLimit(config, store, now),
    iaChatHandler({ config, store, getClient, now }),
  );

  app.notFound((c) => c.json({ error: 'not_found' }, 404));
  app.onError((err, c) => {
    console.error('[app] erro não tratado', err instanceof Error ? err.name : '');
    return c.json({ error: 'internal_error' }, 500);
  });

  return app;
}
