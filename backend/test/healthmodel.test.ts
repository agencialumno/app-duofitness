// healthModel.js: amostras por categoria, origem, fuso e unidade; agregação por dia e semana; ausente nunca vira zero.
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as M from '../../src/utils/healthModel.js';

const NOW = new Date(2026, 5, 10, 12); // quarta, 10/06/2026
const key = (off: number) => { const d = new Date(2026, 5, 10 + off, 12); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const S = (metric: string, value: number, off: number, source = 'manual', extra: Record<string, unknown> = {}) => ({ metric, value, date: key(off), source, tz: 'America/Sao_Paulo', ...extra });

describe('amostras', () => {
  it('toda métrica pertence a uma categoria e a ordem das categorias é a da tela', () => {
    expect(M.CATEGORIES.map((c: { id: string }) => c.id)).toEqual(['body', 'activity', 'sleep', 'heart', 'hydration']);
    for (const [id, m] of Object.entries(M.METRICS) as [string, { category: string; unit: string }][]) {
      expect(M.getCategory(m.category).metrics, id).toContain(id);
    }
    expect(Object.keys(M.METRICS)).toHaveLength(12);
  });

  it('as origens são as quatro pedidas, com rótulo em português', () => {
    expect(M.SOURCES).toEqual(['manual', 'apple_saude', 'health_connect', 'exemplo']);
    expect(M.SOURCE_LABELS.exemplo).toBe('Dados de exemplo');
    expect(M.SOURCE_LABELS.apple_saude).toBe('Apple Saúde');
  });

  it('makeSample guarda métrica, valor, unidade, data, fuso e origem', () => {
    expect(M.makeSample(S('steps', 8420, 0))).toEqual({ metric: 'steps', value: 8420, unit: 'passos', date: key(0), tz: 'America/Sao_Paulo', source: 'manual' });
    expect(M.makeSample(S('weight', 78.46, 0, 'apple_saude', { at: '2026-06-10T07:00:00.000Z' }))).toMatchObject({ value: 78.5, unit: 'kg', source: 'apple_saude', at: '2026-06-10T07:00:00.000Z' });
  });

  it('aceita texto com vírgula e usa o fuso do aparelho quando não vem', () => {
    const s = M.makeSample({ metric: 'weight', value: '78,5', date: key(0), source: 'manual' });
    expect(s.value).toBe(78.5);
    expect(typeof s.tz).toBe('string');
    expect(s.tz.length).toBeGreaterThan(0);
  });

  it.each([
    ['métrica desconhecida', { metric: 'visceral_fat', value: 5, date: key(0), source: 'manual' }],
    ['valor fora da faixa (peso)', { metric: 'weight', value: 20, date: key(0), source: 'manual' }],
    ['valor negativo', { metric: 'steps', value: -1, date: key(0), source: 'manual' }],
    ['NaN', { metric: 'steps', value: NaN, date: key(0), source: 'manual' }],
    ['texto vazio', { metric: 'steps', value: '', date: key(0), source: 'manual' }],
    ['origem desconhecida', { metric: 'steps', value: 10, date: key(0), source: 'fitbit' }],
    ['data inválida', { metric: 'steps', value: 10, date: '2026-02-30', source: 'manual' }],
    ['unidade errada', { metric: 'weight', value: 70, unit: 'lb', date: key(0), source: 'manual' }],
    ['FC fora da faixa', { metric: 'resting_hr', value: 300, date: key(0), source: 'manual' }],
    ['nulo', null],
    ['número solto', 7],
  ])('rejeita: %s', (_n, input) => {
    expect(M.makeSample(input)).toBeNull();
  });

  it('zero é um valor válido quando registrado (0 passos, 0 copos); o que não vale é inventar zero', () => {
    expect(M.makeSample(S('steps', 0, 0)).value).toBe(0);
    expect(M.makeSample(S('water', 0, 0)).value).toBe(0);
  });

  it('normalizeSamples descarta lixo, remove duplicatas (a última vence) e ordena por data', () => {
    const out = M.normalizeSamples([S('steps', 100, -1), S('steps', 200, -1), S('steps', 50, -3), { lixo: true }, null, S('weight', 10, 0)]);
    expect(out.map((s: { date: string; value: number }) => [s.date, s.value])).toEqual([[key(-3), 50], [key(-1), 200]]);
    expect(M.normalizeSamples('nada')).toEqual([]);
    expect(M.normalizeSamples(undefined)).toEqual([]);
  });
});

describe('agregação por dia', () => {
  it('soma os cumulativos do dia (passos), tira a média dos de estado (FC) e usa o último (peso)', () => {
    const list = M.normalizeSamples([
      S('steps', 3000, 0, 'apple_saude', { at: '2026-06-10T09:00:00Z' }), S('steps', 4000, 0, 'apple_saude', { at: '2026-06-10T18:00:00Z' }),
      S('resting_hr', 60, 0, 'manual', { at: '2026-06-10T07:00:00Z' }), S('resting_hr', 64, 0, 'manual', { at: '2026-06-10T21:00:00Z' }),
      S('weight', 80, 0, 'manual', { at: '2026-06-10T07:00:00Z' }), S('weight', 79.5, 0, 'manual', { at: '2026-06-10T20:00:00Z' }),
    ]);
    expect(M.dailyValues(list, 'steps')[0].value).toBe(7000);
    expect(M.dailyValues(list, 'resting_hr')[0].value).toBe(62);
    expect(M.dailyValues(list, 'weight')[0].value).toBe(79.5);
  });

  it('dia sem dado NÃO aparece (não vira zero) e a lista vem em ordem de data', () => {
    const d = M.dailyValues(M.normalizeSamples([S('steps', 10, -5), S('steps', 20, 0)]), 'steps');
    expect(d.map((x: { date: string }) => x.date)).toEqual([key(-5), key(0)]);
    expect(M.dailyValues([], 'steps')).toEqual([]);
    expect(M.dailyValues(M.normalizeSamples([S('steps', 10, 0)]), 'sleep_duration')).toEqual([]);
  });

  it('com duas origens no mesmo dia, vale a de maior prioridade (aparelho > manual > exemplo), sem contar duas vezes', () => {
    const list = M.normalizeSamples([S('steps', 5000, 0, 'manual'), S('steps', 8000, 0, 'apple_saude'), S('steps', 1, 0, 'exemplo')]);
    const d = M.dailyValues(list, 'steps');
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ value: 8000, source: 'apple_saude' });
    expect(M.dailyValues(list, 'steps', { sources: ['manual'] })[0].value).toBe(5000);
  });

  it('hora de dormir atravessa a meia-noite: 23:30 e 00:30 dão 00:00 (não 12:00)', () => {
    const list = M.normalizeSamples([S('bedtime', 23 * 60 + 30, 0, 'manual', { at: '2026-06-10T01:00:00Z' }), S('bedtime', 30, 0, 'manual', { at: '2026-06-10T02:00:00Z' })]);
    expect(M.formatClock(M.dailyValues(list, 'bedtime')[0].value)).toBe('00:00');
  });
});

