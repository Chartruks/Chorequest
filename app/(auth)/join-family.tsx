import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { C, F } from '../../constants/theme';

type Step = 'code' | 'profile';

const CHARACTERS = [
  { emoji: '🧑', label: 'WARRIOR' },
  { emoji: '🧙', label: 'MAGE'    },
  { emoji: '🏹', label: 'RANGER'  },
  { emoji: '🛡️', label: 'KNIGHT'  },
  { emoji: '🧝', label: 'ELF'     },
];

export default function JoinFamily() {
  const [step, setStep]             = useState<Step>('code');
  const [code, setCode]             = useState('');
  const [household, setHousehold]   = useState<{ id: string; name: string } | null>(null);
  const [name, setName]             = useState('');
  const [character, setCharacter]   = useState(CHARACTERS[0].emoji);
  const [loading, setLoading]       = useState(false);

  async function verifyCode() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { Alert.alert('Error', 'Enter a family code.'); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('households')
      .select('id, name')
      .eq('invite_code', trimmed)
      .single();
    setLoading(false);
    if (error || !data) {
      Alert.alert('CODE NOT FOUND', 'Check the code and try again.');
      return;
    }
    setHousehold(data);
    setStep('profile');
  }

  async function joinFamily() {
    if (!name.trim()) { Alert.alert('Error', 'Enter your hero name.'); return; }
    if (!household)   return;
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    if (authError || !authData.user) {
      Alert.alert('ERROR', authError?.message ?? 'Could not create account.');
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id:             authData.user.id,
      username:       name.trim(),
      household_id:   household.id,
      character_type: character,
      is_leader:      false,
      role:           'child',
    }, { onConflict: 'id' });

    if (profileError) {
      Alert.alert('ERROR', profileError.message);
      setLoading(false);
      return;
    }

    // Auth state change in AuthContext will handle navigation
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.container}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Back */}
        <Pressable onPress={() => step === 'profile' ? setStep('code') : router.back()} style={s.back}>
          <Text style={s.backText}>← BACK</Text>
        </Pressable>

        {/* Logo */}
        <View style={s.logoBox}>
          <Text style={s.logoEmoji}>👨‍👩‍👧</Text>
        </View>
        <Text style={s.title}>JOIN A FAMILY</Text>

        {step === 'code' ? (
          <>
            <Text style={s.subtitle}>ENTER THE CODE YOUR FAMILY LEADER GAVE YOU</Text>

            <TextInput
              style={s.input}
              placeholder="FAMILY CODE"
              placeholderTextColor={C.textDim}
              value={code}
              onChangeText={t => setCode(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
            />

            <Pressable
              style={({ pressed }) => [s.btn, loading && s.btnDisabled, pressed && s.btnPressed]}
              onPress={verifyCode}
              disabled={loading}
            >
              <Text style={s.btnText}>{loading ? 'CHECKING…' : 'VERIFY CODE →'}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={s.householdBadge}>
              <Text style={s.householdLabel}>JOINING</Text>
              <Text style={s.householdName}>{household?.name.toUpperCase()}</Text>
            </View>

            <Text style={s.fieldLabel}>YOUR HERO NAME</Text>
            <TextInput
              style={s.input}
              placeholder="ENTER YOUR NAME"
              placeholderTextColor={C.textDim}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              maxLength={20}
            />

            <Text style={s.fieldLabel}>CHOOSE YOUR CHARACTER</Text>
            <View style={s.charGrid}>
              {CHARACTERS.map(c => (
                <Pressable
                  key={c.emoji}
                  style={[s.charCard, character === c.emoji && s.charCardActive]}
                  onPress={() => setCharacter(c.emoji)}
                >
                  <Text style={s.charEmoji}>{c.emoji}</Text>
                  <Text style={[s.charLabel, character === c.emoji && s.charLabelActive]}>{c.label}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [s.btn, loading && s.btnDisabled, pressed && s.btnPressed]}
              onPress={joinFamily}
              disabled={loading}
            >
              <Text style={s.btnText}>{loading ? 'JOINING…' : 'JOIN FAMILY →'}</Text>
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

  charGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  charCard: {
    flex: 1, minWidth: '28%', backgroundColor: C.card,
    borderWidth: 2, borderColor: C.border, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', gap: 6,
    borderBottomWidth: 3, borderBottomColor: C.border,
  },
  charCardActive: {
    borderColor: C.primary, borderBottomColor: C.primaryDark,
    backgroundColor: C.cardAlt,
  },
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
