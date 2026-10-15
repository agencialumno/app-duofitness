// Configuração da lotação ("Academia agora"). Sem URL, com a flag desligada ou no Modo Demo, o app usa
// o provedor de EXEMPLO (mock), sempre rotulado como "Dados de exemplo". Nada aqui é segredo: a chave
// da catraca/sensor fica só no servidor (ver docs/catraca.md).
export const OCCUPANCY_CONFIG = {
  apiUrl: String(process.env.EXPO_PUBLIC_API_URL || '').trim(),
  // "true" ou "1" liga o provedor remoto. Vazio = desligado.
  remoteFlag: String(process.env.EXPO_PUBLIC_OCCUPANCY_REMOTE || '').trim(),
  // Ainda não existe catálogo de condomínios.
  gymId: 'demo',
  // Intervalo de atualização da tela, enquanto ela está aberta.
  refreshMs: 60000,
};
