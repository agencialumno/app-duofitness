// "Continuar com Apple" só no iOS (e só se o provedor souber fazer). Puro, para testar sem React Native.
export function showApple(capabilities, os) {
  return !!capabilities?.apple && os === 'ios';
}
