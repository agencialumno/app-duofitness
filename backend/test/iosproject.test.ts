// scripts/check-ios-project.mjs (na raiz do app) rodado como processo externo contra projetos iOS
// de mentira, nos formatos reais que o "expo prebuild" grava: bundle id ENTRE ASPAS no pbxproj
// (verificado com o próprio código do Expo sobre o template do SDK 54) e a chave de criptografia
// do Info.plist com o valor na linha seguinte.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = path.resolve(__dirname, '../../scripts/check-ios-project.mjs');

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'check-ios-project-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const pbxproj = (bundleLine: string) => `// !$*UTF8*$!
{
\tobjects = {
\t\tAAAA /* Debug */ = {
\t\t\tbuildSettings = {
\t\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\t\tDEVELOPMENT_TEAM = KH97Q8M556;
\t\t\t\t${bundleLine}
\t\t\t\tPRODUCT_NAME = DuoFitness;
\t\t\t};
\t\t};
\t\tBBBB /* Release */ = {
\t\t\tbuildSettings = {
\t\t\t\t${bundleLine}
\t\t\t};
\t\t};
\t};
}
`;

// Formato do @expo/plist: 4 espaços e o valor booleano na linha seguinte à chave.
const infoPlist = (its: string) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
${its}
    <key>UIUserInterfaceStyle</key>
    <string>Dark</string>
  </dict>
</plist>
`;
const ITS_FALSE = '    <key>ITSAppUsesNonExemptEncryption</key>\n    <false/>';

const PODFILE = `require File.join(File.dirname(\`node --print "require.resolve('expo/package.json')"\`), "scripts/autolinking")\ntarget 'DuoFitness' do\n  use_expo_modules!\nend\n`;

interface Opts {
  name?: string;
  bundleLine?: string;
  its?: string | null;
  podfile?: string | null;
  skipProj?: boolean;
  extraProj?: string;
}
function makeProject(o: Opts = {}) {
  const name = o.name ?? 'DuoFitness';
  const ios = path.join(dir, 'ios');
  mkdirSync(path.join(ios, name), { recursive: true });
  if (!o.skipProj) {
    mkdirSync(path.join(ios, `${name}.xcodeproj`), { recursive: true });
    writeFileSync(path.join(ios, `${name}.xcodeproj`, 'project.pbxproj'), pbxproj(o.bundleLine ?? 'PRODUCT_BUNDLE_IDENTIFIER = "com.duofitness.app";'));
  }
  if (o.extraProj) mkdirSync(path.join(ios, `${o.extraProj}.xcodeproj`), { recursive: true });
  if (o.its !== null) writeFileSync(path.join(ios, name, 'Info.plist'), infoPlist(o.its ?? ITS_FALSE));
  if (o.podfile !== null) writeFileSync(path.join(ios, 'Podfile'), o.podfile ?? PODFILE);
}

