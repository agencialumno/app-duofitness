// Sequência do Modo Demo: o número da Home (contador streak do AppContext) e o da Saúde
// (computeStreak, calculado pelas datas das sessões) precisam coincidir, também depois de "Reiniciar demo".
// A regra de cálculo da Saúde NÃO muda: o que se ajusta são os dados do demo.
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as D from '../../src/data/demoData.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as H from '../../src/utils/health.js';

const DAY = 24 * 60 * 60 * 1000;
const NOON = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0).getTime();

describe('sequência do demo: Home x Saúde', () => {
  it('as constantes do demo coincidem (Home mostra DEMO_STREAK; a Saúde calcula o mesmo)', () => {
    const now = new Date();
    expect(H.computeStreak(D.DEMO_SESSIONS, now)).toBe(D.DEMO_STREAK);
  });

  it.each([
    ['dia comum', NOON(2026, 6, 10)],
    ['virada de mês', NOON(2026, 3, 1)],
    ['virada de ano', NOON(2027, 1, 2)],
    ['fim de semana', NOON(2026, 6, 14)],
    ['dias depois (demo reiniciado)', NOON(2026, 6, 10) + 45 * DAY],
  ])('dados frescos (Reiniciar demo) coincidem: %s', (_n, now) => {
    const fresh = D.getFreshDemoData(now);
    expect(H.computeStreak(fresh.sessions, new Date(now))).toBe(fresh.streak);
    expect(fresh.streak).toBe(8);
  });

  it('mantém 9 sessões e 450 XP (a conquista de 500 XP continua a um treino de distância)', () => {
    const fresh = D.getFreshDemoData(NOON(2026, 6, 10));
    expect(fresh.sessions).toHaveLength(9);
    expect(D.DEMO_SESSIONS).toHaveLength(9);
    expect(fresh.xp).toBe(450);
    expect(fresh.sessions.reduce((s: number, x: { xpEarned: number }) => s + x.xpEarned, 0)).toBe(fresh.xp);
    expect(fresh.xp + 50).toBeGreaterThanOrEqual(500); // mais um treino ao vivo desbloqueia "500 XP acumulado"
    expect(fresh.achievements.map((a: { id: string }) => a.id)).not.toContain('xp_500');
  });

  it('as sessões são relativas a "hoje": a mais recente é de ontem e nenhuma é futura', () => {
    const now = NOON(2026, 6, 10);
    const fresh = D.getFreshDemoData(now);
    const times = fresh.sessions.map((s: { completedAt: string }) => new Date(s.completedAt).getTime());
    expect(Math.max(...times)).toBe(now - DAY);
    expect(Math.max(...times)).toBeLessThan(now);
  });

  it('a linha do tempo das conquistas combina com as sessões (nada desbloqueado antes do primeiro treino)', () => {
    const now = NOON(2026, 6, 10);
    const fresh = D.getFreshDemoData(now);
    const first = Math.min(...fresh.sessions.map((s: { completedAt: string }) => new Date(s.completedAt).getTime()));
    for (const a of fresh.achievements) expect(new Date(a.unlockedAt).getTime(), a.id).toBeGreaterThanOrEqual(first);
    const byId = Object.fromEntries(fresh.achievements.map((a: { id: string; unlockedAt: string }) => [a.id, new Date(a.unlockedAt).getTime()]));
    expect(byId.first_workout).toBe(first); // "Primeira série!" no dia do primeiro treino
    expect(byId.streak_3).toBeLessThanOrEqual(byId.streak_7); // 3 dias seguidos antes de 7
  });

  it('a Saúde do demo usa a mesma sequência: o score de sequência do demo reflete 8 dias', () => {
    const now = new Date(NOON(2026, 6, 10));
    const fresh = D.getFreshDemoData(now.getTime());
    const r = H.computeDuoScore({ sessions: fresh.sessions, health: H.buildDemoHealth(now), goals: fresh.user.goals, ageGroup: fresh.user.ageGroup, now });
    const streak = r.components.find((c: { id: string }) => c.id === 'streak');
    expect(streak.value).toBe(100); // 8 dias seguidos >= 7 (nota máxima)
    expect(streak.detail).toContain('8 dias seguidos');
  });
});
