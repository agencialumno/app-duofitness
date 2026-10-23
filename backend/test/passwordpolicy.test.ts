import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as P from '../../src/utils/passwordPolicy.js';

type Rule = { id: string; ok: boolean };
const ok = (pwd: string, ctx: Record<string, string> = {}) => P.checkPassword(pwd, ctx);
const failing = (pwd: string, ctx: Record<string, string> = {}) => (ok(pwd, ctx).rules as Rule[]).filter((r) => !r.ok).map((r) => r.id);

describe('política de senha', () => {
  it('uma senha boa cumpre todos os requisitos', () => {
    const r = ok('Treino#Forte2026', { email: 'ana@exemplo.com', name: 'Ana Souza' });
    expect(r.allOk).toBe(true);
    expect(P.metCount(r.rules)).toBe(7);
    expect(r.strength.level).toBeGreaterThanOrEqual(3);
  });

  it('vazia não cumpre nada e não tem força', () => {
    const r = ok('');
    expect(r.allOk).toBe(false);
    expect(P.metCount(r.rules)).toBe(0);
    expect(r.score).toBe(0);
    expect(r.strength).toEqual({ level: 0, label: '' });
  });

  it.each([
    ['curta', 'Ab1!xyz', ['length']],
    ['sem maiúscula', 'treino#forte2026', ['upper']],
    ['sem minúscula', 'TREINO#FORTE2026', ['lower']],
    ['sem número', 'Treino#Forte', ['number']],
    ['sem símbolo', 'TreinoForte2026', ['symbol']],
    ['com espaço', 'Treino #Forte2026', ['spaces']],
  ])('%s', (_n, pwd, falhas) => {
    expect(failing(pwd)).toEqual(falhas);
  });

  it('exatamente 10 caracteres passa; 9 não', () => {
    expect(failing('Abcdef1!gh')).toEqual([]);
    expect(failing('Abcdef1!g')).toEqual(['length']);
  });

  it('conta caracteres (pontos de código), não bytes: acentos e emoji', () => {
    expect(failing('Ação#1234x')).toEqual([]); // 10 caracteres com acentos
    expect(failing('Ação#123')).toEqual(['length']);
    // emoji vale 1 caractere e conta como símbolo
    expect(failing('Treino1234💪')).toEqual([]);
    expect(P.checkPassword('Aa1💪💪💪💪💪💪💪').rules.find((r: Rule) => r.id === 'length').ok).toBe(true); // 10 pontos de código
    expect(P.checkPassword('Aa1💪💪💪💪💪💪').rules.find((r: Rule) => r.id === 'length').ok).toBe(false); // 9
  });

  it('maiúscula e minúscula também com letras acentuadas', () => {
    expect(failing('ÁguaÉÓtima1!')).toEqual([]);
    expect(failing('água#forte123')).toEqual(['upper']);
    expect(failing('ÁGUA#FORTE123')).toEqual(['lower']);
  });

  it('qualquer espaço em branco reprova (espaço, tab, NBSP, quebra de linha)', () => {
    for (const sp of [' ', '\t', ' ', '\n']) expect(failing(`Treino#Forte${sp}2026`)).toEqual(['spaces']);
    expect(failing(' Treino#Forte2026')).toEqual(['spaces']);
    expect(failing('Treino#Forte2026 ')).toEqual(['spaces']);
  });

  describe('não conter e-mail nem nome', () => {
    it('parte local do e-mail', () => {
      expect(failing('Joaquim#2026Abc', { email: 'joaquim@exemplo.com' })).toEqual(['personal']);
      expect(failing('JOAQUIM#2026abc', { email: 'Joaquim@exemplo.com' })).toContain('personal');
    });
    it('nome ou sobrenome, ignorando acentos e maiúsculas', () => {
      expect(failing('Treino#Conceição1', { name: 'Maria Conceição' })).toEqual(['personal']);
      expect(failing('Treino#Conceicao1', { name: 'Maria Conceição' })).toEqual(['personal']);
      expect(failing('Treino#MARIA2026', { name: 'Maria Conceição' })).toEqual(['personal']);
    });
    it('partes com menos de 3 letras não contam (evita falso positivo)', () => {
      expect(failing('Treino#Forte2026', { name: 'Jo Li', email: 'jl@x.com' })).toEqual([]);
    });
    it('e-mail de pontos e números: usa só letras e números da parte local', () => {
      expect(failing('Treino#ana.souza1', { email: 'ana.souza@x.com' })).toContain('personal');
      expect(failing('Anasouza#Treino1', { email: 'ana.souza@x.com' })).toContain('personal');
    });
    it('sem e-mail e sem nome informados, a regra passa', () => {
      expect(failing('Treino#Forte2026')).toEqual([]);
    });
  });

  describe('senhas comuns penalizam a força (não são bloqueadas)', () => {
    it('a lista é pequena e embutida', () => {
      expect(P.COMMON_PASSWORDS.length).toBeGreaterThan(20);
      expect(P.COMMON_PASSWORDS.length).toBeLessThan(100);
    });
    it('reconhece variações simples (maiúsculas, acento, leet)', () => {
      for (const c of ['Password', 'P@ssw0rd', 'SENHA123', 'Qwerty', 'Flamengo', 'Musculação']) expect(P.isCommonPassword(c), c).toBe(true);
      expect(P.isCommonPassword('Treino#Forte2026')).toBe(false);
    });
    it('uma senha comum que cumpre as regras tem força fraca', () => {
      const comum = ok('Password#2026');
      expect(comum.allOk).toBe(true);
      expect(comum.common).toBe(true);
      expect(comum.strength.level).toBe(1);
      expect(ok('Corvo#Lilas#2026').strength.level).toBeGreaterThan(comum.strength.level);
    });
  });

  it('a força cresce com comprimento e variedade e tem rótulos', () => {
    const a = ok('Ab1!').score;
    const b = ok('Kdmqpw1!ts').score;
    const c = ok('Kdmqpw1!tsvxzybnrjhgf').score;
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    expect(P.strengthOf(10).label).toBe('Fraca');
    expect(P.strengthOf(50).label).toBe('Razoável');
    expect(P.strengthOf(70).label).toBe('Boa');
    expect(P.strengthOf(95).label).toBe('Forte');
  });

  it('muita repetição derruba a força', () => {
    expect(ok('Aaaaaaaaa1!').score).toBeLessThan(ok('Kdmqpwvxz1!').score);
  });

  it('nunca lança com entradas estranhas', () => {
    for (const v of [undefined, null, 123, {}, [], '\u0000', '😀'.repeat(50)]) expect(() => P.checkPassword(v as never, { email: undefined, name: null as never })).not.toThrow();
  });
});
