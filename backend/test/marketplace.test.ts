// Vitrine do app (src/data/marketplace.js): filtragem por categoria, integridade dos itens de exemplo,
// regras dos textos (sem promessa de saúde, dosagem ou resultado), link do WhatsApp e imagens.
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as M from '../../src/data/marketplace.js';

const REPO = path.resolve(__dirname, '../..');
type Item = {
  id: string;
  categoria: string;
  titulo: string;
  descricaoCurta: string;
  descricaoCompleta: string;
  imagem: string | null;
  preco: string | null;
  destaque: boolean;
  contato: { tipo: string; url?: string };
  exemplo: boolean;
};
const items: Item[] = M.MARKETPLACE_ITEMS;
const CATEGORY_IDS = ['nutricao', 'suplementos', 'whey', 'acessorios', 'servicos'];

describe('filtragem por categoria', () => {
  it('"todos" devolve tudo (e uma cópia, sem mutar a lista original)', () => {
    const all = M.filterByCategory(items, 'todos');
    expect(all).toHaveLength(items.length);
    expect(all).not.toBe(items);
    expect(M.filterByCategory(items, undefined)).toHaveLength(items.length);
    expect(M.filterByCategory(items, '')).toHaveLength(items.length);
  });

  it.each(CATEGORY_IDS)('categoria %s só traz itens dela, e há pelo menos um', (id) => {
    const r = M.filterByCategory(items, id) as Item[];
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((i) => i.categoria === id)).toBe(true);
  });

  it('as categorias juntas cobrem todos os itens, sem repetir nem sobrar', () => {
    const ids = CATEGORY_IDS.flatMap((c) => (M.filterByCategory(items, c) as Item[]).map((i) => i.id));
    expect([...ids].sort()).toEqual(items.map((i) => i.id).sort());
  });

  it('categoria desconhecida devolve lista vazia', () => {
    expect(M.filterByCategory(items, 'carros')).toEqual([]);
    expect(M.filterByCategory([], 'whey')).toEqual([]);
  });

  it('countByCategory bate com a filtragem (chips mostram a contagem certa)', () => {
    const counts = M.countByCategory(items);
    expect(counts.todos).toBe(items.length);
    for (const id of CATEGORY_IDS) expect(counts[id]).toBe(M.filterByCategory(items, id).length);
  });

  it('getDestaques só devolve destaques, respeita o máximo e mantém a ordem', () => {
    const d = M.getDestaques(items, 2) as Item[];
    expect(d.length).toBeLessThanOrEqual(2);
    expect(d.every((i) => i.destaque)).toBe(true);
    expect(M.getDestaques(items, 99).length).toBe(items.filter((i) => i.destaque).length);
  });

  it('getItem encontra por id e devolve null se não existir', () => {
    expect(M.getItem(items[0]!.id)?.id).toBe(items[0]!.id);
    expect(M.getItem('nao-existe')).toBeNull();
  });
});

