// Vitrine (marketplace) do Duo Fitness: dados e funções puras (sem React, sem imagens), para os testes
// rodarem em Node. As imagens ficam em marketplaceImages.js (cada require precisa ser explícito).
//
// ⚠️ TODOS OS ITENS ABAIXO SÃO EXEMPLOS (exemplo: true). Troque pelos parceiros reais antes de publicar.
// Regras dos textos (um teste confere uma lista de termos): sem promessa de saúde, de dosagem ou de
// resultado; sem comparação de eficácia; descrição curta de até 2 linhas (máx. 120 caracteres).
//
// Campos de cada item:
//   id, categoria (nutricao | suplementos | whey | acessorios | servicos), titulo,
//   descricaoCurta, descricaoCompleta,
//   imagem  chave em marketplaceImages.js (arquivo em assets/marketplace/) ou null = placeholder,
//   preco   texto opcional (ex.: 'R$ 39,90') ou null,
//   destaque  aparece em "Para você" na Home,
//   contato  { tipo: 'whatsapp' } (número vem de MARKETPLACE_CONFIG) ou { tipo: 'link', url: 'https://…' },
//   exemplo  true enquanto o item for de demonstração.
import { MARKETPLACE_CONFIG } from './marketplaceConfig';

export const TODAS = 'todos';

export const CATEGORIAS = [
  { id: 'nutricao', label: 'Nutrição', icone: 'nutrition-outline' },
  { id: 'suplementos', label: 'Suplementos', icone: 'cube-outline' },
  { id: 'whey', label: 'Whey', icone: 'water-outline' },
  { id: 'acessorios', label: 'Acessórios', icone: 'fitness-outline' },
  { id: 'servicos', label: 'Serviços', icone: 'people-outline' },
];

export const MARKETPLACE_ITEMS = [
  {
    id: 'acess-kit-treino',
    categoria: 'acessorios',
    titulo: 'Kit de acessórios para treino (exemplo)',
    descricaoCurta: 'Itens para treinar em casa ou na academia do condomínio. Modelos e disponibilidade com o parceiro.',
    descricaoCompleta:
      'Item de exemplo da vitrine. Aqui o parceiro descreve o que vem no kit, os tamanhos e as cores disponíveis, o prazo e a forma de entrega. Valores e condições são combinados diretamente com o parceiro.',
    imagem: 'exemplo-acessorios',
    preco: 'R$ 89,90',
    destaque: true,
    contato: { tipo: 'whatsapp' },
    exemplo: true,
  },
  {
    id: 'acess-garrafa',
    categoria: 'acessorios',
    titulo: 'Garrafa squeeze (exemplo)',
    descricaoCurta: 'Garrafa reutilizável para levar ao treino. Cores e tamanhos conforme o parceiro.',
    descricaoCompleta:
      'Item de exemplo da vitrine. O parceiro informa capacidade, material, cores e prazo de entrega. Valores e condições são combinados diretamente com o parceiro.',
    imagem: null,
    preco: 'R$ 29,90',
    destaque: false,
    contato: { tipo: 'whatsapp' },
    exemplo: true,
  },
  {
    id: 'acess-corda',
    categoria: 'acessorios',
    titulo: 'Corda de pular (exemplo)',
    descricaoCurta: 'Corda ajustável para aquecimento e cardio. Consulte modelos com o parceiro.',
    descricaoCompleta:
      'Item de exemplo da vitrine. O parceiro descreve o modelo, o comprimento ajustável e o prazo de entrega. Valores e condições são combinados diretamente com o parceiro.',
    imagem: null,
    preco: null,
    destaque: false,
    contato: { tipo: 'whatsapp' },
    exemplo: true,
  },
  {
    id: 'whey-po',
    categoria: 'whey',
    titulo: 'Whey protein em pó (exemplo)',
    descricaoCurta: 'Proteína do soro do leite em pó. Marcas, sabores e tamanhos variam conforme o parceiro.',
    descricaoCompleta:
      'Item de exemplo da vitrine. O parceiro informa marca, sabor, tamanho da embalagem e prazo de entrega. Consulte o rótulo do produto para a lista de ingredientes e alergênicos.',
    imagem: null,
    preco: null,
    destaque: true,
    contato: { tipo: 'whatsapp' },
    exemplo: true,
  },
  {
    id: 'whey-vegetal',
    categoria: 'whey',
    titulo: 'Proteína vegetal em pó (exemplo)',
    descricaoCurta: 'Opção de proteína de origem vegetal em pó. Sabores e embalagens conforme o parceiro.',
    descricaoCompleta:
      'Item de exemplo da vitrine. O parceiro informa a origem dos ingredientes, os sabores e o prazo de entrega. Consulte o rótulo do produto para a lista de ingredientes e alergênicos.',
    imagem: null,
    preco: null,
    destaque: false,
    contato: { tipo: 'whatsapp' },
    exemplo: true,
  },
  {
    id: 'supl-generico',
    categoria: 'suplementos',
    titulo: 'Suplemento alimentar (exemplo)',
    descricaoCurta: 'Produto de exemplo para demonstrar a vitrine. Detalhes e disponibilidade com o parceiro.',
    descricaoCompleta:
      'Item de exemplo da vitrine. O parceiro informa marca, apresentação e prazo de entrega. Leia o rótulo e converse com um profissional de saúde antes de usar qualquer suplemento.',
    imagem: null,
    preco: null,
    destaque: false,
    contato: { tipo: 'whatsapp' },
    exemplo: true,
  },
  {
    id: 'nutri-consulta',
    categoria: 'nutricao',
    titulo: 'Atendimento com nutricionista parceiro (exemplo)',
    descricaoCurta: 'Atendimento com profissional parceiro. Combine horário e valores pelo WhatsApp.',
    descricaoCompleta:
      'Item de exemplo da vitrine. O parceiro descreve a forma de atendimento (presencial ou online), os horários e como agendar. Valores e condições são combinados diretamente com o parceiro.',
    imagem: null,
    preco: 'A combinar',
    destaque: true,
    contato: { tipo: 'whatsapp' },
    exemplo: true,
  },
  {
    id: 'nutri-receitas',
    categoria: 'nutricao',
    titulo: 'Coleção de receitas do parceiro (exemplo)',
    descricaoCurta: 'Receitas para o dia a dia, publicadas pelo parceiro. Abre o site dele.',
    descricaoCompleta:
      'Item de exemplo da vitrine. O link abre o site do parceiro no navegador. O conteúdo e as condições de acesso são de responsabilidade do parceiro.',
    imagem: null,
    preco: null,
    destaque: false,
    contato: { tipo: 'link', url: 'https://example.com/receitas' },
    exemplo: true,
  },
  {
    id: 'serv-avaliacao',
    categoria: 'servicos',
    titulo: 'Avaliação física com parceiro (exemplo)',
    descricaoCurta: 'Atendimento presencial com profissional parceiro. Agende pelo WhatsApp.',
    descricaoCompleta:
      'Item de exemplo da vitrine. O parceiro descreve o que inclui o atendimento, o local e os horários. Valores e condições são combinados diretamente com o parceiro.',
    imagem: null,
    preco: 'A combinar',
    destaque: false,
    contato: { tipo: 'whatsapp' },
    exemplo: true,
  },
  {
    id: 'serv-personal',
    categoria: 'servicos',
    titulo: 'Personal trainer presencial (exemplo)',
    descricaoCurta: 'Aulas com profissional parceiro na academia do condomínio. Combine pelo WhatsApp.',
    descricaoCompleta:
      'Item de exemplo da vitrine. O parceiro descreve a modalidade, os horários e a forma de contratação. Valores e condições são combinados diretamente com o parceiro.',
    imagem: null,
    preco: 'A combinar',
    destaque: false,
    contato: { tipo: 'whatsapp' },
    exemplo: true,
  },
];

