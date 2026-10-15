// "Anunciar em nosso marketplace" (src/utils/advertise.js): validação, telefone, e-mail, montagem do
// assunto e do corpo, escape no mailto e limite de tamanho da URL.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as A from '../../src/utils/advertise.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as C from '../../src/data/advertiseConfig.js';

const REPO = path.resolve(__dirname, '../..');
const DESC = 'Vendemos kits de acessórios para treino em casa, com entrega no condomínio.';
const base = (over: Record<string, unknown> = {}) => ({
  niche: 'acessorios', nicheOther: '', name: 'Maria da Silva', company: 'Força & Cia', whatsapp: '(11) 99999-8888',
  email: 'maria@forcaecia.com.br', city: 'Condomínio Jardins, São Paulo', description: DESC, link: '@forcaecia', ...over,
});

describe('configuração', () => {
  it('e-mail de contato é uma constante de configuração', () => {
    expect(C.MARKETPLACE_CONTACT_EMAIL).toBe('contato@duofitnessoficial.com.br');
    const src = readFileSync(path.join(REPO, 'src/utils/advertise.js'), 'utf8');
    expect(src).not.toMatch(/duofitnessoficial/); // o endereço não fica fixo na lógica
  });
  it('avisos fixos com o texto exato', () => {
    expect(C.ADVERTISE_NOTICES).toEqual([
      'Os anúncios passam por análise. Não aceitamos promessas de cura, resultado garantido nem indicação de dose.',
      'Seus dados serão enviados por e-mail à equipe Duo Fitness para contato.',
    ]);
    expect(C.ADVERTISE_DONE_MESSAGE).toBe('Seu e-mail está pronto. Toque em Enviar no seu aplicativo de e-mail para concluir.');
  });
  it('nichos: os do marketplace mais "Outro"', () => {
    expect(A.ADVERTISE_NICHES.map((n: { id: string }) => n.id)).toEqual(['nutricao', 'suplementos', 'whey', 'acessorios', 'servicos', 'outro']);
    expect(A.ADVERTISE_NICHES.map((n: { label: string }) => n.label)).toEqual(['Nutrição', 'Suplementos', 'Whey e alimentação', 'Acessórios', 'Serviços e personal', 'Outro']);
  });
});

describe('telefone (DDD, com ou sem máscara)', () => {
  it.each([
    ['11999998888', '(11) 99999-8888'], ['(11) 99999-8888', '(11) 99999-8888'], ['11 99999 8888', '(11) 99999-8888'],
    ['+55 (11) 99999-8888', '(11) 99999-8888'], ['5511999998888', '(11) 99999-8888'], ['011 99999-8888', '(11) 99999-8888'],
    ['(21) 3333-4444', '(21) 3333-4444'], ['2133334444', '(21) 3333-4444'], ['(85)98765-4321', '(85) 98765-4321'],
  ])('aceita %j', (input, formatted) => {
    expect(A.normalizePhone(input)?.formatted).toBe(formatted);
  });
  it.each(['', 'abc', '99999-8888', '999998888', '(11) 89999-8888', '(00) 99999-8888', '(10) 99999-8888', '(11) 9999-88', '119999988889', '+1 555 123 4567', '(11) 09999-8888'])('recusa %j', (input) => {
    expect(A.normalizePhone(input)).toBeNull();
  });
  it('máscara enquanto digita', () => {
    expect(A.maskPhone('')).toBe('');
    expect(A.maskPhone('1')).toBe('(1');
    expect(A.maskPhone('119')).toBe('(11) 9');
    expect(A.maskPhone('11999')).toBe('(11) 999');
    expect(A.maskPhone('1133334')).toBe('(11) 3333-4');
    expect(A.maskPhone('11999998888')).toBe('(11) 99999-8888');
    expect(A.maskPhone('119999988889999')).toBe('(11) 99999-8888'); // não passa de 11 dígitos
    expect(A.maskPhone('+55 11 99999-8888')).toBe('(11) 99999-8888');
  });
});