describe('agregação por semana (segunda a domingo)', () => {
  it('weekStart devolve a segunda-feira do dia local', () => {
    expect(M.weekStart('2026-06-10')).toBe('2026-06-08'); // quarta
    expect(M.weekStart('2026-06-08')).toBe('2026-06-08'); // segunda
    expect(M.weekStart('2026-06-14')).toBe('2026-06-08'); // domingo
    expect(M.weekStart('2026-06-15')).toBe('2026-06-15');
  });
  it('média dos dias que TÊM dado, total e nº de dias; semana sem dado não existe', () => {
    const list = M.normalizeSamples([S('steps', 6000, -2), S('steps', 10000, 0), S('steps', 4000, -9)]);
    const w = M.weeklyValues(list, 'steps');
    expect(w).toEqual([
      { weekStart: '2026-06-01', value: 4000, total: 4000, days: 1 },
      { weekStart: '2026-06-08', value: 8000, total: 16000, days: 2 },
    ]);
    expect(M.weeklyValues([], 'steps')).toEqual([]);
  });
});

describe('janelas, estatísticas e tendência', () => {
  const list = M.normalizeSamples([S('steps', 4000, -6), S('steps', 5000, -5), S('steps', 6000, -1), S('steps', 8000, 0)]);
  it('windowSeries tem UM item por dia, com null onde não há dado', () => {
    const w = M.windowSeries(list, 'steps', { days: 7, now: NOW });
    expect(w).toHaveLength(7);
    expect(w.map((p: { value: number | null }) => p.value)).toEqual([4000, 5000, null, null, null, 6000, 8000]);
    expect(w[6].date).toBe(key(0));
  });
  it('seriesStats ignora os dias sem dado; sem nenhum dado devolve null (nunca zeros)', () => {
    const st = M.seriesStats(M.windowSeries(list, 'steps', { days: 7, now: NOW }));
    expect(st).toMatchObject({ count: 4, min: 4000, max: 8000, sum: 23000, first: 4000, last: 8000 });
    expect(st.avg).toBe(5750);
    expect(M.seriesStats(M.windowSeries([], 'steps', { days: 7, now: NOW }))).toBeNull();
  });
  it('trendOf compara a metade antiga com a nova e respeita a tolerância da métrica', () => {
    const t = M.trendOf(M.windowSeries(list, 'steps', { days: 7, now: NOW }), 'steps');
    expect(t).toMatchObject({ direction: 'up', from: 4500, to: 7000, points: 4 });
    const flat = M.normalizeSamples([S('steps', 5000, -6), S('steps', 5100, -3), S('steps', 5050, 0)]);
    expect(M.trendOf(M.windowSeries(flat, 'steps', { days: 7, now: NOW }), 'steps').direction).toBe('stable');
    const down = M.normalizeSamples([S('weight', 80, -20), S('weight', 79, -2)]);
    expect(M.trendOf(M.windowSeries(down, 'weight', { days: 30, now: NOW }), 'weight').direction).toBe('down');
  });
  it('trendOf exige 2 dias com dado e 3 dias de distância; senão null', () => {
    expect(M.trendOf(M.windowSeries(M.normalizeSamples([S('steps', 1, 0)]), 'steps', { days: 7, now: NOW }), 'steps')).toBeNull();
    expect(M.trendOf(M.windowSeries(M.normalizeSamples([S('steps', 1, -1), S('steps', 99, 0)]), 'steps', { days: 7, now: NOW }), 'steps')).toBeNull();
    expect(M.trendOf([], 'steps')).toBeNull();
  });
  it('latest devolve o dia mais recente com dado, ou null', () => {
    expect(M.latest(list, 'steps')).toMatchObject({ value: 8000, date: key(0) });
    expect(M.latest(list, 'weight')).toBeNull();
  });
});

