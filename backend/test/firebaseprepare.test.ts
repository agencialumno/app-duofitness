// scripts/firebase-prepare.mjs: configuração do Firebase vinda dos secrets (base64) no CI. Só valores FALSOS de teste.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do repositório, sem tipos
import * as F from '../../scripts/firebase-prepare.mjs';

const REPO = path.resolve(__dirname, '../..');
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const FAKE_KEY = 'FAKE-KEY-FOR-TEST-ONLY';

const ANDROID = JSON.stringify({
  project_info: { project_id: 'fake-project' },
  client: [{ client_info: { android_client_info: { package_name: 'com.duofitness.app' } }, api_key: [{ current_key: FAKE_KEY }] }],
});
const PLIST = (bundle = 'com.duofitness.app') => `<?xml version="1.0"?><plist version="1.0"><dict><key>BUNDLE_ID</key><string>${bundle}</string><key>GOOGLE_APP_ID</key><string>1:1:ios:1</string><key>PROJECT_ID</key><string>fake</string><key>API_KEY</key><string>${FAKE_KEY}</string></dict></plist>`;

let dir: string;
let logs: string[];
const out = { log: (m: string) => { logs.push(String(m)); } };
beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), 'fb-prep-')); logs = []; });
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const envFile = () => path.join(dir, 'github_env');

describe('firebase-prepare', () => {
  it('sem a variável FIREBASE_ENABLED não faz nada (mesmo com o secret)', () => {
    const r = F.prepare('android', { FIREBASE_GOOGLE_SERVICES_JSON_B64: b64(ANDROID) }, dir, out);
    expect(r.enabled).toBe(false);
    expect(existsSync(path.join(dir, '.firebase-config'))).toBe(false);
  });

  it('com a variável e sem o secret: avisa e segue SEM Firebase (não falha)', () => {
    const r = F.prepare('ios', { FIREBASE_REQUESTED: 'true' }, dir, out);
    expect(r).toEqual({ enabled: false });
    expect(logs.join('\n')).toMatch(/::warning::.*FIREBASE_GOOGLE_SERVICE_INFO_PLIST_B64.*SEM Firebase/);
  });

  it('Android válido: grava, mascara a chave de API, liga a flag e nunca imprime o conteúdo', () => {
    writeFileSync(envFile(), '');
    const r = F.prepare('android', { FIREBASE_REQUESTED: 'TRUE', FIREBASE_GOOGLE_SERVICES_JSON_B64: b64(ANDROID), GITHUB_ENV: envFile() }, dir, out);
    expect(r.enabled).toBe(true);
    const file = path.join(dir, '.firebase-config', 'google-services.json');
    expect(readFileSync(file, 'utf8')).toBe(ANDROID);
    expect(readFileSync(envFile(), 'utf8')).toBe(`FIREBASE_ENABLED=true\nFIREBASE_ANDROID_CONFIG=${file}\n`);
    const text = logs.join('\n');
    expect(text).toContain(`::add-mask::${FAKE_KEY}`);
    expect(text.replace(`::add-mask::${FAKE_KEY}`, '')).not.toContain(FAKE_KEY);
    expect(text).not.toContain('fake-project');
    if (process.platform !== 'win32') expect(statSync(file).mode & 0o777).toBe(0o600);
  });

  it('iOS válido (base64 com quebras de linha também funciona)', () => {
    writeFileSync(envFile(), '');
    const wrapped = b64(PLIST()).replace(/(.{40})/g, '$1\n');
    const r = F.prepare('ios', { FIREBASE_REQUESTED: 'true', FIREBASE_GOOGLE_SERVICE_INFO_PLIST_B64: wrapped, GITHUB_ENV: envFile() }, dir, out);
    expect(r.enabled).toBe(true);
    expect(readFileSync(envFile(), 'utf8')).toContain('FIREBASE_IOS_CONFIG=');
    expect(readFileSync(path.join(dir, '.firebase-config', 'GoogleService-Info.plist'), 'utf8')).toBe(PLIST());
  });

  it.each([
    ['android', 'FIREBASE_GOOGLE_SERVICES_JSON_B64', 'não é um JSON válido', 'isto não é json'],
    ['android', 'FIREBASE_GOOGLE_SERVICES_JSON_B64', 'não tem o pacote', JSON.stringify({ project_info: { project_id: 'x' }, client: [{ client_info: { android_client_info: { package_name: 'outro.app' } } }] })],
    ['android', 'FIREBASE_GOOGLE_SERVICES_JSON_B64', 'project_id', JSON.stringify({ client: [] })],
    ['ios', 'FIREBASE_GOOGLE_SERVICE_INFO_PLIST_B64', 'não é um plist válido', 'lixo'],
    ['ios', 'FIREBASE_GOOGLE_SERVICE_INFO_PLIST_B64', 'BUNDLE_ID', PLIST('outro.app')],
  ])('secret inválido (%s: %s) falha sem gravar nada e sem imprimir o conteúdo', (plat, secret, motivo, content) => {
    const r = F.prepare(plat, { FIREBASE_REQUESTED: 'true', [secret]: b64(content) }, dir, out);
    expect(r.failed).toBe(true);
    expect(logs.join('\n')).toMatch(new RegExp(`::error::.*${motivo}`));
    expect(logs.join('\n')).not.toContain(content.slice(0, 20) + 'zzz');
    expect(existsSync(path.join(dir, '.firebase-config'))).toBe(false);
  });

  it('cleanup apaga .firebase-config e as cópias do prebuild (Android e iOS)', () => {
    mkdirSync(path.join(dir, '.firebase-config'), { recursive: true });
    writeFileSync(path.join(dir, '.firebase-config', 'x'), '1');
    mkdirSync(path.join(dir, 'android', 'app'), { recursive: true });
    writeFileSync(path.join(dir, 'android', 'app', 'google-services.json'), '{}');
    mkdirSync(path.join(dir, 'ios', 'DuoFitness'), { recursive: true });
    writeFileSync(path.join(dir, 'ios', 'DuoFitness', 'GoogleService-Info.plist'), '<plist/>');
    writeFileSync(path.join(dir, 'ios', 'DuoFitness', 'Info.plist'), '<plist/>');
    const removed = F.cleanup(dir, out);
    expect(removed.length).toBe(3);
    expect(existsSync(path.join(dir, 'ios', 'DuoFitness', 'Info.plist'))).toBe(true); // só apaga o do Firebase
    expect(F.cleanup(dir, out)).toEqual([]);
  });
});

