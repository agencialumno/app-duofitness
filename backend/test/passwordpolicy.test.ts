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
    it('uma senha comum que cumpre as regras continua aceita (allOk) e sinalizada como comum, mas o nível é no máximo "Razoável"', () => {
      const comum = ok('Password#2026');
      expect(comum.allOk).toBe(true);
      expect(comum.common).toBe(true);
      expect(comum.strength).toEqual({ level: 2, label: 'Razoável' });
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

describe('nível da barra de força: definido pelos requisitos atendidos', () => {
  const lv = (pwd: string, ctx = {}) => P.checkPassword(pwd, ctx).strength;
  it('vazio = sem barra', () => expect(lv('')).toEqual({ level: 0, label: '' }));
  it('nenhum requisito crítico atendido = Fraca (nível 1)', () => {
    const r = P.checkPassword('   ');
    expect(P.metCount(r.rules)).toBeLessThanOrEqual(2);
    expect(r.strength).toEqual({ level: 1, label: 'Fraca' });
  });
  it('percorre 1, 2, ... todos os requisitos: o máximo só aparece com TODOS atendidos', () => {
    const casos = ['a', 'aB', 'aB1', 'aB1!', 'aB1!aB1!aB1!', 'aB1!aB1! aB1!', 'Kdmqpw1!ts'];
    for (const c of casos) {
      const r = P.checkPassword(c);
      expect(r.strength.level === 4, c).toBe(r.allOk);
    }
  });
  it('níveis explícitos: 0-2 Fraca, 3-5 Razoável, 6 Boa, 7 Muito forte', () => {
    const mk = (n: number) => Array.from({ length: 7 }, (_, i) => ({ id: String(i), label: '', ok: i < n }));
    expect([0, 1, 2].map((n) => P.strengthFromRules(mk(n)).label)).toEqual(['Fraca', 'Fraca', 'Fraca']);
    expect([3, 4, 5].map((n) => P.strengthFromRules(mk(n)).label)).toEqual(['Razoável', 'Razoável', 'Razoável']);
    expect(P.strengthFromRules(mk(6))).toEqual({ level: 3, label: 'Boa' });
    expect(P.strengthFromRules(mk(7))).toEqual({ level: 4, label: 'Muito forte' });
  });
  it('REGRESSÃO: senha com todos os requisitos mostra "Muito forte", mesmo curta (10) e com poucas classes', () => {
    for (const s of ['Treino#2026a', 'Kdmqpw1!ts', 'Qzmxnb7!ty', 'Corvo#Lilas#2026']) {
      const r = P.checkPassword(s);
      expect(r.allOk, s).toBe(true);
      expect(r.strength, s).toEqual({ level: 4, label: 'Muito forte' });
    }
  });
  it('um requisito faltando nunca chega ao máximo (Boa)', () => {
    expect(lv('Treino#Forte')).toEqual({ level: 3, label: 'Boa' }); // sem número
    expect(lv('treino#forte1')).toEqual({ level: 3, label: 'Boa' }); // sem maiúscula
    expect(lv('Treino 2026#ab').level).toBe(3); // com espaço
  });
  it('acento e emoji contam como letra/símbolo; espaço invalida; a política não afrouxou', () => {
    expect(lv('Ação#Forte2026').level).toBe(4); // acento
    expect(lv('Treino😀Forte2026').level).toBe(4); // emoji vale como símbolo
    expect(lv('Treino 😀Forte2026').level).toBe(3); // espaço
    expect(P.MIN_LENGTH).toBe(10);
    expect(P.checkPassword('Aa1!aaaaa').allOk).toBe(false); // 9 caracteres
    expect(P.checkPassword('Aa1!aaaaa').strength.level).toBe(3);
  });
  it('contém o e-mail/nome: não é máximo', () => {
    expect(lv('Victor#2026abc', { name: 'Victor Barros' }).level).toBe(3);
  });
});

describe('senha comum limita o nível de força (não bloqueia)', () => {
  const lv = (pwd: string, ctx = {}) => P.checkPassword(pwd, ctx);
  it('lista local pequena (50 a 100 itens) com os exemplos óbvios', () => {
    expect(P.COMMON_PASSWORDS.length).toBeGreaterThanOrEqual(50);
    expect(P.COMMON_PASSWORDS.length).toBeLessThanOrEqual(100);
    for (const c of ['123456', '12345678', 'senha123', 'qwerty123', 'password', 'duofitness']) expect(P.COMMON_PASSWORDS, c).toContain(c);
  });
  it.each(['123456', '12345678', 'senha123', 'qwerty123', 'password', 'duofitness', 'PASSWORD', 'DuoFitness', 'QwErTy123'])('senha comum "%s": nível Fraca ou Razoável, nunca Boa', (s) => {
    const r = lv(s);
    expect(r.common, s).toBe(true);
    expect(r.strength.level, s).toBeLessThanOrEqual(2);
    expect(['Fraca', 'Razoável']).toContain(r.strength.label);
  });
  it.each(['password1', 'Password#2026', 'senha2026!', 'Senha!2026', 'duofitness2026', 'DuoFitness#1', 'qwerty123456', 'academia@2026'])('senha comum com sufixo (número ou símbolo no fim) "%s" também fica limitada', (s) => {
    const r = lv(s);
    expect(r.common, s).toBe(true);
    expect(r.strength.level, s).toBeLessThanOrEqual(2);
  });
  it('mesmo cumprindo TODOS os requisitos, a senha comum não passa de "Razoável", e continua aceita', () => {
    const r = lv('Duofitness#2026');
    expect(r.allOk).toBe(true);
    expect(r.strength).toEqual({ level: 2, label: 'Razoável' });
  });
  it('senha forte normal continua "Boa" ou mais (todos os requisitos = "Muito forte")', () => {
    for (const s of ['Corvo#Lilas2026', 'Treino#Forte2026', 'Kdmqpw1!ts']) {
      const r = lv(s);
      expect(r.common, s).toBe(false);
      expect(r.strength.level, s).toBeGreaterThanOrEqual(3);
    }
    expect(lv('Corvo#Lilas2026').strength).toEqual({ level: 4, label: 'Muito forte' });
    expect(lv('Treino#Forte').strength.level).toBe(3); // falta um requisito: Boa
  });
  it('senha vazia: sem barra e não é comum', () => {
    const r = lv('');
    expect(r.strength).toEqual({ level: 0, label: '' });
    expect(r.common).toBe(false);
    expect(r.allOk).toBe(false);
  });
  it('só limita o NÍVEL: os requisitos e a aceitação da senha não mudam', () => {
    expect(lv('Password#2026').allOk).toBe(true);
    expect(lv('password').allOk).toBe(false); // continua faltando maiúscula, número, símbolo e tamanho
    expect(P.MIN_LENGTH).toBe(10);
  });
  it('isCommonPassword: sem diferenciar maiúscula/minúscula nem acento, e sem número/símbolo final', () => {
    for (const c of ['SENHA', 'Senha1', 'senha!!', 'Mudar123', '  password 2026 ', 'Musculação2026!']) expect(P.isCommonPassword(c), c).toBe(true);
    for (const c of ['', 'Corvo#Lilas2026', 'xK9!pQ2mZz']) expect(P.isCommonPassword(c), c).toBe(false);
  });
});
