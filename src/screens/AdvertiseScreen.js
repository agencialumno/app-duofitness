import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler, KeyboardAvoidingView, Linking, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { ADVERTISE_DONE_MESSAGE, ADVERTISE_NOTICES, MARKETPLACE_CONTACT_EMAIL } from '../data/advertiseConfig';
import {
  ADVERTISE_NICHES, DESCRIPTION_MAX, buildEmail, buildShareMessage, emptyForm, maskPhone, nicheLabel, validateForm,
} from '../utils/advertise';
import { Chip } from '../components/guided/GuidedParts';

// "Anunciar em nosso marketplace": formulário -> revisão -> e-mail. Nada é gravado no aparelho: os dados
// vivem só na memória desta tela e seguem por e-mail (mailto:) para a equipe Duo Fitness.
// No Modo Demo o "Confirmar" só mostra uma prévia do e-mail.
export default function AdvertiseScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const isDemo = !!user?.isDemo;

  const [values, setValues] = useState(emptyForm());
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [stage, setStage] = useState('form'); // 'form' | 'review' | 'preview' | 'done'
  const [mail, setMail] = useState(null);
  const [via, setVia] = useState('mail');
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState('');

  const scrollRef = useRef(null);
  const ys = useRef({});

  const check = validateForm(values);
  const show = (field) => (submitted || touched[field]) && check.errors[field];

  const set = (field, value) => setValues((v) => ({ ...v, [field]: value }));
  const blur = (field) => setTouched((t) => ({ ...t, [field]: true }));

  // O formulário rola até o campo em foco (depois do teclado subir), para ele nunca ficar escondido.
  const focus = (field) => {
    setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max((ys.current[field] || 0) - 12, 0), animated: true }), 300);
  };

  const back = useCallback(() => {
    if (stage === 'review') { setStage('form'); return true; }
    if (stage === 'preview') { setStage('review'); return true; }
    navigation.goBack();
    return true;
  }, [stage, navigation]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  }, [back]);

  const review = () => {
    setSubmitted(true);
    if (!check.valid) {
      const first = ['niche', 'nicheOther', 'name', 'whatsapp', 'email', 'description', 'company', 'city', 'link'].find((f) => check.errors[f] || (f === 'whatsapp' && check.errors.contact));
      if (first) scrollRef.current?.scrollTo({ y: Math.max((ys.current[first] || 0) - 12, 0), animated: true });
      return;
    }
    setValues(check.values);
    setStage('review');
  };

  const confirm = async () => {
    if (busy) return;
    const email = buildEmail(check.values);
    setSendError('');
    if (isDemo) {
      setMail(email);
      setStage('preview');
      return;
    }
    setBusy(true);
    let channel = 'mail';
    try {
      await Linking.openURL(email.url); // tenta abrir direto (sem consulta prévia) e, se falhar, cai na folha de compartilhamento
    } catch (e) {
      try {
        const r = await Share.share({ title: email.full.subject, message: buildShareMessage(email) });
        if (r && r.action === Share.dismissedAction) { setBusy(false); return; } // fechou a folha sem enviar
        channel = 'share';
      } catch (e2) {
        setSendError('Não foi possível abrir o e-mail nem a folha de compartilhamento. Tente de novo.');
        setBusy(false);
        return;
      }
    }
    setMail(email);
    setVia(channel);
    setStage('done');
    setBusy(false);
  };

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
      <TouchableOpacity onPress={back} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Voltar">
        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
      </TouchableOpacity>
      <View style={styles.headerText}>
        <Text style={styles.title} accessibilityRole="header">
          {stage === 'review' ? 'Confira os dados' : stage === 'preview' ? 'Prévia do e-mail' : stage === 'done' ? 'Tudo pronto' : 'Anunciar em nosso marketplace'}
        </Text>
      </View>
    </View>
  );

  const notices = (
    <View style={styles.noticeCard}>
      {ADVERTISE_NOTICES.map((n) => (
        <View key={n} style={styles.noticeRow}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.noticeText}>{n}</Text>
        </View>
      ))}
    </View>
  );

  // ---------- Concluído ----------
  if (stage === 'done') {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.centerBody}>
          <Ionicons name="mail-open-outline" size={64} color={COLORS.success} />
          <Text style={styles.doneText} accessibilityLiveRegion="polite">{ADVERTISE_DONE_MESSAGE}</Text>
          {via === 'share' && <Text style={styles.muted}>Abrimos a folha de compartilhamento porque não foi possível abrir o aplicativo de e-mail. Envie o texto para {MARKETPLACE_CONTACT_EMAIL}.</Text>}
          {mail?.truncated && <Text style={styles.muted}>A descrição era longa e foi resumida no e-mail. Complete o texto antes de enviar, se quiser.</Text>}
        </View>
        <View style={styles.footer}>
          <PrimaryButton label="Concluir" onPress={() => navigation.goBack()} />
          <TouchableOpacity style={styles.linkBtn} onPress={() => setStage('review')} accessibilityRole="button" accessibilityLabel="Voltar aos dados">
            <Text style={styles.linkText}>Voltar aos dados</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---------- Prévia (Modo Demo) ----------
  if (stage === 'preview' && mail) {
    return (
      <View style={styles.container}>
        {header}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.demoTag}>
            <Ionicons name="flask-outline" size={14} color={COLORS.black} />
            <Text style={styles.demoTagText}>Modo Demo: nenhum e-mail foi aberto nem enviado</Text>
          </View>
          <Text style={styles.sectionTitle}>É assim que o e-mail será montado</Text>
          <View style={styles.card}>
            <Text style={styles.mailLabel}>Para</Text>
            <Text style={styles.mailValue} selectable>{mail.to}</Text>
            <Text style={styles.mailLabel}>Assunto</Text>
            <Text style={styles.mailValue} selectable>{mail.subject}</Text>
            <Text style={styles.mailLabel}>Mensagem</Text>
            <Text style={styles.mailBody} selectable>{mail.body}</Text>
          </View>
          {notices}
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton label="Concluir" onPress={() => navigation.goBack()} />
          <TouchableOpacity style={styles.linkBtn} onPress={() => setStage('review')} accessibilityRole="button" accessibilityLabel="Voltar aos dados">
            <Text style={styles.linkText}>Voltar aos dados</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---------- Revisão ----------
  if (stage === 'review') {
    const v = check.values;
    const rows = [
      ['Nicho', nicheLabel(v)],
      ['Responsável', v.name],
      ['Empresa ou marca', v.company || 'não informado'],
      ['WhatsApp', v.whatsapp || 'não informado'],
      ['E-mail', v.email || 'não informado'],
      ['Cidade ou condomínio', v.city || 'não informado'],
      ['Link ou Instagram', v.link || 'não informado'],
      ['Descrição', v.description],
    ];
    return (
      <View style={styles.container}>
        {header}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.card}>
            {rows.map(([label, value], i) => (
              <View key={label} style={[styles.reviewRow, i > 0 && styles.reviewRowBorder]} accessible accessibilityLabel={`${label}: ${value}`}>
                <Text style={styles.reviewLabel}>{label}</Text>
                <Text style={styles.reviewValue}>{value}</Text>
              </View>
            ))}
          </View>
          {notices}
          {sendError ? <Text style={styles.errorText} accessibilityLiveRegion="polite">{sendError}</Text> : null}
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton label={busy ? 'Abrindo…' : 'Confirmar'} onPress={confirm} disabled={busy} icon="checkmark" />
          <TouchableOpacity style={styles.linkBtn} onPress={() => setStage('form')} accessibilityRole="button" accessibilityLabel="Voltar e editar">
            <Text style={styles.linkText}>Voltar e editar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---------- Formulário ----------
  const count = values.description.length;
  return (
    <View style={styles.container}>
      {header}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: SPACING.xxl }]}
          keyboardShouldPersistTaps="handled"
        >
          {notices}

          <Field name="niche" ys={ys} label="Nicho" required error={show('niche')}>
            <View style={styles.chips} accessibilityRole="radiogroup">
              {ADVERTISE_NICHES.map((n) => (
                <Chip key={n.id} label={n.label} selected={values.niche === n.id} onPress={() => { set('niche', n.id); blur('niche'); }} />
              ))}
            </View>
          </Field>

          {values.niche === 'outro' && (
            <Field name="nicheOther" ys={ys} label="Especifique o nicho" required error={show('nicheOther')}>
              <Input value={values.nicheOther} onChangeText={(t) => set('nicheOther', t)} onFocus={() => focus('nicheOther')} onBlur={() => blur('nicheOther')} placeholder="Ex.: fisioterapia esportiva" maxLength={60} label="Especifique o nicho, obrigatório" invalid={!!show('nicheOther')} />
            </Field>
          )}

          <Field name="name" ys={ys} label="Nome do responsável" required error={show('name')}>
            <Input value={values.name} onChangeText={(t) => set('name', t)} onFocus={() => focus('name')} onBlur={() => blur('name')} placeholder="Seu nome" maxLength={80} autoCapitalize="words" label="Nome do responsável, obrigatório" invalid={!!show('name')} />
          </Field>

          <Field name="company" ys={ys} label="Nome da empresa ou marca" error={show('company')}>
            <Input value={values.company} onChangeText={(t) => set('company', t)} onFocus={() => focus('company')} onBlur={() => blur('company')} placeholder="Opcional" maxLength={80} autoCapitalize="words" label="Nome da empresa ou marca, opcional" invalid={!!show('company')} />
          </Field>

          <Field name="whatsapp" ys={ys} label="WhatsApp" hint="Informe o WhatsApp ou o e-mail (pelo menos um)." error={show('whatsapp') || (show('contact') && check.errors.contact)}>
            <Input value={values.whatsapp} onChangeText={(t) => set('whatsapp', maskPhone(t))} onFocus={() => focus('whatsapp')} onBlur={() => blur('whatsapp')} placeholder="(11) 99999-8888" keyboardType="phone-pad" maxLength={16} label="WhatsApp com DDD" invalid={!!(show('whatsapp') || show('contact'))} />
          </Field>

          <Field name="email" ys={ys} label="E-mail" error={show('email')}>
            <Input value={values.email} onChangeText={(t) => set('email', t)} onFocus={() => focus('email')} onBlur={() => blur('email')} placeholder="nome@empresa.com.br" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={120} label="E-mail" invalid={!!(show('email') || show('contact'))} />
          </Field>

          <Field name="city" ys={ys} label="Cidade ou condomínio de interesse" error={show('city')}>
            <Input value={values.city} onChangeText={(t) => set('city', t)} onFocus={() => focus('city')} onBlur={() => blur('city')} placeholder="Opcional" maxLength={80} autoCapitalize="words" label="Cidade ou condomínio de interesse, opcional" invalid={!!show('city')} />
          </Field>

          <Field name="description" ys={ys} label="Descrição do produto ou serviço" required error={show('description')}>
            <Input
              value={values.description}
              onChangeText={(t) => set('description', t)}
              onFocus={() => focus('description')}
              onBlur={() => blur('description')}
              placeholder="O que você oferece, para quem e como funciona"
              multiline
              maxLength={DESCRIPTION_MAX}
              label="Descrição do produto ou serviço, obrigatória"
              invalid={!!show('description')}
              style={styles.inputMultiline}
            />
            <Text style={[styles.counter, count >= DESCRIPTION_MAX - 30 && styles.counterWarn]} accessibilityLabel={`${count} de ${DESCRIPTION_MAX} caracteres`}>
              {count}/{DESCRIPTION_MAX}
            </Text>
          </Field>

          <Field name="link" ys={ys} label="Link ou Instagram" error={show('link')}>
            <Input value={values.link} onChangeText={(t) => set('link', t)} onFocus={() => focus('link')} onBlur={() => blur('link')} placeholder="@usuario ou exemplo.com.br (opcional)" autoCapitalize="none" autoCorrect={false} maxLength={120} label="Link ou Instagram, opcional" invalid={!!show('link')} />
          </Field>

          {submitted && !check.valid && <Text style={styles.errorText} accessibilityLiveRegion="polite">Revise os campos em vermelho para continuar.</Text>}
          <PrimaryButton label="Revisar" onPress={review} icon="arrow-forward" />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ---------- Peças ----------

