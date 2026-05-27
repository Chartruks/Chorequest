import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.household_id) { setLoading(false); return; }
    supabase
      .from('profiles')
      .select('*')
      .eq('household_id', profile.household_id)
      .order('points', { ascending: false })
      .then(({ data }) => {
        setMembers(data ?? []);
        setLoading(false);
      });
  }, [profile?.household_id]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Agent Rankings</Text>
        <Text style={styles.headerSub}>Your crew leaderboard</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#00e5ff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏅</Text>
              <Text style={styles.emptyTitle}>No agents yet</Text>
              <Text style={styles.emptyText}>Complete missions to appear on the leaderboard.</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const isMe = item.id === profile?.id;
            return (
              <View style={[styles.card, isMe && styles.cardMe]}>
                <Text style={styles.rank}>{RANK_MEDALS[index] ?? `#${index + 1}`}</Text>
                <View style={styles.info}>
                  <Text style={styles.username}>{item.username ?? 'Agent'}</Text>
                  <Text style={styles.role}>{item.role === 'parent' ? '👩‍✈️ Commander' : '🤖 Cadet'}</Text>
                </View>
                <View style={styles.stats}>
                  <Text style={styles.level}>Lv. {item.level}</Text>
                  <Text style={styles.points}>⭐ {item.points}</Text>
                </View>
              </View>
            );
          }}
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
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#0d0d1f',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1e3f',
  },
  cardMe: { borderColor: '#00e5ff' },
  rank: { fontSize: 28, width: 44 },
  info: { flex: 1 },
  username: { color: '#fff', fontWeight: '700', fontSize: 16 },
  role: { color: '#6b6b8a', fontSize: 12, marginTop: 2 },
  stats: { alignItems: 'flex-end' },
  level: { color: '#bf5af2', fontWeight: '700', fontSize: 13 },
  points: { color: '#00e5ff', fontWeight: '700', fontSize: 15, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: '#6b6b8a', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
