import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';

const { width } = Dimensions.get('window');

const FEATURES = [
  { icon: 'barbell-outline', text: 'Séries montadas por IA para seu objetivo' },
  { icon: 'library-outline', text: 'Biblioteca completa de exercícios' },
  { icon: 'trophy-outline', text: 'Evolução gamificada com XP e conquistas' },
  { icon: 'flame-outline', text: 'Acompanhe sua sequência de treinos' },
];

export default function WelcomeScreen({ navigation }) {
  // O app só entra com conta. Sem provedor de conta neste build (flag desligada ou Firebase ausente), a tela avisa em vez de oferecer
  // um caminho sem conta.
  const { enabled, capabilities } = useAuth();
  const available = enabled && !!capabilities?.email;

  return (
    <View style={styles.container}>
      <View style={styles.logoArea}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>Academia do seu condomínio</Text>
      </View>

      <View style={styles.features}>
        {FEATURES.map((item, i) => (
          <View key={i} style={styles.featureItem}>
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.featureText}>{item.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        {!available ? (
          <Text style={styles.unavailable} testID="wl-unavailable" accessibilityRole="alert">
            A conta não está disponível nesta versão do app. Atualize o app ou tente de novo mais tarde.
          </Text>
        ) : null}
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('SignUp')} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Criar conta" testID="wl-signup">
          <Text style={styles.btnText}>Criar conta</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnOutline} onPress={() => navigation.navigate('SignIn')} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Entrar" testID="wl-signin">
          <Text style={styles.btnOutlineText}>Entrar</Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>Gratuito · Sem anúncios · Sem assinatura</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'space-between',
    paddingVertical: SPACING.xxl,
  },
  logoArea: { alignItems: 'center', marginTop: SPACING.xxl },
  logo: { width: width * 0.72, height: 80, marginBottom: SPACING.sm },
  tagline: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  features: { gap: SPACING.sm },
  featureItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.bgCard, padding: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    backgroundColor: '#1A1700', justifyContent: 'center', alignItems: 'center',
  },
  featureText: { fontSize: FONTS.sizes.md, color: COLORS.textPrimary, fontWeight: '500', flex: 1 },
  footer: { gap: SPACING.sm, alignItems: 'center' },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingVertical: SPACING.md, width: '100%', alignItems: 'center',
  },
  btnText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.black },
  btnOutline: { borderColor: COLORS.primary, borderWidth: 1.5, borderRadius: RADIUS.full, paddingVertical: SPACING.md, width: '100%', alignItems: 'center' },
  btnOutlineText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.primary },
  unavailable: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  footerNote: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
});
