// Contas (e-mail e senha, Google e Apple). Tudo DESLIGADO por padrão: vazio = o app é idêntico ao de antes.
// EXPO_PUBLIC_* vai dentro do app (não é segredo). Depois de mudar, rode o Metro com --clear.
export const AUTH_ENABLED = String(process.env.EXPO_PUBLIC_AUTH_ENABLED || '').trim().toLowerCase() === 'true';

// Termos e política de privacidade (rascunhos em revisão jurídica). Vazio = a tela avisa que ainda não há página.
export const TERMS_URL = String(process.env.EXPO_PUBLIC_TERMS_URL || '').trim();
export const PRIVACY_URL = String(process.env.EXPO_PUBLIC_PRIVACY_URL || '').trim();
