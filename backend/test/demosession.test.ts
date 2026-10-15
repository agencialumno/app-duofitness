// Sessão do Modo Demo (src/utils/demoSession.js + getFreshDemoData): limpar TODAS as chaves @duo_*,
// reiniciar o demo com datas de hoje e nunca sobrescrever dados reais.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as D from '../../src/utils/demoSession.js';
// @ts-expect-error módulo JS do app, sem tipos
import { getFreshDemoData, DEMO_USER } from '../../src/data/demoData.js';
// @ts-expect-error módulo JS do app, sem tipos
import { HEALTH_KEY } from '../../src/utils/health.js';

const REPO = path.resolve(__dirname, '../..');

// AsyncStorage em memória, com a mesma API usada pelo app.
function fakeStorage(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return {
    map: m,
    getAllKeys: async () => [...m.keys()],
    multiRemove: async (keys: string[]) => { keys.forEach((k) => m.delete(k)); },
    getItem: async (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: async (k: string, v: string) => { m.set(k, v); },
  };
}

const ALL_APP_KEYS = ['@duo_user', '@duo_workouts', '@duo_sessions', '@duo_xp', '@duo_streak', '@duo_achievements', '@duo_onboarded', HEALTH_KEY];
const realUser = JSON.stringify({ name: 'Maria', goals: ['health'], weight: 60, height: 165 });

describe('clearAllDuoData', () => {
  it('remove TODAS as chaves @duo_* (inclusive @duo_health e @duo_onboarded), e só elas', async () => {
    const st = fakeStorage({
      ...Object.fromEntries(ALL_APP_KEYS.map((k) => [k, 'x'])),
      '@duo_chave_futura': 'y',
      outra_lib: 'não mexer',
      '@outro_app': 'não mexer',
      duo_sem_arroba: 'não mexer',
    });
    const removed = await D.clearAllDuoData(st);
    expect(removed.sort()).toEqual([...ALL_APP_KEYS, '@duo_chave_futura'].sort());
    expect([...st.map.keys()].sort()).toEqual(['@outro_app', 'duo_sem_arroba', 'outra_lib']);
    expect(st.map.has('@duo_health')).toBe(false);
    expect(st.map.has('@duo_onboarded')).toBe(false);
  });
  it('com o armazenamento vazio não falha', async () => {
    expect(await D.clearAllDuoData(fakeStorage())).toEqual([]);
  });
  it('isDuoKey só aceita o prefixo @duo_', () => {
    expect(D.isDuoKey('@duo_xp')).toBe(true);
    expect(D.isDuoKey('duo_xp')).toBe(false);
    expect(D.isDuoKey(undefined)).toBe(false);
  });
  it('toda chave @duo_* usada no código do app está no teste (se criar uma nova, ela entra na limpeza)', () => {
    const files = ['src/context/AppContext.js', 'src/utils/health.js', 'src/utils/demoSession.js'];
    const found = new Set<string>();
    for (const f of files) for (const m of readFileSync(path.join(REPO, f), 'utf8').matchAll(/'(@duo_[a-z_]+)'/g)) found.add(m[1]!);
    for (const k of found) expect(ALL_APP_KEYS, k).toContain(k);
  });
});

describe('canOfferDemo (o demo nunca sobrescreve dados reais)', () => {
  it('sem perfil salvo ou com o perfil do próprio demo: pode', () => {
    expect(D.canOfferDemo(null)).toBe(true);
    expect(D.canOfferDemo(undefined)).toBe(true);
    expect(D.canOfferDemo('')).toBe(true);
    expect(D.canOfferDemo(JSON.stringify(DEMO_USER))).toBe(true);
  });
  it('perfil real ou ilegível: não pode', () => {
    expect(D.canOfferDemo(realUser)).toBe(false);
    expect(D.canOfferDemo(JSON.stringify({ name: 'x', isDemo: false }))).toBe(false);
    expect(D.canOfferDemo('{quebrado')).toBe(false);
  });
});

describe('dados de exemplo "frescos"', () => {
  const NOW = new Date('2026-06-10T12:00:00Z').getTime();
  const DAY = 24 * 60 * 60 * 1000;

  it('as datas são relativas ao "agora" informado', () => {
    const d = getFreshDemoData(NOW);
    expect(d.user.isDemo).toBe(true);
    expect(new Date(d.user.joinedAt).getTime()).toBe(NOW - 32 * DAY);
    expect(d.sessions).toHaveLength(9);
    expect(new Date(d.sessions[d.sessions.length - 1].completedAt).getTime()).toBe(NOW - 1 * DAY);
    expect(new Date(d.sessions[0].completedAt).getTime()).toBe(NOW - 12 * DAY);
    expect(new Date(d.workouts[0].createdAt).getTime()).toBe(NOW - 32 * DAY);
    expect(d.achievements.map((a: { unlockedAt: string }) => new Date(a.unlockedAt).getTime())).toEqual([NOW - 12 * DAY, NOW - 9 * DAY, NOW - 3 * DAY, NOW - 2 * DAY]);
  });
  it('dias depois, a sessão mais recente continua "de ontem" (nada fica velho)', () => {
    const later = getFreshDemoData(NOW + 30 * DAY);
    expect(new Date(later.sessions[later.sessions.length - 1].completedAt).getTime()).toBe(NOW + 29 * DAY);
  });
  it('não muda as constantes nem o formato: mesmas chaves e quantidades', () => {
    const d = getFreshDemoData(NOW);
    expect(Object.keys(d).sort()).toEqual(['achievements', 'sessions', 'streak', 'user', 'workouts', 'xp']);
    expect(d.workouts.map((w: { serie: string }) => w.serie)).toEqual(['A', 'B', 'C']);
    expect(d.xp).toBe(450);
    expect(d.streak).toBe(8);
  });
});

describe('restartDemoData', () => {
  const NOW = new Date('2026-06-10T12:00:00Z').getTime();

  it('apaga o que o vendedor criou no demo (inclusive saúde) e recarrega o exemplo com datas de hoje', async () => {
    const st = fakeStorage();
    await D.writeDemoData(st, getFreshDemoData(NOW - 20 * 24 * 60 * 60 * 1000)); // demo "velho"
    await st.setItem(HEALTH_KEY, JSON.stringify({ weights: [{ date: '2026-01-01', kg: 99 }] }));
    await st.setItem('@duo_workouts', JSON.stringify([{ id: 'criada_na_demo' }]));
    expect(await D.restartDemoData(st, getFreshDemoData(NOW))).toBe(true);

    expect(st.map.has(HEALTH_KEY)).toBe(false); // o histórico de exemplo é recriado pelo hook, relativo a hoje
    const workouts = JSON.parse(st.map.get('@duo_workouts')!);
    expect(workouts.map((w: { id: string }) => w.id)).toEqual(['demo_serie_a', 'demo_serie_b', 'demo_serie_c']);
    const sessions = JSON.parse(st.map.get('@duo_sessions')!);
    expect(new Date(sessions[sessions.length - 1].completedAt).getTime()).toBe(NOW - 24 * 60 * 60 * 1000);
    expect(st.map.get('@duo_onboarded')).toBe('true');
    expect(JSON.parse(st.map.get('@duo_user')!).isDemo).toBe(true);
    expect(st.map.get('@duo_xp')).toBe('450');
    expect(st.map.get('@duo_streak')).toBe('8');
  });

  it('REGRA: com perfil real salvo não apaga nem grava nada', async () => {
    const st = fakeStorage({ '@duo_user': realUser, '@duo_workouts': '[{"id":"minha"}]', '@duo_onboarded': 'true', [HEALTH_KEY]: '{}' });
    const before = JSON.stringify([...st.map.entries()]);
    expect(await D.restartDemoData(st, getFreshDemoData(NOW))).toBe(false);
    expect(JSON.stringify([...st.map.entries()])).toBe(before);
  });

  it('a partir do armazenamento vazio também funciona', async () => {
    const st = fakeStorage();
    expect(await D.restartDemoData(st, getFreshDemoData(NOW))).toBe(true);
    expect([...st.map.keys()].sort()).toEqual(['@duo_achievements', '@duo_onboarded', '@duo_sessions', '@duo_streak', '@duo_user', '@duo_workouts', '@duo_xp']);
  });
});

describe('sair do demo (limpar tudo) e entrar de novo', () => {
  it('depois de sair não sobra nenhuma @duo_*, e o demo pode ser oferecido de novo', async () => {
    const st = fakeStorage();
    await D.writeDemoData(st, getFreshDemoData());
    await st.setItem(HEALTH_KEY, '{}');
    await D.clearAllDuoData(st);
    expect([...st.map.keys()].filter(D.isDuoKey)).toEqual([]);
    expect(D.canOfferDemo(await st.getItem('@duo_user'))).toBe(true);
    await D.writeDemoData(st, getFreshDemoData());
    expect(JSON.parse(st.map.get('@duo_user')!).isDemo).toBe(true);
  });
});

describe('fiação no app', () => {
  const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
  it('AppContext: loadDemoData recusa perfil real e existem restartDemo e resetAll', () => {
    const src = read('src/context/AppContext.js');
    expect(src).toMatch(/canOfferDemo\(stored\)/);
    expect(src).toMatch(/restartDemo/);
    expect(src).toMatch(/resetAll/);
    expect(src).toMatch(/clearAllDuoData\(AsyncStorage\)/);
  });
});