function run(extra: string[] = [], env: Record<string, string> = {}) {
  const r = spawnSync(process.execPath, [SCRIPT, '--root', dir, ...extra], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true', ...env } });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

describe('check-ios-project.mjs', () => {
  it('projeto como o Expo gera (bundle id entre aspas, ITS=false na linha seguinte): passa', () => {
    makeProject();
    const r = run();
    expect(r.code).toBe(0);
    expect(r.out).toContain('ok     projeto: ios/DuoFitness.xcodeproj (nome real: DuoFitness)');
    expect(r.out).toContain('bundle id com.duofitness.app em 2 configuração(ões)');
    expect(r.out).toContain('ITSAppUsesNonExemptEncryption = false');
    expect(r.out).toContain('Podfile com use_expo_modules!');
    expect(r.out).not.toContain('::error');
  });

  it('REGRESSÃO: o grep antigo (sem aspas) falhava em silêncio com o pbxproj do Expo; agora passa', () => {
    makeProject();
    const old = spawnSync('grep', ['-q', 'PRODUCT_BUNDLE_IDENTIFIER = com.duofitness.app', path.join(dir, 'ios', 'DuoFitness.xcodeproj', 'project.pbxproj')]);
    if (old.error === undefined) expect(old.status).toBe(1); // o grep antigo não casava
    expect(run().code).toBe(0);
  });

  it('aceita o bundle id sem aspas', () => {
    makeProject({ bundleLine: 'PRODUCT_BUNDLE_IDENTIFIER = com.duofitness.app;' });
    expect(run().code).toBe(0);
  });

  it('o nome do projeto é descoberto, não fixado (qualquer nome de .xcodeproj)', () => {
    makeProject({ name: 'OutroNome' });
    const r = run();
    expect(r.code).toBe(0);
    expect(r.out).toContain('nome real: OutroNome');
  });

  it('bundle id errado: ::error:: com o esperado e SÓ as linhas PRODUCT_BUNDLE_IDENTIFIER que existem', () => {
    makeProject({ bundleLine: 'PRODUCT_BUNDLE_IDENTIFIER = "org.name.HelloWorld";' });
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::[pbxproj] Esperado: toda linha PRODUCT_BUNDLE_IDENTIFIER = com.duofitness.app (com ou sem aspas)');
    expect(r.out).toContain('PRODUCT_BUNDLE_IDENTIFIER = "org.name.HelloWorld";');
    // não vaza outras linhas do arquivo
    expect(r.out).not.toContain('DEVELOPMENT_TEAM');
    expect(r.out).not.toContain('KH97Q8M556');
  });

  it('os pontos do bundle id não são curingas (com.duofitnessXapp não casa)', () => {
    makeProject({ bundleLine: 'PRODUCT_BUNDLE_IDENTIFIER = "com.duofitnessXapp";' });
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('com.duofitnessXapp');
  });

  it('sem nenhuma linha PRODUCT_BUNDLE_IDENTIFIER: diz que não há nenhuma', () => {
    makeProject({ bundleLine: 'PRODUCT_NAME = DuoFitness;' });
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('Não há nenhuma linha PRODUCT_BUNDLE_IDENTIFIER');
  });

  it('--bundle-id permite outro valor esperado', () => {
    makeProject({ bundleLine: 'PRODUCT_BUNDLE_IDENTIFIER = "br.com.outro";' });
    expect(run(['--bundle-id', 'br.com.outro']).code).toBe(0);
  });

  it('sem a pasta ios/: erro claro', () => {
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::[ios/] Esperado: a pasta ios/');
  });

  it('sem .xcodeproj: lista o que existe em ios/', () => {
    makeProject({ skipProj: true });
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('[xcodeproj] Esperado: um ios/<Nome>.xcodeproj');
    expect(r.out).toContain('Podfile');
  });

  it('dois .xcodeproj: erro com os nomes', () => {
    makeProject({ extraProj: 'Pods' });
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('exatamente um .xcodeproj');
    expect(r.out).toContain('DuoFitness.xcodeproj, Pods.xcodeproj');
  });

  it('ITSAppUsesNonExemptEncryption ausente, true ou com valor em linha separada por tabs', () => {
    makeProject({ its: '' });
    let r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('[Info.plist] Esperado: <key>ITSAppUsesNonExemptEncryption</key> seguido de <false/>');
    expect(r.out).toContain('ausente');

    rmSync(path.join(dir, 'ios'), { recursive: true, force: true });
    makeProject({ its: '    <key>ITSAppUsesNonExemptEncryption</key>\n    <true/>' });
    r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('Esperado: ITSAppUsesNonExemptEncryption = false');
    expect(r.out).toContain('Veio: true');

    rmSync(path.join(dir, 'ios'), { recursive: true, force: true });
    makeProject({ its: '\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>' }); // formato do template (tabs)
    expect(run().code).toBe(0);
  });

  it('sem Info.plist: erro com as pastas de ios/', () => {
    makeProject({ its: null });
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('[Info.plist] Esperado: ios/<Nome>/Info.plist');
  });

  it('Podfile ausente, vazio ou sem use_expo_modules!', () => {
    makeProject({ podfile: null });
    expect(run().out).toContain('[Podfile] Esperado: ios/Podfile. O arquivo não existe.');
    rmSync(path.join(dir, 'ios'), { recursive: true, force: true });
    makeProject({ podfile: '' });
    expect(run().out).toContain('ios/Podfile com conteúdo');
    rmSync(path.join(dir, 'ios'), { recursive: true, force: true });
    makeProject({ podfile: "target 'X' do\nend\n" });
    expect(run().out).toContain('use_expo_modules!');
  });

  it('mostra TODAS as checagens que falharam de uma vez', () => {
    makeProject({ bundleLine: 'PRODUCT_BUNDLE_IDENTIFIER = "x.y";', its: '', podfile: null });
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('[pbxproj]');
    expect(r.out).toContain('[Info.plist]');
    expect(r.out).toContain('[Podfile]');
    expect(r.out).toContain('3 checagem(ns) do projeto iOS falharam');
  });

  it('nome do projeto diferente do app.json: só AVISO, não falha', () => {
    makeProject({ name: 'Outro' });
    writeFileSync(path.join(dir, 'app.json'), JSON.stringify({ expo: { name: 'Duo Fitness' } }));
    const r = run();
    expect(r.code).toBe(0);
    expect(r.out).toContain('::warning::[xcodeproj] O nome do projeto (Outro) difere do derivado do app.json (DuoFitness)');
  });

  it('fora do GitHub a saída é legível (ERRO)', () => {
    makeProject({ its: '' });
    const r = run([], { GITHUB_ACTIONS: '' });
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/ERRO\s+\[Info\.plist\]/);
  });
});
