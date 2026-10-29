// Sincronização do HealthKit (puro) e a tela Conectar: vazio sem erro, categoria falhando, menor de 18, desconectar e textos.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as Sync from '../../src/utils/healthSync.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as St from '../../src/utils/healthStore.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as C from '../../src/data/healthConnectContent.js';

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const code = (f: string) => read(f).replace(/^\s*\/\/.*$/gm, '');
const NOW = new Date(2026, 5, 15, 14, 5, 0);
const T = 'America/Sao_Paulo';
const smp = (metric: string, value: number, date: string, source = 'apple_saude') => ({ metric, value, date, tz: T, source });
const conn = (cats: string[]) => ({ version: 1, provider: 'apple_saude', consentAt: '2026-06-10T10:00:00.000Z', categories: Object.fromEntries(cats.map((c) => [c, true])), importedAt: null });
const health = (samples: unknown[]) => St.normalizeHealthV2({ version: 2, samples, waterGoal: 8, migratedFromV1: false });

function provider(report: Record<string, { ok: boolean; count: number }>, samples: unknown[], extra: Record<string, unknown> = {}) {
  return { source: 'healthkit', readDetailed: async () => ({ samples, report, window: { from: '2026-05-17', to: '2026-06-15' } }), ...extra };
}

describe('syncHealthKit', () => {
  it('importa só as categorias consentidas, marca "atualizado" e devolve só contagens', async () => {
    const p = provider({ activity: { ok: true, count: 1 }, sleep: { ok: true, count: 1 } }, [smp('steps', 8000, '2026-06-14'), smp('sleep_duration', 420, '2026-06-15')]);
    const r = await Sync.syncHealthKit({ provider: p, health: health([]), connection: conn(['activity', 'sleep']), now: NOW });
    expect(r.changed).toBe(true);
    expect(r.health.samples.map((s: { metric: string }) => s.metric).sort()).toEqual(['sleep_duration', 'steps']);
    expect(r.connection.importedAt).toBe(NOW.toISOString());
    expect(r.report).toEqual({ activity: { ok: true, count: 1 }, sleep: { ok: true, count: 1 } });
    expect(JSON.stringify(r.report)).not.toMatch(/8000|420/); // nunca valores
  });
  it('falha em UMA categoria mantém o que já havia nela e atualiza as outras', async () => {
    const before = health([smp('steps', 5000, '2026-06-14')]);
    const p = provider({ activity: { ok: false, count: 0 }, hydration: { ok: true, count: 1 } }, [smp('water', 6, '2026-06-14')]);
    const r = await Sync.syncHealthKit({ provider: p, health: before, connection: conn(['activity', 'hydration']), now: NOW });
    expect(r.health.samples.find((s: { metric: string }) => s.metric === 'steps').value).toBe(5000); // intacto
    expect(r.health.samples.some((s: { metric: string }) => s.metric === 'water')).toBe(true);
    expect(r.connection.importedAt).not.toBeNull();
  });
  it('retorno VAZIO não apaga nada, não é erro e não vira "negado"', async () => {
    const before = health([smp('steps', 5000, '2026-06-14')]);
    const p = provider({ activity: { ok: true, count: 0 } }, []);
    const r = await Sync.syncHealthKit({ provider: p, health: before, connection: conn(['activity']), now: NOW });
    expect(r.health.samples).toHaveLength(1);
    expect(r.skipped).toBeUndefined();
    expect(Sync.summarizeReport(r.report)).toMatchObject({ allEmpty: true, failed: 0, total: 0 });
  });
  it('tudo falhando não marca "atualizado"; erro inesperado do provedor vira "skipped", sem lançar', async () => {
    const r = await Sync.syncHealthKit({ provider: provider({ activity: { ok: false, count: 0 } }, []), health: health([]), connection: conn(['activity']), now: NOW });
    expect(r.changed).toBe(false);
    expect(r.connection.importedAt).toBeNull();
    const boom = { source: 'healthkit', readDetailed: async () => { throw new Error('x'); } };
    expect((await Sync.syncHealthKit({ provider: boom, health: health([]), connection: conn(['activity']) })).skipped).toBe('erro');
  });
  it('menor de 18, sem conexão, sem categorias ou provedor que não é o HealthKit: nada roda', async () => {
    const p = provider({ activity: { ok: true, count: 1 } }, [smp('steps', 1, '2026-06-14')]);
    let called = 0;
    (p as any).readDetailed = async () => { called++; return { samples: [], report: {} }; };
    for (const args of [
      { provider: p, health: health([]), connection: conn(['activity']), minor: true },
      { provider: p, health: health([]), connection: { ...conn(['activity']), provider: null } },
      { provider: p, health: health([]), connection: conn([]) },
      { provider: { ...p, source: 'manual' }, health: health([]), connection: conn(['activity']) },
    ]) expect((await Sync.syncHealthKit(args)).skipped).toBe('indisponivel');
    expect(called).toBe(0);
  });
  it('reler a mesma janela não duplica e respeita o registro manual (peso próximo do mesmo dia)', async () => {
    const before = health([smp('weight', 78.5, '2026-06-14', 'manual')]);
    const p = provider({ body: { ok: true, count: 1 } }, [smp('weight', 78.6, '2026-06-14')]);
    const a = await Sync.syncHealthKit({ provider: p, health: before, connection: conn(['body']), now: NOW });
    const b = await Sync.syncHealthKit({ provider: p, health: a.health, connection: a.connection, now: NOW });
    expect(b.health.samples).toHaveLength(1);
    expect(b.health.samples[0].source).toBe('manual');
  });
  it('desconectar apaga só o que veio do HealthKit (Apple Saúde e Watch): peso e treino manuais ficam', () => {
    const h = health([smp('weight', 78, '2026-06-14', 'manual'), smp('exercise_minutes', 30, '2026-06-14', 'manual'), smp('steps', 5000, '2026-06-14', 'apple_saude'), smp('heart_rate', 70, '2026-06-14', 'apple_watch')]);
    const r = St.disconnectAndErase(h, conn(['activity']));
    expect(r.health.samples.map((s: { source: string }) => s.source)).toEqual(['manual', 'manual']);
    expect(r.connection.provider).toBeNull();
    expect(r.removed).toBe(2);
  });
  it('"Atualizado às HH:MM" em hora local', () => {
    expect(Sync.updatedAtLabel(new Date(2026, 5, 15, 9, 7).toISOString())).toBe('Atualizado às 09:07');
    expect(Sync.updatedAtLabel(null)).toBe('');
    expect(Sync.updatedAtLabel('lixo')).toBe('');
  });
});

