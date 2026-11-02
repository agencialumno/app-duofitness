// Histórico de séries: um registro por geração (A/B/C), série atual + anteriores, linha do tempo, migração, limite de 50, peso só de maiores de 18, fuso de
// São Paulo, exclusão com confirmação, snapshot por conta e exclusão de conta. Tudo no aparelho.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as H from '../../src/utils/seriesHistory.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as V from '../../src/utils/seriesView.js';
// @ts-expect-error módulo JS do app, sem tipos
import { addDaysKey, dayKeySP, formatDayBR } from '../../src/utils/saoPauloDay.js';
// @ts-expect-error módulo JS do app, sem tipos
import { computeStreak } from '../../src/utils/health.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as S from '../../src/utils/accountSnapshot.js';
import { alerts, Alert } from './stubs/react-native';

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');

function memory(initial: Record<string, string> = {}, failKey?: string) {
  const m = new Map<string, string>(Object.entries(initial));
  return {
    m,
    getAllKeys: async () => [...m.keys()],
    getItem: async (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: async (k: string, v: string) => { if (k === failKey) throw new Error('disco cheio'); m.set(k, v); },
    removeItem: async (k: string) => { m.delete(k); },
    multiGet: async (keys: string[]) => keys.map((k) => [k, m.has(k) ? (m.get(k) as string) : null]),
    multiSet: async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => m.set(k, v)); },
    multiRemove: async (keys: string[]) => { keys.forEach((k) => m.delete(k)); },
  };
}

// treinos de uma geração, como o addWorkouts grava: id "<timestamp>_<índice>", serie A/B/C
const gen = (ts: number, letters = ['A', 'B', 'C']) => letters.map((serie, i) => ({ id: `${ts}_${i}`, serie, name: `Série ${serie}`, createdAt: new Date(ts + i).toISOString(), exercises: [] }));
const manual = (id: string) => ({ id, name: 'Meu treino', category: 'Peito', createdAt: new Date(Number(id)).toISOString(), exercises: [] });
const T1 = Date.parse('2025-03-01T15:00:00Z');
const T2 = Date.parse('2025-04-01T15:00:00Z');
const T3 = Date.parse('2025-05-01T15:00:00Z');
const session = (workoutId: string, iso: string) => ({ id: iso, workoutId, completedAt: iso, xpEarned: 50 });
const emptyStore = () => ({ version: 1, migrated: true, items: [] as any[] });
const reg = (store: any, ts: number, extra: Record<string, unknown> = {}) =>
  H.registerSeries(store, { workoutIds: gen(ts).map((w) => w.id), createdAt: new Date(ts).toISOString(), goals: ['lose_weight'], level: 'beginner', combo: 'duo', source: 'local', weightKg: 80, ageGroup: '26-35', now: new Date(ts), ...extra });

describe('dia em America/Sao_Paulo (helper único)', () => {
  it('a virada de dia é a de São Paulo, qualquer que seja o fuso do aparelho', () => {
    const original = process.env.TZ;
    try {
      for (const tz of ['UTC', 'Asia/Tokyo', 'America/Sao_Paulo', 'Pacific/Auckland']) {
        process.env.TZ = tz;
        expect(dayKeySP('2025-03-10T02:59:00Z'), tz).toBe('2025-03-09'); // 23:59 em SP
        expect(dayKeySP('2025-03-10T03:00:00Z'), tz).toBe('2025-03-10'); // 00:00 em SP
        expect(dayKeySP('2025-12-31T23:30:00-03:00'), tz).toBe('2025-12-31');
        expect(dayKeySP('2026-01-01T00:00:00-03:00'), tz).toBe('2026-01-01');
      }
    } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
    expect(dayKeySP('lixo')).toBeNull();
    expect(addDaysKey('2025-02-28', 1)).toBe('2025-03-01');
    expect(addDaysKey('2025-01-01', -1)).toBe('2024-12-31');
    expect(formatDayBR('2025-03-09')).toBe('09/03/2025');
  });
  it('o computeStreak da Saúde NÃO foi alterado e pode dar resultado diferente do novo: quando o fuso do aparelho não é o de São Paulo, perto da meia-noite', () => {
    const original = process.env.TZ;
    // treino às 22:30 em SP (01:30 UTC do dia seguinte); hoje = 11/03 às 11:00 em SP
    const sessions = [session('x', '2025-03-10T01:30:00Z')];
    const now = new Date('2025-03-11T14:00:00Z');
    try {
      process.env.TZ = 'UTC';
      expect(computeStreak(sessions, now)).toBe(1); // dia local do aparelho (UTC): o treino cai em 10/03 e ontem é 10/03
      expect(V.currentStreakSP(sessions, now)).toBe(0); // dia de São Paulo: o treino foi em 09/03 e ontem (10/03) não treinou
      process.env.TZ = 'America/Sao_Paulo';
      expect(computeStreak(sessions, now)).toBe(0); // aparelho em SP: os dois concordam
      expect(V.currentStreakSP(sessions, now)).toBe(0);
    } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
    // e a diferença de escopo: o novo calcula por série; o antigo, sobre todas as sessões
    expect(read('src/utils/health.js')).toContain('export function computeStreak(sessions, now = new Date())');
  });
});

