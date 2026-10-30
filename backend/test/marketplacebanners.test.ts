// Banners do marketplace (src/data/marketplaceBanners.js): dados, mapa de imagens, caso "sem imagem" e arquivos.
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { MARKETPLACE_BANNERS, getVisibleBanners } from '../../src/data/marketplaceBanners.js';

const REPO = path.resolve(__dirname, '../..');
type Banner = { id: string; imagem: string; titulo: string; alt: string; exemplo: boolean; destino: { rota: string } };
const BANNERS = MARKETPLACE_BANNERS as Banner[];
const read = (rel: string) => readFileSync(path.join(REPO, rel), 'utf8');

const mapSrc = read('src/data/marketplaceBannerImages.js');
const entries = [...mapSrc.matchAll(/'([a-z0-9-]+)':\s*require\('(\.\.\/\.\.\/assets\/marketplace\/[^']+)'\)/g)].map((m) => ({
  key: m[1]!,
  file: path.join(REPO, 'src/data', m[2]!),
}));

// leitura mínima do SOF de um JPEG baseline: devolve [largura, altura]
function jpegSize(buf: Buffer): [number, number] {
  let off = 2;
  while (off + 9 < buf.length) {
    if (buf[off] !== 0xff) { off++; continue; }
    const m = buf[off + 1]!;
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [buf.readUInt16BE(off + 7), buf.readUInt16BE(off + 5)];
    off += 2 + buf.readUInt16BE(off + 2);
  }
  throw new Error('SOF não encontrado');
}

describe('banners do marketplace', () => {
  it('há 3 banners com id único, título (o texto da imagem), texto alternativo e destino no formulário de anúncio; sem o selo Exemplo (peças da Duo Fitness)', () => {
    expect(BANNERS).toHaveLength(3);
    expect(new Set(BANNERS.map((b) => b.id)).size).toBe(3);
    for (const b of BANNERS) {
      expect(b.titulo.length, b.id).toBeGreaterThan(0);
      expect(b.alt.length, b.id).toBeGreaterThan(20);
      expect(b.exemplo, b.id).toBe(false);
      expect((b as any).textoNaImagem, b.id).toBe(true);
      expect(b.destino.rota, b.id).toBe('AnunciarMarketplace');
    }
  });

  it('toda chave de banner existe no mapa de imagens e nenhuma imagem sobra', () => {
    const keys = new Set(entries.map((e) => e.key));
    for (const b of BANNERS) expect(keys.has(b.imagem), b.id).toBe(true);
    const used = new Set(BANNERS.map((b) => b.imagem));
    for (const k of keys) expect(used.has(k), `imagem sobrando: ${k}`).toBe(true);
  });

  it('cada arquivo é JPEG de verdade (.jpg), 1200x800 (3:2) e tem no máximo 200 KB (teto 300 KB)', () => {
    expect(entries).toHaveLength(3);
    for (const e of entries) {
      expect(e.file).toMatch(/\.jpg$/);
      expect(existsSync(e.file), e.file).toBe(true);
      const buf = readFileSync(e.file);
      expect(buf.subarray(0, 3).toString('hex'), `${e.file}: conteúdo precisa ser JPEG (os originais eram PNG com extensão .jpg)`).toBe('ffd8ff');
      expect(buf.length, e.file).toBeLessThanOrEqual(300 * 1024);
      expect(buf.length, `${e.file} acima do alvo de 200 KB (aceito até 300 KB; registre em docs/marketplace.md)`).toBeLessThanOrEqual(200 * 1024);
      expect(jpegSize(buf)).toEqual([1200, 800]);
    }
  });

  it('o texto do banner (titulo) é o que está desenhado na imagem e é lido pelo leitor de tela; a legenda repetida não aparece', () => {
    expect(BANNERS.map((b) => [b.id, b.titulo])).toEqual([
      ['banner-vitrine', 'Entre em contato e solicite seu espaço para anunciar'],
      ['banner-treino', 'Anuncie seu produto e comece a vender'],
      ['banner-anuncie', 'Seja um parceiro Duo Fitness'],
    ]);
    const c = read('src/components/MarketplaceBanners.js');
    expect(c).toMatch(/accessibilityLabel=\{`\$\{b\.titulo\}\./);
    expect(c).toContain('!b.textoNaImagem');
    expect(c).toContain("accessibilityHint=\"Abre o formulário para anunciar no marketplace\"");
  });

  it('a caixa do banner é 3:2 e a imagem usa resizeMode "contain": o texto desenhado na imagem nunca é cortado', () => {
    const c = read('src/components/MarketplaceBanners.js');
    expect(c).toMatch(/imageBox: \{[^}]*aspectRatio: 3 \/ 2/);
    expect(c).toContain('resizeMode="contain"');
    expect(c).not.toMatch(/resizeMode="cover"/);
    expect(c).not.toMatch(/aspectRatio: 2,/);
  });

  it('getVisibleBanners: só entram banners com imagem resolvida', () => {
    const all = (k: string) => ({ k });
    expect(getVisibleBanners(MARKETPLACE_BANNERS, all)).toHaveLength(3);
    const onlyOne = (k: string) => (k === 'banner-treino' ? { k } : null);
    expect((getVisibleBanners(MARKETPLACE_BANNERS, onlyOne) as Banner[]).map((b) => b.id)).toEqual(['banner-treino']);
  });

  it('sem nenhuma imagem (ou entrada inválida) a lista é vazia e a área some', () => {
    expect(getVisibleBanners(MARKETPLACE_BANNERS, () => null)).toEqual([]);
    expect(getVisibleBanners([], () => ({}))).toEqual([]);
    expect(getVisibleBanners(null as any, () => ({}))).toEqual([]);
    expect(getVisibleBanners(MARKETPLACE_BANNERS, undefined as any)).toEqual([]);
    expect(getVisibleBanners([{ id: 'x', titulo: 'sem imagem', imagem: null }, null as any], () => ({}))).toEqual([]);
    expect(read('src/components/MarketplaceBanners.js')).toContain('if (visible.length === 0) return null;');
  });

  it('o carrossel: paginado, sem giro automático, selo Exemplo, pontos, acessibilidade e sem módulo nativo', () => {
    const c = read('src/components/MarketplaceBanners.js');
    expect(c).toContain('pagingEnabled');
    expect(c).toContain('showsHorizontalScrollIndicator={false}');
    expect(c).toContain('showsVerticalScrollIndicator={false}');
    expect(c).toContain('Exemplo');
    expect(c).toContain('accessibilityLabel');
    expect(c).toContain('accessibilityState={{ selected');
    expect(c).not.toMatch(/setInterval|setTimeout|Animated\.|autoplay/i);
    for (const m of c.matchAll(/from '([^']+)'/g)) expect(m[1]!.startsWith('.') || ['react', 'react-native'].includes(m[1]!), m[1]).toBe(true);
  });

  it('a tela do marketplace mostra o carrossel e o toque abre a rota do destino', () => {
    const s = read('src/screens/StoreScreen.js');
    expect(s).toContain('<MarketplaceBanners');
    expect(s).toContain('navigation.navigate(b.destino.rota');
  });

  it('os banners não desenham texto na imagem e não citam marcas: os textos ficam nos dados', () => {
    const src = read('src/data/marketplaceBanners.js');
    expect(src).not.toMatch(/https?:\/\//);
    for (const b of BANNERS) expect(statSync(entries.find((e) => e.key === b.imagem)!.file).size).toBeGreaterThan(0);
  });
});
