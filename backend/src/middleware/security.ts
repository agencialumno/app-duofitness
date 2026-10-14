import { createHash, timingSafeEqual } from 'node:crypto';
import type { Context, MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { Config } from '../config.js';
import type { Store } from '../lib/store.js';

export function getClientIp(c: Context): string {
  const real = c.req.header('x-real-ip')?.trim();
  if (real) return real;
  const fwd = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
  return fwd || 'unknown';
}

/**
 * CORS restrito. Aplicativo nativo não envia Origin, então passa. Origin
 * presente e fora de ALLOWED_ORIGINS recebe 403. Responde o preflight (OPTIONS).
 */
export function corsGuard(config: Pick<Config, 'allowedOrigins'>): MiddlewareHandler {
  return async (c, next) => {
    const origin = c.req.header('origin');
    if (!origin) return next();

    if (!config.allowedOrigins.includes(origin)) {
      return c.json({ error: 'origin_not_allowed' }, 403);
    }
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Vary', 'Origin');
    if (c.req.method === 'OPTIONS') {
      c.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      c.header('Access-Control-Allow-Headers', 'content-type,x-app-key');
      c.header('Access-Control-Max-Age', '600');
      return c.body(null, 204);
    }
    return next();
  };
}

export function limitBody(maxSize: number): MiddlewareHandler {
  return bodyLimit({
    maxSize,
    onError: (c) => c.json({ error: 'body_too_large' }, 413),
  });
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/**
 * Header x-app-key. Atenção: a chave vai embutida no app, então NÃO é segredo
 * de verdade. Só reduz abuso casual (bots que acham a URL).
 */
export function requireAppKey(config: Pick<Config, 'appKey'>): MiddlewareHandler {
  return async (c, next) => {
    const sent = c.req.header('x-app-key') ?? '';
    if (!config.appKey || !timingSafeEqual(digest(sent), digest(config.appKey))) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    return next();
  };
}

/** Limite por IP, janela fixa de 1 minuto. */
export function rateLimit(config: Pick<Config, 'rateLimitPerMin'>, store: Store, now: () => number = Date.now): MiddlewareHandler {
  return async (c, next) => {
    const minute = Math.floor(now() / 60_000);
    const key = `rl:${getClientIp(c)}:${minute}`;
    let count: number;
    try {
      count = await store.incrBy(key, 1, 90);
    } catch (e) {
      // Se o armazenamento cair, não derrubamos o serviço; o teto diário ainda vale.
      console.error('[rate-limit] store error', e instanceof Error ? e.message : e);
      return next();
    }
    if (count > config.rateLimitPerMin) {
      const retryAfter = 60 - Math.floor((now() % 60_000) / 1000);
      c.header('Retry-After', String(retryAfter));
      return c.json({ error: 'rate_limited' }, 429);
    }
    return next();
  };
}

// ---- Teto diário de gasto -------------------------------------------------

const MICRO = 1_000_000;

export function spendKey(now: () => number = Date.now): string {
  return `spend:${new Date(now()).toISOString().slice(0, 10)}`;
}

export async function isDailyCapReached(config: Pick<Config, 'dailySpendLimitUsd'>, store: Store, now: () => number = Date.now): Promise<boolean> {
  const spentMicro = await store.get(spendKey(now));
  return spentMicro / MICRO >= config.dailySpendLimitUsd;
}

export interface Usage {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

export function costUsd(
  usage: Usage,
  prices: Pick<Config, 'inputUsdPerMTok' | 'outputUsdPerMTok' | 'cacheWriteUsdPerMTok' | 'cacheReadUsdPerMTok'>,
): number {
  return (
    ((usage.input_tokens ?? 0) * prices.inputUsdPerMTok +
      (usage.output_tokens ?? 0) * prices.outputUsdPerMTok +
      (usage.cache_creation_input_tokens ?? 0) * prices.cacheWriteUsdPerMTok +
      (usage.cache_read_input_tokens ?? 0) * prices.cacheReadUsdPerMTok) /
    1_000_000
  );
}

export async function recordSpend(store: Store, usd: number, now: () => number = Date.now): Promise<void> {
  const micro = Math.ceil(usd * MICRO);
  if (micro <= 0) return;
  await store.incrBy(spendKey(now), micro, 3 * 24 * 3600);
}
