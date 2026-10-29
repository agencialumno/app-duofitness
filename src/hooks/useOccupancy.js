import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { OCCUPANCY_CONFIG } from '../data/occupancyConfig';
import { getBestTime, selectProvider } from '../utils/occupancy';

// Lotação da academia para as telas. Atualiza ao focar a tela e a cada minuto enquanto ela está em foco.
// status: 'loading' | 'ready' | 'empty' (sem dados no momento). Falha nunca lança: vira 'empty'.
// Sem API configurada (ou com a lotação remota desligada) o provedor é o de exemplo (nenhuma chamada de rede).
export default function useOccupancy(gymId = OCCUPANCY_CONFIG.gymId) {
  const provider = useMemo(
    () => selectProvider({ apiUrl: OCCUPANCY_CONFIG.apiUrl, remoteFlag: OCCUPANCY_CONFIG.remoteFlag }),
    [],
  );
  const [state, setState] = useState({ status: 'loading', reading: null, best: null, now: new Date() });
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const reading = await provider.getOccupancy(gymId);
      const best = reading ? await getBestTime(provider, gymId).catch(() => null) : null;
      if (alive.current) setState({ status: reading ? 'ready' : 'empty', reading, best, now: new Date() });
    } catch (e) {
      if (alive.current) setState({ status: 'empty', reading: null, best: null, now: new Date() });
    }
  }, [provider, gymId]);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      load();
      const timer = setInterval(load, OCCUPANCY_CONFIG.refreshMs);
      return () => {
        alive.current = false;
        clearInterval(timer);
      };
    }, [load]),
  );

  return { ...state, refresh: load, isMock: provider.source === 'mock' };
}
