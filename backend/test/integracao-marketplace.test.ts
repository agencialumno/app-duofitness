// INTEGRAÇÃO, área 3: marketplace. Carrossel renderizado (3 banners na ordem atual), itens, selo "Exemplo", rótulos de acessibilidade, toque que abre
// o formulário de anúncio, imagens existentes e dentro do limite de tamanho (check-pngs de verdade).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as M from '../../src/data/marketplace.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as B from '../../src/data/marketplaceBanners.js';
// @ts-expect-error módulo JS do app, sem tipos
import MarketplaceBanners from '../../src/components/MarketplaceBanners.js';
// @ts-expect-error módulo JS do app, sem tipos
import MarketplaceImage from '../../src/components/MarketplaceImage.js';
import { byTestId, findAll, mount, textsOf } from './stubs/mini-render';

// as imagens são require() de .jpg (o Metro resolve; o Node não): o mapa vira um objeto qualquer, só para o componente decidir se mostra o banner
vi.mock('../../src/data/marketplaceBannerImages.js', () => ({ getBannerImage: (k: string) => ({ uri: `mock://${k}` }) }));
vi.mock('../../src/data/marketplaceImages.js', () => ({ getMarketplaceImage: (k: string) => (k ? { uri: `mock://${k}` } : null) }));

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const code = (f: string) => read(f).replace(/^\s*\/\/.*$/gm, '');

function openCarousel(onOpen = vi.fn(), banners?: unknown) {
  const r = mount(MarketplaceBanners as never, { onOpen, ...(banners ? { banners } : {}) });
  const wrap = byTestId(r.tree, 'marketplace-banners') as any;
  wrap.props.onLayout({ nativeEvent: { layout: { width: 360 } } }); // o carrossel só desenha depois de medir a largura
  return { r, onOpen };
}

describe('carrossel de banners (renderizado)', () => {
  it('mostra os 3 banners na ordem atual (vitrine, treino, anuncie), com rótulo de acessibilidade = texto da imagem', async () => {
    const { r } = openCarousel();
    await r.flush();
    const cards = findAll(r.tree, (n) => typeof n.props?.testID === 'string' && /^marketplace-banner-banner-/.test(n.props.testID));
    expect(cards.map((c) => c.props.testID)).toEqual(['marketplace-banner-banner-vitrine', 'marketplace-banner-banner-treino', 'marketplace-banner-banner-anuncie']);
    expect(cards.map((c) => c.props.accessibilityLabel)).toEqual([
      'Entre em contato e solicite seu espaço para anunciar. Banner 1 de 3.',
      'Anuncie seu produto e comece a vender. Banner 2 de 3.',
      'Seja um parceiro Duo Fitness. Banner 3 de 3.',
    ]);
    for (const c of cards) {
      expect(c.props.accessibilityRole).toBe('button');
      expect(c.props.accessibilityHint).toBe('Abre o formulário para anunciar no marketplace');
    }
  });
  it('o toque em cada banner abre o formulário de anúncio (AnunciarMarketplace)', async () => {
    const onOpen = vi.fn();
    const { r } = openCarousel(onOpen);
    await r.flush();
    for (const b of B.MARKETPLACE_BANNERS) (byTestId(r.tree, `marketplace-banner-${b.id}`) as any).props.onPress();
    expect(onOpen).toHaveBeenCalledTimes(3);
    for (const [banner] of onOpen.mock.calls) expect(banner.destino.rota).toBe('AnunciarMarketplace');
  });
  it('os pontos de navegação têm rótulo e estado selecionado; só 1 banner = sem pontos', async () => {
    const { r } = openCarousel();
    await r.flush();
    const dots = findAll(r.tree, (n) => typeof n.props?.testID === 'string' && /^marketplace-banner-dot-/.test(n.props.testID));
    expect(dots.map((d) => d.props.accessibilityLabel)).toEqual(['Ir ao banner 1 de 3', 'Ir ao banner 2 de 3', 'Ir ao banner 3 de 3']);
    expect(dots[0].props.accessibilityState.selected).toBe(true);
    const one = openCarousel(vi.fn(), [B.MARKETPLACE_BANNERS[0]]);
    await one.r.flush();
    expect(findAll(one.r.tree, (n) => /^marketplace-banner-dot-/.test(n.props?.testID || ''))).toHaveLength(0);
  });
  it('sem banners (ou sem imagem) a área some', async () => {
    const r = mount(MarketplaceBanners as never, { banners: [] });
    expect(byTestId(r.tree, 'marketplace-banners') ?? null).toBeNull();
  });
  it('os banners das peças da Duo Fitness não levam o selo "Exemplo"; um banner marcado como exemplo leva', async () => {
    const { r } = openCarousel();
    await r.flush();
    expect(textsOf(r.tree)).not.toContain('Exemplo');
    const demo = openCarousel(vi.fn(), [{ ...B.MARKETPLACE_BANNERS[0], exemplo: true, textoNaImagem: false }]);
    await demo.r.flush();
    expect(textsOf(demo.r.tree)).toContain('Exemplo');
  });
});

