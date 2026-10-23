import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// "Reduzir movimento" do sistema (iOS e Android; na web, prefers-reduced-motion).
// Devolve { reduce, known }: `known` fica verdadeiro quando o sistema já respondeu (a consulta é assíncrona),
// para quem decide autoplay não começar a tocar e parar logo depois.
export function useReduceMotionState() {
  const [state, setState] = useState({ reduce: false, known: false });
  useEffect(() => {
    let alive = true;
    const done = (v) => { if (alive) setState({ reduce: !!v, known: true }); };
    if (AccessibilityInfo.isReduceMotionEnabled) {
      AccessibilityInfo.isReduceMotionEnabled().then(done).catch(() => done(false));
    } else {
      done(false);
    }
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => done(v));
    return () => { alive = false; sub?.remove?.(); };
  }, []);
  return state;
}

// Só o valor (true = reduzir movimento).
export default function useReduceMotion() {
  return useReduceMotionState().reduce;
}
