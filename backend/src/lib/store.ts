// Armazenamento de contadores (rate limit e gasto diário).
// MemoryStore: por instância da function, NÃO é compartilhado entre instâncias
// serverless, então o limite é "melhor esforço". UpstashStore (Redis REST) é
// compartilhado e deve ser usado em produção.

export interface Store {
  /** Soma `amount` ao contador e devolve o novo valor. TTL é definido na criação da chave. */
  incrBy(key: string, amount: number, ttlSeconds: number): Promise<number>;
  get(key: string): Promise<number>;
}

export class MemoryStore implements Store {
  private data = new Map<string, { value: number; expiresAt: number }>();

  constructor(private now: () => number = Date.now) {}

  private sweep(): void {
    if (this.data.size < 1000) return;
    const t = this.now();
    for (const [k, v] of this.data) if (v.expiresAt <= t) this.data.delete(k);
  }

  async incrBy(key: string, amount: number, ttlSeconds: number): Promise<number> {
    this.sweep();
    const t = this.now();
    const cur = this.data.get(key);
    if (!cur || cur.expiresAt <= t) {
      this.data.set(key, { value: amount, expiresAt: t + ttlSeconds * 1000 });
      return amount;
    }
    cur.value += amount;
    return cur.value;
  }

  async get(key: string): Promise<number> {
    const cur = this.data.get(key);
    return cur && cur.expiresAt > this.now() ? cur.value : 0;
  }
}

export class UpstashStore implements Store {
  constructor(
    private url: string,
    private token: string,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  private async pipeline(commands: (string | number)[][]): Promise<unknown[]> {
    const res = await this.fetchImpl(`${this.url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
    });
    if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
    const out = (await res.json()) as { result?: unknown; error?: string }[];
    return out.map((r) => {
      if (r.error) throw new Error(`Upstash: ${r.error}`);
      return r.result;
    });
  }

  async incrBy(key: string, amount: number, ttlSeconds: number): Promise<number> {
    // EXPIRE ... NX define o TTL só na primeira escrita (janela fixa).
    const [value] = await this.pipeline([
      ['INCRBY', key, Math.round(amount)],
      ['EXPIRE', key, ttlSeconds, 'NX'],
    ]);
    return Number(value);
  }

  async get(key: string): Promise<number> {
    const [value] = await this.pipeline([['GET', key]]);
    return value == null ? 0 : Number(value);
  }
}

export function createStore(
  upstash: { url: string; token: string } | null,
  opts: { isProduction: boolean; warn?: (msg: string) => void } = { isProduction: false },
): Store {
  if (upstash) return new UpstashStore(upstash.url, upstash.token);
  if (opts.isProduction) {
    (opts.warn ?? console.warn)(
      '[duo-backend] AVISO: produção sem UPSTASH_REDIS_REST_URL/TOKEN. Rate limit e teto diário ' +
        'usam memória por instância (não compartilhada) e protegem só parcialmente. Configure o Upstash.',
    );
  }
  return new MemoryStore();
}
