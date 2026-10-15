// Lotação ("Academia agora", src/utils/occupancy.js): faixas, "há X min", provedor Mock determinístico,
// provedor Remote com timeout/fallback, escolha do provedor e melhor horário.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as O from '../../src/utils/occupancy.js';

const REPO = path.resolve(__dirname, '../..');
const at = (h: number, m = 0) => new Date(2026, 5, 10, h, m, 0); // data local fixa

describe('estado por faixa', () => {
  it.each([
    [0, 20, 'Tranquila'],
    [7, 20, 'Tranquila'], // 35%
    [8, 20, 'Moderada'], // 40% (limite)
    [14, 20, 'Moderada'], // 70%
    [15, 20, 'Cheia'], // 75% (limite)
    [20, 20, 'Cheia'],
    [30, 20, 'Cheia'], // acima da capacidade
  ])('%i de %i -> %s', (count, cap, label) => {
    expect(O.getOccupancyState(count, cap).label).toBe(label);
  });

  it('dados inválidos devolvem null (sem estado)', () => {
    expect(O.getOccupancyState(5, 0)).toBeNull();
    expect(O.getOccupancyState(-1, 20)).toBeNull();
    expect(O.getOccupancyState(NaN, 20)).toBeNull();
    expect(O.getOccupancyState(undefined, undefined)).toBeNull();
  });

  it('proporção limitada a 100%', () => {
    expect(O.getOccupancyRatio(40, 20)).toBe(1);
  });
});

describe('atualizado há X min', () => {
  const now = new Date('2026-06-10T12:00:00Z');
  it('formata minutos, horas e dias', () => {
    expect(O.formatUpdatedAgo('2026-06-10T11:59:50Z', now)).toBe('agora');
    expect(O.formatUpdatedAgo('2026-06-10T11:59:00Z', now)).toBe('há 1 min');
    expect(O.formatUpdatedAgo('2026-06-10T11:48:00Z', now)).toBe('há 12 min');
    expect(O.formatUpdatedAgo('2026-06-10T10:00:00Z', now)).toBe('há 2 h');
    expect(O.formatUpdatedAgo('2026-06-08T12:00:00Z', now)).toBe('há 2 dias');
  });
  it('futuro vira agora; inválido vira null', () => {
    expect(O.formatUpdatedAgo('2026-06-10T12:30:00Z', now)).toBe('agora');
    expect(O.formatUpdatedAgo('lixo', now)).toBeNull();
  });
});

describe('MockProvider', () => {
  it('é determinístico: mesma hora, mesmo resultado, e marcado como mock', async () => {
    const a = await O.createMockProvider({ now: () => at(18, 2) }).getOccupancy('demo');
    const b = await O.createMockProvider({ now: () => at(18, 2) }).getOccupancy('demo');
    expect(a).toEqual(b);
    expect(a.source).toBe('mock');
    expect(a.capacity).toBe(20);
  });

  it('valores plausíveis: 0 <= count <= capacidade em todas as horas, madrugada vazia, pico à noite', async () => {
    for (let h = 0; h < 24; h++) {
      const r = await O.createMockProvider({ now: () => at(h) }).getOccupancy();
      expect(r.count).toBeGreaterThanOrEqual(0);
      expect(r.count).toBeLessThanOrEqual(r.capacity);
    }
    expect((await O.createMockProvider({ now: () => at(3) }).getOccupancy()).count).toBe(0);
    expect(O.getOccupancyState((await O.createMockProvider({ now: () => at(19) }).getOccupancy()).count, 20).label).toBe('Cheia');
    expect(O.getOccupancyState((await O.createMockProvider({ now: () => at(15) }).getOccupancy()).count, 20).label).toBe('Tranquila');
  });

  it('updatedAt fica até 4 min antes do relógio', async () => {
    for (const m of [0, 3, 4, 5, 9, 59]) {
      const now = at(10, m);
      const r = await O.createMockProvider({ now: () => now }).getOccupancy();
      const diff = (now.getTime() - new Date(r.updatedAt).getTime()) / 60000;
      expect(diff).toBeGreaterThanOrEqual(0);
      expect(diff).toBeLessThanOrEqual(4);
    }
  });
});

