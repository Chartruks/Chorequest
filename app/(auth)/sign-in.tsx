import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Sign In Failed', error.message);
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🚀</Text>
        <Text style={styles.title}>ChoreQuest</Text>
        <Text style={styles.subtitle}>Sign in to resume your mission</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#555570"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#555570"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignIn} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Connecting…' : 'Sign In'}</Text>
        </Pressable>

        <Link href="/(auth)/sign-up" asChild>
          <Pressable style={styles.link}>
            <Text style={styles.linkText}>No account? <Text style={styles.linkAccent}>Enlist Now</Text></Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05050f' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  logo: { fontSize: 64, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 36, fontWeight: '800', color: '#00e5ff', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b6b8a', textAlign: 'center', marginBottom: 40 },
  input: {
    backgroundColor: '#0d0d1f',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e1e3f',
  },
  button: {
    backgroundColor: '#00e5ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#05050f', fontWeight: '700', fontSize: 16 },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#6b6b8a', fontSize: 14 },
  linkAccent: { color: '#00e5ff', fontWeight: '600' },
});
