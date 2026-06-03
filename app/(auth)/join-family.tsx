import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import CharacterPicker from '../../components/CharacterPicker';
import { t } from '../../lib/i18n';
import { C, F } from '../../constants/theme';

type Step = 'code' | 'pick' | 'create';
type Hero = { id: string; username: string | null; character_type: string; level: number };

export default function JoinFamily() {
  const { setActiveProfile } = useAuth();
  const [step, setStep]           = useState<Step>('code');
  const [code, setCode]           = useState('');
  const [household, setHousehold] = useState<{ id: string; name: string } | null>(null);
  const [heroes, setHeroes]       = useState<Hero[]>([]);
  const [name, setName]           = useState('');
  const [character, setCharacter] = useState('1');
  const [loading, setLoading]     = useState(false);

  // Make sure the device has an (anonymous) session so RLS lets us read/write.
  async function ensureSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
    }
  }

  async function verifyCode() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { Alert.alert(t('auth.error'), t('join.enterCodeErr')); return; }
    setLoading(true);
    const { data: hh, error } = await supabase
      .from('households').select('id, name').eq('invite_code', trimmed).single();
    if (error || !hh) {
      setLoading(false);
      Alert.alert(t('join.codeNotFound'), t('join.codeNotFoundBody'));
      return;
    }
    const { data: members } = await supabase
      .from('profiles')
      .select('id, username, character_type, level')
      .eq('household_id', hh.id)
      .eq('is_leader', false)
      .order('username');
    setLoading(false);
    setHousehold(hh);
    setHeroes(members ?? []);
    setStep('pick');
  }

  async function pickHero(hero: Hero) {
    setLoading(true);
    try {
      await ensureSession();
      await setActiveProfile(hero.id);   // RouteGuard navigates once profile loads
    } catch (e: any) {
      Alert.alert(t('auth.error'), e?.message ?? '');
      setLoading(false);
    }
  }

  async function createHero() {
    if (!name.trim()) { Alert.alert(t('auth.error'), t('join.enterName')); return; }
    if (!household)   return;
    setLoading(true);
    try {
      await ensureSession();
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          username:       name.trim(),
          household_id:   household.id,
          character_type: character,
          is_leader:      false,
        } as any)
        .select('id')
        .single();
      if (error || !data) throw error ?? new Error('Could not create hero.');
      await setActiveProfile(data.id);
    } catch (e: any) {
      Alert.alert(t('auth.error'), e?.message ?? '');
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.container}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Pressable
          onPress={() => step === 'code' ? router.back() : step === 'create' ? setStep('pick') : setStep('code')}
          style={s.back}
        >
          <Text style={s.backText}>{t('join.back')}</Text>
        </Pressable>

        <View style={s.logoBox}><Text style={s.logoEmoji}>👨‍👩‍👧</Text></View>
        <Text style={s.title}>{t('join.title')}</Text>

        {step === 'code' && (
          <>
            <Text style={s.subtitle}>{t('join.enterCode')}</Text>
            <TextInput
              style={s.input}
              placeholder={t('join.familyCode')}
              placeholderTextColor={C.textDim}
              value={code}
              onChangeText={v => setCode(v.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
            />
            <Pressable style={({ pressed }) => [s.btn, loading && s.btnDisabled, pressed && s.btnPressed]} onPress={verifyCode} disabled={loading}>
              <Text style={s.btnText}>{loading ? t('join.checking') : t('join.verify')}</Text>
            </Pressable>
          </>
        )}

        {step === 'pick' && (
          <>
            <View style={s.householdBadge}>
              <Text style={s.householdLabel}>{t('join.joining')}</Text>
              <Text style={s.householdName}>{household?.name.toUpperCase()}</Text>
            </View>

            {loading ? (
              <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
            ) : (
              <>
                {heroes.length > 0 && <Text style={s.fieldLabel}>{t('join.whoAreYou')}</Text>}
                {heroes.map(h => (
                  <Pressable key={h.id} style={({ pressed }) => [s.heroRow, pressed && { opacity: 0.7 }]} onPress={() => pickHero(h)}>
                    <Text style={s.heroEmoji}>🧑</Text>
                    <Text style={s.heroName}>{(h.username ?? t('common.hero')).toUpperCase()}</Text>
                    <Text style={s.heroLv}>LV.{h.level}</Text>
                  </Pressable>
                ))}

                <Pressable style={({ pressed }) => [s.newBtn, pressed && s.btnPressed]} onPress={() => setStep('create')}>
                  <Text style={s.newBtnText}>{t('join.newHero')}</Text>
                </Pressable>
              </>
            )}
          </>
        )}

        {step === 'create' && (
          <>
            <View style={s.householdBadge}>
              <Text style={s.householdLabel}>{t('join.joining')}</Text>
              <Text style={s.householdName}>{household?.name.toUpperCase()}</Text>
            </View>

            <Text style={s.fieldLabel}>{t('auth.heroName')}</Text>
            <TextInput
              style={s.input}
              placeholder={t('auth.yourName')}
              placeholderTextColor={C.textDim}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              maxLength={20}
            />

            <Text style={s.fieldLabel}>{t('auth.chooseCharacter')}</Text>
            <CharacterPicker value={character} onChange={setCharacter} />

            <Pressable style={({ pressed }) => [s.btn, loading && s.btnDisabled, pressed && s.btnPressed]} onPress={createHero} disabled={loading}>
              <Text style={s.btnText}>{loading ? t('auth.creating') : t('join.startPlaying')}</Text>
            </Pressable>
          </>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner:     { paddingHorizontal: 28, paddingVertical: 48 },

  back:     { marginBottom: 16 },
  backText: { fontFamily: F.pixel, fontSize: 7, color: C.textMuted, letterSpacing: 1 },

  logoBox: {
    alignSelf: 'center', width: 88, height: 88,
    backgroundColor: C.card, borderWidth: 3, borderColor: C.primary,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderBottomWidth: 6, borderBottomColor: C.primaryDark,
  },
  logoEmoji: { fontSize: 44 },
  title:    { fontFamily: F.pixel, fontSize: 16, color: C.primary, textAlign: 'center', marginBottom: 10, letterSpacing: 2 },
  subtitle: { fontFamily: F.body, fontSize: 17, color: C.textMuted, textAlign: 'center', marginBottom: 28, letterSpacing: 0.5, lineHeight: 24 },

  householdBadge: {
    backgroundColor: C.card, borderWidth: 2, borderColor: C.primary,
    borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
    alignItems: 'center', marginBottom: 24,
  },
  householdLabel: { fontFamily: F.pixel, fontSize: 6, color: C.textMuted, letterSpacing: 2, marginBottom: 4 },
  householdName:  { fontFamily: F.pixel, fontSize: 13, color: C.primary, letterSpacing: 1 },

  fieldLabel: { fontFamily: F.pixel, fontSize: 7, color: C.textMuted, letterSpacing: 1, marginBottom: 8 },

  input: {
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderBottomWidth: 3, borderBottomColor: C.primaryDark, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, color: C.text,
    fontFamily: F.body, fontSize: 20, marginBottom: 20, letterSpacing: 1,
  },

  // Hero picker rows
  heroRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderBottomWidth: 3, borderBottomColor: C.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
  },
  heroEmoji: { fontSize: 30 },
  heroName:  { flex: 1, fontFamily: F.pixel, fontSize: 10, color: C.text, letterSpacing: 1 },
  heroLv:    { fontFamily: F.pixel, fontSize: 8, color: C.textMuted },

  newBtn: {
    backgroundColor: C.card, borderWidth: 2, borderColor: C.primary,
    borderBottomWidth: 4, borderBottomColor: C.primaryDark, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 6,
  },
  newBtnText: { fontFamily: F.pixel, fontSize: 10, color: C.primary, letterSpacing: 1 },

  charGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  charCard: {
    flex: 1, minWidth: '28%', backgroundColor: C.card,
    borderWidth: 2, borderColor: C.border, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', gap: 6,
    borderBottomWidth: 3, borderBottomColor: C.border,
  },
  charCardActive: { borderColor: C.primary, borderBottomColor: C.primaryDark, backgroundColor: C.cardAlt },
  charEmoji:      { fontSize: 32 },
  charLabel:      { fontFamily: F.pixel, fontSize: 6, color: C.textMuted, letterSpacing: 0.5 },
  charLabelActive:{ color: C.primary },

  btn: {
    backgroundColor: C.primary, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', borderBottomWidth: 4, borderBottomColor: C.primaryDark,
  },
  btnDisabled:{ opacity: 0.5 },
  btnPressed: { borderBottomWidth: 0, marginTop: 4 },
  btnText:    { fontFamily: F.pixel, fontSize: 10, color: C.bg, letterSpacing: 1 },
});
