import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(value / max, 1);
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${pct * 100}%` as any }]} />
    </View>
  );
}

const pb = StyleSheet.create({
  track: { height: 8, backgroundColor: '#2a2a5a', borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: '#FFD700', borderRadius: 4 },
});

export default function ProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);

  const pointsForNextLevel = profile ? profile.level * 100 : 100;
  const currentLevelPoints = profile ? profile.points % 100 : 0;

  async function createHousehold() {
    if (!householdName.trim() || !profile) return;
    setCreating(true);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase
      .from('households')
      .insert({ name: householdName.trim(), invite_code: code, created_by: profile.id })
      .select()
      .single();
    if (error) { Alert.alert('Error', error.message); setCreating(false); return; }
    await supabase.from('profiles').update({ household_id: data.id }).eq('id', profile.id);
    await refreshProfile();
    Alert.alert('Household Created!', `Invite code: ${code}\nShare this with your family.`);
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
      Alert.alert('Invalid Code', 'No household found with that invite code.');
      setJoining(false);
      return;
    }
    await supabase.from('profiles').update({ household_id: data.id }).eq('id', profile.id);
    await refreshProfile();
    Alert.alert('Joined!', 'Welcome to the household!');
    setJoining(false);
  }

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroCard}>
          <Text style={styles.avatar}>{profile.role === 'parent' ? '👑' : '⚡'}</Text>
          <Text style={styles.username}>{profile.username ?? 'Hero'}</Text>
          <Text style={styles.roleText}>{profile.role === 'parent' ? 'Parent · Quest Master' : 'Child · Hero'}</Text>

          <View style={styles.levelRow}>
            <Text style={styles.levelText}>Level {profile.level}</Text>
            <Text style={styles.levelNext}>{currentLevelPoints} / 100 xp</Text>
          </View>
          <ProgressBar value={currentLevelPoints} max={100} />

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>⭐ {profile.points}</Text>
              <Text style={styles.statLabel}>Total Points</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>🗡️ {profile.level}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
          </View>
        </View>

        {!profile.household_id ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Join or Create a Household</Text>

            {profile.role === 'parent' && (
              <View style={styles.householdBlock}>
                <Text style={styles.blockLabel}>Create Household</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Household name"
                  placeholderTextColor="#888"
                  value={householdName}
                  onChangeText={setHouseholdName}
                />
                <Pressable style={[styles.btn, creating && styles.btnDisabled]} onPress={createHousehold} disabled={creating}>
                  <Text style={styles.btnText}>{creating ? 'Creating...' : 'Create'}</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.householdBlock}>
              <Text style={styles.blockLabel}>Join with Invite Code</Text>
              <TextInput
                style={styles.input}
                placeholder="6-digit code"
                placeholderTextColor="#888"
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
              />
              <Pressable style={[styles.btn, { backgroundColor: '#4FC3F7' }, joining && styles.btnDisabled]} onPress={joinHousehold} disabled={joining}>
                <Text style={[styles.btnText, { color: '#1a1a2e' }]}>{joining ? 'Joining...' : 'Join'}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Household</Text>
            <Text style={styles.householdJoined}>✅ You're part of a household</Text>
          </View>
        )}

        <Pressable style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scroll: { padding: 20, gap: 20 },
  heroCard: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  avatar: { fontSize: 64, marginBottom: 8 },
  username: { color: '#fff', fontWeight: '800', fontSize: 24 },
  roleText: { color: '#888', fontSize: 13, marginBottom: 16 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 6 },
  levelText: { color: '#FFD700', fontWeight: '700', fontSize: 14 },
  levelNext: { color: '#888', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 32, marginTop: 20 },
  stat: { alignItems: 'center' },
  statValue: { color: '#fff', fontWeight: '800', fontSize: 20 },
  statLabel: { color: '#888', fontSize: 12, marginTop: 2 },
  section: { gap: 12 },
  sectionTitle: { color: '#FFD700', fontWeight: '700', fontSize: 16 },
  householdBlock: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2a2a5a',
  },
  blockLabel: { color: '#fff', fontWeight: '600', fontSize: 14 },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2a5a',
  },
  btn: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#1a1a2e', fontWeight: '700', fontSize: 15 },
  householdJoined: { color: '#81C784', fontSize: 15, fontWeight: '600' },
  signOutBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff4444',
    marginTop: 8,
  },
  signOutText: { color: '#ff4444', fontWeight: '700', fontSize: 15 },
});
