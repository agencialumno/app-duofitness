// Tela "Sobre" do Perfil: "Versão X (build)" para todos; nos canais dev, beta e rc também o nome SemVer completo, a branch e o commit curto.
// Sem as variáveis (build local) ou no canal store, só a versão. Rótulos em português e alvo de 44 pt.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { buildAboutInfo } from '../../src/utils/aboutInfo.js';
// @ts-expect-error módulo JS do app, sem tipos
import AboutCard from '../../src/components/AboutCard.js';
import { byTestId, mount, textsOf } from './stubs/mini-render';

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const BETA = { channel: 'beta', branch: 'candidato-2', sha: 'a1b2c3d', prerelease: 'beta.1' };

describe('buildAboutInfo (puro)', () => {
  it('todos veem "Versão {versão} ({build})"', () => {
    expect(buildAboutInfo({ version: '1.0.0', build: '33' }).versionLine).toBe('Versão 1.0.0 (33)');
    expect(buildAboutInfo({ version: '1.0.0', build: '33', channel: 'store' }).versionLine).toBe('Versão 1.0.0 (33)');
    expect(buildAboutInfo({ version: '1.0.0', build: '' }).versionLine).toBe('Versão 1.0.0');
  });
  it('canais beta, rc e dev mostram o nome SemVer completo, a branch e o commit curto', () => {
    for (const channel of ['beta', 'rc', 'dev']) {
      const i = buildAboutInfo({ version: '1.0.0', build: '33', ...BETA, channel });
      expect(i.showDetails, channel).toBe(true);
      expect(i.details.map((d: any) => d.id), channel).toEqual(['canal', 'semver', 'branch', 'commit']);
      expect(i.fullName).toBe('1.0.0-beta.1+33');
    }
    const rc = buildAboutInfo({ version: '1.0.0', build: '40', channel: 'rc', branch: 'main', sha: 'f00ba12', prerelease: 'rc.2' });
    expect(rc.fullName).toBe('1.0.0-rc.2+40');
    expect(rc.a11y).toContain('Nome completo: 1.0.0-rc.2+40');
    expect(rc.a11y).toContain('Branch: main');
    expect(rc.a11y).toContain('Commit: f00ba12');
  });
  it('canal store e build local (sem variáveis) mostram só a versão', () => {
    const casos = [{ ...BETA, channel: 'store', prerelease: '' }, {}, { channel: '' }, { channel: 'desconhecido', branch: 'x' }];
    for (const extra of casos) {
      const i = buildAboutInfo({ version: '1.0.0', build: '33', ...extra });
      expect(i.showDetails, JSON.stringify(extra)).toBe(false);
      expect(i.details).toEqual([]);
      expect(i.a11y).toBe('Sobre o app. Versão 1.0.0 (33).');
    }
  });
  it('sem branch ou commit, não inventa: só o que veio', () => {
    const i = buildAboutInfo({ version: '1.0.0', build: '5', channel: 'beta', prerelease: 'beta.2' });
    expect(i.details.map((d: any) => d.id)).toEqual(['canal', 'semver']);
    expect(i.fullName).toBe('1.0.0-beta.2+5');
  });
  it('sem versão do sistema (web, Expo Go): mensagem clara, sem lançar', () => {
    for (const version of [null, undefined, '']) {
      const i = buildAboutInfo({ version, build: '1', channel: 'beta' });
      expect(i.available).toBe(false);
      expect(i.versionLine).toBe('Versão não disponível neste ambiente');
      expect(i.showDetails).toBe(false);
    }
  });
});

describe('cartão Sobre (renderizado)', () => {
  const open = (application: Record<string, unknown>, buildInfo: Record<string, unknown>) => mount(AboutCard as never, { application, buildInfo });
  it('beta: versão, nome completo, branch e commit; botão de 44 pt oculta e mostra os detalhes, com rótulos em português', async () => {
    const r = open({ nativeApplicationVersion: '1.0.0', nativeBuildVersion: '33' }, BETA);
    await r.flush();
    expect(textsOf(r.tree)).toEqual(expect.arrayContaining(['Sobre', 'Versão 1.0.0 (33)', 'Canal: beta', 'Nome completo: 1.0.0-beta.1+33', 'Branch: candidato-2', 'Commit: a1b2c3d']));
    expect((byTestId(r.tree, 'about-info') as any).props.accessibilityLabel).toContain('Versão 1.0.0 (33).');
    const t = byTestId(r.tree, 'about-toggle') as any;
    expect(t.props.accessibilityLabel).toBe('Ocultar detalhes da build');
    expect(t.props.accessibilityRole).toBe('button');
    t.props.onPress();
    await r.flush();
    expect(textsOf(r.tree)).toContain('Versão 1.0.0 (33)'); // a versão continua
    expect(textsOf(r.tree)).not.toContain('Branch: candidato-2');
    expect((byTestId(r.tree, 'about-toggle') as any).props.accessibilityLabel).toBe('Mostrar detalhes da build');
  });
  it('store e build local: só a versão, sem botão', async () => {
    for (const bi of [{ channel: 'store', branch: 'main', sha: 'abc', prerelease: '' }, { channel: '', branch: '', sha: '', prerelease: '' }]) {
      const r = open({ nativeApplicationVersion: '1.0.0', nativeBuildVersion: '40' }, bi);
      await r.flush();
      expect(textsOf(r.tree)).toContain('Versão 1.0.0 (40)');
      expect(textsOf(r.tree).join(' ')).not.toMatch(/Branch|Commit|Nome completo/);
      expect(byTestId(r.tree, 'about-toggle') ?? null).toBeNull();
    }
  });
  it('sem versão nativa: "não disponível neste ambiente"', async () => {
    const r = open({ nativeApplicationVersion: null, nativeBuildVersion: null }, BETA);
    await r.flush();
    expect(textsOf(r.tree)).toContain('Versão não disponível neste ambiente');
  });
  it('alvo de toque de 44 pt e título como cabeçalho', () => {
    const src = read('src/components/AboutCard.js');
    expect(src).toMatch(/toggle: \{ minHeight: 44, minWidth: 44/);
    expect(src).toContain('accessibilityRole="header"');
  });
});

describe('ligação no app', () => {
  it('o Perfil mostra o cartão Sobre e o expo-application é dependência direta do app (SDK 54)', () => {
    expect(read('src/screens/ProfileScreen.js')).toContain('<AboutCard />');
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.dependencies['expo-application']).toMatch(/^~7\./);
  });
  it('as variáveis da build são lidas como process.env literal (o Metro só troca assim) e as quatro vêm dos workflows', () => {
    const b = read('src/data/buildInfo.js');
    for (const v of ['CHANNEL', 'BRANCH', 'SHA', 'PRERELEASE']) expect(b).toContain(`process.env.EXPO_PUBLIC_BUILD_${v}`);
    for (const f of ['android.yml', 'ios.yml']) for (const v of ['CHANNEL', 'BRANCH', 'SHA', 'PRERELEASE']) expect(read(`.github/workflows/${f}`)).toContain(`EXPO_PUBLIC_BUILD_${v}=`);
  });
  it('nada da build é enviado a lugar nenhum (só leitura local, sem rede nem log)', () => {
    for (const f of ['src/data/buildInfo.js', 'src/utils/aboutInfo.js', 'src/components/AboutCard.js']) {
      expect(read(f).replace(/^\s*\/\/.*$/gm, ''), f).not.toMatch(/console\.|fetch\(|XMLHttpRequest|Linking/);
    }
  });
});
