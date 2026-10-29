// Conjunto de amostras de saúde de EXEMPLO, determinístico, só para os testes (antes vivia no app, para o Modo Demo, que foi removido).
import { DEFAULT_WATER_GOAL, addDays, dayKey, normalizeHealth } from '../../../src/utils/health.js';
import { deviceTz, normalizeSamples } from '../../../src/utils/healthModel.js';

export function buildDemoHealthV2(now = new Date()) {
  const today = dayKey(now);
  const tz = deviceTz();
  const samples = [];
  const add = (metric, value, off) => samples.push({ metric, value, date: addDays(today, off), source: 'exemplo', tz });

  // Composição corporal: ~5 semanas de peso (mesmos valores do exemplo antigo) e algumas medidas de composição
  [75.2, 75.4, 75.5, 75.7, 75.8, 76.0].forEach((kg, i) => add('weight', kg, [-35, -28, -21, -14, -7, -1][i]));
  [18.9, 18.7, 18.6, 18.4].forEach((v, i) => add('body_fat', v, [-28, -21, -14, -7][i]));
  [60.4, 60.6, 60.9, 61.1].forEach((v, i) => add('lean_mass', v, [-28, -21, -14, -7][i]));

  // Atividade, sono e coração: 14 dias, do mais antigo (-13) ao mais recente (0)
  const steps = [7800, 9100, 4200, 10300, 8800, 6100, 7400, 8200, 9600, 5300, 11200, 8900, 7000, 8420];
  const distance = [5.6, 6.6, 3.0, 7.5, 6.4, 4.4, 5.3, 5.9, 7.0, 3.8, 8.2, 6.5, 5.0, 6.1];
  const exercise = [35, 50, 0, 60, 40, 20, 30, 45, 55, 15, 65, 40, 25, 45];
  const sleep = [400, 380, 340, 410, 450, 470, 360, 330, 400, 420, 390, 350, 380, 420];
  const bed = [1395, 1410, 1440 + 20, 1400, 1385, 1380, 1425, 1440 + 35, 1400, 1390, 1405, 1430, 1410, 1395];
  const rhr = [60, 59, 61, 60, 58, 58, 59, 61, 60, 59, 58, 59, 58, 57];
  const hrv = [44, 46, 40, 45, 49, 51, 47, 41, 44, 48, 50, 46, 47, 52];
  for (let i = 0; i < 14; i++) {
    const off = i - 13;
    add('steps', steps[i], off);
    add('distance', distance[i], off);
    add('exercise_minutes', exercise[i], off);
    add('sleep_duration', sleep[i], off);
    add('bedtime', bed[i] % 1440, off);
    add('wake_time', (bed[i] + sleep[i]) % 1440, off);
    add('resting_hr', rhr[i], off);
    add('hrv', hrv[i], off);
    add('heart_rate', 70 + (i % 5), off);
    add('active_energy', 300 + i * 10, off);
  }
  add('vo2max', 42.5, -3);
  // Hidratação: 7 dias (mesmos valores do exemplo antigo)
  [6, 8, 7, 5, 8, 8, 4].forEach((g, i) => add('water', g, -(6 - i)));
  return { version: 2, samples: normalizeSamples(samples), waterGoal: DEFAULT_WATER_GOAL, migratedFromV1: false };
}

// Histórico de exemplo da Saúde v1 (relativo a "agora"): ~5 semanas de peso e 7 dias de água.
export function buildDemoHealth(now = new Date()) {
  const today = dayKey(now);
  const weights = [];
  const kgs = [75.2, 75.4, 75.5, 75.7, 75.8, 76.0];
  [-35, -28, -21, -14, -7, -1].forEach((off, i) => weights.push({ date: addDays(today, off), kg: kgs[i] }));
  const glasses = [6, 8, 7, 5, 8, 8, 4];
  const water = {};
  glasses.forEach((g, i) => { water[addDays(today, -(6 - i))] = g; });
  return normalizeHealth({ version: 1, weights, water, waterGoal: DEFAULT_WATER_GOAL });
}
