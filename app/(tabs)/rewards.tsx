import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';

type Reward = Database['public']['Tables']['rewards']['Row'];

export default function RewardsScreen() {
  const { profile, refreshProfile } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchRewards() {
    if (!profile?.household_id) { setLoading(false); return; }
    const { data } = await supabase
      .from('rewards')
      .select('*')
      .eq('household_id', profile.household_id)
      .order('points_cost', { ascending: true });
    setRewards(data ?? []);
    setLoading(false);
  }

  async function redeemReward(reward: Reward) {
    if (!profile) return;
    if (profile.points < reward.points_cost) {
      Alert.alert('Not enough points', `You need ${reward.points_cost - profile.points} more points.`);
      return;
    }
    Alert.alert('Redeem Reward', `Spend ${reward.points_cost} points on "${reward.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Redeem',
        onPress: async () => {
          await supabase
            .from('profiles')
            .update({ points: profile.points - reward.points_cost })
            .eq('id', profile.id);
          await refreshProfile();
          Alert.alert('🎉 Redeemed!', `You got "${reward.title}"! Show this to a parent.`);
        },
      },
    ]);
  }

  useEffect(() => { fetchRewards(); }, [profile?.household_id]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎁 Rewards</Text>
        <Text style={styles.headerSub}>You have ⭐ {profile?.points ?? 0} points</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#FFD700" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rewards}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎀</Text>
              <Text style={styles.emptyTitle}>No rewards yet</Text>
              <Text style={styles.emptyText}>A parent can add rewards for the household.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const canAfford = (profile?.points ?? 0) >= item.points_cost;
            return (
              <View style={[styles.card, !canAfford && styles.cardLocked]}>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.cost, !canAfford && styles.costLocked]}>⭐ {item.points_cost}</Text>
                  {profile?.role === 'child' && (
                    <Pressable
                      style={[styles.redeemBtn, !canAfford && styles.redeemBtnDisabled]}
                      onPress={() => redeemReward(item)}
                      disabled={!canAfford}
                    >
                      <Text style={styles.redeemBtnText}>{canAfford ? 'Redeem' : '🔒'}</Text>
                    </Pressable>
                  )}
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
  headerSub: { fontSize: 13, color: '#FFD700', marginTop: 2 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a5a',
  },
  cardLocked: { opacity: 0.6 },
  cardContent: { flex: 1 },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cardDesc: { color: '#aaa', fontSize: 13, marginTop: 4 },
  cardRight: { alignItems: 'flex-end', marginLeft: 12 },
  cost: { color: '#FFD700', fontWeight: '700', fontSize: 15, marginBottom: 8 },
  costLocked: { color: '#888' },
  redeemBtn: { backgroundColor: '#FFD700', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  redeemBtnDisabled: { backgroundColor: '#333' },
  redeemBtnText: { color: '#1a1a2e', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: '#888', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
