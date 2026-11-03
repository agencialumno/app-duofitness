// Uso do amarelo (docs/visual-cor.md). Lote 1: ícones decorativos, de ação e setas (chevrons) não usam mais COLORS.primary.
// A varredura abaixo falha se um ícone voltar a usar `color={...COLORS.primary...}` fora da lista de exceções. A lista SÓ PODE ENCOLHER:
// cada exceção cita arquivo, linha e motivo, e o teste falha se a exceção deixou de existir (apague-a da lista) ou se a lista cresceu.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { COLORS } from '../../src/utils/theme.js';

const REPO = path.resolve(__dirname, '../..');
function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}
const rel = (f: string) => path.relative(REPO, f).replace(/\\/g, '/');
const files = walk(path.join(REPO, 'src')).filter((f) => rel(f) !== 'src/utils/theme.js');

type Exc = { file: string; line: number; motivo: string };
const AVALIAR = 'avaliar no aparelho';
const ESTADO = 'ícone de estado selecionado/ativo: fora do lote 1';
const ACAO = 'ícone de ação cujo controle tem texto amarelo: acompanha o lote do controle (botão de contorno ou link)';
export const EXCEPTIONS: Exc[] = [
  // exceções pedidas no lote 1 (ícones de exercício e do player)
  { file: 'src/components/ExerciseIcon.js', line: 8, motivo: `${AVALIAR} (cor padrão do ícone do exercício)` },
  { file: 'src/components/ExerciseMedia.js', line: 59, motivo: `${AVALIAR} (play da capa do vídeo)` },
  { file: 'src/components/ExerciseVideoPlayer.js', line: 87, motivo: `${AVALIAR} (play do player)` },
  // ícones de ação: o texto do controle ainda é amarelo, então o ícone fica junto dele
  { file: 'src/components/EditNameRow.js', line: 26, motivo: 'botão só de ícone (sem texto do controle): não classificável com segurança' },
  { file: 'src/components/guided/GuidedParts.js', line: 110, motivo: 'ícone do FooterButton: preto no primário e amarelo no secundário, junto do texto do botão' },
  { file: 'src/components/guided/SeriesCard.js', line: 71, motivo: ACAO },
  { file: 'src/screens/GymNowScreen.js', line: 65, motivo: ACAO },
  { file: 'src/screens/HomeScreen.js', line: 164, motivo: ACAO },
  { file: 'src/screens/HomeScreen.js', line: 171, motivo: ACAO },
  { file: 'src/screens/HomeScreen.js', line: 225, motivo: ACAO },
  { file: 'src/screens/ProfileScreen.js', line: 93, motivo: ACAO },
  { file: 'src/screens/WorkoutsScreen.js', line: 140, motivo: ACAO },
  { file: 'src/screens/WorkoutsScreen.js', line: 175, motivo: ACAO },
  // cores padrão de componentes de outros papéis (aparecem na varredura como parâmetro `color = COLORS.primary`)
  { file: 'src/components/InfoButton.js', line: 11, motivo: 'botão "i": migra no lote 10 (contorno cinza)' },
  { file: 'src/components/health/TrendBars.js', line: 13, motivo: 'barra de gráfico da Saúde: caso de fronteira (item 4.2), sem decisão' },
  // ícones de estado (outro papel)
  { file: 'src/components/guided/GuidedParts.js', line: 68, motivo: ESTADO },
  { file: 'src/components/guided/GuidedParts.js', line: 76, motivo: ESTADO },
  { file: 'src/components/guided/GuidedParts.js', line: 148, motivo: ESTADO },
  { file: 'src/components/health/HealthParts.js', line: 78, motivo: ESTADO },
  { file: 'src/screens/ProfileScreen.js', line: 114, motivo: ESTADO },
];
const MAX_EXCEPTIONS = 20; // só diminui

// linhas de ícone que usam o amarelo da marca como cor: `color={...COLORS.primary...}` (exclui carregamento, cursor e tintColor, que são outros papéis)
const ICON_PRIMARY = /color=\{[^}]*COLORS\.primary|color = COLORS\.primary/; // inclui o parâmetro padrão `color = COLORS.primary`
const OTHER_ROLES = /ActivityIndicator|RefreshControl|selectionColor|tintColor/;

