import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { C, F } from '../../constants/theme';

export default function SignIn() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSignIn() {
    if (!email || !password) { Alert.alert('Error', 'Fill in all fields.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('SIGN IN FAILED', error.message);
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.container}>
      <View style={s.inner}>
        {/* Logo */}
        <View style={s.logoBox}>
          <Text style={s.logoEmoji}>🏰</Text>
        </View>
        <Text style={s.title}>CHOREQUEST</Text>
        <Text style={s.subtitle}>SIGN IN TO YOUR ACCOUNT</Text>

        <TextInput
          style={s.input}
          placeholder="EMAIL"
          placeholderTextColor={C.textDim}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={s.input}
          placeholder="PASSWORD"
          placeholderTextColor={C.textDim}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          style={({ pressed }) => [s.btn, loading && s.btnDisabled, pressed && s.btnPressed]}
          onPress={handleSignIn}
          disabled={loading}
        >
          <Text style={s.btnText}>{loading ? 'CONNECTING…' : 'SIGN IN →'}</Text>
        </Pressable>

        {/* Divider */}
        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>OR</Text>
          <View style={s.dividerLine} />
        </View>

        {/* Join family */}
        <Link href="/(auth)/join-family" asChild>
          <Pressable style={({ pressed }) => [s.joinBtn, pressed && s.joinBtnPressed]}>
            <Text style={s.joinBtnText}>👨‍👩‍👧  JOIN A FAMILY</Text>
          </Pressable>
        </Link>

        <Link href="/(auth)/sign-up" asChild>
          <Pressable style={s.link}>
            <Text style={s.linkText}>NO ACCOUNT? <Text style={s.linkAccent}>CREATE ONE</Text></Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner:     { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },

  logoBox: {
    alignSelf: 'center', width: 96, height: 96,
    backgroundColor: C.card, borderWidth: 3, borderColor: C.primary,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    borderBottomWidth: 6, borderBottomColor: C.primaryDark,
  },
  logoEmoji: { fontSize: 52 },
  title:    { fontFamily: F.pixel, fontSize: 18, color: C.primary, textAlign: 'center', marginBottom: 8, letterSpacing: 2 },
  subtitle: { fontFamily: F.body, fontSize: 17, color: C.textMuted, textAlign: 'center', marginBottom: 36, letterSpacing: 1 },

  input: {
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderBottomWidth: 3, borderBottomColor: C.primaryDark, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, color: C.text,
    fontFamily: F.body, fontSize: 18, marginBottom: 12, letterSpacing: 1,
  },

  btn: {
    backgroundColor: C.primary, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 8, borderBottomWidth: 4, borderBottomColor: C.primaryDark,
  },
  btnDisabled:{ opacity: 0.5 },
  btnPressed: { borderBottomWidth: 0, marginTop: 12 },
  btnText:    { fontFamily: F.pixel, fontSize: 10, color: C.bg, letterSpacing: 1 },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 2, backgroundColor: C.border },
  dividerText: { fontFamily: F.pixel, fontSize: 7, color: C.textMuted },

  joinBtn: {
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderBottomWidth: 3, borderBottomColor: C.border, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  joinBtnPressed: { borderBottomWidth: 0, marginTop: 3 },
  joinBtnText:    { fontFamily: F.pixel, fontSize: 9, color: C.text, letterSpacing: 1 },

  link:       { marginTop: 28, alignItems: 'center' },
  linkText:   { fontFamily: F.pixel, fontSize: 7, color: C.textMuted, letterSpacing: 0.5 },
  linkAccent: { color: C.primary },
});