describe('migração do que existe hoje', () => {
  it('cada geração A/B/C vira um registro "migrado" (objetivo, nível e combo desconhecidos, sem peso); treino à mão fica de fora', () => {
    const workouts = [...gen(T1), manual('1700000000000'), ...gen(T2)];
    const { store, changed } = H.ensureSeriesStore({ stored: undefined, workouts });
    expect(changed).toBe(true);
    expect(store.migrated).toBe(true);
    expect(store.items).toHaveLength(2);
    expect(store.items.map((r: any) => r.workoutIds)).toEqual([[`${T1}_0`, `${T1}_1`, `${T1}_2`], [`${T2}_0`, `${T2}_1`, `${T2}_2`]]);
    for (const r of store.items) { expect(r.goals).toBeNull(); expect(r.level).toBeNull(); expect(r.combo).toBeNull(); expect(r.weights).toEqual([]); expect(r.migrated).toBe(true); expect(r).not.toHaveProperty('tracked'); expect(r).not.toHaveProperty('count'); expect(r).not.toHaveProperty('days'); }
    expect(store.items.flatMap((r: any) => r.workoutIds)).not.toContain('1700000000000');
  });
  it('é idempotente: com a marca de versão, ler de novo não muda nada e não recria registros apagados', () => {
    const workouts = [...gen(T1), ...gen(T2)];
    const first = H.ensureSeriesStore({ stored: undefined, workouts }).store;
    const again = H.ensureSeriesStore({ stored: first, workouts });
    expect(again.changed).toBe(false);
    expect(again.store).toBe(first);
    // série apagada pelo usuário (treinos sumiram): a migração NÃO a recria a partir de treinos que não existem mais, e uma nova leitura não reinventa nada
    const sem = H.ensureSeriesStore({ stored: first, workouts: gen(T2) });
    expect(sem.store.items).toHaveLength(1);
    expect(H.ensureSeriesStore({ stored: sem.store, workouts: gen(T2) }).changed).toBe(false);
  });
  it('só treinos com serie A, B ou C entram; o treino à mão (sem o campo serie) fica em "Outros treinos"', () => {
    const workouts = [...gen(T1), manual('1700000000000')];
    expect(H.isGeneratedWorkout(workouts[0])).toBe(true);
    expect(H.isGeneratedWorkout(workouts[3])).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(workouts[3], 'serie')).toBe(false);
    const { store } = H.ensureSeriesStore({ stored: undefined, workouts });
    const v = V.buildHistoryView({ store, workouts, sessions: [], ageGroup: '26-35' });
    expect(v.others.map((w: any) => w.id)).toEqual(['1700000000000']);
    expect(v.current.workouts).toHaveLength(3);
    // no app o treino à mão é salvo sem `serie` (CreateWorkoutScreen) e os geradores sempre gravam A/B/C
    expect(read('src/screens/CreateWorkoutScreen.js')).toMatch(/addWorkout\(\{ name: name\.trim\(\), category, exercises: selected \}\)/);
    expect(read('src/utils/workoutGenerator.js')).toMatch(/serie: 'A'[\s\S]*serie: 'B'[\s\S]*serie: 'C'/);
  });
  it('não mexe em @duo_workouts nem em @duo_sessions; falha ao gravar o histórico nunca lança nem corrompe os treinos', async () => {
    const workouts = JSON.stringify([...gen(T1)]);
    const sessions = JSON.stringify([session(`${T1}_0`, '2025-03-02T12:00:00Z')]);
    const st = memory({ '@duo_workouts': workouts, '@duo_sessions': sessions }, H.SERIES_KEY); // gravar a chave do histórico FALHA
    const store = await H.loadSeries(st, JSON.parse(workouts));
    expect(store.items).toHaveLength(1); // o histórico existe em memória
    expect(st.m.get('@duo_workouts')).toBe(workouts);
    expect(st.m.get('@duo_sessions')).toBe(sessions);
    expect(st.m.has(H.SERIES_KEY)).toBe(false);
    expect(await H.saveSeries(st, store)).toBe(false); // falha devolvida, sem exceção
  });
  it('valor corrompido do histórico é tratado como ausente (sem apagar a chave nem lançar) e os treinos seguem intactos', async () => {
    const workouts = JSON.stringify(gen(T1));
    const st = memory({ '@duo_workouts': workouts, [H.SERIES_KEY]: '{nao e json' });
    const store = await H.loadSeries(st, JSON.parse(workouts));
    expect(store.items).toHaveLength(1);
    expect(st.m.get('@duo_workouts')).toBe(workouts);
    for (const bad of ['[]', '{"version":9,"items":[]}', '{"version":1}', '"x"']) expect(H.sanitizeStore(JSON.parse(bad))).toBeUndefined();
  });
  it('ids que sumiram são tolerados; se TODOS os treinos do registro sumirem, o registro some', () => {
    const workouts = gen(T1);
    const { store } = H.ensureSeriesStore({ stored: undefined, workouts });
    const parcial = H.ensureSeriesStore({ stored: store, workouts: workouts.slice(0, 1) });
    expect(parcial.changed).toBe(false);
    expect(parcial.store.items[0].workoutIds).toHaveLength(3); // os ids ficam: as sessões antigas se atribuem por eles
    const nenhum = H.ensureSeriesStore({ stored: store, workouts: [] });
    expect(nenhum.store.items).toEqual([]);
    expect(H.dropDeadSeries(store, workouts.slice(0, 1))).toBe(store);
    expect(H.dropDeadSeries(store, []).items).toEqual([]);
  });
});

