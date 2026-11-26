// Lista oficial de condomínios da rede Duo Fitness.
// Somente administradores podem adicionar ou alterar condomínios neste cadastro.
// Cada condomínio possui seu combo de equipamentos associado (ex: uno, duo, triple, prime, elite).

export const CONDOMINIOS = [
  {
    id: 'praia-park-mar',
    nome: 'Praia Park Mar',
    combo: 'triple',
    comboLabel: 'TRIPLE',
    descricao: 'Academia completa com Combo Triple',
  },
];

export const CONDOMINIO_PADRAO = CONDOMINIOS[0];

export function getCondominioById(id) {
  if (!id) return null;
  return CONDOMINIOS.find((c) => c.id === id) || null;
}

export function getCondominioByNome(nome) {
  if (!nome) return null;
  const lower = String(nome).trim().toLowerCase();
  return CONDOMINIOS.find((c) => c.nome.toLowerCase() === lower) || null;
}

export function getComboDoCondominio(condominioNomeOuId) {
  const c = getCondominioById(condominioNomeOuId) || getCondominioByNome(condominioNomeOuId);
  return c ? c.combo : CONDOMINIO_PADRAO.combo;
}
