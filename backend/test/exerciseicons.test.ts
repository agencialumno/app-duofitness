// Ícone de cada exercício: um DIFERENTE por exercício do EXERCISE_DB (59), todos existentes nos glifos da versão instalada do @expo/vector-icons, os 10 de
// src/data/exercises.js usando o mesmo mapa, ícone de reserva para id desconhecido e ícone decorativo para leitor de tela.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { readExerciseCatalog } from '../../scripts/lib/media.mjs';
// @ts-expect-error módulo JS do app, sem tipos
import * as D from '../../src/data/exerciseIcons.js';
// @ts-expect-error módulo JS do app, sem tipos
import ExerciseIcon from '../../src/components/ExerciseIcon.js';
import { findAll, mount } from './stubs/mini-render';

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const GLYPHS = 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/';
const glyphs = (file: string): Record<string, number> => JSON.parse(read(`${GLYPHS}${file}.json`));
const FILE_OF: Record<string, string> = { [D.FAMILY.IONICONS]: 'Ionicons', [D.FAMILY.MCI]: 'MaterialCommunityIcons' };
const catalog: Map<string, string> = readExerciseCatalog(REPO);
const entries = Object.entries(D.EXERCISE_ICONS) as [string, { family: string; name: string }][];

describe('mapa id -> ícone dos 59 exercícios', () => {
  it('cobre exatamente os 59 exercícios do EXERCISE_DB (nenhum sem ícone, nenhum id a mais)', () => {
    expect(catalog.size).toBe(59);
    expect(entries).toHaveLength(59);
    expect(entries.map(([id]) => id).sort()).toEqual([...catalog.keys()].sort());
    for (const [id, icon] of entries) {
      expect(typeof icon.name, id).toBe('string');
      expect(icon.name.length, id).toBeGreaterThan(0);
      expect(Object.values(D.FAMILY), id).toContain(icon.family);
    }
  });
  it('NENHUM ícone se repete entre os 59 (nem o mesmo desenho em versão outline ou sharp da Ionicons)', () => {
    const keys = entries.map(([, i]) => `${i.family}:${i.name}`);
    expect(keys.filter((k, n) => keys.indexOf(k) !== n), 'ícones repetidos').toEqual([]);
    const desenhos = entries.map(([, i]) => `${i.family}:${i.name.replace(/-(outline|sharp)$/, '')}`);
    expect(desenhos.filter((k, n) => desenhos.indexOf(k) !== n), 'mesmo desenho em variantes').toEqual([]);
    expect(new Set(keys).size).toBe(59);
  });
  it('todos os nomes existem nos glifos da versão instalada de cada família', () => {
    const maps: Record<string, Record<string, number>> = {};
    for (const [id, i] of entries) {
      maps[i.family] ??= glyphs(FILE_OF[i.family]!);
      expect(maps[i.family]![i.name], `${id}: "${i.name}" não existe em ${FILE_OF[i.family]}`).toBeTypeOf('number');
    }
    expect(glyphs('Ionicons')[D.FALLBACK_ICON.name]).toBeTypeOf('number'); // o ícone de reserva também existe
  });
  it('só as duas famílias que o app já tem (Ionicons e MaterialCommunityIcons) e a troca pedida do quadrúpede', () => {
    expect([...new Set(entries.map(([, i]) => i.family))].sort()).toEqual([D.FAMILY.IONICONS, D.FAMILY.MCI].sort());
    expect(D.EXERCISE_ICONS.fire_hydrant).toEqual({ family: D.FAMILY.MCI, name: 'dog-side' });
  });
});

describe('os 10 exercícios de src/data/exercises.js usam o mapa', () => {
  const src = read('src/data/exercises.js');
  const ids = [...src.matchAll(/^    id: '([a-z0-9_]+)',/gm)].map((m) => m[1]!);
  it('há 10 e todos resolvem para um ícone do mapa (nenhum cai no ícone de reserva)', () => {
    expect(ids).toHaveLength(10);
    for (const id of ids) {
      const icon = D.getExerciseIcon(id);
      expect(icon, id).not.toBe(D.FALLBACK_ICON);
      expect(entries.some(([, i]) => i === icon), id).toBe(true);
    }
  });
  it('dumbbell_row usa o ícone de row_db', () => {
    expect(ids).toContain('dumbbell_row');
    expect(D.getExerciseIcon('dumbbell_row')).toBe(D.EXERCISE_ICONS.row_db);
    expect(D.ICON_ALIASES).toEqual({ dumbbell_row: 'row_db' });
    expect(catalog.has('row_db')).toBe(true);
  });
  it('o ícone por categoria saiu da lista da aba Exercícios', () => {
    const list = read('src/screens/ExercisesScreen.js');
    expect(list).not.toContain('CATEGORY_ICONS');
    expect(list).toContain('<ExerciseIcon exerciseId={item.id}');
  });
});

