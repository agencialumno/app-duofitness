// Lembretes (notificações LOCAIS): agenda pura com relógio simulado, serviço com módulo falso, plugin próprio (sem push, sem alarmes exatos, com reinício),
// conferência do projeto gerado, snapshot por conta e o repositório sem a flag idêntico. O que depende do aparelho real está em docs/lembretes.md.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as R from '../../src/utils/reminders.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as SV from '../../src/utils/remindersService.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as TX from '../../src/data/reminderTexts.js';
// @ts-expect-error módulo JS do app, sem tipos
import { dayKeySP } from '../../src/utils/saoPauloDay.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as SNAP from '../../src/utils/accountSnapshot.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as H from '../../src/utils/seriesHistory.js';
// @ts-expect-error módulo JS do app, sem tipos
import RemindersCard from '../../src/components/RemindersCard.js';
import { alerts, Alert } from './stubs/react-native';

const REPO = path.resolve(__dirname, '../..');
const req = createRequire(path.join(REPO, 'package.json'));
const plugin = req('./plugins/withNotificationsOptional.js');
const yaml = req('js-yaml') as { load: (s: string) => { jobs: Record<string, { env?: Record<string, string>; steps: { name?: string; run?: string; if?: string; env?: Record<string, string> }[] }> } };
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const code = (f: string) => read(f).replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');

// ---------- relógio simulado: instantes em horário de São Paulo ----------
const sp = (iso: string) => new Date(`${iso}-03:00`); // ex.: sp('2025-03-03T09:00') = segunda 09:00 em SP
const spHour = (d: Date) => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(d)) % 24;
const spMinute = (d: Date) => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', minute: '2-digit' }).format(d));
const prefsOf = (extra: Record<string, unknown> = {}) => ({ ...R.DEFAULT_PREFS, ...extra });
const MON = '2025-03-03'; // segunda-feira
const wd = (key: string) => R.weekdayOfKey(key);

describe('agenda: no máximo 1 por dia, por construção', () => {
  it('em centenas de combinações (último acesso, horário, dias, relógio), nunca há duas no mesmo dia nem nenhuma no passado', () => {
    let casos = 0;
    for (const days of [null, [], [1], [1, 3, 5], [0, 1, 2, 3, 4, 5, 6]]) {
      for (const [hour, minute] of [[8, 0], [18, 0], [20, 30], [21, 0], [22, 45], [3, 15], [0, 0]]) {
        for (const lastOpenOffset of [0, 1, 2, 3, 5, 7, 10, 14, 20]) {
          for (const nowShift of [0, 5, 9, 14, 23]) { // horas depois do último acesso
            const last = new Date(sp(`${MON}T07:00`).getTime() - lastOpenOffset * 86400000);
            const now = new Date(last.getTime() + nowShift * 3600000);
            const s = R.buildSchedule({ prefs: prefsOf({ days, hour, minute, lastOpen: last.toISOString() }), now });
            const keys = s.map((x: any) => x.dayKey);
            expect(new Set(keys).size, JSON.stringify({ days, hour, minute, lastOpenOffset, nowShift })).toBe(keys.length);
            for (const x of s) expect(x.when.getTime()).toBeGreaterThan(now.getTime());
            casos++;
          }
        }
      }
    }
    expect(casos).toBeGreaterThan(1500);
  });
  it('desligado = nenhuma notificação', () => {
    expect(R.buildSchedule({ prefs: prefsOf({ enabled: false }), now: sp(`${MON}T09:00`) })).toEqual([]);
  });
});

describe('lembrete de treino: dias, horário padrão 18h e janela de 7 dias', () => {
  it('padrão: 18h de São Paulo (21:00 UTC) nos dias da série; sem informação da série (migrada), segunda, quarta e sexta', () => {
    const now = sp(`${MON}T08:00`);
    const s = R.buildSchedule({ prefs: prefsOf({ lastOpen: now.toISOString() }), now });
    const treino = s.filter((x: any) => x.kind === 'treino');
    expect(treino.map((x: any) => wd(x.dayKey))).toEqual([1, 3, 5, 1]); // seg, qua, sex e a segunda seguinte (dentro dos 7 dias)
    for (const x of treino) expect(x.when.toISOString().slice(11, 16)).toBe('21:00');
    expect(R.defaultWeekdays(undefined)).toEqual([1, 3, 5]);
    expect(R.defaultWeekdays(1)).toEqual([3]);
    expect(R.defaultWeekdays(2)).toEqual([1, 4]);
    expect(R.defaultWeekdays(3)).toEqual([1, 3, 5]);
    const dois = R.buildSchedule({ prefs: prefsOf({ lastOpen: now.toISOString() }), now, seriesDays: 2 }).filter((x: any) => x.kind === 'treino');
    expect(dois.map((x: any) => wd(x.dayKey))).toEqual([1, 4, 1]);
  });
  it('a janela é de 7 dias depois do último acesso: com todos os dias marcados, nada além do 7º dia', () => {
    const now = sp(`${MON}T07:00`);
    const s = R.buildSchedule({ prefs: prefsOf({ days: [0, 1, 2, 3, 4, 5, 6], lastOpen: now.toISOString() }), now });
    const treino = s.filter((x: any) => x.kind === 'treino').map((x: any) => x.dayKey);
    expect(treino[0]).toBe(MON);
    expect(treino[treino.length - 1]).toBe('2025-03-10');
    expect(treino).toHaveLength(8);
  });
  it('horário e dias escolhidos pela pessoa valem', () => {
    const now = sp(`${MON}T07:00`);
    const s = R.buildSchedule({ prefs: prefsOf({ hour: 7, minute: 30, days: [2], lastOpen: now.toISOString() }), now: sp(`${MON}T06:00`) });
    const t = s.filter((x: any) => x.kind === 'treino');
    expect(t.map((x: any) => x.dayKey)).toEqual(['2025-03-04', '2025-03-11'].filter((k) => k <= '2025-03-10'));
    expect([spHour(t[0].when), spMinute(t[0].when)]).toEqual([8, 0]); // 07:30 cai no silêncio (antes das 8h): vai para 08:00
  });
});

