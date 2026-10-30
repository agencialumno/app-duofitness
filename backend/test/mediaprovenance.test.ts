// Portão de procedência das fotos de referência: com e sem RELEASE_BUILD, com e sem fotos, com o campo em "não", "sim" e ausente; e a ligação nos workflows.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as G from '../../scripts/check-media-provenance.mjs';

const REPO = path.resolve(__dirname, '../..');
const req = createRequire(path.join(REPO, 'package.json'));
const yaml = req('js-yaml') as { load: (s: string) => { jobs: Record<string, { steps: { name?: string; if?: string; env?: Record<string, string>; run?: string }[] }> } };

function project(opts: { photos?: boolean; field?: string | null }) {
  const dir = mkdtempSync(path.join(tmpdir(), 'prov-'));
  mkdirSync(path.join(dir, 'docs'), { recursive: true });
  if (opts.field !== null) writeFileSync(path.join(dir, 'docs/procedencia-midia.md'), `# Procedência\n\nCONFIRMADO: ${opts.field ?? 'não'}\n`);
  if (opts.photos) {
    mkdirSync(path.join(dir, 'assets/exercicios-ref/pushup'), { recursive: true });
    writeFileSync(path.join(dir, 'assets/exercicios-ref/pushup/0.jpg'), 'x');
  }
  return dir;
}
const run = (root: string, release: string | undefined) => {
  const env: NodeJS.ProcessEnv = { ...process.env, GITHUB_ACTIONS: '' };
  delete env.RELEASE_BUILD;
  if (release !== undefined) env.RELEASE_BUILD = release;
  const r = spawnSync(process.execPath, [path.join(REPO, 'scripts/check-media-provenance.mjs'), '--root', root], { encoding: 'utf8', env });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
};

describe('portão de procedência (script)', () => {
  it('COM RELEASE_BUILD=true, fotos presentes e "CONFIRMADO: não": FALHA (exit 1) com mensagem clara', () => {
    const r = run(project({ photos: true, field: 'não' }), 'true');
    expect(r.code).toBe(1);
    expect(r.out).toContain('BLOQUEADO');
    expect(r.out).toContain('docs/procedencia-midia.md');
  });
  it('COM RELEASE_BUILD=true, fotos presentes e campo ausente ou ilegível: FALHA (ausente é tratado como "não")', () => {
    expect(run(project({ photos: true, field: null }), 'true').code).toBe(1);
    expect(run(project({ photos: true, field: 'talvez' }), 'true').code).toBe(1);
  });
  it('COM RELEASE_BUILD=true, fotos presentes e "CONFIRMADO: sim": passa', () => {
    const r = run(project({ photos: true, field: 'sim' }), 'true');
    expect(r.code).toBe(0);
    expect(r.out).toContain('Procedência confirmada');
  });
  it('SEM a variável RELEASE_BUILD (ou diferente de true): passa mesmo com fotos e "não" (comportamento de hoje)', () => {
    const p = project({ photos: true, field: 'não' });
    for (const v of [undefined, '', 'false', '1', 'TRUEE']) expect(run(p, v).code, String(v)).toBe(0);
  });
  it('COM RELEASE_BUILD=true mas SEM fotos (build de CI): passa, não há o que confirmar', () => {
    expect(run(project({ photos: false, field: 'não' }), 'true').code).toBe(0);
    expect(run(project({ photos: false, field: null }), 'true').code).toBe(0);
  });
  it('a variável é lida sem diferenciar maiúscula ("TRUE") e o campo aceita "sim" em qualquer caixa', () => {
    expect(run(project({ photos: true, field: 'não' }), 'TRUE').code).toBe(1);
    expect(run(project({ photos: true, field: 'SIM' }), 'true').code).toBe(0);
  });
});

describe('funções puras', () => {
  it('readConfirmed e evaluate', () => {
    expect(G.readConfirmed('CONFIRMADO: sim')).toBe(true);
    expect(G.readConfirmed('x\nCONFIRMADO: não\n')).toBe(false);
    expect(G.readConfirmed('CONFIRMADO: nao')).toBe(false);
    expect(G.readConfirmed('sem campo')).toBeNull();
    expect(G.evaluate({ release: true, photos: 3, confirmed: null }).ok).toBe(false);
    expect(G.evaluate({ release: true, photos: 3, confirmed: true }).ok).toBe(true);
    expect(G.evaluate({ release: false, photos: 3, confirmed: false }).ok).toBe(true);
  });
});

describe('estado real do repositório e workflows', () => {
  it('o documento real começa com "CONFIRMADO: não" e registra fonte, licença, data e a ressalva da origem não verificada', () => {
    const d = readFileSync(path.join(REPO, 'docs/procedencia-midia.md'), 'utf8');
    expect(G.readConfirmed(d)).toBe(false);
    expect(d).toContain('yuhonas/free-exercise-db');
    expect(d).toContain('Unlicense');
    expect(d).toMatch(/2026-10-30/);
    expect(d).toMatch(/origem original das fotos NÃO foi verificada/);
  });
  it('ios.yml e android.yml chamam o portão SÓ se a variável RELEASE_BUILD existir, sem outro efeito', () => {
    for (const f of ['.github/workflows/ios.yml', '.github/workflows/android.yml']) {
      const steps = yaml.load(readFileSync(path.join(REPO, f), 'utf8')).jobs.build!.steps;
      const s = steps.find((x) => /procedência das fotos/i.test(x.name ?? ''))!;
      expect(s, f).toBeTruthy();
      expect(s.if).toBe("vars.RELEASE_BUILD != ''");
      expect(s.env!.RELEASE_BUILD).toBe('${{ vars.RELEASE_BUILD }}');
      expect(s.run).toBe('node scripts/check-media-provenance.mjs');
      // roda cedo, antes do prebuild e do build
      const pre = steps.findIndex((x) => /prebuild/i.test(x.name ?? ''));
      expect(steps.indexOf(s), f).toBeLessThan(pre);
    }
  });
  it('as pendências do Victor explicam a confirmação e o RELEASE_BUILD', () => {
    const p = readFileSync(path.join(REPO, 'docs/pendencias-usuario.md'), 'utf8');
    expect(p).toContain('RELEASE_BUILD');
    expect(p).toContain('CONFIRMADO: sim');
  });
});
