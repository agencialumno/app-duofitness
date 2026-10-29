// Saúde acessível pelo Perfil: o cartão abre a MESMA tela Saúde (rota registrada também na pilha do Perfil, para o voltar
// retornar ao Perfil) e nada do resto quebra (reset, sair do demo, excluir conta, atalhos da Home).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { buildCategoryViews, mostRecentNote } from '../../src/utils/healthView.js';

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const code = (f: string) => read(f).replace(/^\s*\/\/.*$/gm, '');
const NOW = new Date(2026, 5, 15, 12, 0, 0);
const s = (metric: string, value: number, date: string) => ({ metric, value, unit: '', date, tz: 'America/Sao_Paulo', source: 'manual' });

describe('nota mais recente do cartão', () => {
  it('sem dados: nada a mostrar (o cartão mostra "sem dados" e a ação de registrar)', () => {
    const views = buildCategoryViews({ samples: [], now: NOW });
    expect(mostRecentNote(views, [])).toBeNull();
    expect(mostRecentNote(null, null)).toBeNull();
  });
  it('escolhe a categoria com o registro mais recente', () => {
    const samples = [s('weight', 78.5, '2026-06-10'), s('sleep_duration', 400, '2026-06-14'), s('steps', 8000, '2026-06-12')];
    const views = buildCategoryViews({ samples, now: NOW });
    const n = mostRecentNote(views, samples);
    expect(n.label).toBe('Sono');
    expect(n.text).toMatch(/6h40/);
  });
  it('menor de 18: a composição não existe, então nunca vira a "nota mais recente"', () => {
    const samples = [s('weight', 60, '2026-06-15'), s('steps', 9000, '2026-06-14')];
    const views = buildCategoryViews({ samples, now: NOW, ageGroup: 'under18' });
    expect(views.map((v: { id: string }) => v.id)).not.toContain('body');
    expect(mostRecentNote(views, samples).label).toBe('Atividade');
  });
});

describe('navegação', () => {
  const nav = read('src/navigation/MainNavigator.js');
  it('Saúde, detalhe e conectar existem na pilha do Início E na do Perfil, com as mesmas telas (sem duplicar telas)', () => {
    const home = nav.slice(nav.indexOf('function HomeStackNav'), nav.indexOf('function WorkoutStackNav'));
    const prof = nav.slice(nav.indexOf('function ProfileStackNav'), nav.indexOf('export default function MainNavigator'));
    for (const [name, comp] of [['Saude', 'HealthScreen'], ['SaudeDetalhe', 'HealthCategoryScreen'], ['SaudeConectar', 'HealthConnectScreen']]) {
      expect(home).toContain(`name="${name}" component={${comp}}`);
      expect(prof).toContain(`name="${name}" component={${comp}}`);
    }
    expect((nav.match(/^import Health\w*Screen/gm) || []).length).toBe(3); // um import por tela
  });
  it('o cartão do Perfil abre a Saúde por navigate("Saude") e a Home continua igual', () => {
    const p = code('src/screens/ProfileScreen.js');
    expect(p).toMatch(/<ProfileHealthCard onPress=\{\(\) => navigation\.navigate\('Saude'\)\}/);
    expect(read('src/screens/HomeScreen.js')).toContain("navigation.navigate('Saude')");
  });
  it('Perfil: Sair da conta e Excluir minha conta no fim; sem Resetar tudo nem demo', () => {
    const p = code('src/screens/ProfileScreen.js');
    expect(p).toContain('<AccountCard />');
    expect(p).toContain('<AccountActions />');
    expect(p).not.toMatch(/resetAll|resetToWelcome|DemoCard/);
    expect(read('src/components/auth/AccountCard.js')).toContain('Excluir minha conta');
  });
  it('o cartão não depende de conta nem de perfil real; menor de 18: só hábitos', () => {
    const c = code('src/components/health/ProfileHealthCard.js');
    expect(c).toContain('useHealth');
    expect(c).not.toMatch(/useAuth|isDemo|isExample/);
    expect(c).toMatch(/h\.minor/);
  });
  it('acessibilidade: botão com rótulo completo, alvo de toque grande e sem dado de saúde fora da tela', () => {
    const c = code('src/components/health/ProfileHealthCard.js');
    expect(c).toContain('accessibilityRole="button"');
    expect(c).toContain('accessibilityLabel={label}');
    expect(c).toMatch(/minHeight: 44/);
    expect(c).not.toMatch(/console\.|fetch\(|XMLHttpRequest|Share\./);
  });
});
