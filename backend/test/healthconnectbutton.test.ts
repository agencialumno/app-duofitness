// Botão "Conectar" das ações rápidas da Saúde: três estados (desligado, disponível, conectado), com o rótulo de acessibilidade sempre
// coerente com o texto visível, e um único fluxo (a tela SaudeConectar).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as V from '../../src/utils/healthView.js';
// @ts-expect-error módulo JS do app, sem tipos
import { QuickActions } from '../../src/components/health/HealthParts.js';
import { byTestId, mount, textsOf } from './stubs/mini-render';

const REPO = path.resolve(__dirname, '../..');
const code = (f: string) => readFileSync(path.join(REPO, f), 'utf8').replace(/^\s*\/\/.*$/gm, '');
const conn = (provider: string | null, cats: Record<string, boolean> = { activity: true }) => ({ version: 1, provider, consentAt: '2026-10-29T12:00:00.000Z', categories: cats, importedAt: null });

describe('connectButtonState (puro)', () => {
  it('DESLIGADO (sem a flag ou sem plataforma suportada): "Em breve" e rótulo "indisponível"', () => {
    for (const args of [{ integrationEnabled: false, platform: 'ios' }, { integrationEnabled: false, platform: 'android' }, { integrationEnabled: true, platform: 'web' }, { integrationEnabled: true, platform: undefined }, {}]) {
      const s = V.connectButtonState(args);
      expect(s, JSON.stringify(args)).toMatchObject({ state: 'soon', label: 'Conectar', sub: 'Em breve', muted: true });
      expect(s.accessibilityLabel).toBe('Conectar dispositivos: em breve. Abre a tela de conexão, hoje indisponível.');
    }
    // mesmo conectado antes, sem a flag volta a "Em breve"
    expect(V.connectButtonState({ integrationEnabled: false, platform: 'ios', connection: conn('apple_saude') }).state).toBe('soon');
  });
  it('DISPONÍVEL (flag ligada, plataforma suportada, sem conexão): "Conectar" + nome do provedor, sem "em breve" nem "indisponível"', () => {
    const ios = V.connectButtonState({ integrationEnabled: true, platform: 'ios', connection: conn(null, {}) });
    expect(ios).toMatchObject({ state: 'available', label: 'Conectar', sub: 'Apple Saúde', muted: false });
    const and = V.connectButtonState({ integrationEnabled: true, platform: 'android', connection: undefined });
    expect(and).toMatchObject({ state: 'available', sub: 'Health Connect', muted: false });
    for (const s of [ios, and]) expect(s.accessibilityLabel).not.toMatch(/em breve|indispon/i);
    // conexão de OUTRO provedor ou sem categorias não conta como conectado
    expect(V.connectButtonState({ integrationEnabled: true, platform: 'android', connection: conn('apple_saude') }).state).toBe('available');
    expect(V.connectButtonState({ integrationEnabled: true, platform: 'ios', connection: conn('apple_saude', {}) }).state).toBe('available');
  });
  it('CONECTADO (ao provedor desta plataforma, com categorias): "Conectado" + nome do provedor', () => {
    const ios = V.connectButtonState({ integrationEnabled: true, platform: 'ios', connection: conn('apple_saude') });
    expect(ios).toMatchObject({ state: 'connected', label: 'Conectado', sub: 'Apple Saúde', muted: false });
    const and = V.connectButtonState({ integrationEnabled: true, platform: 'android', connection: conn('health_connect') });
    expect(and).toMatchObject({ state: 'connected', label: 'Conectado', sub: 'Health Connect' });
    expect(and.accessibilityLabel).toBe('Conectado ao Health Connect. Abre a tela de conexão.');
  });
  it('o rótulo de acessibilidade sempre contém o texto visível (rótulo e subtítulo) em qualquer estado', () => {
    const states = [
      V.connectButtonState({}),
      V.connectButtonState({ integrationEnabled: true, platform: 'ios' }),
      V.connectButtonState({ integrationEnabled: true, platform: 'android' }),
      V.connectButtonState({ integrationEnabled: true, platform: 'ios', connection: conn('apple_saude') }),
      V.connectButtonState({ integrationEnabled: true, platform: 'android', connection: conn('health_connect') }),
    ];
    for (const s of states) {
      const spoken = s.accessibilityLabel.toLowerCase();
      expect(spoken, s.state).toContain(s.sub.toLowerCase());
      expect(spoken, s.state).toContain(s.label.toLowerCase().replace('conectar', 'conect')); // "Conectar" e "Conectado" começam com "conect"
    }
  });
});