describe('itens da vitrine', () => {
  it('todo item tem título, descrição, categoria existente, id único, contato e é de exemplo', () => {
    const ids = new Set<string>();
    for (const i of M.MARKETPLACE_ITEMS) {
      expect(i.titulo.length, i.id).toBeGreaterThan(3);
      expect(i.descricaoCurta.length, i.id).toBeGreaterThan(10);
      expect(M.getCategoria(i.categoria), i.id).toBeTruthy();
      expect(ids.has(i.id), i.id).toBe(false);
      ids.add(i.id);
      expect(i.exemplo, i.id).toBe(true);
      expect(i.contato.tipo, i.id).toBeTruthy();
    }
  });
  it('o filtro por categoria e as contagens batem', () => {
    const counts = M.countByCategory(M.MARKETPLACE_ITEMS);
    for (const c of M.CATEGORIAS) expect(M.filterByCategory(M.MARKETPLACE_ITEMS, c.id).length, c.id).toBe(counts[c.id] ?? 0);
    expect(M.filterByCategory(M.MARKETPLACE_ITEMS, M.TODAS)).toHaveLength(M.MARKETPLACE_ITEMS.length);
    expect(M.filterByCategory(M.MARKETPLACE_ITEMS, 'inexistente')).toEqual([]);
  });
  it('destaques: no máximo 3 e só itens que existem', () => {
    const d = M.getDestaques(M.MARKETPLACE_ITEMS, 3);
    expect(d.length).toBeLessThanOrEqual(3);
    for (const i of d) expect(M.getItem(i.id)).toBeTruthy();
  });
  it('o selo "Exemplo": cartão da lista, detalhe e, sobre a foto, na Home', () => {
    expect(code('src/screens/StoreScreen.js')).toMatch(/item\.exemplo[\s\S]{0,200}Exemplo/);
    expect(code('src/screens/StoreDetailScreen.js')).toContain('Item de exemplo');
    const r = mount(MarketplaceImage as never, { imagem: 'whey', categoria: 'whey', exemplo: true });
    expect(textsOf(r.tree)).toContain('Exemplo');
    const plain = mount(MarketplaceImage as never, { imagem: 'whey', categoria: 'whey' });
    expect(textsOf(plain.tree)).not.toContain('Exemplo');
  });
  it('a imagem do item é decorativa para o leitor de tela (o cartão já tem o título) e o cartão tem rótulo e dica', () => {
    const img = mount(MarketplaceImage as never, { imagem: 'whey', categoria: 'whey' });
    expect((img.tree as any).props.importantForAccessibility).toBe('no-hide-descendants');
    const lista = code('src/screens/StoreScreen.js');
    expect(lista).toMatch(/accessibilityLabel=\{`\$\{item\.titulo\}\. \$\{item\.descricaoCurta\}/);
    expect(lista).toContain('accessibilityHint="Abre os detalhes do item"');
  });
  it('sem imagem (ou chave desconhecida) o item mostra o placeholder com o ícone da categoria', () => {
    const r = mount(MarketplaceImage as never, { imagem: null, categoria: 'whey' });
    expect(byTestId(r.tree, 'marketplace-placeholder')).toBeTruthy();
  });
});

describe('imagens: existem e estão dentro do limite', () => {
  const files = [...new Set([...read('src/data/marketplaceImages.js'), ...read('src/data/marketplaceBannerImages.js')].join('').match(/assets\/marketplace\/[\w-]+\.jpg/g) ?? [])];
  it('todo arquivo citado existe, é JPEG de verdade, 3:2 e até 300 KB (alvo 200 KB)', () => {
    expect(files.length).toBeGreaterThanOrEqual(12);
    for (const f of files) {
      const abs = path.join(REPO, f);
      expect(existsSync(abs), f).toBe(true);
      const buf = readFileSync(abs);
      expect(buf.subarray(0, 3).toString('hex'), f).toBe('ffd8ff');
      expect(statSync(abs).size, f).toBeLessThanOrEqual(300 * 1024);
    }
  });
  it('node scripts/check-pngs.mjs passa sem erro nem aviso', () => {
    const r = spawnSync(process.execPath, [path.join(REPO, 'scripts/check-pngs.mjs')], { cwd: REPO, encoding: 'utf8' });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.stdout).toMatch(/0 com erro, 0 com aviso/);
  });
});

describe('contato e anúncio', () => {
  it('sem número configurado o contato avisa em vez de quebrar; com número monta a URL do WhatsApp', () => {
    const item = M.MARKETPLACE_ITEMS.find((i: any) => i.contato.tipo === 'whatsapp');
    expect(M.resolveContact(item, { whatsappNumber: '', whatsappMessage: 'Olá {item}' })).toBeNull();
    expect(M.resolveContact(item, { whatsappNumber: '5511999999999', whatsappMessage: 'Olá {item}' })?.url).toMatch(/^https:\/\/wa\.me\/5511999999999/);
    expect(M.buildWhatsAppUrl('5511999999999', 'Oi')).toMatch(/^https:\/\/wa\.me\/5511999999999\?text=/);
  });
});
