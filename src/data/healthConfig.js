// Integração com Apple Saúde / Health Connect: DESLIGADA. Os provedores reais ainda são stubs
// (src/utils/healthProviders.js). Nada é lido nem enviado; os dados da tela Saúde ficam no aparelho.
export const HEALTH_CONFIG = {
  integrationFlag: String(process.env.EXPO_PUBLIC_HEALTH_INTEGRATION || 'false').trim(),
};
