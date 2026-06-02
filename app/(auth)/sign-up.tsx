import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import CharacterPicker from '../../components/CharacterPicker';
import { C, F } from '../../constants/theme';

export default function SignUp() {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [username, setUsername]   = useState('');
  const [character, setCharacter] = useState('1');
  const [loading, setLoading]     = useState(false);

  async function handleSignUp() {
    if (!email || !password || !username) {
      Alert.alert('Error', 'Fill in all fields.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert('SIGN UP FAILED', error.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      await supabase.from('profiles').update({ username, character_type: character } as any).eq('id', data.user.id);
    }
    setLoading(false);
    Alert.alert('CHECK YOUR EMAIL', 'Confirm your email, then sign in to start your quest.');
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.container}>
      <ScrollView contentContainerStyle={s.inner} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={s.logoBox}><Text style={s.logoEmoji}>🏰</Text></View>
        <Text style={s.title}>CHOREQUEST</Text>
        <Text style={s.subtitle}>CREATE YOUR HERO</Text>

        <Text style={s.fieldLabel}>HERO NAME</Text>
        <TextInput
          style={s.input}
          placeholder="YOUR NAME"
          placeholderTextColor={C.textDim}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="words"
          maxLength={20}
        />

        <Text style={s.fieldLabel}>CHOOSE YOUR CHARACTER</Text>
        <CharacterPicker value={character} onChange={setCharacter} />

        <Text style={s.fieldLabel}>EMAIL</Text>
        <TextInput
          style={s.input}
          placeholder="YOUR@EMAIL.COM"
          placeholderTextColor={C.textDim}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={s.fieldLabel}>PASSWORD</Text>
        <TextInput
          style={s.input}
          placeholder="SECRET CODE"
          placeholderTextColor={C.textDim}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          style={({ pressed }) => [s.btn, loading && s.btnDisabled, pressed && s.btnPressed]}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={s.btnText}>{loading ? 'CREATING…' : 'START QUEST →'}</Text>
        </Pressable>

        <Link href="/(auth)/sign-in" asChild>
          <Pressable style={s.link}>
            <Text style={s.linkText}>ALREADY HAVE AN ACCOUNT? <Text style={s.linkAccent}>SIGN IN</Text></Text>
          </Pressable>
        </Link>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner:     { justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 48 },

  logoBox: {
    alignSelf: 'center', width: 80, height: 80,
    backgroundColor: C.card, borderWidth: 3, borderColor: C.primary,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderBottomWidth: 5, borderBottomColor: C.primaryDark,
  },
  logoEmoji: { fontSize: 42 },
  title:    { fontFamily: F.pixel, fontSize: 18, color: C.primary, textAlign: 'center', marginBottom: 6, letterSpacing: 2 },
  subtitle: { fontFamily: F.body, fontSize: 18, color: C.textMuted, textAlign: 'center', marginBottom: 28, letterSpacing: 1 },

  fieldLabel: { fontFamily: F.pixel, fontSize: 7, color: C.textMuted, letterSpacing: 1, marginBottom: 8 },

  input: {
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderBottomWidth: 3, borderBottomColor: C.primaryDark, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, color: C.text,
    fontFamily: F.body, fontSize: 18, marginBottom: 16, letterSpacing: 1,
  },

  btn: {
    backgroundColor: C.primary, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 4, borderBottomWidth: 4, borderBottomColor: C.primaryDark,
  },
  btnDisabled:{ opacity: 0.5 },
  btnPressed: { borderBottomWidth: 0, marginTop: 8 },
  btnText:    { fontFamily: F.pixel, fontSize: 10, color: C.bg, letterSpacing: 1 },

  link:       { marginTop: 28, alignItems: 'center' },
  linkText:   { fontFamily: F.pixel, fontSize: 7, color: C.textMuted, letterSpacing: 0.5 },
  linkAccent: { color: C.primary },
});
