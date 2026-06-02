import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, FlatList, Modal,
  Pressable, SafeAreaView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { maxHpForLevel } from '../../lib/towerEngine';
import { C, F } from '../../constants/theme';

type StoreItem  = Database['public']['Tables']['store_items']['Row'];
type Reward     = Database['public']['Tables']['rewards']['Row'];
type PlayerItem = { id: string; item_id: string; equipped: boolean };

const SW = Dimensions.get('window').width;
const CARD_W = Math.floor((SW - 24 - 16) / 3);

const FILTERS = ['character', 'weapon', 'armor', 'consumable', 'real_life'] as const;
type Filter = typeof FILTERS[number];

const FILTER_LABEL: Record<Filter, string> = {
  character: 'CHAR', weapon: 'WEAPON', armor: 'ARMOR', consumable: 'USE', real_life: 'REWARDS',
};
const TYPE_COLOR: Record<string, string> = {
  character: C.primary, weapon: C.damage, armor: C.hp, consumable: C.gold, real_life: '#c77dff',
};

// ── Add Reward Modal ──────────────────────────────────────────────
function AddRewardModal({ visible, householdId, createdBy, onClose, onSaved }: {
  visible: boolean; householdId: string; createdBy: string;
  onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [cost, setCost]         = useState('50');
  const [saving, setSaving]     = useState(false);

  async function save() {
    if (!title.trim()) { Alert.alert('Error', 'Enter a title.'); return; }
    setSaving(true);
    await supabase.from('rewards').insert({
      household_id: householdId,
      created_by:   createdBy,
      title:        title.trim(),
      description:  desc.trim() || null,
      points_cost:  Number(cost) || 50,
      reward_type:  'real_world',
    });
    setSaving(false);
    setTitle(''); setDesc(''); setCost('50');
    onSaved();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={rm.container}>
        <View style={rm.header}>
          <Text style={rm.headerTitle}>ADD REWARD</Text>
          <Pressable onPress={onClose} style={rm.closeBtn}>
            <Text style={rm.closeTxt}>✕</Text>
          </Pressable>
        </View>

        <View style={rm.body}>
          <Text style={rm.lbl}>REWARD TITLE</Text>
          <TextInput style={rm.input} placeholder="E.G. MOVIE NIGHT" placeholderTextColor={C.textDim}
            value={title} onChangeText={setTitle} />

          <Text style={rm.lbl}>DESCRIPTION (OPTIONAL)</Text>
          <TextInput style={[rm.input, { height: 80 }]} placeholder="WHAT DOES THE HERO GET?"
            placeholderTextColor={C.textDim} value={desc} onChangeText={setDesc} multiline />

          <Text style={rm.lbl}>GOLD COST</Text>
          <TextInput style={rm.input} value={cost} onChangeText={setCost}
            keyboardType="number-pad" />

          <Pressable
            style={({ pressed }) => [rm.saveBtn, saving && { opacity: 0.5 }, pressed && rm.saveBtnPressed]}
            onPress={save} disabled={saving}
          >
            <Text style={rm.saveTxt}>{saving ? 'SAVING…' : 'ADD REWARD →'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────
export default function StoreScreen({ onClose }: { onClose?: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const [items, setItems]       = useState<StoreItem[]>([]);
  const [owned, setOwned]       = useState<PlayerItem[]>([]);
  const [rewards, setRewards]   = useState<Reward[]>([]);
  const [filter, setFilter]     = useState<Filter>('character');
  const [loading, setLoading]   = useState(true);
  const [buying, setBuying]     = useState<string | null>(null);
  const [showAddReward, setShowAddReward] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const q1 = supabase.from('store_items').select('*').order('sort_order');
    const q2 = supabase.from('player_items').select('id, item_id, equipped').eq('profile_id', profile.id);
    const q3 = profile.household_id
      ? supabase.from('rewards').select('*').eq('household_id', profile.household_id).order('created_at')
      : Promise.resolve({ data: [] as Reward[] });
    Promise.all([q1, q2, q3]).then(([{ data: si }, { data: pi }, { data: rw }]) => {
      setItems(si ?? []);
      setOwned(pi ?? []);
      setRewards(rw ?? []);
      setLoading(false);
    });
  }, [profile?.id]);

  async function buy(item: StoreItem) {
    if (!profile) return;
    if (profile.points < item.cost) {
      Alert.alert('NOT ENOUGH GOLD', `Need 💰${item.cost}, have 💰${profile.points}.`);
      return;
    }
    setBuying(item.id);
    if (item.item_type === 'consumable') {
      // Heal capped at level max + equipped-armor bonus.
      const equipHp = owned
        .filter(o => o.equipped)
        .reduce((sum, o) => sum + (items.find(i => i.id === o.item_id)?.hp_bonus ?? 0), 0);
      const maxHp = maxHpForLevel(profile.level) + equipHp;
      const newHp = Math.min(maxHp, profile.player_hp + item.heal_amount);
      await supabase.from('profiles').update({ points: profile.points - item.cost, player_hp: newHp, gold_spent: (profile.gold_spent ?? 0) + item.cost } as any).eq('id', profile.id);
      await refreshProfile();
      Alert.alert('USED!', `Restored ${item.heal_amount > 900 ? 'all' : item.heal_amount} HP.`);
    } else {
      // Equip: unequip any same-type item, then equip this one. Max HP from gear
      // is computed dynamically (calcMaxHp), so we don't bump player_max_hp here.
      const sameType = owned.filter(o => items.find(i => i.id === o.item_id)?.item_type === item.item_type && o.equipped);
      for (const old of sameType) await supabase.from('player_items').update({ equipped: false }).eq('id', old.id);
      await supabase.from('player_items').upsert({ profile_id: profile.id, item_id: item.id, equipped: true }, { onConflict: 'profile_id,item_id' });
      await supabase.from('profiles').update({ points: profile.points - item.cost, gold_spent: (profile.gold_spent ?? 0) + item.cost } as any).eq('id', profile.id);
      await refreshProfile();
      const { data: pi } = await supabase.from('player_items').select('id, item_id, equipped').eq('profile_id', profile.id);
      setOwned(pi ?? []);
    }
    setBuying(null);
  }

  async function redeem(reward: Reward) {
    if (!profile) return;
    if (profile.points < reward.points_cost) {
      Alert.alert('NOT ENOUGH GOLD', `Need 💰${reward.points_cost}, have 💰${profile.points}.`);
      return;
    }
    setBuying(reward.id);
    await supabase.from('profiles').update({ points: profile.points - reward.points_cost, gold_spent: (profile.gold_spent ?? 0) + reward.points_cost } as any).eq('id', profile.id);
    await refreshProfile();
    Alert.alert('REDEEMED! 🎉', `"${reward.title}" has been redeemed. Claim your real-world reward!`);
    setBuying(null);
  }

  if (!profile) return null;

  const typeColor = TYPE_COLOR[filter] ?? C.primary;
  const isRealLife = filter === 'real_life';
  const filteredItems = items.filter(i => i.item_type === filter);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          {onClose && (
            <Pressable onPress={onClose} style={s.backBtn}>
              <Text style={s.backBtnText}>←</Text>
            </Pressable>
          )}
          <Text style={s.headerTitle}>🛒 STORE</Text>
        </View>
        <View style={s.headerRight}>
          <View style={s.goldBadge}><Text style={s.goldText}>💰 {profile.points}</Text></View>
          {profile.is_leader && isRealLife && (
            <Pressable style={s.addBtn} onPress={() => setShowAddReward(true)}>
              <Text style={s.addBtnText}>＋</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter pills */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[s.pill, filter === f && { backgroundColor: TYPE_COLOR[f], borderColor: TYPE_COLOR[f] }]}>
            <Text style={[s.pillText, filter === f && s.pillTextActive]}>{FILTER_LABEL[f]}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} /> : isRealLife ? (
        /* ── Real-life rewards grid ── */
        <FlatList
          data={rewards}
          keyExtractor={r => r.id}
          numColumns={3}
          contentContainerStyle={s.grid}
          columnWrapperStyle={s.row}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>NO REWARDS YET</Text>
              {profile.is_leader && <Text style={s.emptyHint}>Tap + to add a real-life reward</Text>}
            </View>
          }
          renderItem={({ item }) => {
            const canAfford = profile.points >= item.points_cost;
            return (
              <View style={[s.card, { borderTopColor: TYPE_COLOR.real_life, width: CARD_W }]}>
                <Text style={s.itemEmoji}>🎁</Text>
                <Text style={s.itemName} numberOfLines={2}>{item.title.toUpperCase()}</Text>
                {item.description ? <Text style={s.itemDesc} numberOfLines={2}>{item.description}</Text> : null}
                <View style={s.cardBottom}>
                  <Pressable
                    style={({ pressed }) => [s.buyBtn, { backgroundColor: TYPE_COLOR.real_life, borderBottomColor: '#7b2fff' }, !canAfford && s.buyBtnDim, pressed && s.buyBtnPressed]}
                    disabled={!!buying || !canAfford}
                    onPress={() => redeem(item)}
                  >
                    <Text style={s.buyBtnText}>{buying === item.id ? '…' : `💰${item.points_cost}`}</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      ) : (
        /* ── Store items grid ── */
        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id}
          numColumns={3}
          contentContainerStyle={s.grid}
          columnWrapperStyle={s.row}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}><Text style={s.emptyText}>NOTHING HERE YET</Text></View>
          }
          renderItem={({ item }) => {
            const ownedEntry = owned.find(o => o.item_id === item.id);
            const isOwned    = !!ownedEntry;
            const isEquipped = ownedEntry?.equipped ?? false;
            const canAfford  = profile.points >= item.cost;
            const tColor     = TYPE_COLOR[item.item_type] ?? C.primary;

            return (
              <View style={[s.card, { borderTopColor: tColor, width: CARD_W }]}>
                <Text style={s.itemEmoji}>{item.emoji}</Text>
                <Text style={s.itemName} numberOfLines={2}>{item.name.toUpperCase()}</Text>
                {item.damage_bonus > 0 && <Text style={[s.stat, { color: C.damage }]}>+{item.damage_bonus} ⚔️</Text>}
                {item.hp_bonus     > 0 && <Text style={[s.stat, { color: C.hp }]}>+{item.hp_bonus} 🛡️</Text>}
                {item.heal_amount  > 0 && <Text style={[s.stat, { color: C.gold }]}>+{item.heal_amount > 900 ? 'FULL' : item.heal_amount} ❤️</Text>}
                <View style={s.cardBottom}>
                  {isEquipped ? (
                    <View style={[s.tag, { borderColor: C.hp }]}><Text style={[s.tagText, { color: C.hp }]}>EQ.</Text></View>
                  ) : isOwned && item.item_type !== 'consumable' ? (
                    <View style={s.tag}><Text style={s.tagText}>OWN</Text></View>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [s.buyBtn, { backgroundColor: tColor, borderBottomColor: tColor + '99' }, !canAfford && s.buyBtnDim, pressed && s.buyBtnPressed]}
                      disabled={!!buying || (!canAfford && item.cost !== 0)}
                      onPress={() => buy(item)}
                    >
                      <Text style={s.buyBtnText}>{buying === item.id ? '…' : item.cost === 0 ? 'FREE' : `💰${item.cost}`}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {profile.is_leader && profile.household_id && (
        <AddRewardModal
          visible={showAddReward}
          householdId={profile.household_id}
          createdBy={profile.id}
          onClose={() => setShowAddReward(false)}
          onSaved={() => {
            setShowAddReward(false);
            // Refresh rewards
            if (profile.household_id) {
              supabase.from('rewards').select('*').eq('household_id', profile.household_id).order('created_at')
                .then(({ data }) => setRewards(data ?? []));
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn:     { width: 32, height: 32, backgroundColor: C.card, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border },
  backBtnText: { fontFamily: F.pixel, fontSize: 12, color: C.textMuted, lineHeight: 18 },
  headerTitle: { fontFamily: F.pixel, fontSize: 12, color: C.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goldBadge:   { backgroundColor: C.card, borderWidth: 2, borderColor: C.gold, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  goldText:    { fontFamily: F.pixel, fontSize: 9, color: C.gold },
  addBtn:      { width: 36, height: 36, backgroundColor: '#c77dff', borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: '#7b2fff' },
  addBtnText:  { fontFamily: F.pixel, fontSize: 18, color: C.bg, lineHeight: 22 },

  filterRow:     { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  pill:          { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: C.card, borderWidth: 2, borderColor: C.border },
  pillText:      { fontFamily: F.pixel, fontSize: 7, color: C.textMuted },
  pillTextActive:{ color: C.bg },

  grid: { padding: 12, paddingBottom: 24 },
  row:  { gap: 8, marginBottom: 8 },

  card: {
    width: CARD_W,
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderTopWidth: 4, borderRadius: 16, padding: 10,
    minHeight: 155, alignItems: 'center', overflow: 'hidden',
  },
  itemEmoji: { fontSize: 30, marginBottom: 6, marginTop: 2 },
  itemName:  { fontFamily: F.pixel, fontSize: 8, color: C.text, textAlign: 'center', lineHeight: 14, marginBottom: 4 },
  itemDesc:  { fontFamily: F.body, fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 18, marginBottom: 4 },
  stat:      { fontFamily: F.pixel, fontSize: 8, marginBottom: 3 },

  cardBottom:    { marginTop: 'auto' as any, width: '100%', alignItems: 'center', paddingTop: 8 },
  buyBtn:        { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 3, alignItems: 'center', width: '100%' },
  buyBtnDim:     { opacity: 0.4 },
  buyBtnPressed: { borderBottomWidth: 0, marginTop: 3 },
  buyBtnText:    { fontFamily: F.pixel, fontSize: 8, color: C.bg },

  tag:     { borderWidth: 2, borderColor: C.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { fontFamily: F.pixel, fontSize: 7, color: C.textMuted },

  empty:     { flex: 1, alignItems: 'center', paddingTop: 60, width: '100%' },
  emptyText: { fontFamily: F.pixel, fontSize: 8, color: C.textMuted, marginBottom: 8 },
  emptyHint: { fontFamily: F.body, fontSize: 15, color: C.textDim },
});

const rm = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 2, borderBottomColor: C.border },
  headerTitle:{ fontFamily: F.pixel, fontSize: 11, color: '#c77dff', letterSpacing: 1 },
  closeBtn:  { width: 32, height: 32, backgroundColor: C.card, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  closeTxt:  { fontFamily: F.pixel, fontSize: 10, color: C.textMuted },
  body:      { padding: 20, gap: 4 },
  lbl:       { fontFamily: F.pixel, fontSize: 7, color: C.textMuted, letterSpacing: 1, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, color: C.text,
    fontFamily: F.pixel, fontSize: 8, letterSpacing: 0.5,
  },
  saveBtn:       { backgroundColor: '#c77dff', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: '#7b2fff', marginTop: 20 },
  saveBtnPressed:{ borderBottomWidth: 0, marginTop: 24 },
  saveTxt:       { fontFamily: F.pixel, fontSize: 9, color: C.bg, letterSpacing: 1 },
});
