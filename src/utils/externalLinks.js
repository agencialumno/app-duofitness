// Abre links externos (loja de apps, política de privacidade). Fica fora dos arquivos de saúde de propósito: nenhum arquivo de saúde pode abrir
// URLs (um teste varre), e aqui NUNCA entra nenhum dado de saúde, só endereços fixos ou a política de privacidade.
import { Linking } from 'react-native';

export const HEALTH_CONNECT_PLAY_URL = 'market://details?id=com.google.android.apps.healthdata';
export const HEALTH_CONNECT_PLAY_WEB_URL = 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';

// Devolve true se abriu.
export async function openUrl(url) {
  try { await Linking.openURL(url); return true; } catch (e) { return false; }
}
export async function openHealthConnectInPlayStore() {
  return (await openUrl(HEALTH_CONNECT_PLAY_URL)) || (await openUrl(HEALTH_CONNECT_PLAY_WEB_URL));
}