describe('abrir a Saúde e puxar para atualizar (código-fonte)', () => {
  const hook = code('src/hooks/useHealth.js');
  const screen = code('src/screens/HealthScreen.js');
  it('uma sincronização por vez, no mínimo 30 s entre as automáticas, o puxar ignora o intervalo e não há log', () => {
    expect(hook).toMatch(/if \(inflight\.current\) return inflight\.current;/);
    expect(hook).toMatch(/if \(!force && Date\.now\(\) - lastRun\.current < MIN_AUTO_SYNC_MS\) return null;/);
    expect(hook).not.toMatch(/console\./);
    expect(Sync.MIN_AUTO_SYNC_MS).toBe(30000);
  });
  it('a Saúde sincroniza ao abrir, tem pull-to-refresh só quando conectado e mostra "Atualizado às"', () => {
    expect(screen).toMatch(/useFocusEffect\(useCallback\(\(\) => \{ if \(!loading\) sync\(\); \}, \[loading, sync\]\)\)/);
    expect(screen).toMatch(/refreshControl=\{canSync \? <RefreshControl refreshing=\{syncing\} onRefresh=\{\(\) => sync\(\{ force: true \}\)\}/);
    expect(screen).toContain('updatedAtLabel(lastSyncAt)');
  });
});

describe('tela Conectar', () => {
  const src = code('src/screens/HealthConnectScreen.js');
  it('texto "se nada aparecer" e o caminho de Ajustes, e "Conectar ao Apple Saúde"', () => {
    expect(C.CONNECT_COPY.noDataHelp).toBe('Se nada aparecer, confira em Ajustes › Saúde › Acesso a dados e dispositivos › Duo Fitness.');
    expect(C.CONNECT_COPY.connectButtonApple).toBe('Conectar ao Apple Saúde');
    expect(src).toContain('CONNECT_COPY.noDataHelp');
    expect(src).toMatch(/connectLabel = enabled && os === 'ios'/);
  });
  it('vazio é "ainda não há dados" (info), nunca erro nem "negado"; falha de conexão é erro', () => {
    expect(src).toMatch(/if \(sum\.allEmpty\) setMsg\(\{ kind: 'info'/);
    expect(JSON.stringify(C.CONNECT_COPY)).not.toMatch(/negad[oa] pelo|permissão negada|acesso negado/i);
  });
  it('desconectar explica que a revogação da permissão é em Ajustes e apaga só o que veio do HealthKit', () => {
    expect(C.CONNECT_COPY.disconnectText).toContain('Ajustes › Saúde › Acesso a dados e dispositivos › Duo Fitness');
    expect(C.CONNECT_COPY.disconnectText).toContain('O que você registrou à mão fica');
    expect(src).toContain('disconnectAndErase(health, connection)');
    expect(src).not.toMatch(/readSamples|addSamples/); // a leitura passa pelo sync do hook
  });
  it('lê as categorias pedidas (atividade, sono, coração, composição e hidratação), só leitura', () => {
    expect(C.CONNECT_COPY.reads.map((r: { category: string }) => r.category)).toEqual(['activity', 'sleep', 'heart', 'body', 'hydration']);
    expect(C.CONNECT_COPY.permissions.join(' ')).toMatch(/Só leitura/);
    expect(C.CONNECT_COPY.permissions.join(' ')).toMatch(/não grava nada/);
  });
  it('menor de 18 e Android continuam indisponíveis (texto claro) e a web não tem provedor', () => {
    expect(src).toMatch(/const enabled = integrationEnabled && !!target && !minor;/);
    expect(src).toContain('CONNECT_COPY.minorText');
    expect(C.CONNECT_COPY.providers.android.id).toBe('health_connect');
    expect(src).toMatch(/CONNECT_COPY\.providers\[os\] \|\| null/);
  });
});

describe('privacidade da conta: dados do HealthKit ficam só no aparelho e somem com a conta', () => {
  it('o snapshot por conta guarda @duo_health_v2/@duo_health_connect no aparelho; excluir a conta apaga o snapshot e os dados ativos', async () => {
    // @ts-expect-error módulo JS do app, sem tipos
    const S = await import('../../src/utils/accountSnapshot.js');
    const m = new Map<string, string>([['@duo_owner', 'u1'], ['@duo_health_v2', '{"version":2,"samples":[]}'], ['@duo_health_connect', '{"provider":"apple_saude"}']]);
    const st = {
      getAllKeys: async () => [...m.keys()], getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => { m.set(k, v); }, removeItem: async (k: string) => { m.delete(k); },
      multiGet: async (ks: string[]) => ks.map((k) => [k, m.get(k) ?? null]), multiSet: async (p: [string, string][]) => { p.forEach(([k, v]) => m.set(k, v)); }, multiRemove: async (ks: string[]) => { ks.forEach((k) => m.delete(k)); },
    };
    await S.snapshotAndClear(st, 'u1'); // sair da conta
    expect([...m.keys()]).toEqual(['@duoacct:u1:snapshot']);
    expect(JSON.parse(m.get('@duoacct:u1:snapshot')!).data['@duo_health_v2']).toBeTruthy(); // só no aparelho
    expect(await S.bindAccount(st, 'u2')).toBe('fresh'); // outra conta não vê nada do HealthKit de u1
    expect(m.has('@duo_health_v2')).toBe(false);
    await S.deleteAccountLocalData(st, 'u1'); // excluir a conta de u1
    expect(m.has('@duoacct:u1:snapshot')).toBe(false);
  });
  it('nenhum arquivo novo do HealthKit envia dado para fora (a lista dos arquivos de saúde já é varrida em healthui.test.ts)', () => {
    for (const f of ['src/utils/healthSync.js', 'src/utils/healthKitProvider.js', 'src/utils/healthKitMapping.js', 'src/utils/healthKitLib.js']) {
      expect(code(f), f).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|Share\.share|Linking\.openURL|\bconsole\./);
    }
  });
});

describe('Duo Score: dados do HealthKit alimentam os componentes certos, sem mudar as fórmulas', () => {
  it('passos, minutos de treino, sono, água e peso do Apple Saúde/Watch entram nas categorias de atividade, sono, hidratação e composição', async () => {
    // @ts-expect-error módulo JS do app, sem tipos
    const Sc = await import('../../src/utils/healthScores.js');
    const days = Array.from({ length: 10 }, (_, i) => `2026-06-${String(5 + i).padStart(2, '0')}`);
    const samples = [
      ...days.map((d) => smp('steps', 9000, d, 'apple_watch')),
      ...days.map((d) => smp('exercise_minutes', 40, d, 'apple_saude')),
      ...days.map((d) => smp('sleep_duration', 450, d, 'apple_watch')),
      ...days.map((d) => smp('bedtime', 23 * 60, d, 'apple_watch')),
      ...days.map((d) => smp('water', 8, d, 'apple_saude')),
      smp('weight', 78, '2026-06-05', 'apple_saude'), smp('weight', 77.5, '2026-06-14', 'apple_saude'),
    ];
    const r = Sc.computeDuoScoreV2({ sessions: [], samples, waterGoal: 8, ageGroup: '26-35', now: NOW });
    const present = r.components.filter((c: { present: boolean }) => c.present).map((c: { id: string }) => c.id);
    for (const id of ['activity', 'sleep', 'hydration', 'composition']) expect(present, id).toContain(id);
    expect(Sc.SCORE_WEIGHTS_V2).toEqual({ consistency: 30, streak: 10, activity: 15, sleep: 20, hydration: 15, composition: 10 }); // fórmulas e pesos intactos
  });
  it('categoria sem dados do HealthKit não penaliza (regra já existente): fica de fora do cálculo', async () => {
    // @ts-expect-error módulo JS do app, sem tipos
    const Sc = await import('../../src/utils/healthScores.js');
    const r = Sc.computeDuoScoreV2({ sessions: [], samples: [], waterGoal: 8, ageGroup: '26-35', now: NOW });
    expect(r.components.filter((c: { id: string; present: boolean }) => ['activity', 'sleep', 'hydration', 'composition'].includes(c.id) && c.present)).toEqual([]);
  });
});