describe('ícones decorativos, de ação e setas não usam mais o amarelo (lote 1)', () => {
  const found: string[] = [];
  for (const f of files) {
    readFileSync(f, 'utf8').split(/\r?\n/).forEach((l, i) => {
      if (ICON_PRIMARY.test(l) && !OTHER_ROLES.test(l)) found.push(`${rel(f)}:${i + 1}`);
    });
  }
  const allowed = new Set(EXCEPTIONS.map((e) => `${e.file}:${e.line}`));
  it('nenhum ícone usa COLORS.primary fora da lista de exceções', () => {
    const extra = found.filter((x) => !allowed.has(x));
    expect(extra, `ícone(s) voltaram ao amarelo:\n${extra.join('\n')}`).toEqual([]);
  });
  it('a lista de exceções só encolhe: cada exceção ainda existe (senão, apague-a) e o total não passa de 20', () => {
    const gone = EXCEPTIONS.filter((e) => !found.includes(`${e.file}:${e.line}`)).map((e) => `${e.file}:${e.line} (${e.motivo})`);
    expect(gone, `exceção(ões) que não existem mais: remova da lista\n${gone.join('\n')}`).toEqual([]);
    expect(EXCEPTIONS.length).toBeLessThanOrEqual(MAX_EXCEPTIONS);
    for (const e of EXCEPTIONS) expect(e.motivo.length, `${e.file}:${e.line}`).toBeGreaterThan(10);
  });
  it('as três exceções pedidas (ícone de exercício e do player) estão na lista com o motivo "avaliar no aparelho"', () => {
    for (const [file, line] of [['src/components/ExerciseIcon.js', 8], ['src/components/ExerciseMedia.js', 59], ['src/components/ExerciseVideoPlayer.js', 87]] as const) {
      const e = EXCEPTIONS.find((x) => x.file === file && x.line === line);
      expect(e, `${file}:${line}`).toBeTruthy();
      expect(e!.motivo).toContain('avaliar no aparelho');
    }
    expect(readFileSync(path.join(REPO, 'src/components/ExerciseIcon.js'), 'utf8')).toMatch(/color = COLORS\.primary/); // o padrão do ExerciseIcon continua amarelo
  });
  it('a varredura vê os ícones: as exceções e os ícones de estado existem (sanidade do analisador)', () => {
    expect(found.length).toBeGreaterThanOrEqual(EXCEPTIONS.length);
  });
  it('o ícone da opção "Quer ajustar algo?" usa o branco do rótulo e os decorativos usam textSecondary', () => {
    const g = readFileSync(path.join(REPO, 'src/screens/GuidedPlanScreen.js'), 'utf8');
    expect(g).toMatch(/name="options-outline" size=\{18\} color=\{COLORS\.white\}/);
    const h = readFileSync(path.join(REPO, 'src/screens/HomeScreen.js'), 'utf8');
    expect(h).toMatch(/name="flame" size=\{16\} color=\{COLORS\.textSecondary\}/);
    expect(h.match(/name="chevron-forward" size=\{16\} color=\{COLORS\.textSecondary\}/g)).toHaveLength(3);
  });
  it('nenhum ícone usa a tinta âmbar como cor', () => {
    for (const f of files) {
      const bad = readFileSync(f, 'utf8').split(/\r?\n/).filter((l) => /Ionicons/.test(l) && /color=\{?['"]?#(1a1700|141200|1a0f00|2a2400|3a2a00)/i.test(l));
      expect(bad, rel(f)).toEqual([]);
    }
  });
});

describe('contraste do textSecondary nas superfícies dos ícones (>= 3:1, ícone)', () => {
  const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  const lum = (h: string) => { const [r, g, b] = hex(h) as [number, number, number]; return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
  const ratio = (a: string, b: string) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  it('textSecondary sobre bg, bgCard, bgCardAlt e as tintas âmbar onde o ícone ainda está', () => {
    const surfaces: Record<string, string> = { bg: COLORS.bg, bgCard: COLORS.bgCard, bgCardAlt: COLORS.bgCardAlt, '#1A1700': '#1A1700', '#141200': '#141200', '#1A0F00': '#1A0F00', '#3A2A00': '#3A2A00', '#000000': COLORS.black };
    for (const [n, s] of Object.entries(surfaces)) expect(ratio(COLORS.textSecondary, s), `sobre ${n}`).toBeGreaterThanOrEqual(3);
  });
  it('o branco do ícone de ação sobre as superfícies passa 3:1', () => {
    for (const s of [COLORS.bg, COLORS.bgCard, COLORS.bgCardAlt]) expect(ratio(COLORS.white, s)).toBeGreaterThanOrEqual(3);
  });
});
