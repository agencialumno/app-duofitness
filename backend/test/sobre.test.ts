// Tela "Sobre" do Perfil: só "Versão X.Y.Z" em build de loja (store ou sem variável); nos canais dev, beta e rc os detalhes (canal, build, nome SemVer, branch,
// commit) aparecem de saída; em qualquer canal 7 toques seguidos no texto da versão revelam/ocultam. Rótulos em português e alvo de 44 pt.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { buildAboutInfo } from '../../src/utils/aboutInfo.js';
// @ts-expect-error módulo JS do app, sem tipos
import { createTapCounter } from '../../src/utils/tapCounter.js';
// @ts-expect-error módulo JS do app, sem tipos
import AboutCard from '../../src/components/AboutCard.js';
import { byTestId, mount, textsOf } from './stubs/mini-render';

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const BETA = { channel: 'beta', branch: 'candidato-2', sha: 'a1b2c3d', prerelease: 'beta.1' };

describe('buildAboutInfo (puro)', () => {
  it('todos veem só "Versão {versão}" (sem o número da build na linha)', () => {
    expect(buildAboutInfo({ version: '1.0.0', build: '33' }).versionLine).toBe('Versão 1.0.0');
    expect(buildAboutInfo({ version: '1.0.0', build: '33', channel: 'store' }).versionLine).toBe('Versão 1.0.0');
    expect(buildAboutInfo({ version: '1.0.0', build: '' }).versionLine).toBe('Versão 1.0.0');
  });
  it('canais beta, rc e dev: detalhes visíveis de saída (canal, build, nome SemVer completo, branch e commit curto)', () => {
    for (const channel of ['beta', 'rc', 'dev']) {
      const i = buildAboutInfo({ version: '1.0.0', build: '33', ...BETA, channel });
      expect(i.showDetails, channel).toBe(true);
      expect(i.details.map((d: any) => d.id), channel).toEqual(['canal', 'build', 'semver', 'branch', 'commit']);
      expect(i.fullName).toBe('1.0.0-beta.1+33');
    }
    const rc = buildAboutInfo({ version: '1.0.0', build: '40', channel: 'rc', branch: 'main', sha: 'f00ba12', prerelease: 'rc.2' });
    expect(rc.fullName).toBe('1.0.0-rc.2+40');
    expect(rc.a11y).toContain('Nome completo: 1.0.0-rc.2+40');
    expect(rc.a11y).toContain('Build: 40');
    expect(rc.a11y).toContain('Branch: main');
    expect(rc.a11y).toContain('Commit: f00ba12');
  });
  it('canal store, build local (sem variáveis) e canal desconhecido: detalhes ocultos de saída e o rótulo é só "Versão X.Y.Z"', () => {
    const casos = [{ ...BETA, channel: 'store', prerelease: '' }, {}, { channel: '' }, { channel: 'desconhecido', branch: 'x' }];
    for (const extra of casos) {
      const i = buildAboutInfo({ version: '1.0.0', build: '33', ...extra });
      expect(i.showDetails, JSON.stringify(extra)).toBe(false);
      expect(i.a11y).toBe('Versão 1.0.0');
      expect(i.a11yFor(false)).toBe('Versão 1.0.0');
      expect(i.a11yFor(true)).toContain('Build: 33');
    }
  });
  it('sem branch ou commit, não inventa: só o que veio', () => {
    const i = buildAboutInfo({ version: '1.0.0', build: '5', channel: 'beta', prerelease: 'beta.2' });
    expect(i.details.map((d: any) => d.id)).toEqual(['canal', 'build', 'semver']);
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

describe('contador de toques seguidos', () => {
  it('7 toques dentro do intervalo completam; o 7º devolve true e reinicia', () => {
    let t = 0;
    const c = createTapCounter({ count: 7, gapMs: 2000, now: () => t });
    for (let i = 1; i <= 6; i++) { t += 300; expect(c.hit(), `toque ${i}`).toBe(false); }
    t += 300; expect(c.hit()).toBe(true);
    t += 300; expect(c.hit()).toBe(false);
  });
  it('uma pausa maior que o intervalo reinicia a contagem', () => {
    let t = 0;
    const c = createTapCounter({ count: 7, gapMs: 2000, now: () => t });
    for (let i = 0; i < 6; i++) { t += 500; c.hit(); }
    t += 2500; expect(c.hit()).toBe(false);
    for (let i = 0; i < 5; i++) { t += 500; expect(c.hit()).toBe(false); }
    t += 500; expect(c.hit()).toBe(true);
  });
});

describe('cartão Sobre (renderizado)', () => {
  let clock = 0;
  const open = (application: Record<string, unknown>, buildInfo: Record<string, unknown>) => {
    clock = 0;
    return mount(AboutCard as never, { application, buildInfo, now: () => clock });
  };
  const tap = async (r: any, n: number) => {
    for (let i = 0; i < n; i++) { clock += 300; (byTestId(r.tree, 'about-info') as any).props.onTouchEnd(); }
    await r.flush();
  };
  const APP = { nativeApplicationVersion: '1.0.0', nativeBuildVersion: '33' };

  it('beta: versão, canal, build, nome completo, branch e commit; botão de 44 pt oculta e mostra, com rótulos em português', async () => {
    const r = open(APP, BETA);
    await r.flush();
    expect(textsOf(r.tree)).toEqual(expect.arrayContaining(['Sobre', 'Versão 1.0.0', 'Canal: beta', 'Build: 33', 'Nome completo: 1.0.0-beta.1+33', 'Branch: candidato-2', 'Commit: a1b2c3d']));
    expect((byTestId(r.tree, 'about-info') as any).props.accessibilityLabel).toContain('Versão 1.0.0.');
    const t = byTestId(r.tree, 'about-toggle') as any;
    expect(t.props.accessibilityLabel).toBe('Ocultar detalhes da build');
    expect(t.props.accessibilityRole).toBe('button');
    t.props.onPress();
    await r.flush();
    expect(textsOf(r.tree)).toContain('Versão 1.0.0');
    expect(textsOf(r.tree)).not.toContain('Branch: candidato-2');
    expect((byTestId(r.tree, 'about-toggle') as any).props.accessibilityLabel).toBe('Mostrar detalhes da build');
  });
  it('dev e rc também mostram os detalhes de saída', async () => {
    for (const channel of ['dev', 'rc']) {
      const r = open(APP, { ...BETA, channel });
      await r.flush();
      expect(textsOf(r.tree).join(' '), channel).toMatch(/Branch: candidato-2/);
    }
  });
  it('store e ausente: SÓ "Versão X.Y.Z" (sem build, SemVer, branch, commit nem botão) e o rótulo é "Versão X.Y.Z"', async () => {
    for (const bi of [{ channel: 'store', branch: 'main', sha: 'abc', prerelease: '' }, { channel: '', branch: '', sha: '', prerelease: '' }, {}]) {
      const r = open({ nativeApplicationVersion: '1.0.0', nativeBuildVersion: '40' }, bi);
      await r.flush();
      expect(textsOf(r.tree)).toEqual(['Sobre', 'Versão 1.0.0']);
      expect(byTestId(r.tree, 'about-toggle') ?? null).toBeNull();
      expect((byTestId(r.tree, 'about-info') as any).props.accessibilityLabel).toBe('Versão 1.0.0');
    }
  });
  it('7 toques seguidos revelam e outros 7 ocultam os detalhes na loja; 6 toques não fazem nada', async () => {
    const r = open(APP, { channel: 'store', branch: 'main', sha: 'abc1234', prerelease: '' });
    await r.flush();
    await tap(r, 6);
    expect(textsOf(r.tree)).toEqual(['Sobre', 'Versão 1.0.0']);
    await tap(r, 1);
    expect(textsOf(r.tree)).toEqual(expect.arrayContaining(['Canal: loja', 'Build: 33', 'Nome completo: 1.0.0+33', 'Branch: main', 'Commit: abc1234']));
    expect((byTestId(r.tree, 'about-info') as any).props.accessibilityLabel).toContain('Build: 33');
    await tap(r, 7);
    expect(textsOf(r.tree)).toEqual(['Sobre', 'Versão 1.0.0']);
    expect((byTestId(r.tree, 'about-info') as any).props.accessibilityLabel).toBe('Versão 1.0.0');
  });
  it('toques separados por mais de 2 s não somam', async () => {
    const r = open(APP, { channel: 'store' });
    await r.flush();
    await tap(r, 6);
    clock += 5000;
    await tap(r, 1);
    expect(textsOf(r.tree)).toEqual(['Sobre', 'Versão 1.0.0']);
  });
  it('em beta, 7 toques ocultam os detalhes (e o botão acompanha o estado)', async () => {
    const r = open(APP, BETA);
    await r.flush();
    await tap(r, 7);
    expect(textsOf(r.tree)).not.toContain('Branch: candidato-2');
    expect((byTestId(r.tree, 'about-toggle') as any).props.accessibilityLabel).toBe('Mostrar detalhes da build');
    await tap(r, 7);
    expect(textsOf(r.tree)).toContain('Branch: candidato-2');
  });
  it('o gesto é invisível: nenhuma dica, papel de botão nem texto sobre os toques', async () => {
    const r = open(APP, { channel: 'store' });
    await r.flush();
    for (const id of ['about-info']) {
      const n = byTestId(r.tree, id) as any;
      expect(n.props.accessibilityHint, id).toBeUndefined();
      expect(n.props.accessibilityRole, id).toBeUndefined();
    }
    expect(textsOf(r.tree).join(' ')).not.toMatch(/toque|toques|suporte/i);
    expect(read('src/components/AboutCard.js').replace(/^\s*\/\/.*$/gm, '')).not.toMatch(/accessibilityHint/);
  });
  it('sem versão nativa: "não disponível neste ambiente", e os toques não revelam nada', async () => {
    const r = open({ nativeApplicationVersion: null, nativeBuildVersion: null }, { channel: 'store' });
    await r.flush();
    expect(textsOf(r.tree)).toContain('Versão não disponível neste ambiente');
    await tap(r, 7);
    expect(textsOf(r.tree)).toEqual(['Sobre', 'Versão não disponível neste ambiente']);
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