describe('inatividade: 3º, 7º e 14º dia e depois silêncio total', () => {
  const prefs = (extra = {}) => prefsOf({ days: [], lastOpen: sp(`${MON}T09:00`).toISOString(), ...extra });
  it('sem dias de treino, só os marcos 3, 7 e 14 (e nada depois)', () => {
    const s = R.buildSchedule({ prefs: prefs(), now: sp(`${MON}T09:00`) });
    expect(s.map((x: any) => [x.kind, x.dayKey])).toEqual([['inatividade', '2025-03-06'], ['inatividade', '2025-03-10'], ['inatividade', '2025-03-17']]);
  });
  it('vai sumindo conforme os dias passam e, depois do 14º dia, não resta NADA (silêncio total)', () => {
    const dias = (k: string, h = 12) => sp(`${k}T${String(h).padStart(2, '0')}:00`);
    expect(R.buildSchedule({ prefs: prefs(), now: dias('2025-03-07') }).map((x: any) => x.dayKey)).toEqual(['2025-03-10', '2025-03-17']);
    expect(R.buildSchedule({ prefs: prefs(), now: dias('2025-03-11') }).map((x: any) => x.dayKey)).toEqual(['2025-03-17']);
    expect(R.buildSchedule({ prefs: prefs(), now: dias('2025-03-17', 19) })).toEqual([]);
    expect(R.buildSchedule({ prefs: prefs(), now: dias('2025-04-30') })).toEqual([]);
    expect(R.buildSchedule({ prefs: prefsOf({ lastOpen: sp(`${MON}T09:00`).toISOString() }), now: dias('2025-06-01') })).toEqual([]); // nem treino, nem inatividade
  });
  it('dia de treino VENCE: o marco de inatividade desse dia é DESCARTADO (não adiado), e continua 1 por dia', () => {
    // aberto na sexta 07/03: o 3º dia cai na segunda 10/03 (dia de treino seg/qua/sex)
    const last = sp('2025-03-07T09:00');
    const s = R.buildSchedule({ prefs: prefsOf({ lastOpen: last.toISOString() }), now: last });
    const seg = s.filter((x: any) => x.dayKey === '2025-03-10');
    expect(seg).toHaveLength(1);
    expect(seg[0].kind).toBe('treino'); // nada de "sentimos sua falta" no dia em que deveria treinar
    expect(s.some((x: any) => x.kind === 'inatividade' && x.dayKey === '2025-03-11')).toBe(false); // descartado, não empurrado para terça
    expect(s.some((x: any) => x.kind === 'inatividade' && x.dayKey === '2025-03-09')).toBe(false);
    const sexta14 = s.filter((x: any) => x.dayKey === '2025-03-14');
    expect(sexta14[0].kind).toBe('treino'); // 7º dia também é sexta
    expect(s.find((x: any) => x.dayKey === '2025-03-21').kind).toBe('inatividade'); // 14º dia, fora da janela de treino
  });
  it('em dia sem treino a inatividade aparece normalmente', () => {
    const s = R.buildSchedule({ prefs: prefsOf({ days: [0], lastOpen: sp(`${MON}T09:00`).toISOString() }), now: sp(`${MON}T09:00`) });
    expect(s.find((x: any) => x.dayKey === '2025-03-06').kind).toBe('inatividade');
  });
});