// ---- funções puras --------------------------------------------------------------------------------

/** Itens de uma categoria. "todos" (ou vazio) devolve tudo; categoria desconhecida devolve lista vazia. */
export function filterByCategory(items, categoriaId) {
  if (!categoriaId || categoriaId === TODAS) return [...items];
  return items.filter((item) => item.categoria === categoriaId);
}

export function getCategoria(id) {
  return CATEGORIAS.find((c) => c.id === id) || null;
}

export function getItem(id, items = MARKETPLACE_ITEMS) {
  return items.find((item) => item.id === id) || null;
}

/** Itens em destaque (seção "Para você" da Home). */
export function getDestaques(items = MARKETPLACE_ITEMS, max = 3) {
  return items.filter((item) => item.destaque).slice(0, max);
}

/** Quantos itens há em cada categoria (para os chips). */
export function countByCategory(items = MARKETPLACE_ITEMS) {
  const counts = { [TODAS]: items.length };
  for (const c of CATEGORIAS) counts[c.id] = 0;
  for (const item of items) counts[item.categoria] = (counts[item.categoria] || 0) + 1;
  return counts;
}

export function buildWhatsAppMessage(item, template = MARKETPLACE_CONFIG.whatsappMessage) {
  return template.replace('{titulo}', item.titulo);
}

/** https://wa.me/<número>?text=<mensagem>. Devolve null se o número não for válido (menos de 10 dígitos). */
export function buildWhatsAppUrl(number, message) {
  const digits = String(number || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message || '')}`;
}

/**
 * Destino do clique de um item: { tipo, url } ou null quando ainda não há contato configurado.
 * Só links https são aceitos.
 */
export function resolveContact(item, config = MARKETPLACE_CONFIG) {
  const contato = item && item.contato;
  if (!contato) return null;
  if (contato.tipo === 'whatsapp') {
    const url = buildWhatsAppUrl(config.whatsappNumber, buildWhatsAppMessage(item, config.whatsappMessage));
    return url ? { tipo: 'whatsapp', url } : null;
  }
  if (contato.tipo === 'link') {
    return typeof contato.url === 'string' && contato.url.startsWith('https://') ? { tipo: 'link', url: contato.url } : null;
  }
  return null;
}