function Field({ name, ys, label, required, hint, error, children }) {
  return (
    <View style={styles.field} onLayout={(e) => { ys.current[name] = e.nativeEvent.layout.y; }}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : <Text style={styles.optional}> (opcional)</Text>}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
      {error ? (
        <Text style={styles.errorText} accessibilityLiveRegion="polite" accessibilityRole="alert">{error}</Text>
      ) : null}
    </View>
  );
}

function Input({ label, invalid, style, ...props }) {
  return (
    <TextInput
      style={[styles.input, invalid && styles.inputInvalid, style]}
      placeholderTextColor={COLORS.textSecondary}
      accessibilityLabel={label}
      {...props}
    />
  );
}

function PrimaryButton({ label, onPress, disabled, icon }) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={label}
    >
      {icon ? <Ionicons name={icon} size={20} color={COLORS.black} /> : null}
      <Text style={styles.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  backBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -SPACING.sm },
  headerText: { flex: 1 },
  title: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.white },
  content: { padding: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.xl, gap: SPACING.md },
  noticeCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.sm },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs },
  noticeText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19 },
  field: { gap: SPACING.xs },
  fieldLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.white },
  required: { color: COLORS.primary, fontWeight: '700' },
  optional: { color: COLORS.textSecondary, fontWeight: '400' },
  hint: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  input: { minHeight: 48, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgCardAlt, color: COLORS.white, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: FONTS.sizes.md },
  inputInvalid: { borderColor: COLORS.error },
  inputMultiline: { minHeight: 130, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end', fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  counterWarn: { color: COLORS.warning },
  errorText: { fontSize: FONTS.sizes.sm, color: COLORS.error, lineHeight: 18 },
  muted: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19, textAlign: 'center' },
  primaryBtn: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, marginTop: SPACING.sm },
  btnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.black, flexShrink: 1, textAlign: 'center' },
  footer: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
  linkBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary, textDecorationLine: 'underline' },
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  reviewRow: { paddingVertical: SPACING.sm, gap: 2 },
  reviewRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  reviewLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  reviewValue: { fontSize: FONTS.sizes.md, color: COLORS.white, lineHeight: 22 },
  centerBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SPACING.lg },
  doneText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.white, textAlign: 'center', lineHeight: 26 },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.white },
  demoTag: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  demoTagText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.black, flexShrink: 1 },
  mailLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: SPACING.sm },
  mailValue: { fontSize: FONTS.sizes.md, color: COLORS.white, lineHeight: 22 },
  mailBody: { fontSize: FONTS.sizes.sm, color: COLORS.white, lineHeight: 20 },
});