describe('RemoteProvider', () => {
  const ok = (body: unknown, status = 200) => async () => ({ ok: status === 200, status, json: async () => body });

  it('lê o endpoint /occupancy/<gymId> e marca source remote', async () => {
    let called = '';
    const p = O.createRemoteProvider({
      baseUrl: 'https://api.exemplo.com/',
      fetchImpl: async (url: string) => {
        called = url;
        return { ok: true, json: async () => ({ count: 6, capacity: 24, updatedAt: '2026-06-10T12:00:00Z' }) };
      },
    });
    expect(await p.getOccupancy('demo')).toEqual({ count: 6, capacity: 24, updatedAt: '2026-06-10T12:00:00Z', source: 'remote' });
    expect(called).toBe('https://api.exemplo.com/occupancy/demo');
  });

  it('não repassa campos extras da resposta (só agregados)', async () => {
    const p = O.createRemoteProvider({
      baseUrl: 'https://x',
      fetchImpl: ok({ count: 3, capacity: 10, updatedAt: '2026-06-10T12:00:00Z', users: ['Maria'], cpf: '1' }),
    });
    expect(Object.keys(await p.getOccupancy('demo')).sort()).toEqual(['capacity', 'count', 'source', 'updatedAt']);
  });

  it('fallback: erro de rede, HTTP 500, JSON inválido e campos faltando devolvem null', async () => {
    const mk = (fetchImpl: unknown) => O.createRemoteProvider({ baseUrl: 'https://x', fetchImpl });
    expect(await mk(async () => { throw new Error('rede'); }).getOccupancy('demo')).toBeNull();
    expect(await mk(ok({}, 500)).getOccupancy('demo')).toBeNull();
    expect(await mk(async () => ({ ok: true, json: async () => { throw new Error('json'); } })).getOccupancy('demo')).toBeNull();
    expect(await mk(ok({ count: 3 })).getOccupancy('demo')).toBeNull();
    expect(await mk(ok({ count: -1, capacity: 10, updatedAt: '2026-06-10T12:00:00Z' })).getOccupancy('demo')).toBeNull();
    expect(await mk(ok({ count: 1, capacity: 0, updatedAt: '2026-06-10T12:00:00Z' })).getOccupancy('demo')).toBeNull();
  });

  it('timeout: resposta que não chega vira null dentro do prazo', async () => {
    const p = O.createRemoteProvider({ baseUrl: 'https://x', timeoutMs: 50, fetchImpl: () => new Promise(() => {}) });
    const t0 = Date.now();
    expect(await p.getOccupancy('demo')).toBeNull();
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it('sem baseUrl ou sem fetch devolve null sem lançar', async () => {
    expect(await O.createRemoteProvider({ baseUrl: '' }).getOccupancy('demo')).toBeNull();
    expect(await O.createRemoteProvider({ baseUrl: 'https://x', fetchImpl: null }).getOccupancy('demo')).toBeNull();
  });

  it('escapa o gymId na URL', async () => {
    let called = '';
    const p = O.createRemoteProvider({ baseUrl: 'https://x', fetchImpl: async (u: string) => { called = u; return { ok: false }; } });
    await p.getOccupancy('a/b?c');
    expect(called).toBe('https://x/occupancy/a%2Fb%3Fc');
  });
});

describe('selectProvider', () => {
  const base = { apiUrl: 'https://api.exemplo.com', remoteFlag: 'true' };
  it('remoto só com URL, flag ligada e fora do Modo Demo', () => {
    expect(O.selectProvider(base).source).toBe('remote');
    expect(O.selectProvider({ ...base, remoteFlag: '1' }).source).toBe('remote');
  });
  it('usa o mock sem URL, com flag desligada/vazia ou no Modo Demo', () => {
    expect(O.selectProvider({ ...base, apiUrl: '' }).source).toBe('mock');
    expect(O.selectProvider({ ...base, remoteFlag: '' }).source).toBe('mock');
    expect(O.selectProvider({ ...base, remoteFlag: 'false' }).source).toBe('mock');
    expect(O.selectProvider({ ...base, isDemo: true }).source).toBe('mock');
    expect(O.selectProvider({}).source).toBe('mock');
  });
  it('no Modo Demo nenhuma chamada de rede acontece', async () => {
    let calls = 0;
    const p = O.selectProvider({ ...base, isDemo: true, fetchImpl: async () => { calls++; return { ok: false }; } });
    await p.getOccupancy('demo');
    expect(calls).toBe(0);
  });
});

describe('melhor horário', () => {
  it('mock: pega a hora mais tranquila entre as próximas e mantém o rótulo de origem', async () => {
    const p = O.createMockProvider();
    const best = await O.getBestTime(p, 'demo', { now: at(8, 0) });
    expect(best.source).toBe('mock');
    expect(best.tomorrow).toBe(false);
    expect(best.hour).toBeGreaterThan(8);
    expect(best.hour).toBe(15); // curva: 15h = 20%, a menor entre 9h e 21h
    expect(best.state.label).toBe('Tranquila');
  });

  it('depois do fechamento, sugere o melhor horário de amanhã', async () => {
    const best = await O.getBestTime(O.createMockProvider(), 'demo', { now: at(23, 0) });
    expect(best.tomorrow).toBe(true);
  });

  it('sem previsão (remote falhou ou provedor sem forecast) devolve null', async () => {
    const remote = O.createRemoteProvider({ baseUrl: 'https://x', fetchImpl: async () => { throw new Error('x'); } });
    expect(await O.getBestTime(remote)).toBeNull();
    expect(await O.getBestTime({ source: 'x', getOccupancy: async () => null })).toBeNull();
  });

  it('remote com previsão válida', async () => {
    const remote = O.createRemoteProvider({
      baseUrl: 'https://x',
      fetchImpl: async () => ({ ok: true, json: async () => ({ capacity: 10, hours: [{ hour: 9, count: 9 }, { hour: 14, count: 1 }, { hour: 19, count: 8 }] }) }),
    });
    const best = await O.getBestTime(remote, 'demo', { now: at(8) });
    expect(best.hour).toBe(14);
    expect(best.source).toBe('remote');
  });
});

describe('arquivos do app', () => {
  it('occupancy.js é puro: não importa React Native nem Expo', () => {
    const src = readFileSync(path.join(REPO, 'src/utils/occupancy.js'), 'utf8');
    expect(src).not.toMatch(/from\s+['"](react|expo|@expo|react-native)/);
  });
  it('a flag remota nunca vem ligada por padrão no .env.example', () => {
    const env = readFileSync(path.join(REPO, '.env.example'), 'utf8');
    expect(env).not.toMatch(/^EXPO_PUBLIC_OCCUPANCY_REMOTE=(true|1)/m);
  });
});