describe('ícone de reserva', () => {
  it('id desconhecido, vazio ou nulo usa o ícone de reserva (sem lançar)', () => {
    for (const id of ['nao_existe', '', undefined, null, 'constructor', '__proto__', 'toString']) expect(D.getExerciseIcon(id as never), String(id)).toBe(D.FALLBACK_ICON);
    expect(D.FALLBACK_ICON).toEqual({ family: D.FAMILY.IONICONS, name: 'fitness-outline' });
  });
});

describe('componente ExerciseIcon', () => {
  const open = (props: Record<string, unknown>) => mount(ExerciseIcon as never, props);
  const icons = (r: any) => findAll(r.tree, (n: any) => n.type === 'Ionicons' || n.type === 'MaterialCommunityIcons');
  it('usa a família e o nome do mapa; Ionicons e MaterialCommunityIcons', async () => {
    const mci = open({ exerciseId: 'bicep_curl', size: 22 });
    await mci.flush();
    expect(icons(mci)[0].type).toBe('MaterialCommunityIcons');
    expect(icons(mci)[0].props).toMatchObject({ name: 'arm-flex', size: 22 });
    const ion = open({ exerciseId: 'lateral_raise' });
    await ion.flush();
    expect(icons(ion)[0].type).toBe('Ionicons');
    expect(icons(ion)[0].props.name).toBe('accessibility');
  });
  it('é decorativo para leitor de tela (o nome do exercício já está ao lado)', async () => {
    const r = open({ exerciseId: 'squat' });
    await r.flush();
    const p = icons(r)[0].props;
    expect(p.accessible).toBe(false);
    expect(p.accessibilityElementsHidden).toBe(true);
    expect(p.importantForAccessibility).toBe('no-hide-descendants');
    expect(p.accessibilityLabel).toBeUndefined();
  });
  it('respeita as cores do tema (padrão amarelo da marca) e aceita a cor da tela', async () => {
    const def = open({ exerciseId: 'plank' });
    await def.flush();
    expect(icons(def)[0].props.color).toBe('#fed205');
    const custom = open({ exerciseId: 'plank', color: '#000000' });
    await custom.flush();
    expect(icons(custom)[0].props.color).toBe('#000000');
  });
  it('id desconhecido mostra o ícone de reserva', async () => {
    const r = open({ exerciseId: 'inventado' });
    await r.flush();
    expect(icons(r)[0].type).toBe('Ionicons');
    expect(icons(r)[0].props.name).toBe('fitness-outline');
  });
});

describe('ligação nas telas e nas fontes', () => {
  it('as 5 telas usam ExerciseIcon com o id do exercício e não têm mais o ícone genérico fixo', () => {
    const casos: [string, string][] = [
      ['src/screens/ExerciseDetailScreen.js', '<ExerciseIcon exerciseId={ex.id} size={40} />'],
      ['src/screens/WorkoutDetailScreen.js', '<ExerciseIcon exerciseId={ex.id} size={18} />'],
      ['src/screens/ActiveWorkoutScreen.js', '<ExerciseIcon exerciseId={currentEx?.id} size={36} />'],
      ['src/screens/ExercisesScreen.js', '<ExerciseIcon exerciseId={item.id} size={22} />'],
      ['src/screens/CreateWorkoutScreen.js', '<ExerciseIcon exerciseId={ex.id} size={20} color={sel ? COLORS.black : COLORS.textSecondary} />'],
    ];
    for (const [f, uso] of casos) {
      const s = read(f);
      expect(s, f).toContain(uso);
      expect(s, f).toContain("import ExerciseIcon from '../components/ExerciseIcon'");
      expect(s, f).not.toContain('name="fitness-outline"');
    }
  });
  it('o App.js pré-carrega as DUAS fontes antes de renderizar', () => {
    const app = read('App.js');
    expect(app).toContain("import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';");
    expect(app).toContain('useFonts({ ...Ionicons.font, ...MaterialCommunityIcons.font })');
  });
  it('a otimização de importar por família (tirar ~3,5 MB de fontes não usadas) está registrada como NÃO feita', () => {
    const d = read('docs/pendencias-usuario.md');
    expect(d).toMatch(/importar por família/i);
    expect(d).toMatch(/3,5 MB/);
    expect(d).toMatch(/não foi feita/i);
    expect(read('src/components/ExerciseIcon.js')).toContain("from '@expo/vector-icons'"); // continua importando do pacote raiz
  });
});
