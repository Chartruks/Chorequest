import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

function XPBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(value / max, 1);
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${pct * 100}%` as any }]} />
    </View>
  );
}

const pb = StyleSheet.create({
  track: { height: 8, backgroundColor: '#1e1e3f', borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: '#00e5ff', borderRadius: 4 },
});

export default function ProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [crewName, setCrewName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);

  const levelPoints = profile ? profile.points % 100 : 0;

  async function createHousehold() {
    if (!crewName.trim() || !profile) return;
    setCreating(true);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase
      .from('households')
      .insert({ name: crewName.trim(), invite_code: code, created_by: profile.id })
      .select()
      .single();
    if (error) { Alert.alert('Error', error.message); setCreating(false); return; }
    await supabase.from('profiles').update({ household_id: data.id }).eq('id', profile.id);
    await refreshProfile();
    Alert.alert('Crew Established!', `Access code: ${code}\nShare this with your crew.`);
    setCreating(false);
  }

  async function joinHousehold() {
    if (!inviteCode.trim() || !profile) return;
    setJoining(true);
    const { data, error } = await supabase
      .from('households')
      .select('id')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .single();
    if (error || !data) {
      Alert.alert('Invalid Code', 'No crew found with that access code.');
      setJoining(false);
      return;
    }
    await supabase.from('profiles').update({ household_id: data.id }).eq('id', profile.id);
    await refreshProfile();
    Alert.alert('Crew Joined!', 'Welcome aboard, Agent.');
    setJoining(false);
  }

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.agentCard}>
          <Text style={styles.avatar}>{profile.role === 'parent' ? '👩‍✈️' : '🤖'}</Text>
          <Text style={styles.username}>{profile.username ?? 'Agent'}</Text>
          <Text style={styles.roleText}>{profile.role === 'parent' ? 'Commander · Mission Control' : 'Cadet · Field Agent'}</Text>

          <View style={styles.levelRow}>
            <Text style={styles.levelText}>Level {profile.level}</Text>
            <Text style={styles.levelNext}>{levelPoints} / 100 xp</Text>
          </View>
          <XPBar value={levelPoints} max={100} />

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>⭐ {profile.points}</Text>
              <Text style={styles.statLabel}>Credits</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: '#bf5af2' }]}>⚡ {profile.level}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
          </View>
        </View>

        {!profile.household_id ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Crew</Text>

            {profile.role === 'parent' && (
              <View style={styles.block}>
                <Text style={styles.blockLabel}>Establish a crew</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Crew name"
                  placeholderTextColor="#555570"
                  value={crewName}
                  onChangeText={setCrewName}
                />
                <Pressable style={[styles.btn, creating && styles.btnDisabled]} onPress={createHousehold} disabled={creating}>
                  <Text style={styles.btnText}>{creating ? 'Establishing…' : 'Establish Crew'}</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.block}>
              <Text style={styles.blockLabel}>Join with access code</Text>
              <TextInput
                style={[styles.input, { textAlign: 'center', letterSpacing: 4, fontFamily: 'monospace' }]}
                placeholder="6-character code"
                placeholderTextColor="#555570"
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
              />
              <Pressable style={[styles.btn, { backgroundColor: '#bf5af2' }, joining && styles.btnDisabled]} onPress={joinHousehold} disabled={joining}>
                <Text style={styles.btnText}>{joining ? 'Connecting…' : 'Join Crew'}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Crew</Text>
            <Text style={styles.crewJoined}>🛸 You're part of a crew</Text>
          </View>
        )}

        <Pressable style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Disconnect</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05050f' },
  scroll: { padding: 20, gap: 20 },
  agentCard: {
    backgroundColor: '#0d0d1f',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00e5ff',
  },
  avatar: { fontSize: 64, marginBottom: 8 },
  username: { color: '#fff', fontWeight: '800', fontSize: 24 },
  roleText: { color: '#6b6b8a', fontSize: 13, marginBottom: 16 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 6 },
  levelText: { color: '#00e5ff', fontWeight: '700', fontSize: 14 },
  levelNext: { color: '#6b6b8a', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 32, marginTop: 20 },
  stat: { alignItems: 'center' },
  statValue: { color: '#fff', fontWeight: '800', fontSize: 20 },
  statLabel: { color: '#6b6b8a', fontSize: 12, marginTop: 2 },
  section: { gap: 12 },
  sectionTitle: { color: '#00e5ff', fontWeight: '700', fontSize: 16 },
  block: {
    backgroundColor: '#0d0d1f',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#1e1e3f',
  },
  blockLabel: { color: '#8e8ea0', fontWeight: '600', fontSize: 14 },
  input: {
    backgroundColor: '#05050f',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#1e1e3f',
  },
  btn: {
    backgroundColor: '#00e5ff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#05050f', fontWeight: '700', fontSize: 15 },
  crewJoined: { color: '#30d158', fontSize: 15, fontWeight: '600' },
  signOutBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff453a',
    marginTop: 8,
  },
  signOutText: { color: '#ff453a', fontWeight: '700', fontSize: 15 },
});
