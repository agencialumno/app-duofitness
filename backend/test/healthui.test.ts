// Saúde por categorias: estrutura e privacidade da interface, conferidas no código-fonte (sem renderizar).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as C from '../../src/data/healthConnectContent.js';
// @ts-expect-error módulo JS do app, sem tipos
import { COLORS } from '../../src/utils/theme.js';

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const code = (f: string) => read(f).replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
function walk(dir: string): string[] {
  return readdirSync(path.join(REPO, dir)).flatMap((f) => {
    const rel = `${dir}/${f}`;
    return statSync(path.join(REPO, rel)).isDirectory() ? walk(rel) : rel.endsWith('.js') ? [rel] : [];
  });
}

const HEALTH_FILES = [
  ...walk('src/utils').filter((f) => /\/health[A-Za-z]*\.js$/.test(f)),
  ...walk('src/data').filter((f) => /\/health[A-Za-z]*\.js$/.test(f)),
  'src/hooks/useHealth.js', 'src/screens/HealthScreen.js', 'src/screens/HealthCategoryScreen.js', 'src/screens/HealthConnectScreen.js',
  ...walk('src/components/health'),
];

describe('privacidade: dados de saúde nunca saem do aparelho', () => {
  it('nenhum arquivo de saúde faz rede nem grava log (sem console, fetch, XMLHttpRequest, WebSocket, Share)', () => {
    expect(HEALTH_FILES.length).toBeGreaterThan(14);
    for (const f of HEALTH_FILES) {
      const c = code(f);
      expect(c, f).not.toMatch(/\bconsole\./);
      expect(c, f).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|Share\.share|Linking\.openURL/);
      expect(c, f).not.toMatch(/from '[^']*(services\/api|\/sse)'/);
    }
  });
  it('marketplace, anunciar, backend/API e a conta NÃO importam nada de saúde', () => {
    const outside = [
      ...walk('src/screens').filter((f) => /Store|Advertise/.test(f)),
      'src/data/marketplace.js', 'src/data/marketplaceConfig.js', 'src/data/marketplaceImages.js', 'src/utils/advertise.js', 'src/data/advertiseConfig.js',
      'src/services/api.js', 'src/utils/sse.js', 'src/utils/occupancy.js',
      ...walk('src/auth'), ...walk('src/screens/auth'),
    ];
    // só IMPORT ou uso dos módulos/chaves de saúde (o /api/health do backend é só o "está no ar", sem dado nenhum)
    for (const f of outside) expect(code(f), f).not.toMatch(/from '[^']*health[^']*'|useHealth|healthStore|healthModel|healthScores|healthCoach|duo_health|Saude'/i);
  });
  it('o backend não conhece os dados de saúde', () => {
    for (const f of walk('backend/src')) expect(read(f.replace(/^\//, '')), f).not.toMatch(/duo_health|healthModel|samples\b.*resting_hr|sleep_duration/);
  });
  it('as chaves novas são @duo_health_v2 e @duo_health_connect; @duo_health segue existindo e nada de saúde foi renomeado', () => {
    const st = code('src/utils/healthStore.js');
    expect(st).toContain("'@duo_health_v2'");
    expect(st).toContain("'@duo_health_connect'");
    expect(code('src/utils/health.js')).toContain("HEALTH_KEY = '@duo_health'");
  });
  it('"Excluir conta" limpa as chaves novas de saúde (e só elas), sem tocar nas outras', () => {
    const acc = code('src/components/auth/AccountCard.js');
    expect(acc).toMatch(/await provider\.deleteAccount\(\{ password \}\);[\s\S]*clearHealthData\(AsyncStorage\)/);
    expect(code('src/utils/healthStore.js')).toMatch(/export async function clearHealthData[\s\S]*removeItem\(HEALTH_CONNECT_KEY\)/);
  });
  it('o aviso fixo do Duo Score aparece na tela de resumo', () => {
    expect(code('src/screens/HealthScreen.js')).toContain('SCORE_DISCLAIMER');
    expect(code('src/utils/health.js')).toContain("'O Duo Score mede hábitos. Não é uma avaliação médica.'");
  });
});

describe('tela Saúde: cartões por categoria na ordem pedida', () => {
  const src = code('src/screens/HealthScreen.js');
  it('Resumo (Duo Score), sugestões, depois um cartão por categoria (vindos da lista ordenada) e a conexão', () => {
    const order = ['health-summary', 'health-coach', 'views.map', 'health-connect-card'].map((t) => src.indexOf(t));
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(src).toContain('testID={`health-card-${v.id}`}');
  });
  it('a ordem das categorias vem do modelo: Composição, Atividade, Sono, Coração e recuperação, Hidratação', () => {
    const model = code('src/utils/healthModel.js');
    const ids = [...model.matchAll(/\{ id: '(body|activity|sleep|heart|hydration)', label: '([^']+)'/g)].map((m) => `${m[1]}:${m[2]}`);
    expect(ids).toEqual(['body:Composição corporal', 'activity:Atividade', 'sleep:Sono', 'heart:Coração e recuperação', 'hydration:Hidratação']);
  });
  it('menores de 18: sem o cartão de conexão e com o aviso "Só hábitos"', () => {
    expect(src).toMatch(/\{!minor && \(\s*<TouchableOpacity\s+testID="health-connect-card"/);
    expect(src).toContain('Só hábitos');
    expect(code('src/utils/healthView.js')).toMatch(/c\.id === 'body' && ageGroup === 'under18'/);
  });
  it('toque no cartão abre o detalhe da categoria; as rotas existem na pilha da aba Início', () => {
    expect(src).toMatch(/navigate\('SaudeDetalhe', \{ category \}\)/);
    const nav = code('src/navigation/MainNavigator.js');
    expect(nav).toMatch(/name="SaudeDetalhe" component=\{HealthCategoryScreen\}/);
    expect(nav).toMatch(/name="SaudeConectar" component=\{HealthConnectScreen\}/);
    expect(src).toMatch(/navigate\('SaudeConectar'\)/);
  });
});

describe('detalhe da categoria', () => {
  const src = code('src/screens/HealthCategoryScreen.js');
  it('tem a ajuda "i", tendências de 7 e 30 dias, origem, histórico e registro', () => {
    expect(src).toMatch(/<InfoButton label=\{info\.label\} titulo=\{info\.titulo\} blocks=\{info\.blocks\}/);
    expect(src).toContain('testID="trend-7"');
    expect(src).toContain('testID="trend-30"');
    expect(src).toContain('Origem: {view.origin}');
    expect(src).toContain('history-${metric}');
    expect(src).toContain('testID="health-form"');
  });
  it('categoria de composição é bloqueada para menores (mesmo por navegação direta)', () => {
    expect(src).toMatch(/const blocked = !cat \|\| \(id === 'body' && minor\)/);
  });
  it('campos de registro: teclado escuro e sempre visíveis com o teclado aberto', () => {
    expect(src).toMatch(/<KeyboardAvoidingView style=\{styles\.flex\} behavior="padding"/);
    expect(src).toContain('automaticallyAdjustKeyboardInsets');
    expect(src).toContain('keyboardShouldPersistTaps="handled"');
    expect(src).toMatch(/onFocus=\{\(\) => scrollRef\.current\?\.scrollTo/);
    expect(src).toContain('keyboardAppearance="dark"');
  });
  it('só medidas permitidas: nada de membros, gordura visceral, idade metabólica nem biológica', () => {
    for (const f of HEALTH_FILES) expect(code(f), f).not.toMatch(/visceral|idade metab|idade biol|por membro|bra[cç]o direito|perna esquerda/i);
  });
});

describe('conectar dispositivos: desligado, com consentimento e opção de apagar', () => {
  const src = code('src/screens/HealthConnectScreen.js');
  it('"Em breve" quando a integração está desligada e o botão Conectar fica desabilitado', () => {
    expect(src).toContain('{!integrationEnabled && (');
    expect(src).toContain('testID="connect-soon"');
    expect(src).toMatch(/const enabled = integrationEnabled && !!target && !minor/);
    expect(src).toMatch(/const canConnect = enabled && picks\.length > 0 && !busy/);
    expect(src).toContain('disabled={!canConnect}');
    expect(C.CONNECT_COPY.soonTitle).toBe('Em breve');
  });
  it('consentimento explícito: nada vem marcado, e nada é pedido ao sistema antes de marcar e conectar', () => {
    expect(src).toContain("useState({})"); // nenhuma categoria pré-marcada
    expect(src.indexOf('requestPermissions')).toBeGreaterThan(src.indexOf('canConnect'));
    expect(src).toContain('grantConsent(');
    expect((src.match(/requestPermissions/g) || []).length).toBe(1);
  });
  it('o que será lido e para quê, as permissões, que os dados ficam no aparelho e a opção de apagar', () => {
    expect(C.CONNECT_COPY.reads.map((r: { category: string }) => r.category)).toEqual(['activity', 'sleep', 'heart', 'body']);
    for (const r of C.CONNECT_COPY.reads as { items: string[]; why: string }[]) { expect(r.items.length).toBeGreaterThan(0); expect(r.why.length).toBeGreaterThan(20); }
    expect(C.CONNECT_COPY.permissions.join(' ')).toMatch(/Só leitura/);
    expect(C.CONNECT_COPY.privacy[0]).toBe('Seus dados de saúde ficam só neste aparelho.');
    expect(C.CONNECT_COPY.disconnectButton).toBe('Desconectar e apagar o que foi importado');
    expect(src).toContain('disconnectAndErase(health, connection)');
  });
  it('menores de 18 não veem a conexão; web não tem provedor', () => {
    expect(src).toMatch(/\{minor \? \(/);
    expect(src).toContain('testID="connect-minor"');
    expect(C.CONNECT_COPY.minorText).toMatch(/menores de 18 anos/);
    expect(C.CONNECT_COPY.providers).toEqual({ ios: { id: 'apple_saude', name: 'Apple Saúde' }, android: { id: 'health_connect', name: 'Health Connect' } });
  });
  it('os textos da conexão não têm termos proibidos', () => {
    const PROIBIDOS = /dieta|calor[ií]a|kcal|d[eé]ficit|emagre|suplement|\bdose|dosag|meta de peso|diagn[oó]stic|alerta|garant|milagr|publicidade|vend/i;
    for (const t of C.allConnectStrings() as string[]) expect(PROIBIDOS.test(t), t).toBe(false);
  });
  it('a flag continua desligada por padrão e não há módulo nativo de saúde no package.json', () => {
    expect(code('src/data/healthConfig.js')).toMatch(/\|\| 'false'/);
    const pkg = JSON.parse(read('package.json'));
    expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).join(' ')).not.toMatch(/health/i);
  });
});

describe('acessibilidade, área segura e fundo escuro', () => {
  const screens = ['src/screens/HealthScreen.js', 'src/screens/HealthCategoryScreen.js', 'src/screens/HealthConnectScreen.js'];
  it('usam useSafeAreaInsets, fundo escuro e rolagem sem barra', () => {
    for (const f of screens) {
      const c = code(f);
      expect(c, f).toContain('useSafeAreaInsets');
      expect(c, f).toMatch(/container: \{ flex: 1, backgroundColor: COLORS\.bg \}/);
      expect(c.match(/<ScrollView/g)?.length, f).toBe(c.match(/showsVerticalScrollIndicator=\{false\}/g)?.length);
    }
  });
  it('cartões e botões têm papel e rótulo; alvos de toque de pelo menos 44', () => {
    expect(code('src/components/health/CategoryCard.js')).toMatch(/accessibilityRole="button"\s+accessibilityLabel=\{view\.a11y\}/);
    expect(code('src/components/health/CategoryCard.js')).toContain('minHeight: 44');
    expect(code('src/components/health/TrendBars.js')).toMatch(/accessibilityRole="image" accessibilityLabel=\{describeSeries\(series, metric\)\}/);
    expect(code('src/screens/HealthCategoryScreen.js')).toMatch(/removeBtn: \{ width: 44, height: 44/);
  });
  it('o gráfico de Views esconde as barras do leitor de tela (a alternativa em texto é o rótulo) e dia sem dado não vira barra', () => {
    const c = code('src/components/health/TrendBars.js');
    expect(c).toContain('importantForAccessibility="no-hide-descendants"');
    expect(c).toMatch(/has \? \(\s*<View style=\{\[styles\.bar/);
    expect(c).toContain('styles.gap'); // ponto fraco para "sem registro"
  });
  it('texto: sem cor "textMuted" em texto útil; contraste do cinza secundário e do amarelo sobre o cartão', () => {
    for (const f of [...screens, 'src/components/health/CategoryCard.js', 'src/components/health/TrendBars.js']) expect(code(f), f).not.toMatch(/COLORS\.textMuted/);
    const lum = (hex: string) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!; };
    const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };
    expect(ratio(COLORS.textSecondary, COLORS.bgCard)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(COLORS.primary, COLORS.bgCard)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(COLORS.black, COLORS.primary)).toBeGreaterThanOrEqual(4.5);
  });
});