describe('geração cria registro; a atual muda; anteriores recolhidas', () => {
  it('cada geração vira um registro e a mais recente é a série atual; as outras vão para "anteriores"', () => {
    let store: any = emptyStore();
    store = reg(store, T1).store;
    let workouts: any[] = gen(T1);
    let v = V.buildHistoryView({ store, workouts, sessions: [], ageGroup: '26-35' });
    expect(v.count).toBe(1);
    expect(v.current.dateText).toBe(formatDayBR(dayKeySP(new Date(T1))));
    expect(v.previous).toEqual([]);
    store = reg(store, T2).store;
    workouts = [...workouts, ...gen(T2)];
    v = V.buildHistoryView({ store, workouts, sessions: [], ageGroup: '26-35' });
    expect(v.count).toBe(2);
    expect(v.current.workouts.map((w: any) => w.id)).toEqual(gen(T2).map((w) => w.id)); // A, B, C da geração nova
    expect(v.previous).toHaveLength(1);
    expect(v.previous[0].workouts.map((w: any) => w.id)).toEqual(gen(T1).map((w) => w.id)); // não se misturam
    expect(v.timeline.map((t: any) => t.id)).toEqual([v.current.id, v.previous[0].id]); // linha do tempo: mais nova primeiro
  });
  it('o registro guarda objetivo, nível, combo, origem e os ids dos 3 treinos (formato do plano)', () => {
    const { store } = reg(emptyStore(), T1, { goals: ['gain_muscle', 'health'], level: 'intermediate', combo: 'elite', source: 'local' });
    const r = store.items[0];
    expect(r).toMatchObject({ goals: ['gain_muscle', 'health'], level: 'intermediate', combo: 'elite', source: 'local' });
    expect(r.workoutIds).toHaveLength(3);
    const d = V.describeSeries({ record: r, workouts: gen(T1), sessions: [], ageGroup: '26-35' });
    expect(d.goalsText).toBe('Ganhar massa e Saúde geral');
    expect(d.levelText).toBe('Intermediário');
    expect(d.comboText).toBe('ELITE');
  });
  it('limite de 50: a 51ª geração derruba a mais antiga (devolvida em `removed`, para o aviso e para apagar os treinos dela)', () => {
    let store: any = emptyStore();
    for (let i = 0; i < 50; i++) store = reg(store, T1 + i * 86_400_000).store;
    expect(store.items).toHaveLength(50);
    const oldest = store.items[0];
    const r = reg(store, T1 + 60 * 86_400_000);
    expect(r.store.items).toHaveLength(50);
    expect(r.removed.map((x: any) => x.id)).toEqual([oldest.id]);
    expect(r.store.items.some((x: any) => x.id === oldest.id)).toBe(false);
    expect(H.MAX_SERIES).toBe(50);
    // o contexto avisa e apaga os treinos da série removida
    const ctx = read('src/context/AppContext.js');
    expect(ctx).toContain("Alert.alert('Limite de séries'");
    expect(ctx).toMatch(/removed\.flatMap\(\(r\) => r\.workoutIds\)/);
  });
});

