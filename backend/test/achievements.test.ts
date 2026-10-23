// Conquistas por dias seguidos: "3 dias seguidos" e "Semana perfeita" usam a sequência por datas
// (computeStreak). "Guerreiro da semana" e as demais continuam como eram.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { evaluateAchievements } from '../../src/utils/achievements.js';

const NOW = new Date(2026, 5, 10, 12);
const at = (offsetDays: number) => ({ completedAt: new Date(2026, 5, 10 + offsetDays, 9).toISOString() });
const ids = (r: { list: { id: string }[] }) => r.list.map((a) => a.id);
const run = (sessions: unknown[], xp = 0, current: unknown[] = []) => evaluateAchievements({ current, sessions, xp, now: NOW });

describe('conquistas por dias seguidos', () => {
  it('treinos em dias alternados NÃO dão "3 dias seguidos"', () => {
    const r = run([at(-4), at(-2), at(0)]);
    expect(ids(r)).toContain('first_workout');
    expect(ids(r)).not.toContain('streak_3');
  });

  it('3 dias seguidos (hoje, ontem, anteontem) dão "3 dias seguidos"', () => {
    const r = run([at(-2), at(-1), at(0)]);
    expect(ids(r)).toContain('streak_3');
    expect(ids(r)).not.toContain('streak_7');
  });

  it('7 dias seguidos dão "Semana perfeita" (e "3 dias seguidos")', () => {
    const r = run([-6, -5, -4, -3, -2, -1, 0].map(at));
    expect(ids(r)).toEqual(expect.arrayContaining(['streak_3', 'streak_7']));
  });

  it('6 dias seguidos ainda não dão "Semana perfeita"', () => {
    expect(ids(run([-5, -4, -3, -2, -1, 0].map(at)))).not.toContain('streak_7');
  });

  it('7 treinos espalhados NÃO dão "Semana perfeita", mas dão "Guerreiro da semana" (regra inalterada)', () => {
    const r = run([-30, -25, -20, -15, -10, -5, 0].map(at));
    expect(ids(r)).not.toContain('streak_7');
    expect(ids(r)).not.toContain('streak_3');
    expect(ids(r)).toContain('week_warrior');
  });

  it('vários treinos no mesmo dia contam como um dia', () => {
    expect(ids(run([at(0), at(0), at(0)]))).not.toContain('streak_3');
  });

  it('a sequência pode começar em ontem (ainda não treinou hoje)', () => {
    expect(ids(run([at(-3), at(-2), at(-1)]))).toContain('streak_3');
  });

  it('passagem de mês e de ano conta como dias seguidos', () => {
    const r = evaluateAchievements({
      current: [],
      sessions: [new Date(2026, 11, 30, 9), new Date(2026, 11, 31, 9), new Date(2027, 0, 1, 9)].map((d) => ({ completedAt: d.toISOString() })),
      xp: 0,
      now: new Date(2027, 0, 1, 12),
    });
    expect(ids(r)).toContain('streak_3');
  });

  it('sessões sem data válida não quebram e não contam', () => {
    const bad = [{}, { completedAt: 'lixo' }, { completedAt: null }, null, undefined, 7];
    expect(() => run(bad as unknown[])).not.toThrow();
    const r = run([...(bad as unknown[]), at(0)]);
    expect(ids(r)).not.toContain('streak_3');
    expect(() => evaluateAchievements({ current: null, sessions: null, xp: undefined, now: NOW })).not.toThrow();
    expect(evaluateAchievements({ current: null, sessions: null, xp: undefined, now: NOW }).list).toEqual([]);
  });

  it('conquistas já desbloqueadas não são revogadas nem duplicadas', () => {
    const antigas = [
      { id: 'streak_3', title: '3 dias seguidos', icon: '⚡', unlockedAt: '2026-01-01T10:00:00.000Z' },
      { id: 'streak_7', title: 'Semana perfeita', icon: '🌟', unlockedAt: '2026-01-02T10:00:00.000Z' },
    ];
    const r = run([at(-4), at(-2), at(0)], 0, antigas); // pela regra nova não desbloquearia
    expect(r.list.filter((a: { id: string }) => a.id === 'streak_3')).toHaveLength(1);
    expect(r.list.find((a: { id: string }) => a.id === 'streak_7').unlockedAt).toBe('2026-01-02T10:00:00.000Z');
    expect(antigas).toHaveLength(2); // lista original intacta
  });

  it('as outras regras seguem iguais (30 treinos, XP 500 e 1000)', () => {
    const muitos = Array.from({ length: 30 }, (_, i) => at(-i * 3));
    expect(ids(run(muitos, 1000))).toEqual(expect.arrayContaining(['first_workout', 'week_warrior', 'monthly_beast', 'xp_500', 'xp_1000']));
    expect(ids(run([at(0)], 499))).not.toContain('xp_500');
    expect(ids(run([at(0)], 500))).toContain('xp_500');
  });

  it('títulos e ícones são os de sempre', () => {
    const r = run(Array.from({ length: 30 }, (_, i) => at(-i)), 1000);
    const m = Object.fromEntries(r.list.map((a: { id: string; title: string; icon: string }) => [a.id, `${a.icon} ${a.title}`]));
    expect(m).toEqual({
      first_workout: '🏆 Primeira série!',
      week_warrior: '🔥 Guerreiro da semana',
      monthly_beast: '💪 Besta mensal',
      streak_3: '⚡ 3 dias seguidos',
      streak_7: '🌟 Semana perfeita',
      xp_500: '🎯 500 XP acumulado',
      xp_1000: '👑 Mestre do XP',
    });
  });
});

describe('AppContext usa a regra das conquistas', () => {
  const ctx = readFileSync(path.resolve(__dirname, '../../src/context/AppContext.js'), 'utf8');
  it('checkAchievements não recebe mais o contador; o contador segue gravado', () => {
    expect(ctx).toMatch(/evaluateAchievements/);
    expect(ctx).toMatch(/checkAchievements\(updatedSessions, newXp\)/);
    expect(ctx).not.toMatch(/checkAchievements\(updatedSessions, newXp, newStreak\)/);
    expect(ctx).toMatch(/AsyncStorage\.setItem\('@duo_streak'/);
  });
});
