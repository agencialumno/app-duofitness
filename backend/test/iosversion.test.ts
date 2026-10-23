// scripts/set-ios-version.sh: grava versão e build number no Info.plist gerado pelo Expo. No macOS o
// script usa o PlistBuddy; aqui um PlistBuddy FALSO (Print/Set sobre o XML de verdade) permite rodar
// no Windows e no Linux, com um Info.plist de fixture no formato do template do Expo (valores literais).
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO = path.resolve(__dirname, '../..');
const SCRIPT = path.join(REPO, 'scripts/set-ios-version.sh');
const IOS_YML = path.join(REPO, '.github/workflows/ios.yml');
const hasBash = spawnSync('bash', ['--version']).status === 0;
const px = (p: string) => p.split(path.sep).join('/');

// Mesmo formato do Info.plist do template do SDK 54 (tabs, valores literais "1.0" e "1").
const infoPlist = (short = '1.0', build = '1') => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CFBundleName</key>
\t<string>$(PRODUCT_NAME)</string>
\t<key>CFBundleShortVersionString</key>
\t<string>${short}</string>
\t<key>CFBundleVersion</key>
\t<string>${build}</string>
\t<key>ITSAppUsesNonExemptEncryption</key>
\t<false/>
\t<key>UILaunchStoryboardName</key>
\t<string>SplashScreen</string>
</dict>
</plist>
`;

// PlistBuddy falso: -c "Print :Chave" arquivo | -c "Set :Chave valor" arquivo (chave de string no topo).
const FAKE_PLISTBUDDY = `#!/usr/bin/env bash
cmd="$2"; file="$3"
op="\${cmd%% *}"; rest="\${cmd#* }"; rest="\${rest#:}"
key="\${rest%% *}"; value=""
if [ "$rest" != "$key" ]; then value="\${rest#* }"; fi
case "$op" in
  Print)
    out="$(awk -v k="$key" '$0 ~ "<key>" k "</key>" {f=1; next} f && /<string>/ {sub(/.*<string>/,""); sub(/<\\/string>.*/,""); print; exit}' "$file")"
    if [ -z "$out" ]; then echo "Print: Entry, \\":$key\\", Does Not Exist" >&2; exit 1; fi
    echo "$out" ;;
  Set)
    tmp="$file.tmp"
    awk -v k="$key" -v v="$value" '$0 ~ "<key>" k "</key>" {f=1; print; next} f && /<string>/ {print "\\t<string>" v "</string>"; f=0; next} {print}' "$file" > "$tmp" && mv "$tmp" "$file" ;;
  *) echo "comando não suportado no PlistBuddy falso: $op" >&2; exit 1 ;;
