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

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'parent' | 'child'>('parent');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!email || !password || !username) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert('Enlistment Failed', error.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      await supabase.from('profiles').update({ username, role }).eq('id', data.user.id);
    }
    setLoading(false);
    Alert.alert('Transmission Sent!', 'Check your email to confirm your agent profile.');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🚀</Text>
        <Text style={styles.title}>Enlist in ChoreQuest</Text>
        <Text style={styles.subtitle}>Create your agent profile</Text>

        <TextInput
          style={styles.input}
          placeholder="Call sign"
          placeholderTextColor="#555570"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
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

        <Text style={styles.roleLabel}>My rank is…</Text>
        <View style={styles.roleRow}>
          {(['parent', 'child'] as const).map((r) => (
            <Pressable
              key={r}
              style={[styles.roleButton, role === r && styles.roleButtonActive]}
              onPress={() => setRole(r)}
            >
              <Text style={styles.roleEmoji}>{r === 'parent' ? '👩‍✈️' : '🤖'}</Text>
              <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                {r === 'parent' ? 'Commander' : 'Cadet'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignUp} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Enlisting…' : 'Begin Mission'}</Text>
        </Pressable>

        <Link href="/(auth)/sign-in" asChild>
          <Pressable style={styles.link}>
            <Text style={styles.linkText}>Already enlisted? <Text style={styles.linkAccent}>Sign In</Text></Text>
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
  title: { fontSize: 28, fontWeight: '800', color: '#00e5ff', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b6b8a', textAlign: 'center', marginBottom: 32 },
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
  roleLabel: { color: '#8e8ea0', fontSize: 14, marginBottom: 8, marginTop: 4 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleButton: {
    flex: 1,
    backgroundColor: '#0d0d1f',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1e3f',
  },
  roleButtonActive: { borderColor: '#00e5ff', backgroundColor: '#001a1f' },
  roleEmoji: { fontSize: 28, marginBottom: 4 },
  roleText: { color: '#8e8ea0', fontWeight: '600' },
  roleTextActive: { color: '#00e5ff' },
  button: {
    backgroundColor: '#00e5ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#05050f', fontWeight: '700', fontSize: 16 },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#6b6b8a', fontSize: 14 },
  linkAccent: { color: '#00e5ff', fontWeight: '600' },
});
