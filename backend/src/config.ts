// Toda configuração vem de variáveis de ambiente. Nada de segredo no código.

export interface Config {
  anthropicApiKey: string;
  model: string;
  appKey: string;
  allowedOrigins: string[];
  dailySpendLimitUsd: number;
  rateLimitPerMin: number;
  maxUserTurns: number;
  maxOutputTokens: number;
  // Preços por milhão de tokens. Dependem do modelo em ANTHROPIC_MODEL.
  inputUsdPerMTok: number;
  outputUsdPerMTok: number;
  cacheWriteUsdPerMTok: number;
  cacheReadUsdPerMTok: number;
  upstash: { url: string; token: string } | null;
  isProduction: boolean;
  // Variáveis obrigatórias para /api/ia/chat que estão ausentes ou inválidas.
  problems: string[];
}

type Env = Record<string, string | undefined>;

function num(env: Env, name: string): number | undefined {
  const raw = env[name];
  if (raw === undefined || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export function loadConfig(env: Env = process.env): Config {
  const problems: string[] = [];

  const need = (name: string): string => {
    const v = env[name]?.trim();
    if (!v) problems.push(`${name} ausente`);
    return v ?? '';
  };
  const needNum = (name: string): number => {
    const n = num(env, name);
    if (n === undefined || Number.isNaN(n)) {
      problems.push(`${name} ausente ou inválida`);
      return 0;
    }
    return n;
  };
  const optNum = (name: string, fallback: number): number => {
    const n = num(env, name);
    if (n === undefined) return fallback;
    if (Number.isNaN(n)) {
      problems.push(`${name} inválida`);
      return fallback;
    }
    return n;
  };

  const anthropicApiKey = need('ANTHROPIC_API_KEY');
  const model = need('ANTHROPIC_MODEL');
  const appKey = need('APP_KEY');
  const inputUsdPerMTok = needNum('MODEL_INPUT_USD_PER_MTOK');
  const outputUsdPerMTok = needNum('MODEL_OUTPUT_USD_PER_MTOK');

  const upstashUrl = env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = env.UPSTASH_REDIS_REST_TOKEN?.trim();

  return {
    anthropicApiKey,
    model,
    appKey,
    allowedOrigins: (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    dailySpendLimitUsd: optNum('DAILY_SPEND_LIMIT_USD', 5),
    rateLimitPerMin: optNum('RATE_LIMIT_PER_MIN', 10),
    maxUserTurns: optNum('MAX_USER_TURNS', 8),
    maxOutputTokens: optNum('MAX_OUTPUT_TOKENS', 3000),
    inputUsdPerMTok,
    outputUsdPerMTok,
    // Padrão da Anthropic: escrita de cache = 1,25x e leitura = 0,1x do preço de entrada.
    // Se o seu modelo cobra diferente, defina as duas variáveis abaixo.
    cacheWriteUsdPerMTok: optNum('MODEL_CACHE_WRITE_USD_PER_MTOK', inputUsdPerMTok * 1.25),
    cacheReadUsdPerMTok: optNum('MODEL_CACHE_READ_USD_PER_MTOK', inputUsdPerMTok * 0.1),
    upstash: upstashUrl && upstashToken ? { url: upstashUrl, token: upstashToken } : null,
    isProduction: env.VERCEL_ENV === 'production',
    problems,
  };
}
