import { useCallback, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { HEALTH_CONFIG } from '../data/healthConfig';
import { dayKey } from '../utils/health';
import { buildCoachSuggestions } from '../utils/healthCoach';
import { deviceTz } from '../utils/healthModel';
import { categoryNotes, computeDuoScoreV2 } from '../utils/healthScores';
import {
  addSample, addSamples, emptyConnection, emptyHealthV2, loadConnection, loadHealthV2, normalizeHealthV2, removeSample,
  saveConnection, saveHealthV2, setWaterGoalV2,
} from '../utils/healthStore';
import { isIntegrationEnabled, selectProvider } from '../utils/healthProviders';
import { MIN_AUTO_SYNC_MS, canSync as canSyncHealthKit, syncHealthKit } from '../utils/healthSync';
import loadHealthKitLib from '../utils/healthKitLib';
import { buildCategoryViews } from '../utils/healthView';

// Saúde v2: amostras por categoria (@duo_health_v2), Duo Score V2, cartões, coach e conexão. Tudo local: nenhuma chamada de rede
// e NENHUM log (este arquivo não usa console: dado de saúde nunca é gravado em log). Falhas de leitura/gravação são silenciosas e
// a tela segue funcionando com o que estiver em memória.
export default function useHealth() {
  const { user, completedSessions, dataEpoch } = useApp();
  const [state, setState] = useState(null); // null = carregando
  const [connection, setConnection] = useState(emptyConnection());
  const ref = useRef(emptyHealthV2());
  const connRef = useRef(emptyConnection());
  const inflight = useRef(null); // uma sincronização por vez (sem loop)
  const lastRun = useRef(0);
  const [syncing, setSyncing] = useState(false);
  const [lastReport, setLastReport] = useState(null); // só contagens por categoria, nunca valores

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        let loaded = { health: emptyHealthV2() };
        let conn = emptyConnection();
        try { loaded = await loadHealthV2(AsyncStorage); } catch (e) { /* segue vazio */ }
        try { conn = await loadConnection(AsyncStorage); } catch (e) { /* segue sem conexão */ }
        if (alive) {
          ref.current = loaded.health;
          setState({ health: loaded.health });
          connRef.current = conn;
          setConnection(conn);
        }
      })();
      return () => { alive = false; };
    }, [dataEpoch]),
  );

  const persist = useCallback(async (next) => {
    ref.current = next;
    setState({ health: next });
    try { await saveHealthV2(AsyncStorage, next); } catch (e) { /* sem gravar agora: continua em memória */ }
  }, []);

  // Aplica uma função pura (ex.: addSample) sobre o estado mais recente e grava.
  const update = useCallback((fn) => persist(normalizeHealthV2(fn(ref.current))), [persist]);

  // Registro manual: a origem é "manual" (ou "exemplo" no Modo Demo) e o dia é hoje, no fuso do aparelho.
  const source = 'manual';
  const record = useCallback((entries, date = dayKey()) => {
    const tz = deviceTz();
    return update((h) => addSamples(h, (Array.isArray(entries) ? entries : [entries]).map((e) => ({ date, tz, source, ...e }))));
  }, [update, source]);
  const remove = useCallback((metric, date) => update((h) => removeSample(h, { metric, date, source })), [update, source]);
  const setGoal = useCallback((goal) => update((h) => setWaterGoalV2(h, goal)), [update]);
  const addGlass = useCallback((delta = 1) => update((h) => {
    const today = dayKey();
    const cur = h.samples.find((s) => s.metric === 'water' && s.date === today && s.source === source);
    const next = Math.max(0, Math.min((cur ? cur.value : 0) + delta, 60));
    return addSample(h, { metric: 'water', value: next, date: today, tz: deviceTz(), source });
  }), [update, source]);

  const changeConnection = useCallback(async (next) => {
    connRef.current = next;
    setConnection(next);
    try { await saveConnection(AsyncStorage, next); } catch (e) { /* idem */ }
  }, []);

  const health = state ? state.health : emptyHealthV2();
  const goals = user?.goals;
  const ageGroup = user?.ageGroup;
  const minor = ageGroup === 'under18';
  const integrationEnabled = isIntegrationEnabled(HEALTH_CONFIG.integrationFlag);

  const result = useMemo(
    () => (state ? computeDuoScoreV2({ sessions: completedSessions, samples: health.samples, waterGoal: health.waterGoal, ageGroup }) : null),
    [state, completedSessions, health, ageGroup],
  );
  const notes = useMemo(() => (result ? categoryNotes(result) : []), [result]);
  const views = useMemo(
    () => (state ? buildCategoryViews({ samples: health.samples, waterGoal: health.waterGoal, ageGroup, integrationEnabled, platform: Platform.OS }) : []),
    [state, health, ageGroup, integrationEnabled],
  );
  const coach = useMemo(
    () => (state ? buildCoachSuggestions({ samples: health.samples, sessions: completedSessions, goals, ageGroup, waterGoal: health.waterGoal }) : null),
    [state, health, completedSessions, goals, ageGroup],
  );
  const provider = useMemo(() => selectProvider({ flag: HEALTH_CONFIG.integrationFlag, platform: Platform.OS, minor, loadLib: loadHealthKitLib }), [minor]);

  // Sincroniza com o Apple Saúde (só leitura, só conexão "apple_saude", nunca menor de 18). Chamada ao abrir a Saúde (no mínimo 30 s entre
  // chamadas automáticas) e no puxar para atualizar (force). Não bloqueia a interface e não roda em paralelo.
  const sync = useCallback(async ({ force = false } = {}) => {
    if (inflight.current) return inflight.current;
    if (!force && Date.now() - lastRun.current < MIN_AUTO_SYNC_MS) return null;
    if (!canSyncHealthKit({ connection: connRef.current, provider, minor })) return null;
    const run = (async () => {
      setSyncing(true);
      try {
        const r = await syncHealthKit({ provider, health: ref.current, connection: connRef.current, minor });
        lastRun.current = Date.now();
        if (r.changed) { await persist(r.health); await changeConnection(r.connection); }
        setLastReport(r.report);
        return r;
      } catch (e) {
        return null; // sem log: dado de saúde nunca vai para o console
      } finally {
        setSyncing(false);
        inflight.current = null;
      }
    })();
    inflight.current = run;
    return run;
  }, [provider, minor, persist, changeConnection]);

  return {
    loading: state === null,
    sync,
    syncing,
    lastReport,
    canSync: canSyncHealthKit({ connection, provider, minor }),
    lastSyncAt: connection.importedAt,
    health,
    samples: health.samples,
    waterGoal: health.waterGoal,
    update,
    record,
    remove,
    setGoal,
    addGlass,
    result,
    report: result,
    notes,
    views,
    coach,
    score: result ? result.score : null,
    minor,
    provider,
    integrationEnabled,
    connection,
    changeConnection,
    source,
  };
}
