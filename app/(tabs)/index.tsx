import { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable,
  SafeAreaView, StyleSheet, Text, View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { calcLevel, calcTotalDamage } from '../../lib/towerEngine';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';

type Chore = Database['public']['Tables']['chores']['Row'];
type PlayerItem = any;

const STATUS_COLORS: Record<string, string> = {
  pending:     '#d4791c',
  in_progress: '#c4a73e',
  completed:   '#6b9a4a',
  approved:    '#4a8a5e',
};
const STATUS_LABELS: Record<string, string> = {
  pending:     'Open',
  in_progress: 'In Progress',
  completed:   'Done ✓',
  approved:    'Approved ★',
};
const CATEGORY_EMOJI: Record<string, string> = {
  maintenance: '⚙️',
  learning:    '📚',
  food:        '🍽️',
  family:      '👨‍👩‍👧',
  work:        '💼',
};

export default function ChoresScreen() {
  const { profile, refreshProfile } = useAuth();
  const [chores, setChores] = useState<Chore[]>([]);
  const [playerItems, setPlayerItems] = useState<PlayerItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!profile?.household_id) { setLoading(false); return; }
    const [{ data: c }, { data: pi }] = await Promise.all([
      supabase.from('chores').select('*')
        .eq('household_id', profile.household_id)
        .order('created_at', { ascending: false }),
      supabase.from('player_items').select('*, store_items(*)').eq('profile_id', profile.id),
    ]);
    setChores(c ?? []);
    setPlayerItems(pi ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile?.household_id]);

  async function claimChore(id: string) {
    await supabase.from('chores').update({ assigned_to: profile!.id, status: 'in_progress' }).eq('id', id);
    load();
  }

  async function completeChore(id: string) {
    await supabase.from('chores').update({ status: 'completed' }).eq('id', id);
    load();
  }

  async function approveChore(chore: Chore) {
    if (!chore.assigned_to) return;
    await supabase.from('chores').update({ status: 'approved' }).eq('id', chore.id);

    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', chore.assigned_to)
      .single();
    if (!p) return;

    const { data: pi } = await supabase
      .from('player_items')
      .select('*, store_items(*)')
      .eq('profile_id', p.id);

    const damage = calcTotalDamage(chore.damage_reward, p, pi ?? []);
    const newXp = p.xp + chore.xp_reward;
    const newLevel = calcLevel(newXp);
    const newPoints = p.points + chore.points_reward;
    const newMonsterHp = Math.max(0, p.monster_hp - damage);

    const updates: Record<string, any> = {
      xp: newXp,
      level: newLevel,
      points: newPoints,
      monster_hp: newMonsterHp,
    };

    if (newMonsterHp === 0 && p.tower_floor < 20) {
      const nextFloor = p.tower_floor + 1;
      const { data: floorData } = await supabase
        .from('tower_floors').select('monster_max_hp, xp_reward, money_reward')
        .eq('floor', nextFloor).single();
      if (floorData) {
        updates.tower_floor = nextFloor;
        updates.monster_hp = floorData.monster_max_hp;
        updates.xp = newXp + floorData.xp_reward;
        updates.level = calcLevel(newXp + floorData.xp_reward);
        updates.points = newPoints + floorData.money_reward;
      }
    }

    await supabase.from('profiles').update(updates).eq('id', chore.assigned_to);
    if (chore.assigned_to === profile?.id) await refreshProfile();
    load();
  }

  if (!profile?.household_id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🏚️</Text>
          <Text style={styles.emptyTitle}>No Settlement Yet</Text>
          <Text style={styles.emptyText}>Go to the web dashboard to create or join a settlement.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚡ Chores</Text>
        <Text style={styles.headerSub}>{chores.filter(c => c.status === 'pending').length} open</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#d4791c" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={chores}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No chores yet</Text>
              <Text style={styles.emptyText}>A Leader can add tasks from the web dashboard.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const canClaim    = item.status === 'pending';
            const canComplete = item.status === 'in_progress' && item.assigned_to === profile.id;
            const canApprove  = item.status === 'completed' && profile.is_leader;
            const statusColor = STATUS_COLORS[item.status] ?? '#5a4a3a';
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.catEmoji}>{CATEGORY_EMOJI[item.category] ?? '📋'}</Text>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <View style={[styles.badge, { backgroundColor: statusColor + '33' }]}>
                    <Text style={[styles.badgeText, { color: statusColor }]}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </Text>
                  </View>
                </View>
                {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
                <View style={styles.rewards}>
                  <View style={styles.rewardChip}>
                    <Text style={styles.rewardText}>💰 {item.points_reward}</Text>
                  </View>
                  <View style={styles.rewardChip}>
                    <Text style={styles.rewardText}>⭐ {item.xp_reward} xp</Text>
                  </View>
                  <View style={styles.rewardChip}>
                    <Text style={styles.rewardText}>⚔️ {item.damage_reward} dmg</Text>
                  </View>
                </View>
                <View style={styles.cardBottom}>
                  {canClaim && (
                    <Pressable style={styles.btn} onPress={() => claimChore(item.id)}>
                      <Text style={styles.btnText}>Claim</Text>
                    </Pressable>
                  )}
                  {canComplete && (
                    <Pressable style={[styles.btn, { backgroundColor: '#6b9a4a' }]} onPress={() => completeChore(item.id)}>
                      <Text style={styles.btnText}>Report Done</Text>
                    </Pressable>
                  )}
                  {canApprove && (
                    <Pressable style={[styles.btn, { backgroundColor: '#4a8a5e' }]} onPress={() => approveChore(item)}>
                      <Text style={styles.btnText}>Approve ★</Text>
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
  container:   { flex: 1, backgroundColor: '#100d0a' },
  header:      { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#d4791c' },
  headerSub:   { fontSize: 13, color: '#8a7a6a', marginTop: 2 },
  list:        { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#1a1208', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#2a1f14',
  },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
  catEmoji:   { fontSize: 16, marginTop: 1 },
  cardTitle:  { color: '#e8d5b8', fontWeight: '700', fontSize: 16, flex: 1 },
  badge:      { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  desc:       { color: '#8a7a6a', fontSize: 13, marginBottom: 8 },
  rewards:    { flexDirection: 'row', gap: 6, marginBottom: 10 },
  rewardChip: { backgroundColor: '#2a1f14', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  rewardText: { color: '#c4a73e', fontSize: 11, fontWeight: '600' },
  cardBottom: { flexDirection: 'row', justifyContent: 'flex-end' },
  btn: {
    backgroundColor: '#d4791c', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  btnText: { color: '#100d0a', fontWeight: '700', fontSize: 13 },
  empty:      { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { color: '#e8d5b8', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptyText:  { color: '#8a7a6a', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
