// useIsFocused controlável pelo teste.
import { useEffect, useState } from './react';

const listeners = new Set<(v: boolean) => void>();
export const nav = {
  focused: true,
  set(v: boolean) { nav.focused = v; [...listeners].forEach((f) => f(v)); },
  count: () => listeners.size,
};
export function useIsFocused() {
  const [f, setF] = useState(nav.focused);
  useEffect(() => { listeners.add(setF); return () => { listeners.delete(setF); }; }, []);
  return f;
}
