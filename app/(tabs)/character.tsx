import { useCallback, useState } from 'react';
import {
  ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { calcMaxHp, getEquippedBonus, xpForNextLevel } from '../../lib/towerEngine';
import { supabase } from '../../lib/supabase';

type PlayerItem = any;

const ITEM_TYPE_LABEL: Record<string, string> = {
  character: '🧑 Character',
  weapon:    '⚔️ Weapon',
  armor:     '🛡️ Armor',
};

export default function CharacterScreen() {
  const { profile } = useAuth();
  const [playerItems, setPlayerItems] = useState<PlayerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        if (!profile) return;
        const { data } = await supabase
          .from('player_items')
          .select('*, store_items(*)')
          .eq('profile_id', profile.id);
        setPlayerItems(data ?? []);
        setLoading(false);
      }
      load();
    }, [profile?.id])
  );

  if (!profile) return null;

  if (loading) {
    return <SafeAreaView style={s.container}><ActivityIndicator color="#d4791c" style={{ marginTop: 80 }} /></SafeAreaView>;
  }

  const xp = xpForNextLevel(profile.xp);
  const xpPct = xp.current / xp.needed;
  const hpPct = profile.player_hp / Math.max(1, profile.player_max_hp);
  const equipped = playerItems.filter(pi => pi.equipped);
  const unequipped = playerItems.filter(pi => !pi.equipped);
  const bonus = getEquippedBonus(playerItems);
  const maxHp = calcMaxHp(profile, playerItems);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Character sprite placeholder */}
        <View style={s.spritePlaceholder}>
          <Text style={s.spriteEmoji}>🧑</Text>
          <Text style={s.spriteSub}>[ character sprite placeholder ]</Text>
        </View>

        {/* Name + level */}
        <Text style={s.name}>{profile.username ?? 'Survivor'}</Text>
        <View style={s.levelRow}>
          <View style={s.levelBadge}><Text style={s.levelText}>Lv.{profile.level}</Text></View>
          <Text style={s.floorText}>Floor {profile.tower_floor}</Text>
        </View>

        {/* XP bar */}
        <View style={s.statBlock}>
          <View style={s.barRow}>
            <Text style={s.barLabel}>XP</Text>
            <Text style={s.barValue}>{xp.current} / {xp.needed}</Text>
          </View>
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${xpPct * 100}%` as any, backgroundColor: '#c4a73e' }]} />
          </View>
        </View>

        {/* HP bar */}
        <View style={s.statBlock}>
          <View style={s.barRow}>
            <Text style={s.barLabel}>HP</Text>
            <Text style={s.barValue}>{profile.player_hp} / {maxHp}</Text>
          </View>
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${hpPct * 100}%` as any, backgroundColor: '#4a8a5e' }]} />
          </View>
        </View>

        {/* Stats grid */}
        <View style={s.statsGrid}>
          <View style={s.stat}>
            <Text style={s.statVal}>💰 {profile.points}</Text>
            <Text style={s.statLbl}>Money</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statVal}>⭐ {profile.xp}</Text>
            <Text style={s.statLbl}>Total XP</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statVal}>⚔️ +{bonus.damage}</Text>
            <Text style={s.statLbl}>Dmg Bonus</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statVal}>🛡️ +{bonus.hp}</Text>
            <Text style={s.statLbl}>HP Bonus</Text>
          </View>
        </View>

        {/* Equipped items */}
        {equipped.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Equipped</Text>
            {equipped.map(pi => (
              <View key={pi.id} style={s.itemRow}>
                <Text style={s.itemEmoji}>{pi.store_items.emoji}</Text>
                <View style={s.itemInfo}>
                  <Text style={s.itemName}>{pi.store_items.name}</Text>
                  <Text style={s.itemType}>{ITEM_TYPE_LABEL[pi.store_items.item_type]}</Text>
                </View>
                {pi.store_items.damage_bonus > 0 && <Text style={s.itemStat}>+{pi.store_items.damage_bonus} ⚔️</Text>}
                {pi.store_items.hp_bonus > 0 && <Text style={s.itemStat}>+{pi.store_items.hp_bonus} 🛡️</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Inventory */}
        {unequipped.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Inventory</Text>
            {unequipped.map(pi => (
              <View key={pi.id} style={[s.itemRow, { opacity: 0.6 }]}>
                <Text style={s.itemEmoji}>{pi.store_items.emoji}</Text>
                <View style={s.itemInfo}>
                  <Text style={s.itemName}>{pi.store_items.name}</Text>
                  <Text style={s.itemType}>{ITEM_TYPE_LABEL[pi.store_items.item_type]} · not equipped</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {equipped.length === 0 && unequipped.length === 0 && (
          <View style={s.emptyInv}>
            <Text style={s.emptyInvText}>No equipment yet — visit the Store tab.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#100d0a' },
  scroll:    { padding: 20, paddingBottom: 40 },

  spritePlaceholder: {
    height: 180, borderRadius: 16, backgroundColor: '#1a1208',
    borderWidth: 1, borderColor: '#2a1f14', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  spriteEmoji: { fontSize: 72 },
  spriteSub:   { color: '#3a2f24', fontSize: 11, marginTop: 8 },

  name:     { color: '#e8d5b8', fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  levelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 },
  levelBadge: {
    backgroundColor: '#d4791c', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  levelText:  { color: '#100d0a', fontWeight: '800', fontSize: 15 },
  floorText:  { color: '#8a7a6a', fontSize: 14 },

  statBlock: { marginBottom: 12 },
  barRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  barLabel:  { color: '#8a7a6a', fontSize: 12, fontWeight: '600' },
  barValue:  { color: '#e8d5b8', fontSize: 12, fontWeight: '700' },
  barTrack:  { height: 8, backgroundColor: '#2a1f14', borderRadius: 4, overflow: 'hidden' },
  barFill:   { height: 8, borderRadius: 4 },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    marginBottom: 24, marginTop: 8,
  },
  stat:    {
    flex: 1, minWidth: '45%', backgroundColor: '#1a1208',
    borderRadius: 12, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#2a1f14',
  },
  statVal: { color: '#e8d5b8', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  statLbl: { color: '#8a7a6a', fontSize: 11 },

  section:      { marginBottom: 20 },
  sectionTitle: { color: '#e8d5b8', fontSize: 16, fontWeight: '800', marginBottom: 8 },

  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1a1208', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#2a1f14', marginBottom: 8,
  },
  itemEmoji: { fontSize: 24 },
  itemInfo:  { flex: 1 },
  itemName:  { color: '#e8d5b8', fontWeight: '700', fontSize: 14 },
  itemType:  { color: '#8a7a6a', fontSize: 11 },
  itemStat:  { color: '#d4791c', fontWeight: '700', fontSize: 13 },

  emptyInv:     { alignItems: 'center', paddingTop: 20 },
  emptyInvText: { color: '#8a7a6a', fontSize: 14 },
});
