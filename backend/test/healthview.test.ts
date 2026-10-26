// healthView.js (cartões por categoria) e healthInfoContent.js (ajuda "i"): valor atual, tendência de 7 e 30 dias, origem,
// "sem dados" com a ação certa, texto alternativo do gráfico e termos proibidos.
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as V from '../../src/utils/healthView.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as I from '../../src/data/healthInfoContent.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as H from '../../src/utils/health.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as M from '../../src/utils/healthModel.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as St from '../../src/utils/healthStore.js';

const NOW = new Date(2026, 5, 10, 12);
const key = (off: number) => H.addDays('2026-06-10', off);
const sample = (metric: string, value: number, off: number, source = 'manual') => ({ metric, value, date: key(off), source, tz: 'America/Sao_Paulo' });
const L = (...xs: unknown[]) => M.normalizeSamples(xs.flat());
const days = (metric: string, values: number[], source = 'manual') => values.map((v, i) => sample(metric, v, -(values.length - 1 - i), source));

describe('cartão com dados', () => {
  const samples = L(days('steps', [4000, 5000, 6000, 8000], 'apple_saude'));
  const v = V.buildCategoryView({ category: 'activity', samples, now: NOW });
  it('valor atual (hoje), tendência de 7 e 30 dias e origem', () => {
    expect(v.hasData).toBe(true);
    expect(v.current).toEqual({ text: '8.000 passos', sub: 'Hoje' });
    expect(v.trends.d7.text).toBe('7 dias: subindo 2.500 passos');
    expect(v.trends.d30.text).toBe('30 dias: subindo 2.500 passos');
    expect(v.origin).toBe('Apple Saúde');
    expect(v.empty).toBeNull();
    expect(v.series.d7).toHaveLength(7);
    expect(v.series.d30).toHaveLength(30);
  });
  it('a descrição para leitor de tela resume valor, tendências e origem', () => {
    expect(v.a11y).toContain('Atividade.');
    expect(v.a11y).toContain('8.000 passos, hoje.');
    expect(v.a11y).toContain('7 dias: subindo 2.500 passos.');
    expect(v.a11y).toContain('Origem: Apple Saúde.');
    expect(v.a11y).toContain('Toque para ver o detalhe.');
  });
  it('último registro de outro dia mostra a data; categorias com valores extras', () => {
    const w = V.buildCategoryView({ category: 'body', samples: L(sample('weight', 78.5, -3), sample('body_fat', 18.2, -3), sample('lean_mass', 60.1, -10)), now: NOW });
    expect(w.current).toEqual({ text: '78,5 kg', sub: `Em ${V.shortDate(key(-3))}` });
    expect(w.extra.map((e: { label: string; text: string }) => `${e.label}: ${e.text}`)).toEqual(['% de gordura: 18,2%', 'Massa magra: 60,1 kg']);
  });
  it('sono: valor da última noite e média de 7 dias', () => {
    const s = V.buildCategoryView({ category: 'sleep', samples: L(days('sleep_duration', [340, 400, 440])), now: NOW });
    expect(s.current.text).toBe('7h20');
    expect(s.extra[0]).toEqual({ label: 'Média de 7 dias', text: '6h33', when: '3 noites' });
  });
  it('hidratação: copos de hoje contra a meta', () => {
    const w = V.buildCategoryView({ category: 'hydration', samples: L(sample('water', 6, 0)), now: NOW, waterGoal: 8 });
    expect(w.current).toEqual({ text: '6 de 8 copos', sub: 'Hoje' });
  });
  it('tendência neutra: estável quando a variação é pequena; "sem tendência" com poucos dias; nunca julga', () => {
    const flat = V.buildCategoryView({ category: 'activity', samples: L(days('steps', [5000, 5100, 5050, 5020])), now: NOW });
    expect(flat.trends.d7.text).toBe('7 dias: estável');
    const poucos = V.buildCategoryView({ category: 'activity', samples: L(sample('steps', 5000, 0)), now: NOW });
    expect(poucos.trends.d7.text).toBe('7 dias: sem tendência ainda (faltam dias com registro)');
    for (const t of [v.trends.d7.text, flat.trends.d7.text, poucos.trends.d7.text]) expect(t).not.toMatch(/bom|ruim|melhor|pior|ótimo|péssimo/i);
  });
});

