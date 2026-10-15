import { useCallback, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { HEALTH_CONFIG } from '../data/healthConfig';
import {
  HEALTH_KEY, buildDemoHealth, buildWeeklyReport, emptyHealth, normalizeHealth,
} from '../utils/health';
import { selectHealthProvider } from '../utils/healthProviders';

// Dados de saúde (@duo_health) + Duo Score. Tudo local: nenhuma chamada de rede.
// No Modo Demo, enquanto nada foi gravado, mostra um histórico de EXEMPLO (isExample = true).
export default function useHealth() {
  const { user, completedSessions } = useApp();
  const isDemo = !!user?.isDemo;
  const [health, setHealth] = useState(null); // null = carregando
  const ref = useRef(emptyHealth());

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        let loaded = null;
        try {
          const raw = await AsyncStorage.getItem(HEALTH_KEY);
          if (raw) loaded = normalizeHealth(JSON.parse(raw));
        } catch (e) {
          console.log('Erro ao ler os dados de saúde:', e);
        }
        if (!loaded) loaded = isDemo ? buildDemoHealth() : emptyHealth();
        if (alive) {
          ref.current = loaded;
          setHealth(loaded);
        }
      })();
      return () => { alive = false; };
    }, [isDemo]),
  );

  // Aplica uma função pura (ex.: addWeight) sobre o estado mais recente e grava.
  const update = useCallback(async (fn) => {
    const next = normalizeHealth(fn(ref.current));
    ref.current = next;
    setHealth(next);
    try {
      await AsyncStorage.setItem(HEALTH_KEY, JSON.stringify(next));
    } catch (e) {
      console.log('Erro ao gravar os dados de saúde:', e);
    }
  }, []);

  const goals = user?.goals;
  const ageGroup = user?.ageGroup;
  const report = useMemo(
    () => (health ? buildWeeklyReport({ sessions: completedSessions, health, goals, ageGroup }) : null),
    [health, completedSessions, goals, ageGroup],
  );
  const provider = useMemo(() => selectHealthProvider({ flag: HEALTH_CONFIG.integrationFlag, isDemo }), [isDemo]);

  return {
    loading: health === null,
    health: health || emptyHealth(),
    update,
    report,
    score: report ? report.score : null,
    minor: ageGroup === 'under18',
    isExample: isDemo,
    provider,
  };
}