describe('silêncio noturno 21h às 8h e fuso de São Paulo', () => {
  it('nenhuma notificação cai entre 21h e 8h (horário de SP), qualquer que seja o horário escolhido', () => {
    for (let h = 0; h < 24; h++) for (const m of [0, 30]) {
      const s = R.buildSchedule({ prefs: prefsOf({ hour: h, minute: m, days: [0, 1, 2, 3, 4, 5, 6], lastOpen: sp(`${MON}T06:00`).toISOString() }), now: sp(`${MON}T06:00`) });
      for (const x of s) { const hh = spHour(x.when); expect(hh >= 8 && hh < 21, `${h}:${m} -> ${hh}h`).toBe(true); }
    }
  });
  it('move para o próximo horário válido: 22h30 vai para as 8h do dia seguinte; 5h vai para as 8h do mesmo dia; 21h em ponto é silêncio; 20h30 fica', () => {
    expect(R.shiftQuiet('2025-03-03', 22, 30)).toEqual({ key: '2025-03-04', hour: 8, minute: 0 });
    expect(R.shiftQuiet('2025-03-03', 5, 0)).toEqual({ key: '2025-03-03', hour: 8, minute: 0 });
    expect(R.shiftQuiet('2025-03-03', 21, 0)).toEqual({ key: '2025-03-04', hour: 8, minute: 0 });
    expect(R.shiftQuiet('2025-03-03', 8, 0)).toEqual({ key: '2025-03-03', hour: 8, minute: 0 });
    expect(R.shiftQuiet('2025-03-03', 20, 30)).toEqual({ key: '2025-03-03', hour: 20, minute: 30 });
    expect(R.isQuietTime(21, 0)).toBe(true);
    expect(R.isQuietTime(7, 59)).toBe(true);
    expect(R.isQuietTime(18, 0)).toBe(false);
  });
  it('o dia e a hora são os de São Paulo, não os do aparelho', () => {
    const original = process.env.TZ;
    try {
      for (const tz of ['UTC', 'Asia/Tokyo', 'America/Sao_Paulo']) {
        process.env.TZ = tz;
        const last = new Date('2025-03-04T02:00:00Z'); // 23:00 de segunda em SP
        const s = R.buildSchedule({ prefs: prefsOf({ days: [], lastOpen: last.toISOString() }), now: last });
        expect(s.map((x: any) => x.dayKey), tz).toEqual(['2025-03-06', '2025-03-10', '2025-03-17']); // marcos contados do dia 03/03 (SP)
        expect(s[0].when.toISOString(), tz).toBe('2025-03-06T21:00:00.000Z');
      }
    } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
  });
  it('é determinístico: o mesmo cenário gera sempre a mesma agenda', () => {
    const args = { prefs: prefsOf({ lastOpen: sp(`${MON}T09:00`).toISOString() }), now: sp(`${MON}T09:00`) };
    expect(R.buildSchedule(args)).toEqual(R.buildSchedule(args));
  });
});