describe('categorias e origem', () => {
  const list = M.normalizeSamples([S('steps', 100, 0, 'apple_saude'), S('weight', 80, -3, 'manual'), S('weight', 79, -400, 'manual'), S('water', 6, 0, 'exemplo')]);
  it('hasCategoryData: só quando há amostra da categoria', () => {
    expect(M.hasCategoryData(list, 'activity')).toBe(true);
    expect(M.hasCategoryData(list, 'sleep')).toBe(false);
    expect(M.hasCategoryData(list, 'inexistente')).toBe(false);
  });
  it('originOf lista as origens da janela, a do aparelho primeiro; sem dado na janela: null', () => {
    expect(M.originOf(list, 'activity', { days: 7, now: NOW })).toBe('Apple Saúde');
    expect(M.originOf(list, 'body', { days: 30, now: NOW })).toBe('Registro manual');
    expect(M.originOf(list, 'hydration', { days: 7, now: NOW })).toBe('Dados de exemplo');
    expect(M.originOf(list, 'sleep', { days: 30, now: NOW })).toBeNull();
    expect(M.originOf(M.normalizeSamples([S('weight', 79, -400)]), 'body', { days: 30, now: NOW })).toBeNull();
  });
});

describe('formatação em português', () => {
  it('duração, horário e métricas com vírgula decimal', () => {
    expect(M.formatDuration(340)).toBe('5h40');
    expect(M.formatDuration(420)).toBe('7h');
    expect(M.formatDuration(45)).toBe('45 min');
    expect(M.formatClock(23 * 60 + 5)).toBe('23:05');
    expect(M.formatMetric('weight', 78.5)).toBe('78,5 kg');
    expect(M.formatMetric('body_fat', 18.2)).toBe('18,2%');
    expect(M.formatMetric('steps', 8420)).toBe('8.420 passos');
    expect(M.formatMetric('distance', 5.2)).toBe('5,2 km');
    expect(M.formatMetric('resting_hr', 58.4)).toBe('58 bpm');
    expect(M.formatMetric('water', 1)).toBe('1 copo');
    expect(M.formatMetric('water', 6)).toBe('6 copos');
    expect(M.formatMetric('steps', null)).toBeNull();
    expect(M.formatMetric('steps', undefined)).toBeNull();
  });
  it('parseClock aceita "23:30", "6:05" e "23h30"; rejeita o resto', () => {
    expect(M.parseClock('23:30')).toBe(1410);
    expect(M.parseClock('6:05')).toBe(365);
    expect(M.parseClock('23h30')).toBe(1410);
    for (const bad of ['24:00', '12:60', 'abc', '', null, undefined, '1230']) expect(M.parseClock(bad as never), String(bad)).toBeNull();
  });
});
