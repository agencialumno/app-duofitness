// Links dos Termos de Uso e da Política de Privacidade: URL presente e ausente, frase de aceite, cadastro, login, idade e Perfil.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as L from '../../src/utils/legalLinks.js';
// @ts-expect-error módulo JS do app, sem tipos
import LegalLinks from '../../src/components/LegalLinks.js';
import { Linking } from './stubs/react-native';
import { byTestId, mount, textsOf } from './stubs/mini-render';

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const code = (f: string) => read(f).replace(/^\s*\/\/.*$/gm, '');
const TERMOS = 'https://duofitnessoficial.com.br/termos/';
const POLITICA = 'https://duofitnessoficial.com.br/privacidade/';

describe('legalLinks (puro)', () => {
  it('URL dos termos E da política presentes: os dois links, Termos primeiro', () => {
    const l = L.legalLinks({ termsUrl: TERMOS, privacyUrl: POLITICA });
    expect(l.map((x: any) => [x.id, x.label, x.url])).toEqual([['terms', 'Termos de Uso', TERMOS], ['privacy', 'Política de Privacidade', POLITICA]]);
    expect(l.map((x: any) => x.accessibilityLabel)).toEqual(['Abrir os Termos de Uso', 'Abrir a Política de Privacidade']);
  });
  it('URL dos termos AUSENTE: esconde só o link dos termos e mantém o da política (sem quebrar)', () => {
    for (const termsUrl of [undefined, null, '', '   ', 'termos', 'ftp://x', 'javascript:alert(1)']) {
      const l = L.legalLinks({ termsUrl, privacyUrl: POLITICA });
      expect(l.map((x: any) => x.id), String(termsUrl)).toEqual(['privacy']);
    }
    expect(L.legalLinks({ termsUrl: TERMOS }).map((x: any) => x.id)).toEqual(['terms']);
    expect(L.legalLinks({})).toEqual([]);
    expect(L.legalLinks()).toEqual([]);
  });
  it('a URL é aparada e só http(s) vale', () => {
    expect(L.legalLinks({ termsUrl: `  ${TERMOS} ` })[0].url).toBe(TERMOS);
    expect(L.isHttpUrl('http://x.com')).toBe(true);
    expect(L.isHttpUrl('mailto:a@b.com')).toBe(false);
  });
  it('frase de aceite: cita os dois com os dois links; só o que tem link quando falta um; os dois (com aviso) quando não há nenhum', () => {
    const both = L.legalLinks({ termsUrl: TERMOS, privacyUrl: POLITICA });
    expect(L.acceptanceText(both)).toBe('Ao criar a conta, você concorda com os Termos de Uso e a Política de Privacidade');
    expect(L.acceptanceText(L.legalLinks({ privacyUrl: POLITICA }))).toBe('Ao criar a conta, você concorda com a Política de Privacidade');
    expect(L.acceptanceText(L.legalLinks({ termsUrl: TERMOS }))).toBe('Ao criar a conta, você concorda com os Termos de Uso');
    expect(L.acceptanceText([])).toBe('Ao criar a conta, você concorda com os Termos de Uso e a Política de Privacidade');
    expect(L.LEGAL_PENDING_NOTE).toMatch(/em revisão/);
  });
});

