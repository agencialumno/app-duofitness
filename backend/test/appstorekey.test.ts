// scripts/check-appstore-key.mjs (na raiz do app) como processo externo, contra um servidor local
// que imita a API do App Store Connect. A chave é gerada na hora (EC P-256); nada de segredo real.
import { spawn, spawnSync } from 'node:child_process';
import { createPublicKey, generateKeyPairSync, verify } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const SCRIPT = path.resolve(__dirname, '../../scripts/check-appstore-key.mjs');

let dir: string;
let keyFile: string;
let publicPem: string;
let server: Server;
let base: string;
let nextStatus = 200;
let nextBody: unknown = { data: [{ id: '1' }] };
const seen: { url?: string; auth?: string }[] = [];

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'check-appstore-key-'));
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  keyFile = path.join(dir, 'AuthKey_TEST.p8');
  writeFileSync(keyFile, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  publicPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  server = createServer((req, res) => {
    seen.push({ url: req.url, auth: req.headers.authorization });
    res.writeHead(nextStatus, { 'content-type': 'application/json' });
    res.end(JSON.stringify(nextBody));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

// spawn (assíncrono): o servidor local roda neste mesmo processo e precisa continuar respondendo.
function run(args: string[], env: Record<string, string | undefined> = {}): Promise<{ code: number | null; out: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], {
      env: { ...process.env, GITHUB_ACTIONS: 'true', APPSTORE_KEY_ID: 'KEYID12345', APPSTORE_ISSUER_ID: 'issuer-uuid', ...env },
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ code, out }));
  });
}

describe('check-appstore-key.mjs', () => {
  it('200 com o app encontrado: passa, e envia um JWT ES256 válido com kid/iss/aud corretos', async () => {
    nextStatus = 200;
    nextBody = { data: [{ id: '1' }] };
    seen.length = 0;
    const r = await run(['--key', keyFile, '--api', base]);
    expect(r.code).toBe(0);
    expect(r.out).toContain('app com.duofitness.app encontrado');
    expect(seen[0]!.url).toContain('filter[bundleId]=com.duofitness.app');
    const jwt = seen[0]!.auth!.replace('Bearer ', '');
    const [h, p, s] = jwt.split('.') as [string, string, string];
    const header = JSON.parse(Buffer.from(h, 'base64url').toString());
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    expect(header).toMatchObject({ alg: 'ES256', kid: 'KEYID12345', typ: 'JWT' });
    expect(payload).toMatchObject({ iss: 'issuer-uuid', aud: 'appstoreconnect-v1' });
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(20 * 60);
    expect(verify('sha256', Buffer.from(`${h}.${p}`), { key: createPublicKey(publicPem), dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'))).toBe(true);
    // nunca imprime o JWT nem a chave
    expect(r.out).not.toContain(jwt);
    expect(r.out).not.toContain('BEGIN PRIVATE KEY');
  });

  it('401: aponta as três credenciais', async () => {
    nextStatus = 401;
    nextBody = { errors: [{ code: 'NOT_AUTHORIZED' }] };
    const r = await run(['--key', keyFile, '--api', base]);
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error::A App Store Connect recusou as credenciais (401)');
    expect(r.out).toContain('APPSTORE_KEY_ID');
  });

  it('403: fala de papel (App Manager ou Admin)', async () => {
    nextStatus = 403;
    const r = await run(['--key', keyFile, '--api', base]);
    expect(r.code).toBe(1);
    expect(r.out).toContain('(403)');
    expect(r.out).toContain('App Manager ou Admin');
  });

  it('200 sem o app: diz para criar o app com esse bundle id', async () => {
    nextStatus = 200;
    nextBody = { data: [] };
    const r = await run(['--key', keyFile, '--api', base]);
    expect(r.code).toBe(1);
    expect(r.out).toContain('não foi encontrado nesta conta');
  });

  it('faltam variáveis: lista os nomes', async () => {
    const r = await run(['--key', keyFile, '--api', base], { APPSTORE_KEY_ID: '', APPSTORE_ISSUER_ID: '' });
    expect(r.code).toBe(1);
    expect(r.out).toContain('APPSTORE_KEY_ID, APPSTORE_ISSUER_ID');
  });

  it('arquivo que não é .p8: erro claro, sem rede', async () => {
    const bad = path.join(dir, 'ruim.p8');
    writeFileSync(bad, 'isto não é uma chave');
    const r = await run(['--key', bad, '--api', base]);
    expect(r.code).toBe(1);
    expect(r.out).toContain('não parece uma chave .p8');
  });

  it('bloco PEM inválido: erro claro', async () => {
    const bad = path.join(dir, 'pem-ruim.p8');
    writeFileSync(bad, '-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n');
    const r = await run(['--key', bad, '--api', base]);
    expect(r.code).toBe(1);
    expect(r.out).toContain('não é uma chave EC P-256 válida');
  });

  it('--offline monta e confere o JWT localmente', () => {
    const r = spawnSync(process.execPath, [SCRIPT, '--key', keyFile, '--offline'], {
      encoding: 'utf8',
      env: { ...process.env, APPSTORE_KEY_ID: 'K', APPSTORE_ISSUER_ID: 'I' },
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('verificado localmente');
  });
});
