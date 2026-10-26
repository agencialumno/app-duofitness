// Formulário de registro manual da Saúde: vírgula decimal, formatos de horário e duração, faixas válidas.
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as V from '../../src/utils/healthView.js';

const F = (cat: string, metric: string) => V.FORM_FIELDS[cat].find((f: { metric: string }) => f.metric === metric);

describe('parseDuration', () => {
  it.each([['7:30', 450], ['7h30', 450], ['7,5', 450], ['7.5', 450], ['8', 480], ['450 min', 450], ['6h', 360], [' 5h45 ', 345]])('%s -> %s min', (t, m) => {
    expect(V.parseDuration(t)).toBe(m);
  });
  it.each(['', 'abc', null, undefined, '25:00', '7h99'])('%s -> null', (t) => {
    expect(V.parseDuration(t as never)).toBeNull();
  });
});

describe('parseFormEntry', () => {
  it('número com vírgula, ponto, unidade e espaços', () => {
    expect(V.parseFormEntry(F('body', 'weight'), '78,5')).toEqual({ ok: true, value: 78.5 });
    expect(V.parseFormEntry(F('body', 'weight'), '78.5 kg')).toEqual({ ok: true, value: 78.5 });
    expect(V.parseFormEntry(F('activity', 'steps'), ' 8420 ')).toEqual({ ok: true, value: 8420 });
    expect(V.parseFormEntry(F('body', 'body_fat'), '18,2%')).toEqual({ ok: true, value: 18.2 });
  });
  it('duração e horário', () => {
    expect(V.parseFormEntry(F('sleep', 'sleep_duration'), '7:30')).toEqual({ ok: true, value: 450 });
    expect(V.parseFormEntry(F('sleep', 'bedtime'), '23:30')).toEqual({ ok: true, value: 1410 });
    expect(V.parseFormEntry(F('sleep', 'wake_time'), '6h45')).toEqual({ ok: true, value: 405 });
  });
  it('fora da faixa ou formato errado: mensagem em português com o nome do campo', () => {
    expect(V.parseFormEntry(F('body', 'weight'), '20')).toEqual({ ok: false, error: 'Peso (kg): use um valor entre 30 e 300.' });
    expect(V.parseFormEntry(F('heart', 'resting_hr'), '300')).toEqual({ ok: false, error: 'FC em repouso (bpm): use um valor entre 20 e 220.' });
    expect(V.parseFormEntry(F('activity', 'steps'), 'muitos')).toEqual({ ok: false, error: 'Passos de hoje: informe um número, pode usar vírgula.' });
    expect(V.parseFormEntry(F('sleep', 'bedtime'), '25:00')).toEqual({ ok: false, error: 'Hora de dormir: use o formato 23:30.' });
    expect(V.parseFormEntry(F('sleep', 'sleep_duration'), 'x')).toEqual({ ok: false, error: 'Duração do sono (h:min): use o formato 7:30 (horas e minutos).' });
    expect(V.parseFormEntry(F('activity', 'steps'), '-5').ok).toBe(false);
  });
});

describe('parseForm', () => {
  it('ignora campos vazios, junta os válidos e acumula os erros dos inválidos', () => {
    const r = V.parseForm(V.FORM_FIELDS.body, { weight: '80,2', body_fat: '', lean_mass: '' });
    expect(r).toEqual({ entries: [{ metric: 'weight', value: 80.2 }], errors: [] });
    const bad = V.parseForm(V.FORM_FIELDS.activity, { steps: '1000', distance: 'x', exercise_minutes: '5000' });
    expect(bad.entries).toEqual([{ metric: 'steps', value: 1000 }]);
    expect(bad.errors).toHaveLength(2);
    expect(V.parseForm(V.FORM_FIELDS.sleep, {})).toEqual({ entries: [], errors: [] });
  });
  it('há formulário para as 4 categorias manuais (a hidratação usa os botões de copo) e nada de medidas proibidas', () => {
    expect(Object.keys(V.FORM_FIELDS).sort()).toEqual(['activity', 'body', 'heart', 'sleep']);
    const labels = (Object.values(V.FORM_FIELDS) as { label: string }[][]).flat().map((f) => f.label).join(' ');
    expect(labels).not.toMatch(/visceral|metab[oó]lica|biol[oó]gica|bra[cç]o|perna|cintura|quadril/i);
  });
});