describe('linha do tempo: treinos concluídos e sequência vêm de @duo_sessions, na hora de exibir', () => {
  const { store } = reg(reg(emptyStore(), T1).store, T2);
  const workouts = [...gen(T1), ...gen(T2)];
  const sessions = [
    session(`${T1}_0`, '2025-03-02T13:00:00Z'), session(`${T1}_1`, '2025-03-03T13:00:00Z'), session(`${T1}_2`, '2025-03-04T13:00:00Z'), session(`${T1}_0`, '2025-03-10T13:00:00Z'),
    session(`${T2}_0`, '2025-04-02T13:00:00Z'),
  ];
  const v = V.buildHistoryView({ store, workouts, sessions, ageGroup: '26-35' });
  it('atribui as sessões ao registro pelo id do treino e calcula a maior sequência (dias seguidos, fuso de São Paulo)', () => {
    expect(v.previous[0].completed).toBe(4);
    expect(v.previous[0].bestStreak).toBe(3); // 02, 03 e 04/03 seguidos; 10/03 sozinho
    expect(v.current.completed).toBe(1);
    expect(v.current.bestStreak).toBe(1);
    expect(V.bestStreakOf([])).toBe(0);
  });
  it('sessão perto da meia-noite conta no dia de São Paulo', () => {
    const rec = reg(emptyStore(), T1).store.items[0];
    const s = [session(`${T1}_0`, '2025-03-10T02:30:00Z'), session(`${T1}_1`, '2025-03-10T03:30:00Z')]; // 23:30 de 09/03 e 00:30 de 10/03 em SP
    expect(V.seriesTrainingDays(rec, s)).toEqual(['2025-03-09', '2025-03-10']);
    expect(V.bestStreakOf(V.seriesTrainingDays(rec, s))).toBe(2);
  });
  it('cada item da linha do tempo é lido por inteiro (data, objetivo, combo, treinos e sequência) e não depende de cor nem de gráfico', () => {
    const t = v.timeline[1];
    expect(t.a11y).toContain(`Série de ${t.dateText}`);
    expect(t.a11y).toContain('Objetivo: Emagrecer');
    expect(t.a11y).toContain('Combo: DUO');
    expect(t.a11y).toContain('Treinos concluídos: 4');
    expect(t.a11y).toContain('Maior sequência: 3 dias');
    expect(v.timeline[0].a11y).toContain('Maior sequência: 1 dia.');
    const screen = read('src/screens/SeriesTimelineScreen.js');
    expect(screen).toContain('accessibilityLabel={`${index === 0 ?');
    expect(screen).toContain('showsVerticalScrollIndicator={false}');
    expect(screen).not.toMatch(/Svg|Chart|chart/);
  });
  it('série migrada: objetivo, nível e combo "desconhecido", peso "sem registro", mas treinos concluídos e sequência são REAIS (das sessões)', () => {
    const workoutsM = [...gen(T1)];
    const m = H.ensureSeriesStore({ stored: undefined, workouts: workoutsM }).store;
    const d = V.buildHistoryView({ store: m, workouts: workoutsM, sessions, ageGroup: '26-35' }).current;
    expect(d.goalsText).toBe('desconhecido');
    expect(d.levelText).toBe('desconhecido');
    expect(d.comboText).toBe('desconhecido');
    expect(d.weightText).toBe('Peso: sem registro');
    expect(d.completed).toBe(4);
    expect(d.bestStreak).toBe(3);
  });
});