describe('e-mail, link e Instagram', () => {
  it.each(['a@b.co', 'maria.silva+anuncio@empresa.com.br', 'x_y@sub.dominio.org'])('e-mail válido %j', (e) => expect(A.isValidEmail(e)).toBe(true));
  it.each(['', 'maria', 'maria@', '@empresa.com', 'maria@empresa', 'maria @empresa.com', 'maria@empresa..com', 'a@b.c', `${'a'.repeat(120)}@x.com`])('e-mail inválido %j', (e) => expect(A.isValidEmail(e)).toBe(false));
  it.each(['', '@forcaecia', '@a.b_c', 'forcaecia.com.br', 'https://forcaecia.com.br/loja', 'instagram.com/forcaecia'])('link/Instagram válido %j', (l) => expect(A.isValidLinkOrHandle(l)).toBe(true));
  it.each(['forcaecia', '@', '@com espaço', 'http://', 'a b.com', `https://${'a'.repeat(130)}.com`])('link/Instagram inválido %j', (l) => expect(A.isValidLinkOrHandle(l)).toBe(false));
});

describe('validação do formulário', () => {
  it('formulário completo é válido e devolve valores limpos', () => {
    const r = A.validateForm(base({ name: '  Maria   da Silva ', whatsapp: '11999998888' }));
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual({});
    expect(r.values.name).toBe('Maria da Silva');
    expect(r.values.whatsapp).toBe('(11) 99999-8888');
  });
  it('só os obrigatórios bastam (empresa, cidade e link são opcionais)', () => {
    const r = A.validateForm({ niche: 'servicos', name: 'João', whatsapp: '(11) 99999-8888', description: DESC });
    expect(r.valid).toBe(true);
  });
  it('mensagem por campo, em português', () => {
    const r = A.validateForm(A.emptyForm());
    expect(r.valid).toBe(false);
    expect(r.errors.niche).toMatch(/Escolha o nicho/);
    expect(r.errors.name).toMatch(/nome do responsável/);
    expect(r.errors.contact).toMatch(/WhatsApp ou o e-mail/);
    expect(r.errors.description).toMatch(/pelo menos 20 caracteres/);
  });
  it('contato: basta um dos dois (WhatsApp ou e-mail)', () => {
    expect(A.validateForm(base({ whatsapp: '', email: 'a@b.com.br' })).valid).toBe(true);
    expect(A.validateForm(base({ whatsapp: '11999998888', email: '' })).valid).toBe(true);
    const none = A.validateForm(base({ whatsapp: '', email: '' }));
    expect(none.valid).toBe(false);
    expect(none.errors.contact).toBeTruthy();
  });
  it('se o campo de contato foi preenchido, precisa ser válido (mesmo que o outro esteja certo)', () => {
    expect(A.validateForm(base({ whatsapp: '123' })).errors.whatsapp).toMatch(/WhatsApp inválido/);
    expect(A.validateForm(base({ email: 'maria@' })).errors.email).toMatch(/E-mail inválido/);
  });
  it('"Outro" exige a especificação; trocar de nicho descarta o texto antigo', () => {
    expect(A.validateForm(base({ niche: 'outro', nicheOther: '' })).errors.nicheOther).toMatch(/Especifique/);
    expect(A.validateForm(base({ niche: 'outro', nicheOther: 'x' })).valid).toBe(false);
    const ok = A.validateForm(base({ niche: 'outro', nicheOther: 'Fisioterapia esportiva' }));
    expect(ok.valid).toBe(true);
    expect(ok.values.nicheOther).toBe('Fisioterapia esportiva');
    expect(A.validateForm(base({ niche: 'whey', nicheOther: 'sobrou' })).values.nicheOther).toBe('');
    expect(A.validateForm(base({ niche: 'planeta' })).errors.niche).toBeTruthy();
  });
  it('descrição: mínimo 20 e máximo 600 caracteres', () => {
    expect(A.validateForm(base({ description: 'curta' })).errors.description).toMatch(/pelo menos 20/);
    expect(A.validateForm(base({ description: 'a'.repeat(19) })).valid).toBe(false);
    expect(A.validateForm(base({ description: 'a'.repeat(20) })).valid).toBe(true);
    expect(A.validateForm(base({ description: 'a'.repeat(600) })).valid).toBe(true);
    const big = A.validateForm(base({ description: 'a'.repeat(601) }));
    expect(big.valid).toBe(false);
    expect(big.errors.description).toMatch(/no máximo 600 .* 601/);
    expect(A.validateForm(base({ description: `   ${'a'.repeat(10)}   ` })).errors.description).toBeTruthy(); // espaços não contam
  });
  it('limites dos outros campos e link inválido', () => {
    expect(A.validateForm(base({ name: 'a'.repeat(81) })).errors.name).toMatch(/no máximo 80/);
    expect(A.validateForm(base({ company: 'a'.repeat(81) })).errors.company).toMatch(/no máximo 80/);
    expect(A.validateForm(base({ city: 'a'.repeat(81) })).errors.city).toMatch(/no máximo 80/);
    expect(A.validateForm(base({ link: 'minhaloja' })).errors.link).toMatch(/@usuario/);
  });
  it('remove caracteres de controle e invisíveis dos campos', () => {
    const r = A.validateForm(base({ name: 'Ma\u0000ria‮ da\nSilva', description: `${DESC}​\r\n\r\n\r\n\r\nFim` }));
    expect(r.values.name).toBe('Maria da Silva');
    expect(r.values.description).toBe(`${DESC}\n\nFim`);
  });
});