describe('QuickActions renderizado', () => {
  const render = (connect?: unknown, extra: Record<string, unknown> = {}) => {
    const onConnect = vi.fn();
    const r = mount(QuickActions as never, { minor: false, onRegister: vi.fn(), onWater: vi.fn(), waterText: '', onConnect, ...(connect ? { connect } : {}), ...extra });
    const btn = byTestId(r.tree, 'health-connect-card') as { props: Record<string, any> } | null;
    return { r, btn, onConnect };
  };
  it('sem a prop `connect` (ou desligado): "Em breve", sem destaque, rótulo "indisponível"; o toque abre a tela Conectar', () => {
    for (const connect of [undefined, V.connectButtonState({ integrationEnabled: false, platform: 'ios' })]) {
      const { r, btn, onConnect } = render(connect);
      expect(btn!.props.accessibilityLabel).toBe('Conectar dispositivos: em breve. Abre a tela de conexão, hoje indisponível.');
      expect(textsOf(r.tree)).toEqual(expect.arrayContaining(['Conectar', 'Em breve']));
      btn!.props.onPress();
      expect(onConnect).toHaveBeenCalledTimes(1);
    }
  });
  it('disponível: "Conectar" + provedor, o mesmo caminho (onConnect), sem "Em breve"', () => {
    const { r, btn, onConnect } = render(V.connectButtonState({ integrationEnabled: true, platform: 'ios' }));
    expect(textsOf(r.tree)).toEqual(expect.arrayContaining(['Conectar', 'Apple Saúde']));
    expect(textsOf(r.tree)).not.toContain('Em breve');
    expect(btn!.props.accessibilityLabel).toBe('Conectar ao Apple Saúde. Abre a tela de conexão para escolher o que o app pode ler.');
    btn!.props.onPress();
    expect(onConnect).toHaveBeenCalledTimes(1);
  });
  it('conectado: "Conectado" + provedor; o toque leva à mesma tela (estado e Desconectar)', () => {
    const { r, btn, onConnect } = render(V.connectButtonState({ integrationEnabled: true, platform: 'android', connection: conn('health_connect') }));
    expect(textsOf(r.tree)).toEqual(expect.arrayContaining(['Conectado', 'Health Connect']));
    expect(btn!.props.accessibilityLabel).toBe('Conectado ao Health Connect. Abre a tela de conexão.');
    btn!.props.onPress();
    expect(onConnect).toHaveBeenCalledTimes(1);
  });
  it('menor de 18: o botão não existe em nenhum estado', () => {
    const { btn } = render(V.connectButtonState({ integrationEnabled: true, platform: 'ios' }), { minor: true });
    expect(btn ?? null).toBeNull();
  });
});

describe('ligação na tela Saúde (um único fluxo)', () => {
  it('a tela passa o estado real (flag, plataforma, conexão) e o toque continua indo para SaudeConectar', () => {
    const c = code('src/screens/HealthScreen.js');
    expect(c).toContain("navigation.navigate('SaudeConectar')");
    expect(c).toContain('connectButtonState({ integrationEnabled, platform: Platform.OS, connection })');
    expect(c).not.toMatch(/requestPermissions|requestAuthorization|requestPermission\(/); // o pedido ao sistema fica só na tela Conectar
    expect(code('src/components/health/HealthParts.js')).not.toMatch(/sub="Em breve"/); // nada fixo
  });
});
