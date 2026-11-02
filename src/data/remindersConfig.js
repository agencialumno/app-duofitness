// Lembretes (notificações LOCAIS no aparelho). Ligados só em build com NOTIFICATIONS_ENABLED=true no CI (que instala o módulo nativo e define esta variável).
// Sem a variável o app fica idêntico: nada é agendado, o cartão do Perfil some e o módulo nem é carregado. Cada leitura precisa ser o
// `process.env.EXPO_PUBLIC_...` literal (o Metro troca na hora do bundle). Nenhum dado sai do aparelho.
export const NOTIFICATIONS_ENABLED = String(process.env.EXPO_PUBLIC_NOTIFICATIONS_ENABLED || '').trim().toLowerCase() === 'true';
