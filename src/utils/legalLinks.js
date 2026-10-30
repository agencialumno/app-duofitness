// Links legais (Termos de Uso e Política de Privacidade). Puro: as URLs entram por parâmetro (vêm de EXPO_PUBLIC_TERMS_URL e
// EXPO_PUBLIC_PRIVACY_URL em src/data/authConfig.js). URL ausente ou inválida = o link some (o app nunca quebra por isso).

export const isHttpUrl = (u) => /^https?:\/\/[^\s]+$/i.test(String(u ?? '').trim());

const DOCS = [
  { id: 'terms', label: 'Termos de Uso', accessibilityLabel: 'Abrir os Termos de Uso', key: 'termsUrl' },
  { id: 'privacy', label: 'Política de Privacidade', accessibilityLabel: 'Abrir a Política de Privacidade', key: 'privacyUrl' },
];

// Só os documentos que têm URL válida, na ordem Termos, Política.
export function legalLinks({ termsUrl, privacyUrl } = {}) {
  const urls = { termsUrl, privacyUrl };
  return DOCS.filter((d) => isHttpUrl(urls[d.key])).map((d) => ({ id: d.id, label: d.label, accessibilityLabel: d.accessibilityLabel, url: String(urls[d.key]).trim() }));
}

// Frase de aceite do cadastro. Cita só o que tem link; sem nenhum link, cita os dois (documentos em revisão).
export function acceptanceText(links) {
  const ids = (links || []).map((l) => l.id);
  if (ids.includes('terms') && ids.includes('privacy')) return 'Ao criar a conta, você concorda com os Termos de Uso e a Política de Privacidade';
  if (ids.includes('terms')) return 'Ao criar a conta, você concorda com os Termos de Uso';
  if (ids.includes('privacy')) return 'Ao criar a conta, você concorda com a Política de Privacidade';
  return 'Ao criar a conta, você concorda com os Termos de Uso e a Política de Privacidade';
}

export const LEGAL_PENDING_NOTE = 'Os Termos de Uso e a Política de Privacidade estão em revisão e serão publicados em breve.';
