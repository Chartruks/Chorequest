import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Pressable,
  SafeAreaView, StyleSheet, Text, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';

type StoreItem = Database['public']['Tables']['store_items']['Row'];
type PlayerItem = { id: string; item_id: string; equipped: boolean };

const FILTERS = ['all', 'character', 'weapon', 'armor', 'consumable'] as const;
type Filter = typeof FILTERS[number];

const FILTER_LABEL: Record<Filter, string> = {
  all: 'All', character: '🧑 Chars', weapon: '⚔️ Weapons', armor: '🛡️ Armor', consumable: '💊 Use',
};

export default function StoreScreen() {
  const { profile, refreshProfile } = useAuth();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [owned, setOwned] = useState<PlayerItem[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        if (!profile) return;
        const [{ data: si }, { data: pi }] = await Promise.all([
          supabase.from('store_items').select('*').order('sort_order'),
          supabase.from('player_items').select('id, item_id, equipped').eq('profile_id', profile.id),
        ]);
        setItems(si ?? []);
        setOwned(pi ?? []);
        setLoading(false);
      }
      load();
    }, [profile?.id])
  );

  async function buy(item: StoreItem) {
    if (!profile) return;
    if (profile.points < item.cost) {
      Alert.alert('Not enough money', `You need 💰${item.cost} but have 💰${profile.points}.`);
      return;
    }
    setBuying(item.id);

    if (item.item_type === 'consumable') {
      // Instant use
      const newHp = Math.min(profile.player_max_hp, profile.player_hp + item.heal_amount);
      await supabase.from('profiles').update({
        points: profile.points - item.cost,
        player_hp: newHp,
      }).eq('id', profile.id);
      await refreshProfile();
      Alert.alert('Used!', `Restored ${item.heal_amount > 900 ? 'all' : item.heal_amount} HP.`);
    } else {
      // Unequip any existing item of same type
      const sameType = owned.filter(o => {
        const si = items.find(i => i.id === o.item_id);
        return si?.item_type === item.item_type && o.equipped;
      });
      for (const old of sameType) {
        await supabase.from('player_items').update({ equipped: false }).eq('id', old.id);
      }

      // Add to inventory (equipped)
      await supabase.from('player_items').upsert({
        profile_id: profile.id,
        item_id: item.id,
        equipped: true,
      }, { onConflict: 'profile_id,item_id' });

      // Deduct cost + update max HP if armor/character
      const updates: Record<string, any> = { points: profile.points - item.cost };
      if (item.hp_bonus > 0) {
        updates.player_max_hp = profile.player_max_hp + item.hp_bonus;
        updates.player_hp = Math.min(profile.player_hp + item.hp_bonus, profile.player_max_hp + item.hp_bonus);
      }
      await supabase.from('profiles').update(updates).eq('id', profile.id);
      await refreshProfile();

      // Refresh owned
      const { data: pi } = await supabase
        .from('player_items').select('id, item_id, equipped').eq('profile_id', profile.id);
      setOwned(pi ?? []);
    }
    setBuying(null);
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.item_type === filter);

  if (!profile) return null;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>🛒 Store</Text>
        <View style={s.moneyChip}>
          <Text style={s.moneyText}>💰 {profile.points}</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[s.filterBtn, filter === f && s.filterBtnActive]}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {FILTER_LABEL[f]}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color="#d4791c" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const ownedEntry = owned.find(o => o.item_id === item.id);
            const isOwned    = !!ownedEntry;
            const isEquipped = ownedEntry?.equipped ?? false;
            const canAfford  = profile.points >= item.cost;
            const isFree     = item.cost === 0;

            return (
              <View style={s.card}>
                <View style={s.cardLeft}>
                  <View style={s.emojiBox}>
                    <Text style={s.emoji}>{item.emoji}</Text>
                  </View>
                </View>
                <View style={s.cardMid}>
                  <Text style={s.itemName}>{item.name}</Text>
                  <Text style={s.itemDesc}>{item.description}</Text>
                  <View style={s.statRow}>
                    {item.damage_bonus > 0 && <Text style={s.statChip}>+{item.damage_bonus} ⚔️</Text>}
                    {item.hp_bonus     > 0 && <Text style={s.statChip}>+{item.hp_bonus} 🛡️</Text>}
                    {item.heal_amount  > 0 && <Text style={s.statChip}>+{item.heal_amount > 900 ? 'full' : item.heal_amount} ❤️</Text>}
                  </View>
                </View>
                <View style={s.cardRight}>
                  {isEquipped ? (
                    <View style={s.equippedBadge}><Text style={s.equippedText}>Equipped</Text></View>
                  ) : isOwned && item.item_type !== 'consumable' ? (
                    <View style={s.ownedBadge}><Text style={s.ownedText}>Owned</Text></View>
                  ) : (
                    <Pressable
                      style={[s.buyBtn, !canAfford && s.buyBtnDisabled]}
                      disabled={!!buying || (!canAfford && !isFree)}
                      onPress={() => buy(item)}
                    >
                      <Text style={s.buyBtnText}>
                        {buying === item.id ? '…' : isFree ? 'Free' : `💰${item.cost}`}
                      </Text>
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#100d0a' },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#d4791c' },
  moneyChip:   { backgroundColor: '#2a1f14', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  moneyText:   { color: '#c4a73e', fontWeight: '800', fontSize: 16 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 6 },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1a1208', borderWidth: 1, borderColor: '#2a1f14' },
  filterBtnActive: { backgroundColor: '#d4791c', borderColor: '#d4791c' },
  filterText: { color: '#8a7a6a', fontSize: 11, fontWeight: '700' },
  filterTextActive: { color: '#100d0a' },

  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1a1208', borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: '#2a1f14',
  },
  cardLeft:  {},
  cardMid:   { flex: 1 },
  cardRight: { alignItems: 'flex-end' },

  emojiBox: {
    width: 48, height: 48, borderRadius: 10,
    backgroundColor: '#100d0a', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2a1f14',
  },
  emoji:     { fontSize: 26 },
  itemName:  { color: '#e8d5b8', fontWeight: '700', fontSize: 14, marginBottom: 2 },
  itemDesc:  { color: '#8a7a6a', fontSize: 11, marginBottom: 4 },
  statRow:   { flexDirection: 'row', gap: 4 },
  statChip:  { backgroundColor: '#2a1f14', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, color: '#c4a73e', fontSize: 10, fontWeight: '700' },

  buyBtn:         { backgroundColor: '#d4791c', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  buyBtnDisabled: { backgroundColor: '#3a2f24' },
  buyBtnText:     { color: '#100d0a', fontWeight: '800', fontSize: 13 },
  equippedBadge:  { backgroundColor: '#4a8a5e33', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  equippedText:   { color: '#6b9a4a', fontWeight: '700', fontSize: 12 },
  ownedBadge:     { backgroundColor: '#2a1f14', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  ownedText:      { color: '#8a7a6a', fontWeight: '700', fontSize: 12 },
});