describe('assunto e corpo', () => {
  const v = A.validateForm(base()).values;
  it('assunto no formato combinado', () => {
    expect(A.buildSubject(v)).toBe('[Marketplace] Pedido de anúncio - Acessórios - Maria da Silva');
    expect(A.buildSubject({ ...v, niche: 'outro', nicheOther: 'Fisioterapia esportiva' })).toBe('[Marketplace] Pedido de anúncio - Fisioterapia esportiva - Maria da Silva');
    expect(A.buildSubject({ ...v, niche: 'servicos' })).toContain('Serviços e personal');
  });
  it('assunto em uma linha só e com tamanho limitado (sem injetar cabeçalhos)', () => {
    const s = A.buildSubject({ ...v, name: 'Maria\r\nBcc: x@y.com' });
    expect(s).not.toMatch(/[\r\n]/);
    expect(A.buildSubject({ ...v, name: 'a'.repeat(500) }).length).toBeLessThanOrEqual(160);
  });
  it('corpo em português com todos os campos', () => {
    const b = A.buildBody(v);
    for (const t of ['Nicho: Acessórios', 'Responsável: Maria da Silva', 'Empresa ou marca: Força & Cia', 'WhatsApp: (11) 99999-8888', 'E-mail: maria@forcaecia.com.br', 'Cidade ou condomínio de interesse: Condomínio Jardins, São Paulo', 'Link ou Instagram: @forcaecia', 'Descrição do produto ou serviço:', DESC, 'Enviado pelo app Duo Fitness.']) {
      expect(b).toContain(t);
    }
  });
  it('campos vazios viram "não informado"', () => {
    const b = A.buildBody(A.validateForm({ niche: 'whey', name: 'Ana', email: 'ana@x.com.br', description: DESC }).values);
    expect(b).toContain('Empresa ou marca: não informado');
    expect(b).toContain('WhatsApp: não informado');
    expect(b).toContain('Link ou Instagram: não informado');
  });
});