describe('componente LegalLinks', () => {
  beforeEach(() => { Linking.opened.length = 0; Linking.fail = false; });
  const render = (props: Record<string, unknown>) => mount(LegalLinks as never, { testIDPrefix: 'x', ...props });

  it('com as duas URLs: dois links de 44 pt com rótulo de acessibilidade; o toque abre a URL certa', async () => {
    const r = render({ termsUrl: TERMOS, privacyUrl: POLITICA });
    const terms = byTestId(r.tree, 'x-terms-link') as any;
    const priv = byTestId(r.tree, 'x-privacy-link') as any;
    expect(terms.props.accessibilityLabel).toBe('Abrir os Termos de Uso');
    expect(terms.props.accessibilityRole).toBe('link');
    expect(priv.props.accessibilityLabel).toBe('Abrir a Política de Privacidade');
    expect(textsOf(r.tree)).toEqual(expect.arrayContaining(['Termos de Uso', 'Política de Privacidade']));
    await terms.props.onPress();
    await priv.props.onPress();
    expect(Linking.opened).toEqual([TERMOS, POLITICA]);
  });
  it('SEM a URL dos termos: o link dos termos não existe e o da política continua', () => {
    const r = render({ termsUrl: '', privacyUrl: POLITICA });
    expect(byTestId(r.tree, 'x-terms-link') ?? null).toBeNull();
    expect(byTestId(r.tree, 'x-privacy-link')).toBeTruthy();
    expect(textsOf(r.tree)).not.toContain('Termos de Uso');
  });
  it('sem nenhuma URL: não renderiza links nem quebra; com `emptyNote` mostra o aviso', () => {
    const none = render({ termsUrl: '', privacyUrl: '' });
    expect(byTestId(none.tree, 'x-terms-link') ?? null).toBeNull();
    expect(byTestId(none.tree, 'x-privacy-link') ?? null).toBeNull();
    const note = render({ termsUrl: '', privacyUrl: '', emptyNote: L.LEGAL_PENDING_NOTE });
    expect(textsOf(note.tree)).toContain(L.LEGAL_PENDING_NOTE);
  });
  it('falha ao abrir: mostra um aviso (live region) sem lançar', async () => {
    Linking.fail = true;
    const r = render({ termsUrl: TERMOS, privacyUrl: POLITICA });
    await (byTestId(r.tree, 'x-terms-link') as any).props.onPress();
    await r.flush();
    expect(textsOf(r.tree).join(' ')).toContain('Não foi possível abrir os Termos de Uso agora.');
  });
  it('alvo de toque de 44 pt', () => {
    expect(code('src/components/LegalLinks.js')).toMatch(/link: \{ minHeight: 44, minWidth: 44/);
  });
});

describe('onde os links aparecem', () => {
  it('cadastro: frase de aceite com os dois documentos e os links; sem Linking direto', () => {
    const c = code('src/screens/auth/SignUpScreen.js');
    expect(c).toContain('acceptanceText(legalLinks({ termsUrl: TERMS_URL, privacyUrl: PRIVACY_URL }))');
    expect(c).toContain('<LegalLinks termsUrl={TERMS_URL} privacyUrl={PRIVACY_URL} testIDPrefix="su"');
    expect(c).toContain('label={ACCEPT}'); // rótulo de acessibilidade do checkbox = frase de aceite
    expect(c).not.toMatch(/Linking\./);
  });
  it('login, etapa de idade e Perfil mostram os links', () => {
    expect(code('src/screens/auth/SignInScreen.js')).toContain('<LegalLinks testIDPrefix="si" />');
    expect(code('src/screens/auth/AgeGateScreen.js')).toContain('<LegalLinks testIDPrefix="age"');
    expect(code('src/screens/ProfileScreen.js')).toContain('<LegalLinks testIDPrefix="profile" />');
  });
});

describe('configuração da URL dos termos', () => {
  it('o app lê EXPO_PUBLIC_TERMS_URL e EXPO_PUBLIC_PRIVACY_URL (vazio = sem link)', () => {
    const c = code('src/data/authConfig.js');
    expect(c).toContain("process.env.EXPO_PUBLIC_TERMS_URL || ''");
    expect(c).toContain("process.env.EXPO_PUBLIC_PRIVACY_URL || ''");
  });
  it('os dois workflows de build repassam as duas variáveis; o .env.example e as docs trazem a URL dos termos', () => {
    for (const f of ['.github/workflows/android.yml', '.github/workflows/ios.yml']) {
      const t = read(f);
      expect(t, f).toContain('EXPO_PUBLIC_TERMS_URL: ${{ vars.EXPO_PUBLIC_TERMS_URL }}');
      expect(t, f).toContain('EXPO_PUBLIC_PRIVACY_URL: ${{ vars.EXPO_PUBLIC_PRIVACY_URL }}');
    }
    expect(read('.env.example')).toContain(`EXPO_PUBLIC_TERMS_URL=${TERMOS}`);
    expect(read('docs/pendencias-usuario.md')).toContain(TERMOS);
    expect(read('CLAUDE.md')).toContain('EXPO_PUBLIC_TERMS_URL');
  });
});
