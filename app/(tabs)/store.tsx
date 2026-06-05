import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, FlatList, Modal,
  Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import HeroSprite from '../../components/HeroSprite';
import { t } from '../../lib/i18n';
import { itemName } from '../../lib/content';
import { C, F } from '../../constants/theme';

type StoreItem  = Database['public']['Tables']['store_items']['Row'];
type Reward     = Database['public']['Tables']['rewards']['Row'];
type PlayerItem = { id: string; item_id: string; equipped: boolean; quantity: number };

const SW = Dimensions.get('window').width;
const CARD_W = Math.floor((SW - 24 - 16) / 3);
// Carousel hero ≈ 60% of the in-game character (which fills ~half the screen width).
const CAROUSEL = Math.round(SW * 0.27);

const RARITIES = [
  { key: 'common',    color: '#8aa0aa' },
  { key: 'uncommon',  color: C.hp },
  { key: 'rare',      color: C.primary },
  { key: 'elite',     color: C.gold },
  { key: 'legendary', color: '#ff7b00' },
] as const;

// Gem packs (purchased via IAP). Prices are display-only until native IAP is wired.
const GEM_PACKS = [
  { gems: 80,   price: '$0.99' },
  { gems: 250,  price: '$2.99', best: true },
  { gems: 700,  price: '$6.99' },
  { gems: 1500, price: '$12.99' },
];

const FILTERS = ['character', 'weapon', 'armor', 'consumable', 'real_life'] as const;
type Filter = typeof FILTERS[number];

const FILTER_KEY: Record<Filter, string> = {
  character: 'store.fChar', weapon: 'store.fWeapon', armor: 'store.fArmor', consumable: 'store.fUse', real_life: 'store.fRewards',
};
const TYPE_COLOR: Record<string, string> = {
  character: C.primary, weapon: C.damage, armor: C.hp, consumable: C.gold, real_life: '#c77dff',
};