describe('sem dados: a ação certa', () => {
  it('categoria vazia: mensagem do que falta e ação "Registrar"', () => {
    for (const id of ['body', 'activity', 'sleep', 'heart', 'hydration']) {
      const v = V.buildCategoryView({ category: id, samples: [], now: NOW });
      expect(v.hasData, id).toBe(false);
      expect(v.current).toBeNull();
      expect(v.trends).toEqual({ d7: null, d30: null });
      expect(v.origin).toBeNull();
      expect(v.empty.message.startsWith('Sem '), id).toBe(true);
      expect(v.empty.action).toEqual({ type: 'register', label: 'Registrar' });
      expect(v.a11y).toContain('sem dados');
    }
  });
  it('com a integração ligada e plataforma suportada, a ação é "Conectar" (exceto hidratação, que é manual)', () => {
    expect(V.buildCategoryView({ category: 'sleep', samples: [], now: NOW, integrationEnabled: true, platform: 'ios' }).empty.action).toEqual({ type: 'connect', label: 'Conectar Apple Saúde' });
    expect(V.buildCategoryView({ category: 'sleep', samples: [], now: NOW, integrationEnabled: true, platform: 'android' }).empty.action).toEqual({ type: 'connect', label: 'Conectar Health Connect' });
    expect(V.buildCategoryView({ category: 'hydration', samples: [], now: NOW, integrationEnabled: true, platform: 'ios' }).empty.action.type).toBe('register');
    expect(V.buildCategoryView({ category: 'sleep', samples: [], now: NOW, integrationEnabled: true, platform: 'web' }).empty.action.type).toBe('register');
    expect(V.buildCategoryView({ category: 'sleep', samples: [], now: NOW, integrationEnabled: false, platform: 'ios' }).empty.action.type).toBe('register');
  });
  it('categoria desconhecida: null', () => {
    expect(V.buildCategoryView({ category: 'x', samples: [], now: NOW })).toBeNull();
  });
});

describe('lista de cartões', () => {
  it('na ordem pedida (sem o Resumo, que é separado) e SEM composição para menores de 18', () => {
    expect(V.buildCategoryViews({ samples: [], now: NOW, ageGroup: '26-35' }).map((c: { id: string }) => c.id)).toEqual(['body', 'activity', 'sleep', 'heart', 'hydration']);
    expect(V.buildCategoryViews({ samples: [], now: NOW, ageGroup: 'under18' }).map((c: { id: string }) => c.id)).toEqual(['activity', 'sleep', 'heart', 'hydration']);
  });
  it('o rótulo das categorias é o pedido', () => {
    expect(V.buildCategoryViews({ samples: [], now: NOW }).map((c: { label: string }) => c.label)).toEqual(['Composição corporal', 'Atividade', 'Sono', 'Coração e recuperação', 'Hidratação']);
  });
  it('no demo todos os cartões têm dados e a origem é "Dados de exemplo"', () => {
    const demo = St.buildDemoHealthV2(NOW);
    for (const c of V.buildCategoryViews({ samples: demo.samples, now: NOW, waterGoal: demo.waterGoal })) {
      expect(c.hasData, c.id).toBe(true);
      expect(c.origin, c.id).toBe('Dados de exemplo');
    }
  });
});