describe('peso: só maiores de 18; inicial sempre; variação só com 2 ou mais pontos', () => {
  it('menores de 18 (e idade desconhecida) NUNCA têm peso gravado, nem na geração nem na atualização do perfil', () => {
    for (const ageGroup of ['under18', undefined, null, '']) {
      let { store } = reg(emptyStore(), T1, { ageGroup, weightKg: 62 });
      expect(store.items[0].weights, String(ageGroup)).toEqual([]);
      store = H.appendWeight(store, 60, { ageGroup, now: new Date(T2) });
      expect(store.items[0].weights, String(ageGroup)).toEqual([]);
    }
    expect(H.isAdultAge('26-35')).toBe(true);
    expect(H.isAdultAge('under18')).toBe(false);
  });
  it('menor de 18 não vê peso na tela mesmo que exista no registro (defesa), e o texto não menciona peso', () => {
    const tampered = { ...reg(emptyStore(), T1).store.items[0], weights: [{ date: '2025-03-01', kg: 70 }, { date: '2025-03-20', kg: 68 }] };
    const d = V.describeSeries({ record: tampered, workouts: gen(T1), sessions: [], ageGroup: 'under18' });
    expect(d.weightText).toBeNull();
    expect(d.a11y).not.toMatch(/[Pp]eso/);
  });
  it('adulto: peso inicial sempre que houver; variação só com 2 ou mais pontos; sem peso = "sem registro"', () => {
    let { store } = reg(emptyStore(), T1, { weightKg: 80 });
    const d1 = V.describeSeries({ record: store.items[0], workouts: gen(T1), sessions: [], ageGroup: '26-35' });
    expect(d1.weightText).toBe('Peso inicial: 80 kg');
    expect(d1.weightDelta).toBeNull();
    store = H.appendWeight(store, 80, { ageGroup: '26-35', now: new Date(T2) });
    expect(store.items[0].weights).toHaveLength(1); // mesmo valor: não duplica
    store = H.appendWeight(store, 78.5, { ageGroup: '26-35', now: new Date(T2) });
    const d2 = V.describeSeries({ record: store.items[0], workouts: gen(T1), sessions: [], ageGroup: '26-35' });
    expect(d2.weightText).toBe('Peso inicial: 80 kg; variação: diminuiu 1,5 kg');
    expect(d2.weightDelta).toBe(-1.5);
    const none = reg(emptyStore(), T1, { weightKg: undefined }).store.items[0];
    expect(V.describeSeries({ record: none, workouts: gen(T1), sessions: [], ageGroup: '26-35' }).weightText).toBe('Peso: sem registro');
  });
  it('o peso novo só entra na série ATUAL e sem série não faz nada', () => {
    let store: any = reg(reg(emptyStore(), T1).store, T2).store;
    store = H.appendWeight(store, 75, { ageGroup: '26-35', now: new Date(T3) });
    expect(store.items[0].weights).toHaveLength(1);
    expect(store.items[1].weights).toHaveLength(2);
    const vazio = emptyStore();
    expect(H.appendWeight(vazio, 75, { ageGroup: '26-35' })).toBe(vazio);
  });
});

