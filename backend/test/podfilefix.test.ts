// plugins/withFirebaseIosFix.js: ajustes do Podfile para o RNFB com frameworks estáticos (só com FIREBASE_ENABLED=true).
// A fixture é o Podfile REAL do template do Expo SDK 54 (expo-template-bare-minimum 54.0.54).
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO = path.resolve(__dirname, '../..');
const req = createRequire(import.meta.url);
const fix = req('../../plugins/withFirebaseIosFix.js') as ((c: Record<string, unknown>) => Record<string, unknown>) & {
  patchPodfile: (t: string) => string; PodfileTemplateError: new (m: string) => Error; MARK_VAR: string; MARK_POST: string;
};
// normaliza para LF: o Git no Windows pode entregar a fixture com CRLF
const CR = String.fromCharCode(13);
const TEMPLATE = readFileSync(path.join(__dirname, 'fixtures/Podfile.sdk54.rb'), 'utf8').split(CR).join('');
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe('patchPodfile (fixture do template do SDK 54)', () => {
  it('acrescenta a variável do RNFB antes do prepare_react_native_project! e o bloco no post_install', () => {
    const out = fix.patchPodfile(TEMPLATE);
    expect(out).toContain('$RNFirebaseAsStaticFramework = true');
    expect(out.indexOf('$RNFirebaseAsStaticFramework')).toBeLessThan(out.indexOf('prepare_react_native_project!'));
    const post = out.slice(out.indexOf('post_install do |installer|'));
    expect(post).toContain("CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'");
    expect(post).toContain('-Wno-non-modular-include-in-framework-module');
    expect(post.indexOf('withFirebaseIosFix')).toBeLessThan(post.indexOf('react_native_post_install('));
  });

  it('só mexe nos pods RNFB* (os demais pods ficam como estão)', () => {
    const out = fix.patchPodfile(TEMPLATE);
    expect(out).toContain("next unless target.name.start_with?('RNFB')");
  });

  it('é IDEMPOTENTE: rodar de novo (ou 5 vezes) não duplica nada', () => {
    const once = fix.patchPodfile(TEMPLATE);
    let many = once;
    for (let i = 0; i < 5; i++) many = fix.patchPodfile(many);
    expect(many).toBe(once);
    expect(count(many, /withFirebaseIosFix\] variável/g)).toBe(1);
    expect(count(many, /withFirebaseIosFix\] post_install/g)).toBe(1);
    expect(count(many, /\$RNFirebaseAsStaticFramework = true/g)).toBe(1);
  });

  it('não remove nem altera nenhuma linha do template (só acrescenta)', () => {
    const out = fix.patchPodfile(TEMPLATE).split('\n');
    const orig = TEMPLATE.split('\n');
    let i = 0;
    for (const line of out) if (i < orig.length && line === orig[i]) i++;
    expect(i).toBe(orig.length); // o template inteiro continua lá, na mesma ordem
  });

  it('a estrutura Ruby continua balanceada (+2 blocos do/end) e preserva CRLF', () => {
    const out = fix.patchPodfile(TEMPLATE);
    const dos = (s: string) => count(s, /\bdo\b(\s*\|[^|]*\|)?\s*$/gm);
    const ends = (s: string) => count(s, /^\s*end\b/gm);
    expect(dos(out) - dos(TEMPLATE)).toBe(2);
    expect(ends(out) - ends(TEMPLATE)).toBe(2);
    const crlf = fix.patchPodfile(TEMPLATE.replace(/\n/g, '\r\n'));
    expect(crlf).not.toMatch(/[^\r]\n/);
    expect(crlf.replace(/\r\n/g, '\n')).toBe(out);
  });

  it('se o template mudar e as âncoras sumirem, FALHA com mensagem clara (como o plugin do Android)', () => {
    const semPrepare = TEMPLATE.replace('prepare_react_native_project!', '# removido');
    expect(() => fix.patchPodfile(semPrepare)).toThrow(/não encontrei "prepare_react_native_project!".*template do Expo mudou/);
    const semPost = TEMPLATE.replace('post_install do |installer|', 'post_install_novo do |installer|');
    expect(() => fix.patchPodfile(semPost)).toThrow(/não encontrei "post_install do \|installer\|".*template do Expo mudou/);
    expect(() => fix.patchPodfile(semPost)).toThrow(fix.PodfileTemplateError);
  });
});

