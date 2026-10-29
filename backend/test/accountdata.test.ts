// Idade da conta (13/18) e dados por conta (snapshot em @duoacct:<uid>:snapshot), tudo no aparelho.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { ADULT_AGE, MAX_AGE, MIN_ACCOUNT_AGE } from '../../src/config/account.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as A from '../../src/utils/accountAge.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as S from '../../src/utils/accountSnapshot.js';
// @ts-expect-error módulo JS do app, sem tipos
import { clearAllDuoData } from '../../src/utils/duoStorage.js';

const REPO = path.resolve(__dirname, '../..');

function memory(initial: Record<string, string> = {}) {
  const m = new Map<string, string>(Object.entries(initial));
  return {
    m,
    getAllKeys: async () => [...m.keys()],
    getItem: async (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: async (k: string, v: string) => { m.set(k, v); },
    removeItem: async (k: string) => { m.delete(k); },
    multiGet: async (keys: string[]) => keys.map((k) => [k, m.has(k) ? (m.get(k) as string) : null]),
    multiSet: async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => m.set(k, v)); },
    multiRemove: async (keys: string[]) => { keys.forEach((k) => m.delete(k)); },
  };
}

describe('idade mínima e faixas', () => {
  it('constantes: 13 para criar conta, 18 para adulto', () => {
    expect(MIN_ACCOUNT_AGE).toBe(13);
    expect(ADULT_AGE).toBe(18);
    expect(MAX_AGE).toBe(119);
  });
  it('12: bloqueia com mensagem respeitosa e nada é guardado', () => {
    const r = A.evaluateAge('12');
    expect(r.status).toBe('blocked');
    expect(r.message).toMatch(/a partir de 13 anos/);
    expect(r.message).toMatch(/Obrigado/);
    expect(A.canContinueAge(r, true)).toBe(false);
    expect(A.buildAgeInfo(r, true)).toBeNull();
  });
  it('13 e 17: exigem a confirmação do responsável; sem marcar não avança', () => {
    for (const t of ['13', '17']) {
      const r = A.evaluateAge(t);
      expect(r.status, t).toBe('guardian');
      expect(r.ageGroup).toBe('under18');
      expect(A.canContinueAge(r, false)).toBe(false);
      expect(A.canContinueAge(r, true)).toBe(true);
      expect(A.buildAgeInfo(r, true)).toEqual({ age: Number(t), ageGroup: 'under18', guardianConfirmed: true });
    }
  });
  it('18 ou mais: segue direto, com a faixa que o app já usa', () => {
    expect(A.evaluateAge('18')).toMatchObject({ status: 'ok', ageGroup: '18-25' });
    expect(A.canContinueAge(A.evaluateAge('18'), false)).toBe(true);
    expect(A.buildAgeInfo(A.evaluateAge('40'), false)).toEqual({ age: 40, ageGroup: '36-45', guardianConfirmed: false });
    expect(A.ageGroupFor(26)).toBe('26-35');
    expect(A.ageGroupFor(46)).toBe('46+');
    expect(A.evaluateAge(' 119 ').status).toBe('ok');
  });
  it('valores inválidos: vazio, letras, negativo, decimal, zero e 120 ou mais', () => {
    for (const t of ['', '   ', 'abc', '1a', '-5', '12.5', '0', '120', '999', '1000', null, undefined]) {
      expect(A.evaluateAge(t as string).status, String(t)).toBe('invalid');
      expect(A.canContinueAge(A.evaluateAge(t as string), true)).toBe(false);
    }
  });
  it('ao ler do armazenamento, valor adulterado vira ausente (a etapa de idade volta)', () => {
    expect(A.sanitizeAgeInfo({ age: 15, ageGroup: 'under18', guardianConfirmed: true })).toEqual({ age: 15, ageGroup: 'under18', guardianConfirmed: true });
    expect(A.sanitizeAgeInfo({ age: 15, ageGroup: 'under18', guardianConfirmed: false })).toBeUndefined(); // menor sem autorização
    expect(A.sanitizeAgeInfo({ age: 15, ageGroup: '26-35', guardianConfirmed: true })).toBeUndefined();
    expect(A.sanitizeAgeInfo({ age: 12, ageGroup: 'under18', guardianConfirmed: true })).toBeUndefined();
    expect(A.sanitizeAgeInfo({ age: '30', ageGroup: '26-35' })).toBeUndefined();
    expect(A.sanitizeAgeInfo(null)).toBeUndefined();
    expect(A.sanitizeAgeInfo([1])).toBeUndefined();
  });
});