describe('excluir série: sempre com confirmação', () => {
  it('a confirmação tem o texto combinado e botões em português; nada é apagado antes de tocar em "Excluir série"', () => {
    alerts.length = 0;
    let apagou = 0;
    V.confirmDeleteSeries(Alert, () => { apagou++; });
    expect(apagou).toBe(0);
    const a = alerts[0]!;
    expect(a.title).toBe('Excluir esta série?');
    expect(a.message).toBe('Tem certeza? Esta série e a linha do tempo dela serão apagadas. Seus treinos realizados continuam contando no perfil. Não dá para desfazer.');
    expect(a.buttons.map((b: any) => b.text)).toEqual(['Cancelar', 'Excluir série']);
    expect(a.buttons[0].style).toBe('cancel');
    expect(a.buttons[1].style).toBe('destructive');
    a.buttons[0].onPress?.(); // cancelar
    expect(apagou).toBe(0);
    a.buttons[1].onPress(); // confirmar
    expect(apagou).toBe(1);
  });
  it('as telas só chamam deleteSeries por dentro da confirmação (série atual e anteriores), e o contexto não a expõe de outro jeito', () => {
    const w = read('src/screens/WorkoutsScreen.js');
    expect(w).toContain('confirmDeleteSeries(Alert, () => deleteSeries(s.id))');
    expect(w.match(/deleteSeries\(/g)).toHaveLength(1);
    expect(w).toContain("accessibilityRole=\"button\"");
    expect(w).toContain('Séries anteriores');
    expect(w).toMatch(/showPrevious, setShowPrevious\] = useState\(false\)/); // recolhido de saída
    expect(read('src/screens/SeriesTimelineScreen.js')).not.toContain('deleteSeries');
  });
  it('apaga os treinos dela e o registro, mantém @duo_sessions (continuam contando no perfil)', () => {
    const base: any = reg(reg(emptyStore(), T1).store, T2).store;
    const workouts = [...gen(T1), ...gen(T2), manual('1700000000000')];
    const sessions = [session(`${T1}_0`, '2025-03-02T13:00:00Z')];
    const antes = JSON.stringify(sessions);
    const r = H.removeSeries({ store: base, workouts, id: base.items[0].id });
    expect(r.store.items).toHaveLength(1);
    expect(r.workouts.map((w: any) => w.id)).toEqual([...gen(T2).map((w) => w.id), '1700000000000']);
    expect(JSON.stringify(sessions)).toBe(antes); // a função nem recebe as sessões
    expect(H.removeSeries({ store: base, workouts, id: 'nao-existe' }).store).toBe(base);
    // a série atual também pode ser excluída (com a mesma confirmação)
    const r2 = H.removeSeries({ store: base, workouts, id: base.items[1].id });
    expect(V.buildHistoryView({ store: r2.store, workouts: r2.workouts, sessions, ageGroup: '26-35' }).current.workouts.map((w: any) => w.id)).toEqual(gen(T1).map((w) => w.id));
    const ctx = read('src/context/AppContext.js');
    expect(ctx).not.toMatch(/@duo_sessions[^\n]*removeSeries|deleteSeries[\s\S]{0,400}@duo_sessions/);
  });
});

