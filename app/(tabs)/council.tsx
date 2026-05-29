import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

const ROLE_INFO: Record<string, { emoji: string; label: string; desc: string }> = {
  engineer:  { emoji: '🔧', label: 'Engineer',  desc: '+50% Energy from Maintenance' },
  scout:     { emoji: '🥾', label: 'Scout',     desc: 'Scouting missions 30% faster' },
  medic:     { emoji: '💊', label: 'Medic',     desc: '+3 Morale/day passive' },
  trader:    { emoji: '💵', label: 'Trader',    desc: '+50% Money from Special tasks' },
  sentinel:  { emoji: '🔫', label: 'Sentinel',  desc: '+30% combat win rate' },
  scholar:   { emoji: '📚', label: 'Scholar',   desc: '+50% Knowledge from Learning' },
};

const GAME_ROLES = Object.keys(ROLE_INFO);

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function XPBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(value / max, 1);
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${pct * 100}%` as any }]} />
    </View>
  );
}
const pb = StyleSheet.create({
  track: { height: 8, backgroundColor: '#2a1f14', borderRadius: 4, overflow: 'hidden' },
  fill:  { height: 8, backgroundColor: '#d4791c', borderRadius: 4 },
});

export default function CouncilScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [crewName, setCrewName]     = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [creating, setCreating]     = useState(false);
  const [joining, setJoining]       = useState(false);
  const [tab, setTab] = useState<'profile' | 'crew'>('profile');

  useEffect(() => {
    if (!profile?.household_id) return;
    supabase.from('profiles')
      .select('*')
      .eq('household_id', profile.household_id)
      .order('points', { ascending: false })
      .then(({ data }) => setMembers(data ?? []));
  }, [profile?.household_id]);

  async function chooseRole(role: string) {
    if (!profile) return;
    await supabase.from('profiles').update({ role }).eq('id', profile.id);
    await refreshProfile();
    Alert.alert('Role Chosen', `You are now a ${ROLE_INFO[role]?.label ?? role}.`);
  }

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
    await supabase.from('profiles').update({ household_id: data.id, is_leader: true }).eq('id', profile.id);
    await refreshProfile();
    Alert.alert('Settlement Founded!', `Access code: ${code}\nShare this with your group.`);
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
      Alert.alert('Invalid Code', 'No settlement found with that access code.');
      setJoining(false);
      return;
    }
    await supabase.from('profiles').update({ household_id: data.id }).eq('id', profile.id);
    await refreshProfile();
    Alert.alert('Joined!', 'Welcome to the settlement.');
    setJoining(false);
  }

  if (!profile) return null;

  const levelPoints = profile.points % 100;
  const roleInfo = profile.role ? ROLE_INFO[profile.role] : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <Pressable style={[styles.tabBtn, tab === 'profile' && styles.tabBtnActive]} onPress={() => setTab('profile')}>
          <Text style={[styles.tabBtnText, tab === 'profile' && styles.tabBtnTextActive]}>Profile</Text>
        </Pressable>
        <Pressable style={[styles.tabBtn, tab === 'crew' && styles.tabBtnActive]} onPress={() => setTab('crew')}>
          <Text style={[styles.tabBtnText, tab === 'crew' && styles.tabBtnTextActive]}>Settlement</Text>
        </Pressable>
      </View>

      {tab === 'profile' ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Survivor card */}
          <View style={styles.survivorCard}>
            <Text style={styles.avatar}>{profile.is_leader ? '🏛️' : (roleInfo?.emoji ?? '🧍')}</Text>
            <Text style={styles.username}>{profile.username ?? 'Survivor'}</Text>
            <Text style={styles.roleText}>
              {profile.is_leader ? 'Settlement Leader' : (roleInfo ? `${roleInfo.label}` : 'No role chosen')}
            </Text>
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
                <Text style={[styles.statValue, { color: '#c4a73e' }]}>Lv.{profile.level}</Text>
                <Text style={styles.statLabel}>Level</Text>
              </View>
            </View>
          </View>

          {/* Role picker */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Survivor Role</Text>
            <View style={styles.block}>
              <Text style={styles.blockLabel}>{profile.role ? 'Change role' : 'Choose your specialisation'}</Text>
              {GAME_ROLES.map(r => {
                const info = ROLE_INFO[r];
                const isActive = profile.role === r;
                return (
                  <Pressable
                    key={r}
                    style={[styles.roleOption, isActive && styles.roleOptionActive]}
                    onPress={() => {
                      if (isActive) return;
                      Alert.alert(
                        `${info.emoji} ${info.label}`,
                        info.desc,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Choose', onPress: () => chooseRole(r) },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.roleEmoji}>{info.emoji}</Text>
                    <View style={styles.roleBody}>
                      <Text style={[styles.roleName, isActive && styles.roleNameActive]}>{info.label}</Text>
                      <Text style={styles.roleDesc}>{info.desc}</Text>
                    </View>
                    {isActive && <Text style={styles.roleCheck}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable style={styles.signOutBtn} onPress={signOut}>
            <Text style={styles.signOutText}>Leave Settlement</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Leaderboard */}
          {profile.household_id && members.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏆 Rankings</Text>
              {members.map((m, i) => {
                const isMe = m.id === profile.id;
                const mRole = m.role ? ROLE_INFO[m.role] : null;
                return (
                  <View key={m.id} style={[styles.rankCard, isMe && styles.rankCardMe]}>
                    <Text style={styles.rankMedal}>{RANK_MEDALS[i] ?? `#${i + 1}`}</Text>
                    <View style={styles.rankInfo}>
                      <Text style={styles.rankName}>{m.username ?? 'Survivor'}</Text>
                      <Text style={styles.rankRole}>
                        {m.is_leader ? '🏛️ Leader' : (mRole ? `${mRole.emoji} ${mRole.label}` : '🧍 No role')}
                      </Text>
                    </View>
                    <View style={styles.rankStats}>
                      <Text style={styles.rankLevel}>Lv. {m.level}</Text>
                      <Text style={styles.rankPoints}>⭐ {m.points}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Settlement management */}
          {!profile.household_id ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Found or Join a Settlement</Text>

              {/* Only leaders can found */}
              <View style={styles.block}>
                <Text style={styles.blockLabel}>Found a new settlement</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Settlement name"
                  placeholderTextColor="#5a4a3a"
                  value={crewName}
                  onChangeText={setCrewName}
                />
                <Pressable style={[styles.btn, creating && styles.btnDisabled]} onPress={createHousehold} disabled={creating}>
                  <Text style={styles.btnText}>{creating ? 'Founding…' : '🏚️ Found Settlement'}</Text>
                </Pressable>
              </View>

              <View style={styles.block}>
                <Text style={styles.blockLabel}>Join with access code</Text>
                <TextInput
                  style={[styles.input, { textAlign: 'center', letterSpacing: 4 }]}
                  placeholder="6-character code"
                  placeholderTextColor="#5a4a3a"
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="characters"
                />
                <Pressable style={[styles.btn, { backgroundColor: '#6b4a1c' }, joining && styles.btnDisabled]} onPress={joinHousehold} disabled={joining}>
                  <Text style={styles.btnText}>{joining ? 'Connecting…' : 'Join Settlement'}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Settlement</Text>
              <View style={styles.block}>
                <Text style={styles.joinedText}>🏚️ You are part of a settlement</Text>
                {profile.is_leader && (
                  <Text style={styles.blockLabel}>Invite others with the code from the web dashboard.</Text>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#100d0a' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#2a1f14' },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#d4791c' },
  tabBtnText: { color: '#5a4a3a', fontWeight: '700', fontSize: 14 },
  tabBtnTextActive: { color: '#d4791c' },
  scroll: { padding: 20, gap: 20 },
  survivorCard: {
    backgroundColor: '#1a1208',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d4791c',
    gap: 4,
  },
  avatar: { fontSize: 64, marginBottom: 8 },
  username: { color: '#e8d5b8', fontWeight: '800', fontSize: 24 },
  roleText: { color: '#8a7a6a', fontSize: 13, marginBottom: 12 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 6 },
  levelText: { color: '#d4791c', fontWeight: '700', fontSize: 14 },
  levelNext: { color: '#8a7a6a', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 32, marginTop: 16 },
  stat: { alignItems: 'center' },
  statValue: { color: '#e8d5b8', fontWeight: '800', fontSize: 20 },
  statLabel: { color: '#8a7a6a', fontSize: 12, marginTop: 2 },
  section: { gap: 12 },
  sectionTitle: { color: '#d4791c', fontWeight: '700', fontSize: 16 },
  block: { backgroundColor: '#1a1208', borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: '#2a1f14' },
  blockLabel: { color: '#8a7a6a', fontWeight: '600', fontSize: 14 },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#100d0a',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2a1f14',
  },
  roleOptionActive: { borderColor: '#d4791c' },
  roleEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
  roleBody: { flex: 1 },
  roleName: { color: '#8a7a6a', fontWeight: '700', fontSize: 14 },
  roleNameActive: { color: '#d4791c' },
  roleDesc: { color: '#5a4a3a', fontSize: 12, marginTop: 2 },
  roleCheck: { color: '#d4791c', fontWeight: '900', fontSize: 16 },
  input: {
    backgroundColor: '#100d0a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#e8d5b8',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a1f14',
  },
  btn: { backgroundColor: '#d4791c', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#100d0a', fontWeight: '700', fontSize: 15 },
  rankCard: {
    backgroundColor: '#1a1208',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a1f14',
  },
  rankCardMe: { borderColor: '#d4791c' },
  rankMedal: { fontSize: 28, width: 44 },
  rankInfo: { flex: 1 },
  rankName: { color: '#e8d5b8', fontWeight: '700', fontSize: 16 },
  rankRole: { color: '#8a7a6a', fontSize: 12, marginTop: 2 },
  rankStats: { alignItems: 'flex-end' },
  rankLevel: { color: '#c4a73e', fontWeight: '700', fontSize: 13 },
  rankPoints: { color: '#d4791c', fontWeight: '700', fontSize: 15, marginTop: 2 },
  joinedText: { color: '#6b9a4a', fontSize: 15, fontWeight: '600' },
  signOutBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#8a3a1a', marginTop: 8 },
  signOutText: { color: '#8a3a1a', fontWeight: '700', fontSize: 15 },
});
