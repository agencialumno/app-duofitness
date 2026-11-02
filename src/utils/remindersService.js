// Cola dos lembretes (notificações LOCAIS): preferências no armazenamento do aparelho, permissão e agendamento. O módulo de notificações e o armazenamento entram
// por parâmetro (testável em Node com um módulo falso). Nenhum servidor, nenhum token push, nenhum dado sai do aparelho. Guarda só o necessário em
// "@duo_reminders" (preferências, último acesso e estado da permissão), que é uma chave @duo_*: entra no snapshot por conta e é apagada na exclusão de conta.
import { NOTIFICATIONS_ENABLED } from '../data/remindersConfig';
import { OFFER_MESSAGE, OFFER_TITLE } from '../data/reminderTexts';
import { readJsonKey } from './safeStorage';
import { DEFAULT_PREFS, buildSchedule, sanitizePrefs } from './reminders';

export const REMINDERS_KEY = '@duo_reminders';
export const CHANNEL_ID = 'lembretes';

// O módulo só é carregado com a flag ligada; sem ele (ou se faltar no build) devolve null e tudo vira "não faz nada".
export function loadNotifications() {
  if (!NOTIFICATIONS_ENABLED) return null;
  try { return require('expo-notifications'); } catch (e) { return null; }
}

export async function loadPrefs(storage) {
  const p = await readJsonKey(storage, REMINDERS_KEY, sanitizePrefs);
  return p ?? { ...DEFAULT_PREFS };
}

export async function savePrefs(storage, prefs) {
  try { await storage.setItem(REMINDERS_KEY, JSON.stringify(prefs)); return true; } catch (e) { return false; }
}

const isGranted = (r) => Boolean(r && (r.granted === true || r.status === 'granted'));

export async function getPermission(notifications) {
  try { return isGranted(await notifications.getPermissionsAsync()) ? 'granted' : 'denied'; } catch (e) { return 'denied'; }
}

// Canal do Android: importância MÉDIA (som padrão do sistema), sem vibração, sem selo; na tela de bloqueio só a versão genérica.
export async function ensureChannel(notifications, platform = 'android') {
  if (platform !== 'android' || typeof notifications.setNotificationChannelAsync !== 'function') return;
  try {
    await notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Lembretes de treino',
      importance: notifications.AndroidImportance?.DEFAULT ?? 3,
      sound: 'default',
      enableVibrate: false,
      showBadge: false,
      lockscreenVisibility: notifications.AndroidNotificationVisibility?.PRIVATE ?? 0,
    });
  } catch (e) { /* sem canal o Android usa o padrão; os lembretes seguem */ }
}

export async function cancelAllReminders(notifications) {
  if (!notifications) return;
  try { await notifications.cancelAllScheduledNotificationsAsync(); } catch (e) { /* nada a cancelar */ }
}

/**
 * Cancela TUDO e reagenda a partir das preferências. Chamado ao abrir o app (markOpen: true grava o último acesso) e a cada mudança nos ajustes.
 * Só agenda com a permissão concedida; nunca pede permissão aqui.
 */
export async function syncReminders({ storage, notifications, now = new Date(), seriesDays, markOpen = false, platform = 'android' }) {
  if (!notifications) return { scheduled: [], reason: 'indisponivel' };
  let prefs = await loadPrefs(storage);
  if (markOpen) { prefs = { ...prefs, lastOpen: now.toISOString() }; await savePrefs(storage, prefs); }
  await cancelAllReminders(notifications);
  if (!prefs.enabled) return { scheduled: [], reason: 'desligado' };
  const permission = await getPermission(notifications);
  if (permission !== 'granted') return { scheduled: [], reason: 'sem_permissao' };
  await ensureChannel(notifications, platform);
  const items = buildSchedule({ prefs, now, seriesDays });
  const done = [];
  for (const it of items) {
    try {
      await notifications.scheduleNotificationAsync({
        identifier: it.id,
        content: { title: it.title, body: it.body, sound: true },
        trigger: { type: notifications.SchedulableTriggerInputTypes?.DATE ?? 'date', date: it.when, channelId: CHANNEL_ID },
      });
      done.push(it);
    } catch (e) { /* um lembrete que falhou não derruba os outros */ }
  }
  return { scheduled: done, reason: 'ok' };
}

// Pede a permissão do sistema (só por ação da pessoa) e guarda o resultado. Negou = não insiste: quem quiser liga de novo nos Ajustes.
export async function requestPermission({ storage, notifications, now = new Date() }) {
  if (!notifications) return 'indisponivel';
  let status;
  try { status = isGranted(await notifications.requestPermissionsAsync()) ? 'granted' : 'denied'; } catch (e) { status = 'denied'; }
  const prefs = await loadPrefs(storage);
  await savePrefs(storage, { ...prefs, permission: status, askedAt: prefs.askedAt || now.toISOString() });
  return status;
}

// A explicação só aparece UMA vez, depois da primeira série gerada.
export function shouldOffer(prefs) {
  return prefs.askedAt === null && prefs.permission === 'unknown'; // quem chama só chega aqui com a flag ligada (AppContext)
}

/**
 * Depois da PRIMEIRA série gerada: explica em português e só então chama o pedido do sistema. "Agora não" não insiste (marca que já perguntou).
 * `Alert` entra por parâmetro. Devolve true se a explicação foi mostrada.
 */
export async function offerReminders({ Alert, storage, notifications, seriesDays, now = new Date(), platform }) {
  if (!notifications) return false;
  const prefs = await loadPrefs(storage);
  if (!shouldOffer(prefs)) return false;
  Alert.alert(OFFER_TITLE, OFFER_MESSAGE, [
    { text: 'Agora não', style: 'cancel', onPress: () => { savePrefs(storage, { ...prefs, askedAt: now.toISOString() }); } },
    {
      text: 'Ativar lembretes',
      onPress: async () => {
        const status = await requestPermission({ storage, notifications, now });
        if (status === 'granted') await syncReminders({ storage, notifications, now, seriesDays, platform });
      },
    },
  ]);
  return true;
}

// "Parar todos os lembretes": desliga e cancela tudo agendado.
export async function stopAllReminders({ storage, notifications }) {
  const prefs = await loadPrefs(storage);
  await savePrefs(storage, { ...prefs, enabled: false });
  await cancelAllReminders(notifications);
}
