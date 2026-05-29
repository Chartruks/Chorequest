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
import { applyMoraleMultiplier } from '../../lib/idleEngine';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';

type Chore = Database['public']['Tables']['chores']['Row'];

const STATUS_COLORS: Record<string, string> = {
  pending:    '#d4791c',
  in_progress:'#c4a73e',
  completed:  '#6b9a4a',
  approved:   '#4a8a5e',
};

const STATUS_LABELS: Record<string, string> = {
  pending:    'Open',
  in_progress:'In Progress',
  completed:  'Done ✓',
  approved:   'Ratified ★',
};

const CATEGORY_EMOJI: Record<string, string> = {
  maintenance: '⚙️',
  learning:    '📚',
  cleanliness: '🍽️',
  family:      '👨‍👩‍👧',
  special:     '⭐',
};

export default function ChoresScreen() {
  const { profile, gameState, refreshGameState } = useAuth();
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

    const morale = gameState?.morale ?? 75;

    if (chore.assigned_to) {
      const { data: p } = await supabase
        .from('profiles')
        .select('points, level')
        .eq('id', chore.assigned_to)
        .single();
      if (p) {
        const rawPoints = applyMoraleMultiplier(chore.points_reward, morale);
        const newPoints = p.points + rawPoints;
        const newLevel = Math.floor(newPoints / 100) + 1;
        await supabase.from('profiles').update({ points: newPoints, level: newLevel }).eq('id', chore.assigned_to);
      }

      if (profile?.household_id && gameState) {
        await supabase.from('game_state').update({
          energy:    gameState.energy    + applyMoraleMultiplier(chore.energy_reward,    morale),
          knowledge: gameState.knowledge + applyMoraleMultiplier(chore.knowledge_reward, morale),
          money:     gameState.money     + applyMoraleMultiplier(chore.money_reward,     morale),
          food:      gameState.food      + applyMoraleMultiplier(chore.food_reward,      morale),
          morale:    Math.min(100, gameState.morale + applyMoraleMultiplier(chore.morale_reward, morale)),
        }).eq('household_id', profile.household_id);
        await refreshGameState();
      }
    }
    fetchChores();
  }

  useEffect(() => { fetchChores(); }, [profile?.household_id]);

  if (!profile?.household_id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🏚️</Text>
          <Text style={styles.emptyTitle}>No Settlement Yet</Text>
          <Text style={styles.emptyText}>Go to the Council tab to create or join a settlement.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚡ Chores</Text>
        <Text style={styles.headerSub}>{chores.filter(c => c.status === 'pending').length} tasks open</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#d4791c" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={chores}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No tasks yet</Text>
              <Text style={styles.emptyText}>A Leader can assign tasks from the web dashboard.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const resourceLine = [
              item.energy_reward    > 0 && `⚡+${item.energy_reward}`,
              item.knowledge_reward > 0 && `📚+${item.knowledge_reward}`,
              item.money_reward     > 0 && `💵+${item.money_reward}`,
              item.food_reward      > 0 && `🥫+${item.food_reward}`,
              item.morale_reward    > 0 && `💜+${item.morale_reward}`,
            ].filter(Boolean).join('  ');

            const canClaim    = item.status === 'pending';
            const canComplete = item.status === 'in_progress' && item.assigned_to === profile.id;
            const canApprove  = item.status === 'completed' && profile.is_leader;

            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardCategory}>{CATEGORY_EMOJI[item.category] ?? '📋'}</Text>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[item.status] ?? '#5a4a3a') + '33' }]}>
                    <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] ?? '#8a7a6a' }]}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </Text>
                  </View>
                </View>
                {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
                <View style={styles.cardBottom}>
                  <View>
                    <Text style={styles.points}>⭐ {item.points_reward} cr</Text>
                    {resourceLine ? <Text style={styles.resources}>{resourceLine}</Text> : null}
                  </View>
                  {canClaim && (
                    <Pressable style={styles.actionBtn} onPress={() => claimChore(item.id)}>
                      <Text style={styles.actionBtnText}>Claim</Text>
                    </Pressable>
                  )}
                  {canComplete && (
                    <Pressable style={[styles.actionBtn, { backgroundColor: '#6b9a4a' }]} onPress={() => completeChore(item.id)}>
                      <Text style={styles.actionBtnText}>Report Done</Text>
                    </Pressable>
                  )}
                  {canApprove && (
                    <Pressable style={[styles.actionBtn, { backgroundColor: '#4a8a5e' }]} onPress={() => approveChore(item)}>
                      <Text style={styles.actionBtnText}>Ratify ★</Text>
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
  container: { flex: 1, backgroundColor: '#100d0a' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#d4791c' },
  headerSub: { fontSize: 13, color: '#8a7a6a', marginTop: 2 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#1a1208',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a1f14',
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, gap: 6 },
  cardCategory: { fontSize: 16, marginTop: 1 },
  cardTitle: { color: '#e8d5b8', fontWeight: '700', fontSize: 16, flex: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { color: '#8a7a6a', fontSize: 13, marginBottom: 10 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  points: { color: '#d4791c', fontWeight: '700', fontSize: 14 },
  resources: { color: '#8a7a6a', fontSize: 11, marginTop: 2 },
  actionBtn: {
    backgroundColor: '#d4791c',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionBtnText: { color: '#100d0a', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { color: '#e8d5b8', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: '#8a7a6a', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
