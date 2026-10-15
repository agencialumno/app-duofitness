// "Anunciar em nosso marketplace": validação do formulário e montagem do e-mail (mailto:).
// Módulo puro (sem React Native), testável em Node. Nada daqui é gravado no aparelho.
import { MARKETPLACE_CONTACT_EMAIL } from '../data/advertiseConfig';

export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 600;
export const NAME_MAX = 80;
export const COMPANY_MAX = 80;
export const CITY_MAX = 80;
export const OTHER_NICHE_MAX = 60;
export const EMAIL_MAX = 120;
export const LINK_MAX = 120;
// Limite seguro para a URL mailto: inteira (alguns aplicativos de e-mail e o Android recusam URLs muito longas).
export const MAILTO_MAX_LENGTH = 1900;

// Nichos do formulário (os ids batem com as categorias do marketplace; "outro" abre um campo livre).
export const ADVERTISE_NICHES = [
  { id: 'nutricao', label: 'Nutrição' },
  { id: 'suplementos', label: 'Suplementos' },
  { id: 'whey', label: 'Whey e alimentação' },
  { id: 'acessorios', label: 'Acessórios' },
  { id: 'servicos', label: 'Serviços e personal' },
  { id: 'outro', label: 'Outro' },
];

export function emptyForm() {
  return { niche: '', nicheOther: '', name: '', company: '', whatsapp: '', email: '', city: '', description: '', link: '' };
}

// ---------- Limpeza de texto ----------

// Remove caracteres de controle e de direção de texto (evita bagunçar o e-mail ou disfarçar o conteúdo).
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g;

export function cleanLine(text) {
  return String(text ?? '').replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();
}