describe('snapshot por conta', () => {
  const dataA = { '@duo_user': '{"name":"Ana","ageGroup":"26-35"}', '@duo_age': '{"age":30}', '@duo_xp': '150', '@duo_onboarded': 'true' };

  it('chave do snapshot não começa com @duo_ (a limpeza das ativas não a apaga)', async () => {
    expect(S.snapshotKey('uid-1')).toBe('@duoacct:uid-1:snapshot');
    const st = memory({ ...dataA, [S.snapshotKey('x')]: '{}' });
    await clearAllDuoData(st);
    expect([...st.m.keys()]).toEqual([S.snapshotKey('x')]);
  });

  it('sair e entrar de novo: A com dados -> B nova (não vê nada de A) -> A de volta (vê tudo de A)', async () => {
    const st = memory({ ...dataA });
    expect(await S.bindAccount(st, 'A')).toBe('adopted'); // dados de antes das contas vão para a primeira conta
    expect(st.m.get('@duo_owner')).toBe('A');
    await st.setItem('@duo_workouts', '[{"id":"1"}]'); // A continua usando o app

    await S.snapshotAndClear(st, 'A'); // A sai
    expect([...st.m.keys()].filter((k) => k.startsWith('@duo_'))).toEqual([]);
    expect(st.m.has(S.snapshotKey('A'))).toBe(true);

    expect(await S.bindAccount(st, 'B')).toBe('fresh'); // B nova: nada de A
    expect(st.m.get('@duo_user')).toBeUndefined();
    expect(st.m.get('@duo_xp')).toBeUndefined();
    expect(st.m.get('@duo_owner')).toBe('B');
    await st.setItem('@duo_xp', '999');

    await S.snapshotAndClear(st, 'B'); // B sai
    expect(await S.bindAccount(st, 'A')).toBe('restored'); // A volta: vê tudo de A, e só de A
    expect(st.m.get('@duo_user')).toBe(dataA['@duo_user']);
    expect(st.m.get('@duo_workouts')).toBe('[{"id":"1"}]');
    expect(st.m.get('@duo_age')).toBe(dataA['@duo_age']);
    expect(st.m.get('@duo_xp')).toBe('150');
    expect(st.m.get('@duo_owner')).toBe('A');
    expect(st.m.has(S.snapshotKey('A'))).toBe(false); // consumido; é salvo de novo ao sair
    expect(st.m.has(S.snapshotKey('B'))).toBe(true); // o de B continua guardado
  });

  it('reabrir o app com a sessão ativa não mexe em nada', async () => {
    const st = memory({ ...dataA, '@duo_owner': 'A' });
    expect(await S.bindAccount(st, 'A')).toBe('owner');
    expect(st.m.get('@duo_xp')).toBe('150');
  });

  it('dados de antes das contas: adotados pela primeira conta, sem snapshot; os de exemplo do antigo demo não', async () => {
    const legacy = memory({ ...dataA });
    expect(await S.bindAccount(legacy, 'A')).toBe('adopted');
    expect(legacy.m.get('@duo_xp')).toBe('150');
    const demo = memory({ '@duo_onboarded': 'true', '@duo_user': '{"name":"Rafael","isDemo":true}', '@duo_xp': '50' });
    expect(await S.bindAccount(demo, 'A')).toBe('fresh');
    expect(demo.m.get('@duo_xp')).toBeUndefined();
  });

  it('com snapshot do uid, ele vence os dados antigos soltos; conta nova sem nada começa do zero', async () => {
    const st = memory({ '@duo_onboarded': 'true', '@duo_user': '{"name":"Antigo"}' });
    await S.saveSnapshot(memory(), 'Z'); // (só garante que a função roda sem chaves)
    await st.setItem(S.snapshotKey('Z'), JSON.stringify({ version: 1, savedAt: 'x', data: { '@duo_user': '{"name":"Zoe"}', '@duo_onboarded': 'true' } }));
    expect(await S.bindAccount(st, 'Z')).toBe('restored');
    expect(st.m.get('@duo_user')).toBe('{"name":"Zoe"}');
    expect(await S.bindAccount(memory(), 'N')).toBe('fresh');
  });

  it('chaves ativas de OUTRA conta (queda antes de sair) são salvas no snapshot dela antes de entrar a nova', async () => {
    const st = memory({ ...dataA, '@duo_owner': 'A' });
    expect(await S.bindAccount(st, 'B')).toBe('fresh');
    const snap = await S.readSnapshot(st, 'A');
    expect(snap['@duo_xp']).toBe('150');
    expect(st.m.get('@duo_xp')).toBeUndefined();
  });

  it('JSON corrompido no snapshot é IGNORADO e nada é apagado', async () => {
    for (const bad of ['{nao e json', '{"version":2,"data":{}}', '{"version":1,"data":[1,2]}', '"texto"', 'null']) {
      const st = memory({ [S.snapshotKey('A')]: bad, '@duo_xp': '7', '@duo_owner': 'A' });
      expect(await S.readSnapshot(st, 'A')).toBeUndefined();
      expect(await S.restoreSnapshot(st, 'A')).toBe(false);
      expect(st.m.get(S.snapshotKey('A'))).toBe(bad); // não apagou o corrompido
      expect(st.m.get('@duo_xp')).toBe('7'); // nem as ativas
    }
    const st2 = memory({ [S.snapshotKey('A')]: '{"version":1,"data":{"@duo_xp":"5","outra":"x","@duo_n":3}}' });
    expect(await S.readSnapshot(st2, 'A')).toEqual({ '@duo_xp': '5' }); // só chaves @duo_ com texto
  });

  it('sair sem ser dono das chaves ativas só limpa (não grava dados de outra conta no snapshot errado)', async () => {
    const st = memory({ '@duo_xp': '1', '@duo_owner': 'OUTRA' });
    await S.snapshotAndClear(st, 'A');
    expect(st.m.has(S.snapshotKey('A'))).toBe(false);
    expect(st.m.has('@duo_xp')).toBe(false);
  });

  it('excluir a conta apaga o snapshot do uid e as chaves ativas, e não o snapshot de outras contas', async () => {
    const st = memory({ ...dataA, '@duo_owner': 'A', [S.snapshotKey('A')]: '{}', [S.snapshotKey('B')]: '{}' });
    await S.deleteAccountLocalData(st, 'A');
    expect([...st.m.keys()]).toEqual([S.snapshotKey('B')]);
  });
});

describe('a idade nunca sai do aparelho', () => {
  const code = (f: string) => readFileSync(path.join(REPO, f), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  it('os módulos da idade e do snapshot não fazem rede nem compartilham nada', () => {
    for (const f of ['src/utils/accountAge.js', 'src/utils/accountSnapshot.js', 'src/config/account.js']) {
      expect(code(f), f).not.toMatch(/fetch\s*\(|XMLHttpRequest|WebSocket|Share\.share|Linking\.openURL|console\./);
    }
  });
  it('API, SSE, anúncio, marketplace e lotação não conhecem a idade da conta', () => {
    for (const f of ['src/services/api.js', 'src/utils/sse.js', 'src/utils/advertise.js', 'src/data/advertiseConfig.js', 'src/data/marketplace.js', 'src/utils/occupancy.js']) {
      expect(code(f), f).not.toMatch(/accountAge|ageInfo|@duo_age|MIN_ACCOUNT_AGE|guardianConfirmed/);
    }
  });
});
