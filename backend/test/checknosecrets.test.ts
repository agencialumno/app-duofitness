// Verificação de CI contra segredos no repositório público. Os "segredos" abaixo são montados em pedaços para este
// arquivo não conter os padrões por inteiro (e é liberado no próprio script mesmo assim).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do repositório, sem tipos
import { scanFiles } from '../../scripts/check-no-secrets.mjs';

const REPO = path.resolve(__dirname, '../..');
const buf = (s: string) => Buffer.from(s, 'utf8');
const run = (files: Record<string, string>) => scanFiles(Object.keys(files), (f: string) => buf(files[f]!)) as { file: string; line: number; kind: string }[];

const FAKE_API_KEY = 'AI' + 'za' + 'Sy' + 'A'.repeat(33); // 4 + 2 + 33 = 39 caracteres: formato de chave de API do Google
const FAKE_SA = '"type": "service' + '_account"';
const FAKE_PEM = '-----BEGIN PRIVATE' + ' KEY-----';

describe('check-no-secrets', () => {
  it('arquivo limpo passa', () => {
    expect(run({ 'src/a.js': 'const x = 1;\n// AIza curto\nservice account' })).toEqual([]);
  });
  it('pega google-services.json e GoogleService-Info.plist versionados, em qualquer pasta', () => {
    for (const f of ['google-services.json', 'android/app/google-services.json', 'ios/App/GoogleService-Info.plist', 'a/b/googleservice-info.PLIST']) {
      expect(run({ [f]: '{}' }).map((p) => p.kind), f).toContain('arquivo de configuração/chave versionado');
    }
  });
  it('pega chave de conta de serviço, chave privada e chave de API (padrão AIza), com arquivo e linha', () => {
    const r = run({ 'docs/x.md': `linha 1\nalgo ${FAKE_SA} aqui\n${FAKE_PEM}\nkey=${FAKE_API_KEY}` });
    expect(r.map((p) => [p.line, p.kind])).toEqual([
      [2, 'conta de serviço do Google'],
      [3, 'chave privada'],
      [4, 'chave de API do Google (padrão AIza)'],
    ]);
  });
  it('nunca devolve o trecho do segredo', () => {
    const r = run({ 'a.txt': `k=${FAKE_API_KEY}` });
    expect(JSON.stringify(r)).not.toContain('SyAAAA');
  });
  it('arquivos de chave de conta de serviço pelo nome', () => {
    expect(run({ 'chaves/duofitness-adminsdk-1.json': '{}' }).length).toBeGreaterThan(0);
    expect(run({ 'my-service-account.json': '{}' }).length).toBeGreaterThan(0);
  });
  it('binários e arquivos enormes são ignorados', () => {
    const bin = Buffer.concat([Buffer.from([0, 1, 2]), buf(FAKE_API_KEY)]);
    expect(scanFiles(['a.png'], () => bin)).toEqual([]);
    expect(scanFiles(['grande.txt'], () => Buffer.alloc(2_000_001, 65))).toEqual([]);
  });
  it('o repositório atual está limpo (o mesmo comando do CI)', () => {
    const out = execFileSync('node', ['scripts/check-no-secrets.mjs'], { cwd: REPO, encoding: 'utf8' });
    expect(out).toMatch(/nada suspeito/);
  });
  it('o CI e os dois workflows de build rodam a verificação antes do npm ci', () => {
    for (const f of ['ci.yml', 'android.yml', 'ios.yml']) {
      const y = readFileSync(path.join(REPO, '.github/workflows', f), 'utf8');
      const at = y.indexOf('check-no-secrets.mjs');
      expect(at, f).toBeGreaterThan(0);
      expect(at, f).toBeLessThan(y.search(/run: npm ci/));
    }
  });
  it('o .gitignore cobre os arquivos do Firebase e as chaves', () => {
    const g = readFileSync(path.join(REPO, '.gitignore'), 'utf8');
    for (const p of ['google-services.json', 'GoogleService-Info.plist', 'firebase/secrets/', 'adminsdk']) expect(g).toContain(p);
  });
});
