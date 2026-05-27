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
        <Text style={styles.headerTitle}>🏆 Hero Rankings</Text>
        <Text style={styles.headerSub}>Your household leaderboard</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#FFD700" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏅</Text>
              <Text style={styles.emptyTitle}>No heroes yet</Text>
              <Text style={styles.emptyText}>Complete quests to appear on the leaderboard.</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const isMe = item.id === profile?.id;
            return (
              <View style={[styles.card, isMe && styles.cardMe]}>
                <Text style={styles.rank}>{RANK_MEDALS[index] ?? `#${index + 1}`}</Text>
                <View style={styles.info}>
                  <Text style={styles.username}>{item.username ?? 'Hero'}</Text>
                  <Text style={styles.role}>{item.role === 'parent' ? '👑 Parent' : '⚡ Child'}</Text>
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
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFD700' },
  headerSub: { fontSize: 13, color: '#888', marginTop: 2 },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a5a',
  },
  cardMe: { borderColor: '#FFD700' },
  rank: { fontSize: 28, width: 44 },
  info: { flex: 1 },
  username: { color: '#fff', fontWeight: '700', fontSize: 16 },
  role: { color: '#888', fontSize: 12, marginTop: 2 },
  stats: { alignItems: 'flex-end' },
  level: { color: '#4FC3F7', fontWeight: '700', fontSize: 13 },
  points: { color: '#FFD700', fontWeight: '700', fontSize: 15, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