esac
`;

let work: string;
let fakePb: string;
beforeEach(() => {
  work = mkdtempSync(path.join(tmpdir(), 'ios-version-'));
  fakePb = path.join(work, 'PlistBuddy');
  writeFileSync(fakePb, FAKE_PLISTBUDDY);
  chmodSync(fakePb, 0o755);
});
afterEach(() => rmSync(work, { recursive: true, force: true }));

function putPlist(content = infoPlist()) {
  mkdirSync(path.join(work, 'ios', 'DuoFitness'), { recursive: true });
  const p = path.join(work, 'ios', 'DuoFitness', 'Info.plist');
  writeFileSync(p, content);
  return p;
}
function runScript(args: string[]) {
  const r = spawnSync('bash', [px(SCRIPT), ...args], {
    cwd: work,
    encoding: 'utf8',
    env: { ...process.env, GITHUB_ACTIONS: 'true', PLISTBUDDY: px(fakePb) },
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

describe.skipIf(!hasBash)('set-ios-version.sh', () => {
  it('grava versão e build number e não mexe no resto do Info.plist', () => {
    const plist = putPlist();
    const before = readFileSync(plist, 'utf8');
    const r = runScript([px(plist), '1.2.3', '42']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('CFBundleShortVersionString  1.0 -> 1.2.3');
    expect(r.out).toContain('CFBundleVersion  1 -> 42');
    const after = readFileSync(plist, 'utf8');
    expect(after).toContain('<key>CFBundleShortVersionString</key>\n\t<string>1.2.3</string>');
    expect(after).toContain('<key>CFBundleVersion</key>\n\t<string>42</string>');
    // só essas duas linhas mudaram
    const b = before.split('\n');
    const a = after.split('\n');
    expect(a).toHaveLength(b.length);
    expect(a.filter((l, i) => l !== b[i])).toEqual(['\t<string>1.2.3</string>', '\t<string>42</string>']);
    expect(after).toContain('<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>');
  });

  it('é idempotente (rodar de novo com o mesmo valor não muda nada)', () => {
    const plist = putPlist();
    runScript([px(plist), '1.0.0', '7']);
    const once = readFileSync(plist, 'utf8');
    const r = runScript([px(plist), '1.0.0', '7']);
    expect(r.code).toBe(0);
    expect(readFileSync(plist, 'utf8')).toBe(once);
  });

  it('o build number sobe a cada execução (o caso real: archive saía com build 1 em vez de 3)', () => {
    const plist = putPlist();
    expect(runScript([px(plist), '1.0.0', '3']).code).toBe(0);
    expect(readFileSync(plist, 'utf8')).toContain('<key>CFBundleVersion</key>\n\t<string>3</string>');
  });

  it('Info.plist inexistente: ::error:: com o caminho esperado', () => {
    const r = runScript([px(path.join(work, 'ios', 'Nada', 'Info.plist')), '1.0.0', '3']);
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::Info.plist não encontrado em');
    expect(r.out).toContain('ios/<NomeDoProjeto>/Info.plist');
  });

  it('chave ausente: ::error:: dizendo qual', () => {
    const plist = putPlist(infoPlist().replace('<key>CFBundleVersion</key>\n\t<string>1</string>\n', ''));
    const r = runScript([px(plist), '1.0.0', '3']);
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::A chave CFBundleVersion não existe');
  });

  it('versão ou build number inválidos: erro claro, sem editar o arquivo', () => {
    const plist = putPlist();
    const before = readFileSync(plist, 'utf8');
    for (const [v, b, msg] of [
      ['1.0.0-beta', '3', 'Versão inválida'],
      ['1.0.0', 'abc', 'Build number inválido'],
      ['1.0.0', '3.1', 'Build number inválido'],
    ] as const) {
      const r = runScript([px(plist), v, b]);
      expect(r.code).toBe(1);
      expect(r.out).toContain(msg);
    }
    expect(readFileSync(plist, 'utf8')).toBe(before);
  });

  it('argumentos faltando: erro de uso', () => {
    const r = runScript([px(putPlist())]);
    expect(r.code).toBe(2);
    expect(r.out).toContain('Uso: set-ios-version.sh');
  });
});

// ---- o passo do ios.yml e a ordem dos passos -------------------------------------------------------

function extractRun(yml: string, stepName: string): string {
  const lines = yml.split(/\r?\n/);
  const start = lines.findIndex((l) => l.includes('- name: ') && l.includes(stepName));
  if (start < 0) throw new Error(`passo não encontrado: ${stepName}`);
  const runIdx = lines.findIndex((l, i) => i > start && /^\s+run: \|\s*$/.test(l));
  const indent = lines[runIdx]!.match(/^(\s+)run:/)![1]!.length + 2;
  const body: string[] = [];
  for (let i = runIdx + 1; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.trim() !== '' && l.search(/\S/) < indent) break;
    body.push(l.length >= indent ? l.slice(indent) : '');
  }
  return body.join('\n');
}
const stepBlock = (yml: string, name: string): string => {
  const lines = yml.split(/\r?\n/);
  const start = lines.findIndex((l) => l.includes('- name: ') && l.includes(name));
  if (start < 0) throw new Error(`passo não encontrado: ${name}`);
  let end = lines.findIndex((l, i) => i > start && /^ {6}- /.test(l));
  if (end < 0) end = lines.length;
  return lines.slice(start, end).join('\n');
};

describe.skipIf(!hasBash)('ios.yml: passo "Gravar versão e build number no Info.plist"', () => {
  const stepScript = () => extractRun(readFileSync(IOS_YML, 'utf8'), 'Gravar versão e build number');

  function runStep(env: Record<string, string> = {}) {
    mkdirSync(path.join(work, 'scripts'), { recursive: true });
    writeFileSync(path.join(work, 'scripts', 'set-ios-version.sh'), readFileSync(SCRIPT));
    writeFileSync(path.join(work, 'step.sh'), stepScript());
    // "bash -e {0}": o shell padrão dos passos "run" do Actions
    const r = spawnSync('bash', ['-e', px(path.join(work, 'step.sh'))], {
      cwd: work,
      encoding: 'utf8',
      env: { ...process.env, GITHUB_ACTIONS: 'true', PLISTBUDDY: px(fakePb), APP_VERSION_NAME: '1.0.0', IOS_BUILD_NUMBER: '3', ...env },
    });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  }

  it('descobre o nome real do projeto e grava os valores', () => {
    const plist = putPlist();
    mkdirSync(path.join(work, 'ios', 'DuoFitness.xcodeproj'), { recursive: true });
    const r = runStep();
    expect(r.code).toBe(0);
    expect(r.out).toContain('Info.plist: ios/DuoFitness/Info.plist');
    expect(readFileSync(plist, 'utf8')).toContain('<key>CFBundleVersion</key>\n\t<string>3</string>');
  });

  it('sem .xcodeproj: ::error:: claro (não falha em silêncio)', () => {
    putPlist();
    const r = runStep();
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::Nenhum .xcodeproj em ios/');
  });

  it('com .xcodeproj mas sem Info.plist: ::error:: do script', () => {
    mkdirSync(path.join(work, 'ios', 'DuoFitness.xcodeproj'), { recursive: true });
    const r = runStep();
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::Info.plist não encontrado');
  });

  it('a ordem dos passos: prebuild, conferir projeto, gravar versão, pod install, archive, conferir archive, export, envio', () => {
    const yml = readFileSync(IOS_YML, 'utf8');
    const order = [
      'Gerar projeto iOS (expo prebuild)',
      'Conferir o projeto iOS gerado',
      'Gravar versão e build number no Info.plist',
      'pod install',
      'Archive (sem assinatura por padrão; sign_archive=true assina automático)',
      'Conferir versão e build number do archive',
      'Exportar o .ipa e validar a assinatura de distribuição',
      'Conferir os entitlements do .ipa (comparação com o projeto)',
      'Validar o .ipa e enviar ao TestFlight (altool)',
    ].map((n) => yml.indexOf(`- name: ${n}`));
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('as verificações de assinatura rodam SEMPRE (sem "if") e antes do envio, também com upload=true', () => {
    const yml = readFileSync(IOS_YML, 'utf8');
    const exportBlock = stepBlock(yml, 'Exportar o .ipa e validar a assinatura');
    expect(exportBlock).not.toMatch(/^\s{8}if:/m); // nenhum "if" no nível do passo
    for (const needle of ['codesign --verify --deep --strict', 'Apple Distribution', 'get-task-allow', 'application-identifier', 'TeamIdentifier']) {
      expect(exportBlock).toContain(needle);
    }
    // o passo do altool também roda sempre (com upload=false só valida, sem enviar)
    const altoolBlock = stepBlock(yml, 'Validar o .ipa e enviar ao TestFlight (altool)');
    expect(altoolBlock).not.toMatch(/^\s{8}if:/m);
    expect(altoolBlock).toContain('--validate-only');
    expect(altoolBlock).toContain('"$XC_IPA"');
    expect(stepBlock(yml, 'Conferir versão e build number do archive')).not.toMatch(/^\s{8}if:/m);
  });
});
