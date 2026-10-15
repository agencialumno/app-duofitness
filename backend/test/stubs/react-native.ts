// Stub mínimo do react-native para testes em Node.
export const View = 'View';
export const Text = 'Text';
export const ScrollView = 'ScrollView';
export const TouchableOpacity = 'TouchableOpacity';
export const StyleSheet = { create: (s: any) => s, hairlineWidth: 1 };
export const Platform = { OS: 'ios' as string };
export const alerts: { title: string; message: string; buttons: any[] }[] = [];
export const Alert = { alert: (title: string, message: string, buttons: any[]) => { alerts.push({ title, message, buttons }); } };