describe('integração com o contexto e o Perfil', () => {
  it('addWorkouts grava os treinos PRIMEIRO e só depois registra o histórico, dentro de try/catch (falha não bloqueia @duo_workouts)', () => {
    const ctx = read('src/context/AppContext.js');
    const i = ctx.indexOf('const addWorkouts');
    const body = ctx.slice(i, ctx.indexOf('const updateWorkout', i));
    expect(body.indexOf("setItem('@duo_workouts', JSON.stringify(updated))")).toBeGreaterThan(-1);
    expect(body.indexOf("setItem('@duo_workouts', JSON.stringify(updated))")).toBeLessThan(body.indexOf('registerSeries('));
    expect(body).toMatch(/try \{[\s\S]*registerSeries[\s\S]*\} catch/);
    expect(ctx).toContain('loadSeries(AsyncStorage');
    expect(ctx).toMatch(/try \{ setSeriesStore\(await loadSeries/);
  });
  it('"Séries criadas" no Perfil conta registros de série, não workouts.length', () => {
    const p = read('src/screens/ProfileScreen.js');
    expect(p).toContain("value: seriesCount ?? 0");
    expect(p).not.toMatch(/Séries criadas', value: workouts/);
  });
  it('os três caminhos que geram séries passam os dados da geração ao histórico', () => {
    expect(read('src/screens/GuidedPlanScreen.js')).toContain('addWorkouts(plan.workouts, { goals: settings.goals, level: settings.level, combo: settings.combo');
    expect(read('src/screens/SmartPlanScreen.js')).toContain("addWorkouts(generated, { combo: answers.combo ?? null, source: 'local' })");
    expect(read('src/screens/AIPersonalTrainerScreen.js')).toContain('addWorkouts(finalPlan.workouts, finalPlan.meta || {})');
  });
  it('nenhum módulo novo lê @duo_* com JSON.parse direto, loga peso, usa rede ou manda dados a servidor', () => {
    for (const f of ['src/utils/seriesHistory.js', 'src/utils/seriesView.js', 'src/utils/saoPauloDay.js', 'src/screens/SeriesTimelineScreen.js']) {
      const src = read(f).replace(/^\s*\/\/.*$/gm, '');
      expect(src, f).not.toMatch(/JSON\.parse\(|fetch\(|XMLHttpRequest|console\./);
    }
    expect(read('src/utils/health.js')).not.toMatch(/saoPauloDay|seriesHistory/); // a Saúde não foi tocada
  });
});

describe('por conta: snapshot, logout/login e exclusão da conta', () => {
  const dados = async (st: any) => {
    await st.setItem('@duo_onboarded', 'true');
    await st.setItem('@duo_workouts', JSON.stringify(gen(T1)));
    await st.setItem(H.SERIES_KEY, JSON.stringify(reg(emptyStore(), T1, { weightKg: 77 }).store));
  };
  it('o histórico é uma chave @duo_*: entra no snapshot da conta e logout/login na MESMA conta restaura as séries antigas', async () => {
    const st = memory();
    expect(await S.bindAccount(st, 'uidA')).toBe('fresh');
    await dados(st);
    const salvo = st.m.get(H.SERIES_KEY);
    await S.snapshotAndClear(st, 'uidA'); // sair
    expect(st.m.has(H.SERIES_KEY)).toBe(false); // ativas limpas
    expect(st.m.get(S.snapshotKey('uidA'))).toContain('@duo_series_v2');
    expect(await S.bindAccount(st, 'uidA')).toBe('restored');
    expect(st.m.get(H.SERIES_KEY)).toBe(salvo);
  });
  it('em OUTRA conta no mesmo aparelho as séries não vazam, e a primeira conta continua intacta', async () => {
    const st = memory();
    await S.bindAccount(st, 'uidA');
    await dados(st);
    const salvo = st.m.get(H.SERIES_KEY);
    await S.snapshotAndClear(st, 'uidA');
    expect(await S.bindAccount(st, 'uidB')).toBe('fresh');
    expect(st.m.has(H.SERIES_KEY)).toBe(false);
    expect((await H.loadSeries(st, [])).items).toEqual([]); // conta B começa sem histórico
    await S.snapshotAndClear(st, 'uidB');
    expect(await S.bindAccount(st, 'uidA')).toBe('restored');
    expect(st.m.get(H.SERIES_KEY)).toBe(salvo);
  });
  it('excluir a conta apaga o histórico ativo e o snapshot dela', async () => {
    const st = memory();
    await S.bindAccount(st, 'uidA');
    await dados(st);
    await S.deleteAccountLocalData(st, 'uidA');
    expect(st.m.has(H.SERIES_KEY)).toBe(false);
    expect(st.m.has(S.snapshotKey('uidA'))).toBe(false);
    expect([...st.m.keys()].filter((k) => k.includes('series'))).toEqual([]);
  });
  it('a limpeza total das @duo_* leva o histórico junto e a memória do contexto é zerada ao sair', () => {
    expect(H.SERIES_KEY.startsWith('@duo_')).toBe(true);
    expect(read('src/context/AppContext.js')).toMatch(/resetMemory = \(\) => \{[\s\S]*setSeriesStore\(EMPTY_STORE\)/);
  });
});
