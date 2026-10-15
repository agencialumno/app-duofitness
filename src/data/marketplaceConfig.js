// Configuração da vitrine (marketplace). O marketplace do Duo Fitness é só uma VITRINE: não há pagamento nem
// entrega no app; o contato com o parceiro acontece fora (WhatsApp ou link).

export const MARKETPLACE_CONFIG = {
  // Número do WhatsApp do parceiro, com código do país e DDD, só dígitos (ex.: 5511999999999).
  // Defina em EXPO_PUBLIC_MARKETPLACE_WHATSAPP (no .env) ou troque aqui. Vazio = o botão avisa que o
  // contato ainda não foi configurado, sem abrir nada. Nunca deixe um número de teste de outra pessoa.
  whatsappNumber: String(process.env.EXPO_PUBLIC_MARKETPLACE_WHATSAPP || '').replace(/\D/g, ''),

  // Mensagem pré-preenchida. {titulo} vira o título do item.
  whatsappMessage: 'Olá! Vi "{titulo}" no marketplace do app Duo Fitness e gostaria de saber mais.',

  // Aviso exibido no detalhe de cada item.
  partnerNotice: 'Anúncio de parceiro. O Duo Fitness não vende nem entrega estes itens.',
};
