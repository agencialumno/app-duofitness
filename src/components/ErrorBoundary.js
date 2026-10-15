import React from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { describeError, initialState, offerReset, onCatch, onRetry, resetAppData } from '../utils/errorRecovery';

// Confirmação que funciona nas duas plataformas (Alert.alert não existe na web).
function confirmReset() {
  const title = 'Recomeçar do zero';
  const message = 'Isso apaga todos os seus treinos e progresso deste aparelho e volta às boas-vindas. Tem certeza?';
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Apagar e recomeçar', style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

// Rede de segurança na raiz do app. Um erro de render não derruba o app para a tela branca: mostra
// "Algo deu errado" com "Tentar novamente"; se o erro se repetir, oferece também "Recomeçar do zero".
//
// A tela de recuperação NÃO depende de navegação nem do AppContext (só de componentes básicos do React
// Native e da área segura, que vem do SafeAreaProvider acima). O erro é registrado só com console.error:
// nada é enviado a lugar nenhum.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = initialState();
  }

  static getDerivedStateFromError(error) {
    // O estado anterior (retriedAt) vem pelo updater em componentDidCatch; aqui só guardamos o erro.
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Erro de render capturado:', describeError(error), info?.componentStack || '');
    // Marca "repetido" se veio logo depois de uma nova tentativa.
    this.setState((s) => onCatch({ ...s, error: null }, error));
    if (typeof this.props.onError === 'function') {
      try { this.props.onError(error); } catch (e) { /* o boundary nunca lança */ }
    }
  }

  handleRetry = () => {
    this.setState((s) => onRetry(s));
  };

  handleReset = async () => {
    const ok = await confirmReset();
    if (!ok) return;
    try {
      await resetAppData(AsyncStorage);
    } catch (e) {
      console.error('[ErrorBoundary] Falha ao limpar os dados:', describeError(e));
    }
    this.setState(initialState());
    if (typeof this.props.onReset === 'function') this.props.onReset();
  };

  render() {
    if (!this.state.error) {
      // key = attempt: "Tentar novamente" remonta a árvore inteira
      return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
    }
    const canReset = offerReset(this.state);
    return (
      <SafeAreaInsetsContext.Consumer>
        {(insets) => (
          <View style={[styles.root, { paddingTop: (insets?.top || 0) + SPACING.lg, paddingBottom: (insets?.bottom || 0) + SPACING.lg }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
              <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Text style={styles.badgeText}>!</Text>
              </View>
              <Text style={styles.title} accessibilityRole="header" accessibilityLiveRegion="polite">Algo deu errado</Text>
              <Text style={styles.text}>
                {canReset
                  ? 'O problema continua. Você pode tentar de novo ou recomeçar do zero (isso apaga os dados deste aparelho).'
                  : 'O app encontrou um problema inesperado. Seus dados continuam salvos neste aparelho.'}
              </Text>

              <TouchableOpacity style={styles.primaryBtn} onPress={this.handleRetry} accessibilityRole="button" accessibilityLabel="Tentar novamente">
                <Text style={styles.primaryText}>Tentar novamente</Text>
              </TouchableOpacity>

              {canReset && (
                <TouchableOpacity style={styles.secondaryBtn} onPress={this.handleReset} accessibilityRole="button" accessibilityLabel="Recomeçar do zero">
                  <Text style={styles.secondaryText}>Recomeçar do zero</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}
      </SafeAreaInsetsContext.Consumer>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: SPACING.lg },
  body: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  badge: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.primary },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white, textAlign: 'center' },
  text: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  primaryBtn: { alignSelf: 'stretch', minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, marginTop: SPACING.sm },
  primaryText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.black, textAlign: 'center' },
  secondaryBtn: { alignSelf: 'stretch', minHeight: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  secondaryText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },
});