export function cleanMultiline(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(INVISIBLE, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------- WhatsApp ----------

// Aceita DDD e número com ou sem máscara, com +55, 55 ou 0 na frente.
export function normalizePhone(text) {
  let d = String(text ?? '').replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if ((d.length === 11 || d.length === 12) && d.startsWith('0')) d = d.slice(1); // prefixo 0 de operadora
  if (d.length !== 10 && d.length !== 11) return null;
  if (!/^[1-9][1-9]/.test(d)) return null; // DDD
  if (d.length === 11 && d[2] !== '9') return null; // celular com 9 na frente
  if (d.length === 10 && d[2] === '0') return null;
  return { digits: d, formatted: formatPhone(d) };
}

export function formatPhone(digits) {
  const d = String(digits).replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

// Máscara enquanto digita: (11) 99999-8888
export function maskPhone(text) {
  let d = String(text ?? '').replace(/\D/g, '');
  if (d.startsWith('55') && d.length > 11) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// ---------- E-mail e link ----------

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export function isValidEmail(text) {
  const t = cleanLine(text);
  return t.length > 0 && t.length <= EMAIL_MAX && !/\s/.test(t) && EMAIL_RE.test(t);
}

const HANDLE_RE = /^@[A-Za-z0-9._]{1,30}$/;
const SITE_RE = /^(https?:\/\/)?([A-Za-z0-9-]+\.)+[A-Za-z]{2,}(\/\S*)?$/;

export function isValidLinkOrHandle(text) {
  const t = cleanLine(text);
  if (!t) return true; // opcional
  if (t.length > LINK_MAX) return false;
  return HANDLE_RE.test(t) || SITE_RE.test(t);
}

// ---------- Validação ----------

export function nicheLabel(values) {
  if (values.niche === 'outro') return cleanLine(values.nicheOther) || 'Outro';
  return ADVERTISE_NICHES.find((n) => n.id === values.niche)?.label || '';
}

// Devolve { valid, errors, values } com os campos já limpos e o WhatsApp formatado.
// Obrigatórios: nicho (e a especificação, se "Outro"), nome, descrição e pelo menos um entre WhatsApp e e-mail.
export function validateForm(input) {
  const v = { ...emptyForm(), ...(input || {}) };
  const errors = {};

  const niche = String(v.niche || '');
  if (!ADVERTISE_NICHES.some((n) => n.id === niche)) errors.niche = 'Escolha o nicho do seu anúncio.';
  const nicheOther = cleanLine(v.nicheOther);
  if (niche === 'outro') {
    if (nicheOther.length < 2) errors.nicheOther = 'Especifique o nicho (mínimo de 2 letras).';
    else if (nicheOther.length > OTHER_NICHE_MAX) errors.nicheOther = `Use no máximo ${OTHER_NICHE_MAX} caracteres.`;
  }

  const name = cleanLine(v.name);
  if (name.length < 2) errors.name = 'Informe o nome do responsável.';
  else if (name.length > NAME_MAX) errors.name = `Use no máximo ${NAME_MAX} caracteres.`;

  const company = cleanLine(v.company);
  if (company.length > COMPANY_MAX) errors.company = `Use no máximo ${COMPANY_MAX} caracteres.`;

  const city = cleanLine(v.city);
  if (city.length > CITY_MAX) errors.city = `Use no máximo ${CITY_MAX} caracteres.`;

  const rawPhone = cleanLine(v.whatsapp);
  let phone = null;
  if (rawPhone) {
    phone = normalizePhone(rawPhone);
    if (!phone) errors.whatsapp = 'WhatsApp inválido. Use DDD e número, por exemplo (11) 99999-8888.';
  }

  const email = cleanLine(v.email);
  if (email && !isValidEmail(email)) errors.email = 'E-mail inválido. Confira, por exemplo nome@empresa.com.br.';

  if (!rawPhone && !email) errors.contact = 'Informe o WhatsApp ou o e-mail (pelo menos um) para a equipe entrar em contato.';

  const description = cleanMultiline(v.description);
  if (description.length < DESCRIPTION_MIN) errors.description = `Descreva o produto ou serviço em pelo menos ${DESCRIPTION_MIN} caracteres.`;
  else if (description.length > DESCRIPTION_MAX) errors.description = `Use no máximo ${DESCRIPTION_MAX} caracteres (agora ${description.length}).`;

  const link = cleanLine(v.link);
  if (link && !isValidLinkOrHandle(link)) errors.link = 'Use @usuario do Instagram ou o endereço do site (exemplo.com.br).';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values: {
      niche,
      nicheOther: niche === 'outro' ? nicheOther : '',
      name,
      company,
      whatsapp: phone ? phone.formatted : rawPhone,
      email,
      city,
      description,
      link,
    },
  };
}

// ---------- E-mail ----------

const NA = 'não informado';

export function buildSubject(values) {
  const niche = nicheLabel(values);
  const name = cleanLine(values.name);
  return cleanLine(`[Marketplace] Pedido de anúncio - ${niche} - ${name}`).slice(0, 160);
}

export function buildBody(values) {
  const lines = [
    'Olá, equipe Duo Fitness!',
    '',
    'Quero anunciar no marketplace do app.',
    '',
    `Nicho: ${nicheLabel(values)}`,
    `Responsável: ${cleanLine(values.name)}`,
    `Empresa ou marca: ${cleanLine(values.company) || NA}`,
    `WhatsApp: ${cleanLine(values.whatsapp) || NA}`,
    `E-mail: ${cleanLine(values.email) || NA}`,
    `Cidade ou condomínio de interesse: ${cleanLine(values.city) || NA}`,
    `Link ou Instagram: ${cleanLine(values.link) || NA}`,
    '',
    'Descrição do produto ou serviço:',
    cleanMultiline(values.description),
    '',
    'Enviado pelo app Duo Fitness.',
  ];
  return lines.join('\n');
}

export function buildMailto(to, subject, body) {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Monta o e-mail inteiro e garante que a URL mailto: caiba no limite, encurtando só o que for preciso
// (primeiro a descrição, depois campos opcionais). `truncated` avisa quando algo foi resumido.
// `full` traz o texto completo (usado na folha de compartilhamento, que não tem esse limite).
export function buildEmail(values, { to = MARKETPLACE_CONTACT_EMAIL, maxLength = MAILTO_MAX_LENGTH } = {}) {
  const fullSubject = buildSubject(values);
  const fullBody = buildBody(values);
  const fullUrl = buildMailto(to, fullSubject, fullBody);
  const full = { to, subject: fullSubject, body: fullBody };
  if (fullUrl.length <= maxLength) return { to, subject: fullSubject, body: fullBody, url: fullUrl, truncated: false, full };

  const NOTE = '… [descrição resumida: complete aqui antes de enviar]';
  const v = { ...values };
  const build = () => buildMailto(to, buildSubject(v), buildBody(v));
  const fits = () => build().length <= maxLength;

  // 1) encurta a descrição aos poucos
  let desc = cleanMultiline(values.description);
  while (!fits() && desc.length > 40) {
    desc = desc.slice(0, Math.max(40, Math.floor(desc.length * 0.85))).trimEnd();
    v.description = desc + NOTE;
  }
  // 2) depois os campos opcionais e o nome (WhatsApp e e-mail nunca são cortados)
  for (const size of [30, 10, 0]) {
    for (const f of ['link', 'city', 'company']) {
      if (fits()) break;
      v[f] = cleanLine(v[f]).slice(0, size);
    }
  }
  if (!fits()) v.name = cleanLine(v.name).slice(0, 30);
  if (!fits()) v.name = cleanLine(v.name).slice(0, 12);

  const subject = buildSubject(v);
  const body = buildBody(v);
  return { to, subject, body, url: buildMailto(to, subject, body), truncated: true, full };
}

// Texto para a folha de compartilhamento (Share.share), o mesmo do e-mail, completo.
export function buildShareMessage(email) {
  return `Para: ${email.full.to}\nAssunto: ${email.full.subject}\n\n${email.full.body}`;
}