describe('gráfico: alternativa em texto', () => {
  it('descreve dias com registro, média, mínimo, máximo e dias sem registro (null não vira zero)', () => {
    const series = M.windowSeries(L(days('steps', [4000, 6000, 8000])), 'steps', { days: 7, now: NOW });
    expect(V.describeSeries(series, 'steps')).toBe('Gráfico de passos dos últimos 7 dias: 3 dias com registro, média 6.000 passos, mínimo 4.000 passos, máximo 8.000 passos. 4 dias sem registro.');
    expect(V.describeSeries(M.windowSeries([], 'steps', { days: 7, now: NOW }), 'steps')).toBe('Gráfico de passos dos últimos 7 dias: sem registros.');
  });
});

describe('histórico', () => {
  it('mais recente primeiro, com origem e se pode remover (manual e exemplo)', () => {
    const h = V.buildHistory(L(sample('weight', 80, -2), sample('weight', 79, 0, 'apple_saude')), 'weight');
    expect(h.map((x: { text: string }) => x.text)).toEqual(['79,0 kg', '80,0 kg']);
    expect(h[0]).toMatchObject({ source: 'apple_saude', removable: false });
    expect(h[1]).toMatchObject({ source: 'manual', removable: true });
  });
});

describe('ajuda ("i") por categoria', () => {
  const PROIBIDOS = /dieta|calor[ií]a|kcal|d[eé]ficit|emagre|perder peso|perda de peso|queim|jejum|\bdose|dosag|suplement|meta de peso|meta de gordura|peso ideal|prazo|em \d+ (dias|semanas|meses)|diagn[oó]stic|doen[cç]|alerta|sintoma|cl[ií]nic|tratamento|visceral|metab[oó]lica|biol[oó]gica|garant|milagr|detox|card[aá]pio/i;
  it('há uma ajuda para cada categoria, com título, rótulo e blocos', () => {
    expect(Object.keys(I.HEALTH_INFO).sort()).toEqual(['activity', 'body', 'heart', 'hydration', 'sleep']);
    for (const th of Object.values(I.HEALTH_INFO) as { label: string; titulo: string; blocks: unknown[] }[]) {
      expect(th.label.length).toBeGreaterThan(2);
      expect(th.titulo.length).toBeGreaterThan(2);
      expect(th.blocks.length).toBeGreaterThanOrEqual(3);
    }
  });
  it('nenhum texto tem termos proibidos nem medidas por membro, gordura visceral, idade metabólica ou idade biológica', () => {
    const all = I.allHealthInfoStrings() as string[];
    expect(all.length).toBeGreaterThan(25);
    for (const s of all) expect(PROIBIDOS.test(s), s).toBe(false);
    expect(all.join(' ')).not.toMatch(/por membro|bra[cç]o direito|perna esquerda|idade metab|idade biol|visceral/i);
  });
  it('a composição diz que não há meta; o coração não tem nota; o sono cita 7 a 9 h (menores 8 a 10 h)', () => {
    const txt = (id: string) => (I.HEALTH_INFO[id].blocks as { text?: string; items?: string[] }[]).flatMap((b) => [b.text ?? '', ...(b.items ?? [])]).join(' ');
    expect(txt('body')).toMatch(/não usa metas/);
    expect(txt('heart')).toMatch(/Não há nota nem meta/);
    expect(txt('sleep')).toMatch(/7 a 9 horas/);
    expect(txt('sleep')).toMatch(/8 a 10 horas/);
  });
  it('privacidade: o aviso fixo e as linhas de privacidade dizem onde os dados ficam e o que nunca acontece', () => {
    expect(I.HEALTH_SCORE_DISCLAIMER).toBe('O Duo Score mede hábitos. Não é uma avaliação médica.');
    expect(I.HEALTH_PRIVACY_LINES[0]).toBe('Seus dados de saúde ficam só neste aparelho.');
    expect(I.HEALTH_PRIVACY_LINES[1]).toMatch(/nunca são usados no marketplace.*nunca são enviados ao servidor nem à sua conta.*nunca são gravados em registros/);
  });
});
