import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { MAX_NAME_LENGTH, isUsableName, validateFullName } from '../utils/accountName';

// Nome do perfil com edição no próprio lugar. O nome fica só no aparelho (@duo_user, que entra no snapshot por conta).
export default function EditNameRow({ name, onSave }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const start = () => { setText(name || ''); setError(''); setEditing(true); };
  const save = async () => {
    const err = validateFullName(text) || (isUsableName(text) ? '' : 'Informe pelo menos 2 caracteres.');
    if (err) { setError(err); return; }
    await onSave(text);
    setEditing(false);
  };

  if (!editing) {
    return (
      <View style={styles.row}>
        <Text style={styles.name} accessibilityRole="header" testID="profile-name">{name}</Text>
        <TouchableOpacity onPress={start} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Editar nome" testID="profile-name-edit">
          <Ionicons name="create-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={styles.editWrap}>
      <TextInput
        value={text}
        onChangeText={(t) => { setText(t); setError(''); }}
        style={styles.input}
        autoFocus
        autoCapitalize="words"
        maxLength={MAX_NAME_LENGTH}
        textContentType="name"
        autoComplete="name"
        returnKeyType="done"
        onSubmitEditing={save}
        keyboardAppearance="dark"
        selectionColor={COLORS.primary}
        placeholder="Nome completo"
        placeholderTextColor={COLORS.textSecondary}
        accessibilityLabel="Nome completo"
        testID="profile-name-input"
      />
      {error ? <Text style={styles.error} accessibilityLiveRegion="polite" testID="profile-name-error">{error}</Text> : null}
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => setEditing(false)} style={styles.btn} accessibilityRole="button" accessibilityLabel="Cancelar" testID="profile-name-cancel">
          <Text style={styles.btnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={save} style={[styles.btn, styles.btnPrimary]} accessibilityRole="button" accessibilityLabel="Salvar nome" testID="profile-name-save">
          <Text style={[styles.btnText, styles.btnPrimaryText]}>Salvar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.lg },
  name: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white, flexShrink: 1, textAlign: 'center' },
  iconBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  editWrap: { alignSelf: 'stretch', paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  input: { minHeight: 48, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, color: COLORS.white, fontSize: FONTS.sizes.md },
  error: { color: COLORS.error, fontSize: FONTS.sizes.sm },
  actions: { flexDirection: 'row', gap: SPACING.sm, justifyContent: 'center' },
  btn: { minHeight: 44, minWidth: 96, paddingHorizontal: SPACING.md, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontWeight: '600' },
  btnPrimary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  btnPrimaryText: { color: COLORS.black },
});
