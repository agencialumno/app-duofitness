export const SafeAreaInsetsContext = { Consumer: 'InsetsConsumer' };
// Margens da área segura controláveis pelo teste (ScreenHeader e ScreenTopInset).
export const __insets = { top: 0, bottom: 0, left: 0, right: 0 };
export const useSafeAreaInsets = () => __insets;