describe('mailto: escape e limite de tamanho', () => {
  const decode = (url: string) => {
    const q = url.slice(url.indexOf('?') + 1);
    const parts = Object.fromEntries(q.split('&').map((p) => { const i = p.indexOf('='); return [p.slice(0, i), decodeURIComponent(p.slice(i + 1))]; }));
    return parts as { subject: string; body: string };
  };

  it('usa o e-mail da configuração e codifica assunto e corpo', () => {
    const mail = A.buildEmail(A.validateForm(base()).values);
    expect(mail.url.startsWith('mailto:contato@duofitnessoficial.com.br?subject=')).toBe(true);
    expect(mail.truncated).toBe(false);
    const { subject, body } = decode(mail.url);
    expect(subject).toBe(mail.subject);
    expect(body).toBe(mail.body);
  });
  it('acentos, &, ?, #, +, %, aspas, emoji e quebras de linha voltam idênticos e não quebram a URL', () => {
    const desc = 'Açaí & café com leite? #1 do bairro: 100% natural + frete grátis. "Entrega" rápida 😀\nSegunda linha: ação/promoção = ótimo';
    const mail = A.buildEmail(A.validateForm(base({ company: 'Força & Cia #1', description: desc, name: 'José d\'Ávila' })).values);
    expect(mail.url).not.toMatch(/[ \n\r"#<>]/);
    const q = mail.url.slice(mail.url.indexOf('?') + 1);
    expect(q.split('&')).toHaveLength(2); // só subject e body: o "&" do texto virou %26
    const { subject, body } = decode(mail.url);
    expect(body).toContain('Empresa ou marca: Força & Cia #1');
    expect(body).toContain(desc);
    expect(subject).toContain("José d'Ávila");
  });
  it('não deixa o texto injetar outros parâmetros (bcc, cc) nem destinatários', () => {
    const mail = A.buildEmail(A.validateForm(base({ name: 'Eu&bcc=x@y.com', description: `${DESC}&cc=a@b.com?to=z@z.com` })).values);
    const q = mail.url.slice(mail.url.indexOf('?') + 1);
    expect(q.split('&').map((p: string) => p.split('=')[0])).toEqual(['subject', 'body']);
    expect(mail.url.split('?')).toHaveLength(2);
    expect(mail.url.slice(0, mail.url.indexOf('?'))).toBe('mailto:contato@duofitnessoficial.com.br');
  });
  it('descrição de 600 caracteres: a URL final cabe no limite e avisa se resumiu', () => {
    const accents = 'ação café é ótimo, á ê ç ã õ ü. '.repeat(30).slice(0, 600);
    const v = A.validateForm(base({ description: accents })).values;
    const mail = A.buildEmail(v);
    expect(mail.url.length).toBeLessThanOrEqual(A.MAILTO_MAX_LENGTH);
    expect(mail.truncated).toBe(true);
    expect(decode(mail.url).body).toContain('descrição resumida');
    // o texto completo continua disponível para a folha de compartilhamento
    expect(mail.full.body).toContain(accents);
    expect(A.buildShareMessage(mail)).toContain(accents);
    expect(A.buildShareMessage(mail)).toContain('Assunto: ' + mail.subject);
  });
  it('descrição média cabe sem resumir', () => {
    const v = A.validateForm(base({ description: 'Texto simples sem acento. '.repeat(10) })).values;
    const mail = A.buildEmail(v);
    expect(mail.truncated).toBe(false);
    expect(mail.url.length).toBeLessThanOrEqual(A.MAILTO_MAX_LENGTH);
  });
  it('caso extremo: todos os campos no máximo e só acentos ainda cabe', () => {
    const v = A.validateForm(base({
      name: 'é'.repeat(80), company: 'ç'.repeat(80), city: 'ã'.repeat(80), link: 'https://' + 'a'.repeat(100) + '.com',
      email: 'a'.repeat(60) + '@' + 'b'.repeat(40) + '.com', description: 'ó'.repeat(600),
    })).values;
    const mail = A.buildEmail(v);
    expect(mail.url.length).toBeLessThanOrEqual(A.MAILTO_MAX_LENGTH);
    expect(mail.url.startsWith('mailto:contato@duofitnessoficial.com.br?subject=')).toBe(true);
  });
  it('o limite pode ser ajustado e o destinatário trocado (configuração)', () => {
    const v = A.validateForm(base()).values;
    expect(A.buildEmail(v, { to: 'teste@exemplo.com' }).url.startsWith('mailto:teste@exemplo.com?')).toBe(true);
    const long = A.validateForm(base({ description: 'palavra '.repeat(70) })).values;
    expect(A.buildEmail(long, { maxLength: 1000 }).url.length).toBeLessThanOrEqual(1000);
    expect(A.buildEmail(long).truncated).toBe(false);
  });
});

describe('privacidade', () => {
  it('a lógica e as telas não gravam nada no aparelho (sem AsyncStorage)', () => {
    for (const f of ['src/utils/advertise.js', 'src/data/advertiseConfig.js']) {
      expect(readFileSync(path.join(REPO, f), 'utf8')).not.toMatch(/AsyncStorage|localStorage|setItem/);
    }
  });
});