describe('workflows do Firebase', () => {
  const yml = (f: string) => readFileSync(path.join(REPO, '.github/workflows', f), 'utf8');
  for (const [f, secret, plat] of [['android.yml', 'FIREBASE_GOOGLE_SERVICES_JSON_B64', 'android'], ['ios.yml', 'FIREBASE_GOOGLE_SERVICE_INFO_PLIST_B64', 'ios']] as const) {
    it(`${f}: secret só no passo de preparo, depois do npm ci; módulos só com a flag; limpeza sempre`, () => {
      const y = yml(f);
      expect(y).toContain(`${secret}: \${{ secrets.${secret} }}`);
      expect(y.split(`secrets.${secret}`).length - 1).toBe(1); // citado uma única vez
      expect(y).toContain('FIREBASE_REQUESTED: ${{ vars.FIREBASE_ENABLED }}');
      expect(y.indexOf(`firebase-prepare.mjs ${plat}`)).toBeGreaterThan(y.search(/run: npm ci/));
      expect(y.indexOf(`firebase-prepare.mjs ${plat}`)).toBeLessThan(y.indexOf('npx expo prebuild --platform'));
      expect(y).toMatch(/if: env\.FIREBASE_ENABLED == 'true'\r?\n\s+run: node scripts\/install-firebase-deps\.mjs/);
      expect(y).toMatch(/if: always\(\)\r?\n\s+run: node scripts\/firebase-prepare\.mjs cleanup/);
      expect(y).not.toMatch(/^\s+FIREBASE_ENABLED:/m); // a flag efetiva só vem do GITHUB_ENV (passo de preparo)
    });
  }
  it('nenhum workflow imprime o conteúdo dos secrets do Firebase', () => {
    for (const f of ['android.yml', 'ios.yml', 'ci.yml']) expect(yml(f)).not.toMatch(/echo[^\n]*FIREBASE_GOOGLE_SERVICE/);
  });
});

describe('firebase-spike.yml (medição, só manual)', () => {
  const y = readFileSync(path.join(REPO, '.github/workflows/firebase-spike.yml'), 'utf8');
  it('só tem o gatilho workflow_dispatch (nunca push, tag nem pull request)', () => {
    const on = y.slice(y.indexOf('\non:'), y.indexOf('\npermissions:'));
    expect(on).toContain('workflow_dispatch');
    expect(on).not.toMatch(/\b(push|pull_request|schedule|tags)\b/);
  });
  it('não usa secrets, só permissões de leitura, e apaga a configuração falsa ao fim', () => {
    expect(y).not.toMatch(/secrets\./);
    expect(y).toMatch(/permissions:\r?\n\s+contents: read/);
    expect(y.match(/firebase-prepare\.mjs cleanup/g)?.length).toBe(2);
    expect(y).not.toMatch(/upload-artifact|altool|TestFlight|keystore/i);
  });
});
