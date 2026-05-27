import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';

type Chore = Database['public']['Tables']['chores']['Row'];

const STATUS_COLORS: Record<Chore['status'], string> = {
  pending: '#FFD700',
  in_progress: '#4FC3F7',
  completed: '#81C784',
  approved: '#A5D6A7',
};

const STATUS_LABELS: Record<Chore['status'], string> = {
  pending: 'Open',
  in_progress: 'In Progress',
  completed: 'Done ✓',
  approved: 'Approved ★',
};

export default function QuestsScreen() {
  const { profile } = useAuth();
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchChores() {
    if (!profile?.household_id) { setLoading(false); return; }
    const { data } = await supabase
      .from('chores')
      .select('*')
      .eq('household_id', profile.household_id)
      .order('created_at', { ascending: false });
    setChores(data ?? []);
    setLoading(false);
  }

  async function claimChore(id: string) {
    await supabase.from('chores').update({ assigned_to: profile!.id, status: 'in_progress' }).eq('id', id);
    fetchChores();
  }

  async function completeChore(id: string) {
    await supabase.from('chores').update({ status: 'completed' }).eq('id', id);
    fetchChores();
  }

  async function approveChore(chore: Chore) {
    await supabase.from('chores').update({ status: 'approved' }).eq('id', chore.id);
    if (chore.assigned_to) {
      const { data: p } = await supabase.from('profiles').select('points, level').eq('id', chore.assigned_to).single();
      if (p) {
        const newPoints = p.points + chore.points_reward;
        const newLevel = Math.floor(newPoints / 100) + 1;
        await supabase.from('profiles').update({ points: newPoints, level: newLevel }).eq('id', chore.assigned_to);
      }
    }
    fetchChores();
  }

  useEffect(() => { fetchChores(); }, [profile?.household_id]);

  if (!profile?.household_id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🏰</Text>
          <Text style={styles.emptyTitle}>No Household Yet</Text>
          <Text style={styles.emptyText}>Go to your Hero profile to create or join a household.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚔️ Quests</Text>
        <Text style={styles.headerSub}>{chores.filter(c => c.status === 'pending').length} open quests</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#FFD700" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={chores}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📜</Text>
              <Text style={styles.emptyTitle}>No quests yet</Text>
              <Text style={styles.emptyText}>A parent can add quests from here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] + '33' }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] }]}>
                    {STATUS_LABELS[item.status]}
                  </Text>
                </View>
              </View>
              {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
              <View style={styles.cardBottom}>
                <Text style={styles.points}>⭐ {item.points_reward} pts</Text>
                {item.status === 'pending' && profile.role === 'child' && (
                  <Pressable style={styles.actionBtn} onPress={() => claimChore(item.id)}>
                    <Text style={styles.actionBtnText}>Claim</Text>
                  </Pressable>
                )}
                {item.status === 'in_progress' && item.assigned_to === profile.id && (
                  <Pressable style={[styles.actionBtn, { backgroundColor: '#81C784' }]} onPress={() => completeChore(item.id)}>
                    <Text style={[styles.actionBtnText, { color: '#1a1a2e' }]}>Complete</Text>
                  </Pressable>
                )}
                {item.status === 'completed' && profile.role === 'parent' && (
                  <Pressable style={[styles.actionBtn, { backgroundColor: '#A5D6A7' }]} onPress={() => approveChore(item)}>
                    <Text style={[styles.actionBtnText, { color: '#1a1a2e' }]}>Approve ★</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFD700' },
  headerSub: { fontSize: 13, color: '#888', marginTop: 2 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a5a',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 16, flex: 1, marginRight: 8 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { color: '#aaa', fontSize: 13, marginBottom: 10 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  points: { color: '#FFD700', fontWeight: '700', fontSize: 14 },
  actionBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionBtnText: { color: '#1a1a2e', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