describe('textos: neutros, gentis, variados e iguais para qualquer idade', () => {
  it('3 a 5 mensagens por tipo; título genérico; nada de saúde, peso, aparência, nome ou cobrança', () => {
    expect(TX.TRAINING_TEXTS.length).toBeGreaterThanOrEqual(3);
    expect(TX.TRAINING_TEXTS.length).toBeLessThanOrEqual(5);
    expect(TX.INACTIVITY_TEXTS.length).toBeGreaterThanOrEqual(3);
    expect(TX.INACTIVITY_TEXTS.length).toBeLessThanOrEqual(5);
    expect(TX.REMINDER_TITLE).toBe('Duo Fitness');
    const proibido = /\b(peso|kg|imc|caloria|dieta|gordur|gord[oa]|magr[oa]|emagrec|barriga|corpo|apar[eê]ncia|shape|queimar|culpa|falt[ao]|sumiu|pregui|desist|abandon|perdeu|vergonha|sem treinar|n[aã]o treinou)\b/i;
    const todos = [...TX.TRAINING_TEXTS, ...TX.INACTIVITY_TEXTS, TX.REMINDER_TITLE, TX.OFFER_TITLE, TX.OFFER_MESSAGE];
    for (const t of todos) expect(t, t).not.toMatch(proibido);
    for (const t of [...TX.TRAINING_TEXTS, ...TX.INACTIVITY_TEXTS]) expect(t.length, t).toBeLessThanOrEqual(90); // curtos: aparecem na tela de bloqueio
    for (const t of [...TX.TRAINING_TEXTS, ...TX.INACTIVITY_TEXTS]) expect(t, t).toMatch(/[áéíóúãõâêçà]|[a-z]/);
  });
  it('as mensagens variam entre os dias (escolha por data) e a agenda não conhece idade, nome, peso nem série', () => {
    const now = sp(`${MON}T07:00`);
    const s = R.buildSchedule({ prefs: prefsOf({ days: [0, 1, 2, 3, 4, 5, 6], lastOpen: now.toISOString() }), now });
    expect(new Set(s.map((x: any) => x.body)).size).toBeGreaterThanOrEqual(3);
    for (const x of s) { expect(x.title).toBe('Duo Fitness'); expect([...TX.TRAINING_TEXTS, ...TX.INACTIVITY_TEXTS]).toContain(x.body); }
    expect(code('src/utils/reminders.js')).not.toMatch(/ageGroup|under18|weight|peso|user\b|name\b|AsyncStorage|fetch\(/); // menores recebem exatamente os mesmos lembretes
  });
  it('a explicação antes do pedido do sistema é curta e fala de aviso gentil, no aparelho', () => {
    expect(TX.OFFER_MESSAGE).toMatch(/no m[aá]ximo um aviso por dia/i);
    expect(TX.OFFER_MESSAGE).toMatch(/aparelho/);
  });
});

// ---------- módulo de notificações FALSO ----------
function fakeNotifications(opts: { granted?: boolean; canAsk?: boolean } = {}) {
  const log: string[] = [];
  const scheduled = new Map<string, any>();
  const channels: Record<string, any> = {};
  let granted = opts.granted ?? true;
  const mod = {
    log, scheduled, channels,
    AndroidImportance: { DEFAULT: 3, LOW: 2 },
    AndroidNotificationVisibility: { PRIVATE: 0 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
    getPermissionsAsync: async () => ({ granted, status: granted ? 'granted' : 'denied' }),
    requestPermissionsAsync: async () => { log.push('request'); granted = opts.canAsk === false ? false : (opts.granted ?? true); return { granted, status: granted ? 'granted' : 'denied' }; },
    cancelAllScheduledNotificationsAsync: async () => { log.push('cancelAll'); scheduled.clear(); },
    scheduleNotificationAsync: async (r: any) => { log.push('schedule'); scheduled.set(r.identifier, r); return r.identifier; },
    setNotificationChannelAsync: async (id: string, cfg: any) => { channels[id] = cfg; },
    getAllScheduledNotificationsAsync: async () => [...scheduled.values()],
  };
  return mod;
}
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
const savedPrefs = (st: any) => JSON.parse(st.m.get(SV.REMINDERS_KEY));

describe('serviço: cancelar e reagendar ao abrir, permissão e canal', () => {
  const NOW = sp(`${MON}T09:00`);
  it('ao abrir: grava o último acesso, CANCELA tudo e agenda de novo (sem duplicar ao abrir outra vez)', async () => {
    const st = memory();
    const n = fakeNotifications();
    const r1 = await SV.syncReminders({ storage: st, notifications: n, now: NOW, markOpen: true });
    expect(r1.reason).toBe('ok');
    expect(n.log[0]).toBe('cancelAll'); // cancela ANTES de agendar
    expect(n.log.filter((x) => x === 'schedule').length).toBe(r1.scheduled.length);
    const antes = [...n.scheduled.keys()].sort();
    expect(savedPrefs(st).lastOpen).toBe(NOW.toISOString());
    await SV.syncReminders({ storage: st, notifications: n, now: NOW, markOpen: true });
    expect([...n.scheduled.keys()].sort()).toEqual(antes); // mesmo conjunto, sem duplicatas
    // abrir de novo dias depois move os marcos de inatividade para depois do novo acesso
    const depois = sp('2025-03-12T10:00');
    await SV.syncReminders({ storage: st, notifications: n, now: depois, markOpen: true });
    const inat = [...n.scheduled.values()].filter((x) => x.identifier.startsWith('duo-inat')).map((x) => x.identifier);
    expect(inat).toEqual(['duo-inat-2025-03-15', 'duo-inat-2025-03-19', 'duo-inat-2025-03-26'].filter((id) => !n.scheduled.has(id.replace('inat', 'treino'))));
  });
  it('cada agendamento é uma notificação ÚNICA com data (nada de repetição semanal), no canal dos lembretes, com título e texto neutros', async () => {
    const n = fakeNotifications();
    await SV.syncReminders({ storage: memory(), notifications: n, now: NOW, markOpen: true });
    for (const req of n.scheduled.values()) {
      expect(req.trigger.type).toBe('date');
      expect(req.trigger.date).toBeInstanceOf(Date);
      expect(req.trigger.channelId).toBe('lembretes');
      expect(req.trigger).not.toHaveProperty('repeats');
      expect(req.content.title).toBe('Duo Fitness');
      expect(Object.keys(req.content).sort()).toEqual(['body', 'sound', 'title']); // sem dados extras (nada de payload, nome ou saúde)
    }
    expect(n.scheduled.size).toBeLessThan(64); // muito abaixo do limite de notificações pendentes do iOS
  });
  it('canal do Android: importância MÉDIA, som padrão, sem vibração, conteúdo privado na tela de bloqueio; no iOS não há canal', async () => {
    const n = fakeNotifications();
    await SV.syncReminders({ storage: memory(), notifications: n, now: NOW, platform: 'android' });
    expect(n.channels.lembretes).toMatchObject({ importance: 3, sound: 'default', enableVibrate: false, showBadge: false, lockscreenVisibility: 0 });
    expect(n.channels.lembretes).not.toHaveProperty('vibrationPattern');
    const n2 = fakeNotifications();
    await SV.syncReminders({ storage: memory(), notifications: n2, now: NOW, platform: 'ios' });
    expect(Object.keys(n2.channels)).toEqual([]);
  });
  it('permissão negada: cancela, não agenda nada e não pede a permissão por conta própria', async () => {
    const n = fakeNotifications({ granted: false });
    const r = await SV.syncReminders({ storage: memory(), notifications: n, now: NOW, markOpen: true });
    expect(r).toEqual({ scheduled: [], reason: 'sem_permissao' });
    expect(n.log).toEqual(['cancelAll']);
    expect(n.scheduled.size).toBe(0);
  });
  it('depois da primeira série: explica ANTES do pedido do sistema; "Ativar" pede e agenda; negou, não insiste', async () => {
    alerts.length = 0;
    const st = memory();
    const n = fakeNotifications({ granted: false, canAsk: false });
    expect(await SV.offerReminders({ Alert, storage: st, notifications: n, now: NOW })).toBe(true);
    expect(n.log).toEqual([]); // a explicação veio primeiro: o sistema ainda não foi chamado
    expect(alerts[0]!.title).toBe('Quer receber lembretes?');
    expect(alerts[0]!.buttons.map((b: any) => b.text)).toEqual(['Agora não', 'Ativar lembretes']);
    await alerts[0]!.buttons[1].onPress();
    expect(n.log).toContain('request');
    expect(savedPrefs(st)).toMatchObject({ permission: 'denied' });
    expect(savedPrefs(st).askedAt).not.toBeNull();
    alerts.length = 0;
    expect(await SV.offerReminders({ Alert, storage: st, notifications: n, now: NOW })).toBe(false); // não insiste
    expect(alerts).toHaveLength(0);
  });
  it('"Ativar" com permissão concedida agenda na hora; "Agora não" não pede nada e também não volta a perguntar', async () => {
    alerts.length = 0;
    const st = memory();
    const n = fakeNotifications({ granted: true });
    await SV.offerReminders({ Alert, storage: st, notifications: n, now: NOW });
    await alerts[0]!.buttons[1].onPress();
    expect(savedPrefs(st).permission).toBe('granted');
    expect(n.scheduled.size).toBeGreaterThan(0);
    alerts.length = 0;
    const st2 = memory();
    const n2 = fakeNotifications();
    await SV.offerReminders({ Alert, storage: st2, notifications: n2, now: NOW });
    alerts[0]!.buttons[0].onPress();
    await Promise.resolve();
    expect(n2.log).toEqual([]);
    expect(savedPrefs(st2).askedAt).not.toBeNull();
    alerts.length = 0;
    expect(await SV.offerReminders({ Alert, storage: st2, notifications: n2, now: NOW })).toBe(false);
  });
  it('"Parar todos os lembretes": desliga e cancela tudo; um novo sync não agenda nada', async () => {
    const st = memory();
    const n = fakeNotifications();
    await SV.syncReminders({ storage: st, notifications: n, now: NOW, markOpen: true });
    expect(n.scheduled.size).toBeGreaterThan(0);
    await SV.stopAllReminders({ storage: st, notifications: n });
    expect(n.scheduled.size).toBe(0);
    expect(savedPrefs(st).enabled).toBe(false);
    expect((await SV.syncReminders({ storage: st, notifications: n, now: NOW, markOpen: true })).reason).toBe('desligado');
    expect(n.scheduled.size).toBe(0);
  });
  it('logout e exclusão de conta cancelam tudo (o contexto chama cancelAllReminders nos três caminhos de saída)', async () => {
    const n = fakeNotifications();
    await SV.syncReminders({ storage: memory(), notifications: n, now: NOW });
    expect(n.scheduled.size).toBeGreaterThan(0);
    await SV.cancelAllReminders(n);
    expect(n.scheduled.size).toBe(0);
    await SV.cancelAllReminders(null); // sem módulo: não faz nada nem lança
    const ctx = read('src/context/AppContext.js');
    for (const flow of ['signOutFlow', 'deleteAccountFlow', 'rejectUnderageFlow']) {
      const i = ctx.indexOf(`await ${flow}(`);
      expect(i, flow).toBeGreaterThan(-1);
      const trecho = ctx.slice(i, ctx.indexOf('resetMemory();', i));
      expect(trecho, flow).toContain('await cancelAllReminders(loadNotifications())');
    }
  });
  it('sem o módulo (flag desligada): nada é carregado, agendado nem gravado', async () => {
    expect(SV.loadNotifications()).toBeNull();
    const st = memory();
    expect(await SV.syncReminders({ storage: st, notifications: null, now: NOW, markOpen: true })).toEqual({ scheduled: [], reason: 'indisponivel' });
    expect(st.m.size).toBe(0);
    expect(await SV.offerReminders({ Alert, storage: st, notifications: null })).toBe(false);
  });
  it('preferências corrompidas viram o padrão (sem lançar e sem apagar a chave)', async () => {
    const st = memory({ [SV.REMINDERS_KEY]: '{lixo' });
    expect(await SV.loadPrefs(st)).toMatchObject({ enabled: true, hour: 18, days: null });
    expect(st.m.get(SV.REMINDERS_KEY)).toBe('{lixo');
    expect(R.sanitizePrefs({ hour: 99, minute: -1, days: [1, 1, 9, 'x'], permission: 'talvez', lastOpen: 'ontem' })).toMatchObject({ hour: 18, minute: 0, days: [1], permission: 'unknown', lastOpen: null });
  });
});

describe('dados: só o necessário, no aparelho, por conta', () => {
  const prefsJson = JSON.stringify({ ...R.DEFAULT_PREFS, lastOpen: sp(`${MON}T09:00`).toISOString() });
  it('@duo_reminders guarda só preferências, último acesso e estado da permissão', () => {
    expect(Object.keys(R.DEFAULT_PREFS).sort()).toEqual(['askedAt', 'days', 'enabled', 'hour', 'lastOpen', 'minute', 'permission', 'version']);
    expect(SV.REMINDERS_KEY.startsWith('@duo_')).toBe(true);
    const src = code('src/utils/remindersService.js') + code('src/utils/reminders.js') + code('src/screens/RemindersScreen.js');
    expect(src).not.toMatch(/fetch\(|XMLHttpRequest|getExpoPushTokenAsync|getDevicePushTokenAsync|console\./);
  });
  it('logout/login na MESMA conta restaura os lembretes; em outra conta não vaza; exclusão de conta apaga tudo', async () => {
    const st = memory();
    await SNAP.bindAccount(st, 'uidA');
    await st.setItem(SV.REMINDERS_KEY, prefsJson);
    await st.setItem('@duo_onboarded', 'true');
    await SNAP.snapshotAndClear(st, 'uidA');
    expect(st.m.has(SV.REMINDERS_KEY)).toBe(false);
    expect(await SNAP.bindAccount(st, 'uidB')).toBe('fresh');
    expect(st.m.has(SV.REMINDERS_KEY)).toBe(false);
    await SNAP.snapshotAndClear(st, 'uidB');
    expect(await SNAP.bindAccount(st, 'uidA')).toBe('restored');
    expect(st.m.get(SV.REMINDERS_KEY)).toBe(prefsJson);
    await SNAP.deleteAccountLocalData(st, 'uidA');
    expect([...st.m.keys()].filter((k) => k.includes('reminders'))).toEqual([]);
    expect(st.m.has(SNAP.snapshotKey('uidA'))).toBe(false);
  });
  it('a série guarda os dias por semana (campo opcional); sem o campo (migrada) valem 3 dias', () => {
    const store = { version: 1, migrated: true, items: [] as any[] };
    const r = H.registerSeries(store, { workoutIds: ['1_0', '1_1', '1_2'], days: 2, goals: ['health'], now: new Date() });
    expect(r.store.items[0].days).toBe(2);
    expect(H.sanitizeStore(JSON.parse(JSON.stringify(r.store))).items[0].days).toBe(2);
    const sem = H.registerSeries(store, { workoutIds: ['2_0'], days: 9, now: new Date() }).store.items[0];
    expect(sem).not.toHaveProperty('days');
    const migrada = H.migrateWorkouts([{ id: '5_0', serie: 'A', createdAt: new Date().toISOString() }])[0];
    expect(migrada).not.toHaveProperty('days');
    expect(R.defaultWeekdays(migrada.days)).toEqual([1, 3, 5]);
  });
});

describe('plugin próprio: sem push, sem alarmes exatos, com reinício', () => {
  const manifestBase = () => ({ manifest: { $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' }, 'uses-permission': [{ $: { 'android:name': 'android.permission.INTERNET' } }], application: [{}] } });
  it('Android: declara POST_NOTIFICATIONS e RECEIVE_BOOT_COMPLETED (reagendar depois de reiniciar) e REMOVE SCHEDULE_EXACT_ALARM e USE_EXACT_ALARM', () => {
    const m = plugin.applyManifest(manifestBase()).manifest;
    const perms = m['uses-permission'];
    const ativa = (n: string) => perms.some((p: any) => p.$['android:name'] === n && p.$['tools:node'] !== 'remove');
    const removida = (n: string) => perms.some((p: any) => p.$['android:name'] === n && p.$['tools:node'] === 'remove');
    expect(ativa('android.permission.RECEIVE_BOOT_COMPLETED')).toBe(true);
    expect(ativa('android.permission.POST_NOTIFICATIONS')).toBe(true);
    expect(ativa('android.permission.INTERNET')).toBe(true); // o resto do manifest continua
    for (const n of ['android.permission.SCHEDULE_EXACT_ALARM', 'android.permission.USE_EXACT_ALARM']) { expect(ativa(n), n).toBe(false); expect(removida(n), n).toBe(true); }
    expect(m.$['xmlns:tools']).toBe('http://schemas.android.com/tools');
    expect(plugin.KEEP).toEqual(['android.permission.POST_NOTIFICATIONS', 'android.permission.RECEIVE_BOOT_COMPLETED']);
  });
  it('mesmo que outra biblioteca declare alarme exato, o plugin o troca por "remove"; é idempotente', () => {
    const sujo: any = manifestBase();
    sujo.manifest['uses-permission'].push({ $: { 'android:name': 'android.permission.SCHEDULE_EXACT_ALARM' } }, { $: { 'android:name': 'android.permission.USE_EXACT_ALARM' } });
    const uma = plugin.applyManifest(sujo);
    const duas = plugin.applyManifest(JSON.parse(JSON.stringify(uma)));
    expect(duas).toEqual(uma);
    const exatas = uma.manifest['uses-permission'].filter((p: any) => /EXACT_ALARM/.test(p.$['android:name']));
    expect(exatas).toHaveLength(2);
    for (const p of exatas) expect(p.$['tools:node']).toBe('remove');
  });
  it('iOS: sem aps-environment (push) nos entitlements e sem remote-notification nos modos de fundo', () => {
    expect(plugin.applyEntitlements({ 'aps-environment': 'development', 'com.apple.developer.applesignin': ['Default'] })).toEqual({ 'com.apple.developer.applesignin': ['Default'] });
    expect(plugin.applyInfoPlist({ UIBackgroundModes: ['remote-notification', 'audio'], X: 1 })).toEqual({ UIBackgroundModes: ['audio'], X: 1 });
    expect(plugin.applyInfoPlist({ UIBackgroundModes: ['remote-notification'] })).toEqual({});
    expect(plugin.applyInfoPlist({ X: 1 })).toEqual({ X: 1 });
  });
  it('NÃO usa o plugin do pacote: o app.json lista o nosso e nunca "expo-notifications"; o código não referencia app.plugin nem aps-environment ativo', () => {
    const app = JSON.parse(read('app.json'));
    expect(app.expo.plugins).toContain('./plugins/withNotificationsOptional');
    expect(app.expo.plugins.some((p: any) => (Array.isArray(p) ? p[0] : p) === 'expo-notifications')).toBe(false);
    const src = code('plugins/withNotificationsOptional.js');
    expect(src).not.toMatch(/app\.plugin|require\('expo-notifications/);
    expect(src).not.toMatch(/\['aps-environment'\]\s*=/);
    expect(JSON.stringify(app)).not.toMatch(/SCHEDULE_EXACT_ALARM|USE_EXACT_ALARM|aps-environment/);
  });
  it('sem a flag o plugin devolve o config INTACTO (mesma referência) e com a flag registra os mods', () => {
    const cfg: any = { name: 'x', slug: 'x' };
    const antes = process.env.NOTIFICATIONS_ENABLED;
    try {
      delete process.env.NOTIFICATIONS_ENABLED;
      expect(plugin(cfg)).toBe(cfg);
      process.env.NOTIFICATIONS_ENABLED = 'false';
      expect(plugin(cfg)).toBe(cfg);
      process.env.NOTIFICATIONS_ENABLED = 'true';
      const on = plugin({ ...cfg });
      expect(on).not.toBe(cfg);
      expect(Object.keys(on.mods?.android ?? {})).toContain('manifest');
      expect(Object.keys(on.mods?.ios ?? {})).toEqual(expect.arrayContaining(['entitlements', 'infoPlist']));
    } finally { if (antes === undefined) delete process.env.NOTIFICATIONS_ENABLED; else process.env.NOTIFICATIONS_ENABLED = antes; }
  });
});

describe('conferência do projeto gerado (check-notifications-project.mjs)', () => {
  const script = path.join(REPO, 'scripts/check-notifications-project.mjs');
  const run = (root: string, args: string[]) => spawnSync(process.execPath, [script, '--root', root, ...args], { encoding: 'utf8', env: { ...process.env, NOTIFICATIONS_ENABLED: '' } });
  const android = (perms: string[]) => {
    const root = mkdtempSync(path.join(tmpdir(), 'notif-'));
    const dir = path.join(root, 'android/app/src/main');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'AndroidManifest.xml'), `<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">${perms.join('')}<application/></manifest>`);
    return root;
  };
  const P = (n: string, remove = false) => `<uses-permission android:name="android.permission.${n}"${remove ? ' tools:node="remove"' : ''}/>`;
  it('Android com a flag: precisa de POST_NOTIFICATIONS e RECEIVE_BOOT_COMPLETED e dos alarmes exatos REMOVIDOS', () => {
    const ok = android([P('INTERNET'), P('POST_NOTIFICATIONS'), P('RECEIVE_BOOT_COMPLETED'), P('SCHEDULE_EXACT_ALARM', true), P('USE_EXACT_ALARM', true)]);
    expect(run(ok, ['--platform', 'android', '--expect', 'on']).status).toBe(0);
    const semBoot = android([P('POST_NOTIFICATIONS'), P('SCHEDULE_EXACT_ALARM', true), P('USE_EXACT_ALARM', true)]);
    const r = run(semBoot, ['--platform', 'android', '--expect', 'on']);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('RECEIVE_BOOT_COMPLETED não está declarada');
    const exata = android([P('POST_NOTIFICATIONS'), P('RECEIVE_BOOT_COMPLETED'), P('SCHEDULE_EXACT_ALARM'), P('USE_EXACT_ALARM', true)]);
    const e = run(exata, ['--platform', 'android', '--expect', 'on']);
    expect(e.status).toBe(1);
    expect(e.stdout).toContain('SCHEDULE_EXACT_ALARM está declarada como permissão ATIVA');
  });
  it('Android sem a flag: manifest como o de antes (nenhuma dessas permissões)', () => {
    expect(run(android([P('INTERNET')]), ['--platform', 'android', '--expect', 'off']).status).toBe(0);
    expect(run(android([P('POST_NOTIFICATIONS')]), ['--platform', 'android', '--expect', 'off']).status).toBe(1);
    expect(run(android([P('SCHEDULE_EXACT_ALARM')]), ['--platform', 'android', '--expect', 'off']).status).toBe(1);
  });
  it('iOS (com ou sem a flag): falha se houver aps-environment ou remote-notification', () => {
    const ios = (ent: string, plist: string) => {
      const root = mkdtempSync(path.join(tmpdir(), 'notif-ios-'));
      mkdirSync(path.join(root, 'ios/App'), { recursive: true });
      writeFileSync(path.join(root, 'ios/App/App.entitlements'), ent);
      writeFileSync(path.join(root, 'ios/App/Info.plist'), plist);
      return root;
    };
    expect(run(ios('<plist><dict/></plist>', '<plist><dict/></plist>'), ['--platform', 'ios']).status).toBe(0);
    expect(run(ios('<plist><dict><key>aps-environment</key><string>development</string></dict></plist>', '<plist/>'), ['--platform', 'ios']).status).toBe(1);
    expect(run(ios('<plist/>', '<plist><dict><key>UIBackgroundModes</key><array><string>remote-notification</string></array></dict></plist>'), ['--platform', 'ios']).status).toBe(1);
  });
});

describe('o repositório SEM a flag fica idêntico', () => {
  it('o módulo não está no package.json nem no lockfile; o script não instala sem a flag; a variável de execução vem desligada', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.dependencies['expo-notifications']).toBeUndefined();
    expect(pkg.devDependencies?.['expo-notifications']).toBeUndefined();
    expect(read('package-lock.json')).not.toContain('node_modules/expo-notifications');
    const r = spawnSync(process.execPath, [path.join(REPO, 'scripts/install-notifications-deps.mjs'), '--dry-run'], { encoding: 'utf8', env: { ...process.env, NOTIFICATIONS_ENABLED: '' } });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('desligada');
    const on = spawnSync(process.execPath, [path.join(REPO, 'scripts/install-notifications-deps.mjs'), '--dry-run'], { encoding: 'utf8', env: { ...process.env, NOTIFICATIONS_ENABLED: 'true' } });
    expect(on.stdout).toContain('expo-notifications@~');
    const cfg = JSON.parse(read('notifications/native-deps.json'));
    expect(cfg.expo).toEqual(['expo-notifications']);
    expect(cfg.pinned).toEqual({});
    expect(process.env.EXPO_PUBLIC_NOTIFICATIONS_ENABLED ?? '').not.toBe('true');
  });
  it('sem a flag o cartão do Perfil não aparece e o módulo nunca é carregado', () => {
    expect(RemindersCard({ onPress: () => {} })).toBeNull();
    expect(SV.loadNotifications()).toBeNull();
    expect(read('src/data/remindersConfig.js')).toContain('process.env.EXPO_PUBLIC_NOTIFICATIONS_ENABLED');
    const ctx = read('src/context/AppContext.js');
    expect(ctx).toMatch(/if \(!NOTIFICATIONS_ENABLED\) return;[\s]*syncReminders/);
    expect(ctx).toMatch(/if \(NOTIFICATIONS_ENABLED && firstSeries\)/);
  });
  it('autolinking: com a flag exige o expo-notifications; sem a flag a lista obrigatória é a de antes', () => {
    const src = read('scripts/check-autolinking.mjs');
    expect(src).toContain("...(NOTIFICATIONS_FLAG ? ['expo-notifications'] : [])");
    expect(src).toContain("const BASE_REQUIRED = ['expo-file-system', 'expo-asset', 'expo-font', 'expo-keep-awake', 'expo-video',");
  });
  it('os workflows: variável NOTIFICATIONS_ENABLED + EXPO_PUBLIC no env do job, instalação só com a flag e conferência do projeto gerado', () => {
    for (const f of ['android.yml', 'ios.yml']) {
      const wf = yaml.load(read(`.github/workflows/${f}`));
      const job = Object.values(wf.jobs).find((j) => j.steps.some((s) => /install-notifications-deps/.test(s.run ?? '')))!;
      expect(job.env!.NOTIFICATIONS_ENABLED, f).toBe('${{ vars.NOTIFICATIONS_ENABLED }}');
      expect(job.env!.EXPO_PUBLIC_NOTIFICATIONS_ENABLED, f).toBe('${{ vars.NOTIFICATIONS_ENABLED }}');
      const inst = job.steps.find((s) => /install-notifications-deps/.test(s.run ?? ''))!;
      expect(inst.if, f).toBe("env.NOTIFICATIONS_ENABLED == 'true'");
      expect(job.steps.some((s) => /check-notifications-project\.mjs --platform (android|ios)/.test(s.run ?? '')), f).toBe(true);
      const iInst = job.steps.indexOf(inst);
      const iPre = job.steps.findIndex((s) => /expo prebuild/.test(s.run ?? ''));
      expect(iInst, f).toBeLessThan(iPre); // instala ANTES do prebuild
    }
    const ci = yaml.load(read('.github/workflows/ci.yml'));
    const job = ci.jobs['prebuild-notifications']!;
    const runs = job.steps.map((s) => s.run ?? '').join('\n');
    expect(runs).toContain('check-notifications-project.mjs --platform android --expect off');
    expect(runs).toContain('check-notifications-project.mjs --platform android --expect on');
    expect(runs).toContain('check-notifications-project.mjs --platform ios --expect on');
    expect(runs).toContain('check-autolinking.mjs --platform ios');
  });
  it('docs/pendencias-usuario.md lembra de atualizar a política de privacidade e de conferir o rótulo da App Store', () => {
    const d = read('docs/pendencias-usuario.md');
    expect(d).toMatch(/lembretes locais/i);
    expect(d).toMatch(/política de privacidade/i);
    expect(d).toMatch(/r[oó]tulo/i);
  });
});
