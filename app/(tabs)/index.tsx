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
  pending: '#00e5ff',
  in_progress: '#bf5af2',
  completed: '#30d158',
  approved: '#0abe6a',
};

const STATUS_LABELS: Record<Chore['status'], string> = {
  pending: 'Open',
  in_progress: 'In Progress',
  completed: 'Done ✓',
  approved: 'Authorized ★',
};

export default function MissionsScreen() {
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
          <Text style={styles.emptyEmoji}>🛸</Text>
          <Text style={styles.emptyTitle}>No Crew Yet</Text>
          <Text style={styles.emptyText}>Go to your Agent profile to create or join a crew.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚀 Missions</Text>
        <Text style={styles.headerSub}>{chores.filter(c => c.status === 'pending').length} open missions</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#00e5ff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={chores}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📡</Text>
              <Text style={styles.emptyTitle}>No missions yet</Text>
              <Text style={styles.emptyText}>A Commander can deploy missions from the web app.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] + '22' }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] }]}>
                    {STATUS_LABELS[item.status]}
                  </Text>
                </View>
              </View>
              {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
              <View style={styles.cardBottom}>
                <Text style={styles.points}>⭐ {item.points_reward} cr</Text>
                {item.status === 'pending' && profile.role === 'child' && (
                  <Pressable style={styles.actionBtn} onPress={() => claimChore(item.id)}>
                    <Text style={styles.actionBtnText}>Accept</Text>
                  </Pressable>
                )}
                {item.status === 'in_progress' && item.assigned_to === profile.id && (
                  <Pressable style={[styles.actionBtn, { backgroundColor: '#30d158' }]} onPress={() => completeChore(item.id)}>
                    <Text style={styles.actionBtnText}>Report Done</Text>
                  </Pressable>
                )}
                {item.status === 'completed' && profile.role === 'parent' && (
                  <Pressable style={[styles.actionBtn, { backgroundColor: '#0abe6a' }]} onPress={() => approveChore(item)}>
                    <Text style={styles.actionBtnText}>Authorize ★</Text>
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
  container: { flex: 1, backgroundColor: '#05050f' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#00e5ff' },
  headerSub: { fontSize: 13, color: '#6b6b8a', marginTop: 2 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#0d0d1f',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e1e3f',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 16, flex: 1, marginRight: 8 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { color: '#6b6b8a', fontSize: 13, marginBottom: 10 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  points: { color: '#00e5ff', fontWeight: '700', fontSize: 14 },
  actionBtn: {
    backgroundColor: '#00e5ff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionBtnText: { color: '#05050f', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: '#6b6b8a', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