describe('o plugin como config plugin', () => {
  let dir: string;
  const saved = process.env.FIREBASE_ENABLED;
  beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), 'podfile-')); cpSync(path.join(__dirname, 'fixtures/Podfile.sdk54.rb'), path.join(dir, 'Podfile')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); if (saved === undefined) delete process.env.FIREBASE_ENABLED; else process.env.FIREBASE_ENABLED = saved; });

  it('SEM FIREBASE_ENABLED devolve o config intacto (nenhum mod registrado): o Podfile dos builds normais não muda', () => {
    delete process.env.FIREBASE_ENABLED;
    const cfg = { name: 'x' };
    expect(fix(cfg)).toBe(cfg);
    expect(cfg).not.toHaveProperty('mods');
    expect(TEMPLATE).not.toContain('withFirebaseIosFix');
    process.env.FIREBASE_ENABLED = 'false';
    expect(fix(cfg)).toBe(cfg);
  });

  it('COM a flag registra o mod do iOS, que grava o Podfile corrigido e é idempotente entre prebuilds', async () => {
    process.env.FIREBASE_ENABLED = 'true';
    const out = fix({ name: 'x' }) as { mods?: { ios?: { dangerous?: (c: unknown) => Promise<unknown> } } };
    const run = () => out.mods!.ios!.dangerous!({ name: 'x', modRequest: { platformProjectRoot: dir, projectRoot: dir, platform: 'ios' }, modResults: {} });
    await run();
    const first = readFileSync(path.join(dir, 'Podfile'), 'utf8');
    expect(first).toContain('withFirebaseIosFix');
    await run();
    expect(readFileSync(path.join(dir, 'Podfile'), 'utf8')).toBe(first);
  });

  it('Podfile ausente falha com mensagem clara', async () => {
    process.env.FIREBASE_ENABLED = 'true';
    rmSync(path.join(dir, 'Podfile'));
    const out = fix({ name: 'x' }) as { mods: { ios: { dangerous: (c: unknown) => Promise<unknown> } } };
    await expect(out.mods.ios.dangerous({ name: 'x', modRequest: { platformProjectRoot: dir } })).rejects.toThrow(/Podfile não encontrado/);
  });
});

describe('withFirebaseOptional aplica o remédio documentado (forceStaticLinking) só no iOS com o arquivo', () => {
  const src = readFileSync(path.join(REPO, 'plugins/withFirebaseOptional.js'), 'utf8');
  it('forceStaticLinking com os pods RNFBApp e RNFBAuth, junto de useFrameworks static, e o plugin do Podfile', () => {
    expect(req('../../plugins/withFirebaseOptional.js').RNFB_STATIC_PODS).toEqual(['RNFBApp', 'RNFBAuth']);
    expect(src).toMatch(/if \(iosFile\) \{[\s\S]*useFrameworks: 'static', forceStaticLinking: RNFB_STATIC_PODS[\s\S]*withFirebaseIosFix[\s\S]*\}\s*\n\s*plugins\.push\(plug\('@react-native-firebase\/app/);
  });
  it('o app.json continua sem nenhuma dessas opções (builds sem a flag idênticos)', () => {
    const app = readFileSync(path.join(REPO, 'app.json'), 'utf8');
    expect(app).not.toMatch(/forceStaticLinking|useFrameworks|withFirebaseIosFix|RNFirebaseAsStaticFramework/);
  });
});
