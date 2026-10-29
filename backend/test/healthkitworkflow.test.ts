// ios.yml / android.yml / ci.yml com a flag do HealthKit: um só significado, ordem dos passos e Android intacto.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO = path.resolve(__dirname, '../..');
const req = createRequire(path.join(REPO, 'package.json'));
const yaml = req('js-yaml') as { load: (s: string) => { jobs: Record<string, { env?: Record<string, string>; steps: { name?: string; run?: string; if?: string }[] }> } };
const load = (f: string) => yaml.load(readFileSync(path.join(REPO, '.github/workflows', f), 'utf8'));

describe('ios.yml', () => {
  const wf = load('ios.yml');
  const job = wf.jobs.build!;
  const idx = (re: RegExp) => job.steps.findIndex((s) => re.test(`${s.name ?? ''} ${s.run ?? ''}`));

  it('UMA variável: HEALTH_INTEGRATION_ENABLED liga o check do .ipa E o JavaScript do app (EXPO_PUBLIC_HEALTH_INTEGRATION vem dela, não de outra)', () => {
    expect(job.env!.HEALTH_INTEGRATION_ENABLED).toBe('${{ vars.HEALTH_INTEGRATION_ENABLED }}');
    expect(job.env!.EXPO_PUBLIC_HEALTH_INTEGRATION).toBe('${{ vars.HEALTH_INTEGRATION_ENABLED }}');
    expect(readFileSync(path.join(REPO, '.github/workflows/ios.yml'), 'utf8')).not.toMatch(/vars\.EXPO_PUBLIC_HEALTH_INTEGRATION|secrets\.[A-Z_]*HEALTH/);
  });
  it('instala os módulos só com a flag, ANTES do autolinking e do prebuild', () => {
    const install = idx(/install-healthkit-deps\.mjs/);
    expect(install).toBeGreaterThan(-1);
    expect(job.steps[install]!.if).toBe("env.HEALTH_INTEGRATION_ENABLED == 'true'");
    expect(install).toBeLessThan(idx(/check-autolinking\.mjs --platform ios/));
    expect(install).toBeLessThan(idx(/expo prebuild --platform ios/));
    expect(install).toBeGreaterThan(idx(/install-firebase-deps\.mjs/)); // depois do Firebase (instalações separadas)
  });
  it('o check dos entitlements do .ipa continua exigindo o HealthKit com a flag e avisa do sign_archive', () => {
    const run = job.steps.find((s) => (s.name ?? '').startsWith('Conferir os entitlements do .ipa'))!.run!;
    expect(run).toContain('--require-healthkit');
    expect(run).toContain('sign_archive=true');
  });
});

describe('Android e CI', () => {
  it('o android.yml NÃO recebe a flag do HealthKit (Android não muda nesta fase)', () => {
    const t = readFileSync(path.join(REPO, '.github/workflows/android.yml'), 'utf8');
    expect(t).not.toMatch(/HEALTH_INTEGRATION|healthkit/i);
  });
  it('docs/testflight.md diz que o build com HealthKit usa sign_archive=true', () => {
    const d = readFileSync(path.join(REPO, 'docs/testflight.md'), 'utf8');
    expect(d).toMatch(/O build com HealthKit usa `sign_archive=true`/);
    expect(d).toContain('Clinical Health Records');
  });
});
