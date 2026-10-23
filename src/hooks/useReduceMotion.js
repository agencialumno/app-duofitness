import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// "Reduzir movimento" do sistema (iOS e Android). Quem usa o hook deve desligar animações e reprodução automática.
export default function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { if (alive) setReduce(!!v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setReduce(!!v));
    return () => { alive = false; sub?.remove?.(); };
  }, []);
  return reduce;
}