describe('integridade dos itens (todos são exemplos)', () => {
  it('ids únicos, categorias válidas e campos obrigatórios preenchidos', () => {
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    for (const i of items) {
      expect(CATEGORY_IDS).toContain(i.categoria);
      expect(i.titulo.trim().length).toBeGreaterThan(3);
      expect(i.descricaoCompleta.trim().length).toBeGreaterThan(20);
      expect(['whatsapp', 'link']).toContain(i.contato.tipo);
      expect(typeof i.destaque).toBe('boolean');
    }
  });

  it('todo item de exemplo está marcado como exemplo, no campo e no título', () => {
    for (const i of items) {
      expect(i.exemplo).toBe(true);
      expect(i.titulo.toLowerCase()).toContain('(exemplo)');
    }
  });

  it('a descrição curta cabe em 2 linhas (até 120 caracteres)', () => {
    for (const i of items) expect(i.descricaoCurta.length, i.id).toBeLessThanOrEqual(120);
  });

  it('links de itens são https', () => {
    for (const i of items.filter((x) => x.contato.tipo === 'link')) expect(i.contato.url, i.id).toMatch(/^https:\/\//);
  });

  it('todas as categorias têm rótulo e ícone', () => {
    expect(M.CATEGORIAS.map((c: { id: string }) => c.id)).toEqual(CATEGORY_IDS);
    for (const c of M.CATEGORIAS) {
      expect(c.label.length).toBeGreaterThan(2);
      expect(c.icone).toMatch(/-outline$/);
    }
  });
});

describe('textos: sem promessa de saúde, dosagem ou resultado', () => {
  // Lista de termos que não podem aparecer em nenhum texto da vitrine.
  const PROIBIDOS =
    /emagre|queim(a|e|ar)\b|gordura|resultado|dosag|\bdose\b|\bmg\b|\bgramas?\b|\bcura\b|cura(r|m)\b|trata(mento|r)\b|previne|garant|milagr|ganh(e|o|ar) (de )?massa|hipertrofi|defini[cç][aã]o muscular|\bsaudável\b|melhora (o|a|seu|sua)|aumenta|reduz|antes e depois|aprovado|clinicamente|eficaz|\d+\s?%/i;

  it('nenhum título ou descrição usa termos proibidos', () => {
    for (const i of items) {
      for (const [campo, texto] of [['titulo', i.titulo], ['descricaoCurta', i.descricaoCurta], ['descricaoCompleta', i.descricaoCompleta]] as const) {
        expect(PROIBIDOS.test(texto), `${i.id}.${campo}: "${texto}"`).toBe(false);
      }
    }
  });

  it('o aviso do parceiro está na configuração', () => {
    expect(M.CATEGORIAS.length).toBe(5);
    const cfg = readFileSync(path.join(REPO, 'src/data/marketplaceConfig.js'), 'utf8');
    expect(cfg).toContain('Anúncio de parceiro. O Duo Fitness não vende nem entrega estes itens.');
  });
});

describe('WhatsApp', () => {
  it('monta https://wa.me/<número>?text=<mensagem codificada>', () => {
    const url = M.buildWhatsAppUrl('5511999998888', 'Olá! Vi "Kit & acessórios" na loja.');
    expect(url).toBe('https://wa.me/5511999998888?text=' + encodeURIComponent('Olá! Vi "Kit & acessórios" na loja.'));
    expect(url).not.toContain(' '); // espaços, aspas, & e acentos ficam codificados
    expect(decodeURIComponent(url.split('?text=')[1])).toBe('Olá! Vi "Kit & acessórios" na loja.');
  });

  it('limpa o número (só dígitos) e recusa número curto ou vazio', () => {
    expect(M.buildWhatsAppUrl('+55 (11) 99999-8888', 'oi')).toBe('https://wa.me/5511999998888?text=oi');
    expect(M.buildWhatsAppUrl('', 'oi')).toBeNull();
    expect(M.buildWhatsAppUrl(undefined, 'oi')).toBeNull();
    expect(M.buildWhatsAppUrl('12345', 'oi')).toBeNull();
  });

  it('a mensagem pré-preenchida cita o título do item', () => {
    const item = items[0]!;
    const msg = M.buildWhatsAppMessage(item);
    expect(msg).toContain(item.titulo);
    expect(msg).not.toContain('{titulo}');
  });

  it('resolveContact: whatsapp usa o número da configuração; sem número devolve null', () => {
    const item = items.find((i) => i.contato.tipo === 'whatsapp')!;
    const cfg = { whatsappNumber: '5511999998888', whatsappMessage: 'Quero {titulo}' };
    const r = M.resolveContact(item, cfg);
    expect(r.tipo).toBe('whatsapp');
    expect(r.url.startsWith('https://wa.me/5511999998888?text=')).toBe(true);
    expect(decodeURIComponent(r.url.split('?text=')[1])).toBe(`Quero ${item.titulo}`);
    expect(M.resolveContact(item, { ...cfg, whatsappNumber: '' })).toBeNull();
  });

  it('resolveContact: link devolve a URL https; http ou sem URL vira null', () => {
    const link = items.find((i) => i.contato.tipo === 'link')!;
    expect(M.resolveContact(link, { whatsappNumber: '' })).toEqual({ tipo: 'link', url: link.contato.url });
    expect(M.resolveContact({ ...link, contato: { tipo: 'link', url: 'http://inseguro.example' } }, {})).toBeNull();
    expect(M.resolveContact({ ...link, contato: { tipo: 'link' } }, {})).toBeNull();
    expect(M.resolveContact({ contato: { tipo: 'outro' } }, {})).toBeNull();
    expect(M.resolveContact(null, {})).toBeNull();
  });

  it('o número vem de uma constante de configuração, nunca fixo nos itens', () => {
    const data = readFileSync(path.join(REPO, 'src/data/marketplace.js'), 'utf8');
    expect(data).not.toMatch(/wa\.me\/\d/);
    expect(data).not.toMatch(/\b55\d{10,11}\b/);
  });
});

describe('imagens', () => {
  const imagesSrc = readFileSync(path.join(REPO, 'src/data/marketplaceImages.js'), 'utf8');
  const entries = [...imagesSrc.matchAll(/'([a-z0-9-]+)':\s*require\('(\.\.\/\.\.\/assets\/marketplace\/[^']+)'\)/g)].map((m) => ({ key: m[1]!, file: path.join(REPO, 'src/data', m[2]!) }));

  it('toda chave de imagem usada pelos itens existe no mapa', () => {
    const keys = new Set(entries.map((e) => e.key));
    for (const i of items.filter((x) => x.imagem)) expect(keys.has(i.imagem!), `${i.id} -> ${i.imagem}`).toBe(true);
  });

  it('cada arquivo mapeado existe, é PNG e tem no máximo ~200 KB', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(existsSync(e.file), e.file).toBe(true);
      expect(statSync(e.file).size, e.file).toBeLessThanOrEqual(200 * 1024);
      expect(readFileSync(e.file).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    }
  });

  it('itens sem imagem (null) usam o placeholder: há pelo menos um item assim', () => {
    expect(items.some((i) => i.imagem === null)).toBe(true);
  });
});