const isPremium = (i: StoreItem) => i.premium_cost > 0;
const isFree    = (i: StoreItem) => i.premium_cost === 0 && i.cost === 0;
const RESALE    = 0.6;  // gold refunded for the gear you trade in when upgrading

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
          <Text style={rm.headerTitle}>{t('store.addReward')}</Text>
          <Pressable onPress={onClose} style={rm.closeBtn}>
            <Text style={rm.closeTxt}>✕</Text>
          </Pressable>
        </View>

        <View style={rm.body}>
          <Text style={rm.lbl}>{t('store.rewardTitle')}</Text>
          <TextInput style={rm.input} placeholder={t('store.rewardTitlePh')} placeholderTextColor={C.textDim}
            value={title} onChangeText={setTitle} />

          <Text style={rm.lbl}>{t('store.rewardDesc')}</Text>
          <TextInput style={[rm.input, { height: 80 }]} placeholder={t('store.rewardDescPh')}
            placeholderTextColor={C.textDim} value={desc} onChangeText={setDesc} multiline />

          <Text style={rm.lbl}>{t('store.tokenCost')}</Text>
          <TextInput style={rm.input} value={cost} onChangeText={setCost}
            keyboardType="number-pad" />

          <Pressable
            style={({ pressed }) => [rm.saveBtn, saving && { opacity: 0.5 }, pressed && rm.saveBtnPressed]}
            onPress={save} disabled={saving}
          >
            <Text style={rm.saveTxt}>{saving ? t('store.saving') : t('store.addRewardBtn')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ── Gem Shop Modal (IAP) ──────────────────────────────────────────
function GemShopModal({ visible, balance, busy, onClose, onBuy }: {
  visible: boolean; balance: number; busy: boolean;
  onClose: () => void; onBuy: (pack: typeof GEM_PACKS[number]) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={rm.container}>
        <View style={rm.header}>
          <Text style={[rm.headerTitle, { color: '#ff7b00' }]}>{t('store.gemShop')}</Text>
          <Pressable onPress={onClose} style={rm.closeBtn}>
            <Text style={rm.closeTxt}>✕</Text>
          </Pressable>
        </View>

        <View style={gm.balanceRow}>
          <Text style={gm.balanceTxt}>💎 {balance}</Text>
        </View>

        <ScrollView contentContainerStyle={gm.list}>
          {GEM_PACKS.map(pack => (
            <View key={pack.gems} style={[gm.pack, pack.best && gm.packBest]}>
              {pack.best && <View style={gm.bestTag}><Text style={gm.bestTagTxt}>{t('store.bestValue')}</Text></View>}
              <Text style={gm.packGems}>💎 {pack.gems}</Text>
              <Text style={gm.packLabel}>{t('store.gemPack', { n: pack.gems })}</Text>
              <Pressable
                style={({ pressed }) => [gm.buyBtn, busy && { opacity: 0.5 }, pressed && gm.buyBtnPressed]}
                disabled={busy}
                onPress={() => onBuy(pack)}
              >
                <Text style={gm.buyTxt}>{pack.price}</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
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
  const [showGemShop, setShowGemShop]     = useState(false);
  const [gearPopup, setGearPopup] = useState<{ name: string; emoji: string; stat: string; refund: number; oldName: string } | null>(null);

  useEffect(() => {
    if (!profile) return;
    const q1 = supabase.from('store_items').select('*').order('sort_order');
    const q2 = supabase.from('player_items').select('id, item_id, equipped, quantity').eq('profile_id', profile.id);
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

  async function refreshOwned() {
    if (!profile) return;
    const { data } = await supabase.from('player_items').select('id, item_id, equipped, quantity').eq('profile_id', profile.id);
    setOwned(data ?? []);
  }

  async function equipItem(item: StoreItem) {
    if (!profile) return;
    // Unequip any same-type item, then equip the new one (weapon → left, armor → right).
    const { data: pi } = await supabase.from('player_items').select('id, item_id').eq('profile_id', profile.id);
    for (const o of pi ?? []) {
      if (items.find(i => i.id === o.item_id)?.item_type === item.item_type) {
        await supabase.from('player_items').update({ equipped: false }).eq('id', o.id);
      }
    }
    await supabase.from('player_items').update({ equipped: true }).eq('profile_id', profile.id).eq('item_id', item.id);
    await refreshOwned();
  }

  async function selectCharacter(item: StoreItem) {
    if (!profile) return;
    await supabase.from('profiles').update({ character_type: item.id } as any).eq('id', profile.id);
    await refreshProfile();
    Alert.alert(t('store.active'), t('store.nowPlaying', { name: itemName(item.name) }));
  }

  async function buy(item: StoreItem) {
    if (!profile) return;
    const usesGems = isPremium(item);
    const isGear   = item.item_type === 'weapon' || item.item_type === 'armor';

    // Trade-in: buying gear with gold refunds 60% of the currently-equipped same-type
    // item's cost and replaces it — keeps upgrades affordable and the bag tidy.
    const tradeIn = isGear && !usesGems
      ? owned.find(o => o.equipped && o.item_id !== item.id &&
          items.find(i => i.id === o.item_id)?.item_type === item.item_type)
      : undefined;
    const tradeInItem = tradeIn ? items.find(i => i.id === tradeIn.item_id) : undefined;
    const refund = tradeInItem ? Math.round(RESALE * tradeInItem.cost) : 0;

    const listPrice = usesGems ? item.premium_cost : item.cost;
    const price     = Math.max(0, listPrice - refund);
    const balance   = usesGems ? (profile.gems ?? 0) : profile.points;

    if (price > 0 && balance < price) {
      if (usesGems) Alert.alert(t('store.notEnoughGems'), t('store.notEnoughGemsBody', { cost: price, have: balance }));
      else          Alert.alert(t('store.notEnough'),     t('store.notEnoughBody',     { cost: price, have: balance }));
      return;
    }
    setBuying(item.id);

    if (usesGems) {
      await supabase.from('profiles').update({ gems: balance - price } as any).eq('id', profile.id);
    } else {
      await supabase.from('profiles')
        .update({ points: profile.points - price, gold_spent: (profile.gold_spent ?? 0) + price } as any)
        .eq('id', profile.id);
    }

    if (isGear) {
      // Remove the traded-in item, add the new one, then equip it.
      if (tradeIn) await supabase.from('player_items').delete().eq('id', tradeIn.id);
      const existing = owned.find(o => o.item_id === item.id && o.id !== tradeIn?.id);
      if (!existing) await supabase.from('player_items').insert({ profile_id: profile.id, item_id: item.id, quantity: 1, equipped: false } as any);
      await equipItem(item);
    } else {
      const existing = owned.find(o => o.item_id === item.id);
      if (existing) await supabase.from('player_items').update({ quantity: (existing.quantity ?? 1) + 1 }).eq('id', existing.id);
      else await supabase.from('player_items').insert({ profile_id: profile.id, item_id: item.id, quantity: 1, equipped: false } as any);
    }

    await refreshProfile();
    await refreshOwned();
    setBuying(null);

    if (item.item_type === 'character') {
      await selectCharacter(item);
    } else if (isGear) {
      // In-game popup (not a native alert) showing the new gear + trade-in payout.
      const stat = item.item_type === 'weapon' ? `+${item.damage_bonus} ⚔️` : `+${item.hp_bonus} 🛡️`;
      setGearPopup({
        name: itemName(item.name).toUpperCase(),
        emoji: item.emoji,
        stat,
        refund,
        oldName: tradeInItem ? itemName(tradeInItem.name).toUpperCase() : '',
      });
    } else {
      Alert.alert(t('store.addedBag'), t('store.addedBagBody', { name: itemName(item.name) }));
    }
  }

  async function buyGemPack(pack: typeof GEM_PACKS[number]) {
    if (!profile) return;
    setBuying('gems');
    // TODO: wire native in-app purchases (expo StoreKit / Google Play Billing) here.
    if (__DEV__) {
      // Dev affordance so the premium shop is testable before IAP is integrated.
      await supabase.from('profiles').update({ gems: (profile.gems ?? 0) + pack.gems } as any).eq('id', profile.id);
      await refreshProfile();
      setBuying(null);
      Alert.alert(t('store.gemShop'), t('store.gemsGranted', { n: pack.gems }));
    } else {
      setBuying(null);
      Alert.alert(t('store.iapSoon'), t('store.iapSoonBody'));
    }
  }

  if (!profile) return null;

  const isRealLife  = filter === 'real_life';
  const isCharacter = filter === 'character';
  const isWeapon    = filter === 'weapon';

  // Active character: the one the profile points at, falling back to the free starter.
  const charItems    = items.filter(i => i.item_type === 'character');
  const starter      = charItems.find(isFree);
  const activeCharId = charItems.find(c => c.id === profile.character_type)?.id ?? starter?.id ?? null;

  function priceLabel(item: StoreItem): string {
    if (isFree(item)) return t('store.free');
    return isPremium(item) ? `💎${item.premium_cost}` : `💰${item.cost}`;
  }
  function canAfford(item: StoreItem): boolean {
    if (isFree(item)) return true;
    return isPremium(item) ? (profile!.gems ?? 0) >= item.premium_cost : profile!.points >= item.cost;
  }

  function renderCard(kind: 'character' | 'weapon', item: StoreItem, color: string) {
    const ownedEntry = owned.find(o => o.item_id === item.id);

    if (kind === 'character') {
      const isOwned  = isFree(item) || !!ownedEntry;
      const isActive = item.id === activeCharId;
      return (
        <View key={item.id} style={[cc.card, { borderColor: isOwned ? color : C.border }]}>
          <HeroSprite size={CAROUSEL} unlocked={isOwned} />
          <Text style={[cc.cardName, isOwned && { color }]} numberOfLines={1}>{itemName(item.name).toUpperCase()}</Text>
          {isActive ? (
            <View style={[cc.stateTag, { borderColor: color }]}><Text style={[cc.stateTagTxt, { color }]}>{t('store.active')}</Text></View>
          ) : isOwned ? (
            <Pressable style={({ pressed }) => [cc.cardBtn, { backgroundColor: color }, pressed && cc.cardBtnPressed]} onPress={() => selectCharacter(item)}>
              <Text style={cc.cardBtnTxt}>{t('store.use')}</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [cc.cardBtn, { backgroundColor: color }, !canAfford(item) && cc.cardBtnDim, pressed && cc.cardBtnPressed]}
              disabled={!!buying || !canAfford(item)}
              onPress={() => buy(item)}
            >
              <Text style={cc.cardBtnTxt}>{buying === item.id ? '…' : priceLabel(item)}</Text>
            </Pressable>
          )}
        </View>
      );
    }

    // Weapon
    const isOwned    = !!ownedEntry;
    const isEquipped = ownedEntry?.equipped ?? false;
    return (
      <View key={item.id} style={[cc.card, cc.weaponCard, { borderColor: isOwned ? color : C.border }]}>
        <Text style={cc.weaponEmoji}>{item.emoji}</Text>
        <Text style={[cc.cardName, isOwned && { color }]} numberOfLines={1}>{itemName(item.name).toUpperCase()}</Text>
        <Text style={[cc.weaponStat, { color: C.damage }]}>+{item.damage_bonus} ⚔️</Text>
        {isEquipped ? (
          <View style={[cc.stateTag, { borderColor: C.hp }]}><Text style={[cc.stateTagTxt, { color: C.hp }]}>{t('store.eq')}</Text></View>
        ) : isOwned ? (
          <Pressable style={({ pressed }) => [cc.cardBtn, { backgroundColor: C.hp }, pressed && cc.cardBtnPressed]} onPress={() => equipItem(item)}>
            <Text style={cc.cardBtnTxt}>{t('store.equip')}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [cc.cardBtn, { backgroundColor: color }, !canAfford(item) && cc.cardBtnDim, pressed && cc.cardBtnPressed]}
            disabled={!!buying || !canAfford(item)}
            onPress={() => buy(item)}
          >
            <Text style={cc.cardBtnTxt}>{buying === item.id ? '…' : priceLabel(item)}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  function renderCarousel(kind: 'character' | 'weapon') {
    const list = items.filter(i => i.item_type === kind);
    return (
      <ScrollView contentContainerStyle={cc.list} showsVerticalScrollIndicator={false}>
        {RARITIES.map(r => {
          const tier = list.filter(i => i.rarity === r.key);
          if (tier.length === 0) return null;
          return (
            <View key={r.key} style={cc.section}>
              <View style={[cc.tag, { borderColor: r.color }]}>
                <Text style={[cc.tagText, { color: r.color }]}>{t(`store.${r.key}`)}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cc.rowScroll}>
                {tier.map(item => renderCard(kind, item, r.color))}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>
    );
  }

  async function redeem(reward: Reward) {
    if (!profile) return;
    const tokens = profile.tokens ?? 0;
    if (tokens < reward.points_cost) {
      Alert.alert(t('store.notEnoughTokens'), t('store.notEnoughTokensBody', { cost: reward.points_cost, have: tokens }));
      return;
    }
    setBuying(reward.id);
    await supabase.from('profiles').update({ tokens: tokens - reward.points_cost } as any).eq('id', profile.id);
    await refreshProfile();
    Alert.alert(t('store.redeemed'), t('store.redeemedBody', { title: reward.title }));
    setBuying(null);
  }

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
          <Text style={s.headerTitle}>{t('store.title')}</Text>
        </View>
        <View style={s.headerRight}>
          {isRealLife
            ? <View style={s.tokenBadge}><Text style={s.tokenText}>🎟️ {profile.tokens ?? 0}</Text></View>
            : <View style={s.goldBadge}><Text style={s.goldText}>💰 {profile.points}</Text></View>}
          <Pressable style={s.gemBadge} onPress={() => setShowGemShop(true)}>
            <Text style={s.gemText}>💎 {profile.gems ?? 0}</Text>
            <Text style={s.gemPlus}>＋</Text>
          </Pressable>
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
            <Text style={[s.pillText, filter === f && s.pillTextActive]}>{t(FILTER_KEY[f])}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} /> : isCharacter ? (
        /* ── Character carousel by rarity ── */
        renderCarousel('character')
      ) : isWeapon ? (
        /* ── Weapon carousel by rarity ── */
        renderCarousel('weapon')
      ) : isRealLife ? (
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
              <Text style={s.emptyText}>{t('store.noRewards')}</Text>
              {profile.is_leader && <Text style={s.emptyHint}>{t('store.noRewardsHint')}</Text>}
            </View>
          }
          renderItem={({ item }) => {
            const affordable = (profile.tokens ?? 0) >= item.points_cost;
            return (
              <View style={[s.card, { borderTopColor: TYPE_COLOR.real_life, width: CARD_W }]}>
                <Text style={s.itemEmoji}>🎁</Text>
                <Text style={s.itemName} numberOfLines={2}>{item.title.toUpperCase()}</Text>
                {item.description ? <Text style={s.itemDesc} numberOfLines={2}>{item.description}</Text> : null}
                <View style={s.cardBottom}>
                  <Pressable
                    style={({ pressed }) => [s.buyBtn, { backgroundColor: TYPE_COLOR.real_life, borderBottomColor: '#7b2fff' }, !affordable && s.buyBtnDim, pressed && s.buyBtnPressed]}
                    disabled={!!buying || !affordable}
                    onPress={() => redeem(item)}
                  >
                    <Text style={s.buyBtnText}>{buying === item.id ? '…' : `🎟️${item.points_cost}`}</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      ) : (
        /* ── Armor / consumable grid ── */
        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id}
          numColumns={3}
          contentContainerStyle={s.grid}
          columnWrapperStyle={s.row}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}><Text style={s.emptyText}>{t('store.nothingHere')}</Text></View>
          }
          renderItem={({ item }) => {
            const ownedEntry = owned.find(o => o.item_id === item.id);
            const isOwned    = !!ownedEntry;
            const isEquipped = ownedEntry?.equipped ?? false;
            const affordable = canAfford(item);
            const tColor     = TYPE_COLOR[item.item_type] ?? C.primary;

            return (
              <View style={[s.card, { borderTopColor: tColor, width: CARD_W }]}>
                <Text style={s.itemEmoji}>{item.emoji}</Text>
                <Text style={s.itemName} numberOfLines={2}>{itemName(item.name).toUpperCase()}</Text>
                {item.damage_bonus > 0 && <Text style={[s.stat, { color: C.damage }]}>+{item.damage_bonus} ⚔️</Text>}
                {item.hp_bonus     > 0 && <Text style={[s.stat, { color: C.hp }]}>+{item.hp_bonus} 🛡️</Text>}
                {item.heal_amount  > 0 && <Text style={[s.stat, { color: C.gold }]}>+{item.heal_amount > 900 ? 'FULL' : item.heal_amount} ❤️</Text>}
                <View style={s.cardBottom}>
                  {isEquipped ? (
                    <View style={[s.tag, { borderColor: C.hp }]}><Text style={[s.tagText, { color: C.hp }]}>{t('store.eq')}</Text></View>
                  ) : isOwned && item.item_type !== 'consumable' ? (
                    <View style={s.tag}><Text style={s.tagText}>{t('store.own')}</Text></View>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [s.buyBtn, { backgroundColor: tColor, borderBottomColor: tColor + '99' }, !affordable && s.buyBtnDim, pressed && s.buyBtnPressed]}
                      disabled={!!buying || (!affordable && item.cost !== 0)}
                      onPress={() => buy(item)}
                    >
                      <Text style={s.buyBtnText}>{buying === item.id ? '…' : priceLabel(item)}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      <GemShopModal
        visible={showGemShop}
        balance={profile.gems ?? 0}
        busy={buying === 'gems'}
        onClose={() => setShowGemShop(false)}
        onBuy={buyGemPack}
      />

      {profile.is_leader && profile.household_id && (
        <AddRewardModal
          visible={showAddReward}
          householdId={profile.household_id}
          createdBy={profile.id}
          onClose={() => setShowAddReward(false)}
          onSaved={() => {
            setShowAddReward(false);
            if (profile.household_id) {
              supabase.from('rewards').select('*').eq('household_id', profile.household_id).order('created_at')
                .then(({ data }) => setRewards(data ?? []));
            }
          }}
        />
      )}

      {/* In-game gear / trade-in popup (replaces the native alert). */}
      {gearPopup && (
        <Pressable style={pp.overlay} onPress={() => setGearPopup(null)}>
          <View style={pp.card}>
            <Text style={pp.title}>{t('store.equipped')}</Text>
            <Text style={pp.emoji}>{gearPopup.emoji}</Text>
            <Text style={pp.name}>{gearPopup.name}</Text>
            <Text style={pp.stat}>{gearPopup.stat}</Text>
            {gearPopup.refund > 0 && (
              <View style={pp.tradeBox}>
                <Text style={pp.tradeLbl}>{t('store.tradedIn', { name: gearPopup.oldName })}</Text>
                <Text style={pp.tradeGold}>+💰{gearPopup.refund}</Text>
              </View>
            )}
            <Pressable style={({ pressed }) => [pp.btn, pressed && pp.btnPressed]} onPress={() => setGearPopup(null)}>
              <Text style={pp.btnText}>{t('game.continue')}</Text>
            </Pressable>
          </View>
        </Pressable>
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
  tokenBadge:  { backgroundColor: C.card, borderWidth: 2, borderColor: '#c77dff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  tokenText:   { fontFamily: F.pixel, fontSize: 9, color: '#c77dff' },
  gemBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.card, borderWidth: 2, borderColor: '#ff7b00', borderRadius: 12, paddingLeft: 12, paddingRight: 8, paddingVertical: 6 },
  gemText:     { fontFamily: F.pixel, fontSize: 9, color: '#ff7b00' },
  gemPlus:     { fontFamily: F.pixel, fontSize: 11, color: '#ff7b00', marginTop: -2 },
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

const gm = StyleSheet.create({
  balanceRow:  { alignItems: 'center', paddingVertical: 18 },
  balanceTxt:  { fontFamily: F.pixel, fontSize: 18, color: '#ff7b00', letterSpacing: 1 },
  list:        { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  pack: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderBottomWidth: 4, borderBottomColor: C.border, borderRadius: 16, padding: 16,
  },
  packBest:    { borderColor: '#ff7b00', borderBottomColor: '#b35600' },
  bestTag:     { position: 'absolute', top: -9, right: 14, backgroundColor: '#ff7b00', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  bestTagTxt:  { fontFamily: F.pixel, fontSize: 6, color: C.bg, letterSpacing: 0.5 },
  packGems:    { fontFamily: F.pixel, fontSize: 14, color: '#ff7b00' },
  packLabel:   { flex: 1, fontFamily: F.pixel, fontSize: 7, color: C.textMuted, letterSpacing: 1 },
  buyBtn:        { backgroundColor: C.hp, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 3, borderBottomColor: C.hpDark },
  buyBtnPressed: { borderBottomWidth: 0, marginTop: 3 },
  buyTxt:        { fontFamily: F.pixel, fontSize: 9, color: C.bg },
});

const cc = StyleSheet.create({
  list:      { padding: 14, gap: 18, paddingBottom: 32 },
  section:   { gap: 10 },
  tag:       { alignSelf: 'flex-start', borderWidth: 2, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  tagText:   { fontFamily: F.pixel, fontSize: 8, letterSpacing: 1 },
  rowScroll: { gap: 12, paddingRight: 14 },
  card: {
    width: CAROUSEL + 24,
    backgroundColor: C.card, borderWidth: 2, borderRadius: 14,
    padding: 8, alignItems: 'center', gap: 6,
  },
  cardName:  { fontFamily: F.pixel, fontSize: 7, color: C.textMuted, letterSpacing: 0.5, textAlign: 'center' },

  weaponCard:  { justifyContent: 'space-between' },
  weaponEmoji: { fontSize: Math.round(CAROUSEL * 0.5), height: CAROUSEL, lineHeight: CAROUSEL, textAlign: 'center' },
  weaponStat:  { fontFamily: F.pixel, fontSize: 8 },

  cardBtn:        { width: '100%', borderRadius: 8, paddingVertical: 6, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#0006' },
  cardBtnDim:     { opacity: 0.4 },
  cardBtnPressed: { borderBottomWidth: 0, marginTop: 3 },
  cardBtnTxt:     { fontFamily: F.pixel, fontSize: 8, color: C.bg },

  stateTag:    { width: '100%', borderWidth: 2, borderRadius: 8, paddingVertical: 4, alignItems: 'center' },
  stateTagTxt: { fontFamily: F.pixel, fontSize: 7, letterSpacing: 0.5 },
});

const pp = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000a', alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: {
    width: '100%', maxWidth: 320, backgroundColor: C.card, borderWidth: 3, borderColor: C.damage,
    borderBottomWidth: 6, borderBottomColor: C.damageDark, borderRadius: 18, padding: 22, alignItems: 'center', gap: 8,
  },
  title:    { fontFamily: F.pixel, fontSize: 9, color: C.damage, letterSpacing: 2 },
  emoji:    { fontSize: 52, marginVertical: 4 },
  name:     { fontFamily: F.pixel, fontSize: 11, color: C.text, textAlign: 'center', letterSpacing: 0.5, lineHeight: 18 },
  stat:     { fontFamily: F.pixel, fontSize: 10, color: C.damage },
  tradeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%', backgroundColor: C.cardAlt, borderWidth: 2, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 6 },
  tradeLbl: { flex: 1, fontFamily: F.body, fontSize: 15, color: C.textMuted },
  tradeGold:{ fontFamily: F.pixel, fontSize: 10, color: C.gold },
  btn:        { backgroundColor: C.damage, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: C.damageDark, marginTop: 10, width: '100%' },
  btnPressed: { borderBottomWidth: 0, marginTop: 14 },
  btnText:    { fontFamily: F.pixel, fontSize: 9, color: C.bg, letterSpacing: 1 },
});
