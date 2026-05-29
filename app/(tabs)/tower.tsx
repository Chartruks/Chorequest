import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { calcMonsterAttack, nextAttackCountdown } from '../../lib/towerEngine';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';

type TowerFloor = Database['public']['Tables']['tower_floors']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export default function TowerScreen() {
  const { profile, refreshProfile } = useAuth();
  const [floor, setFloor] = useState<TowerFloor | null>(null);
  const [crewMembers, setCrewMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState('');

  async function load() {
    if (!profile) return;

    // Apply pending monster attacks
    const { data: freshProfile } = await supabase
      .from('profiles').select('*').eq('id', profile.id).single();
    if (!freshProfile) return;

    const { data: floorData } = await supabase
      .from('tower_floors').select('*').eq('floor', freshProfile.tower_floor).single();
    if (!floorData) return;

    const attack = calcMonsterAttack(freshProfile, floorData);
    if (attack.ticks > 0) {
      const newHp = attack.newHp;
      if (newHp <= 0) {
        // Player defeated — reset HP, monster regenerates 50%
        await supabase.from('profiles').update({
          player_hp: freshProfile.player_max_hp,
          monster_hp: Math.floor(floorData.monster_max_hp * 0.5),
          last_monster_attack: attack.newLastAttack.toISOString(),
        }).eq('id', profile.id);
      } else {
        await supabase.from('profiles').update({
          player_hp: newHp,
          last_monster_attack: attack.newLastAttack.toISOString(),
        }).eq('id', profile.id);
      }
      await refreshProfile();
    }

    setFloor(floorData);

    if (profile.household_id) {
      const { data: crew } = await supabase
        .from('profiles').select('*')
        .eq('household_id', profile.household_id)
        .order('tower_floor', { ascending: false });
      setCrewMembers(crew ?? []);
    }
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { load(); }, [profile?.id]));

  useEffect(() => {
    if (!profile || !floor) return;
    const update = () => setCountdown(nextAttackCountdown(profile, floor));
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [profile, floor]);

  if (!profile?.household_id) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.empty}><Text style={s.emptyEmoji}>🏰</Text>
          <Text style={s.emptyTitle}>No Settlement Yet</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || !floor) {
    return <SafeAreaView style={s.container}><ActivityIndicator color="#d4791c" style={{ marginTop: 80 }} /></SafeAreaView>;
  }

  const monsterPct = Math.max(0, profile.monster_hp / floor.monster_max_hp);
  const playerPct  = Math.max(0, profile.player_hp / profile.player_max_hp);
  const monsterBarColor = monsterPct > 0.5 ? '#6b9a4a' : monsterPct > 0.25 ? '#c4a73e' : '#c0392b';

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Floor header */}
        <View style={s.floorBadge}>
          <Text style={s.floorLabel}>FLOOR</Text>
          <Text style={s.floorNum}>{profile.tower_floor}</Text>
        </View>

        {/* Monster card */}
        <View style={s.monsterCard}>
          {/* Sprite placeholder */}
          <View style={s.spritePlaceholder}>
            <Text style={s.spriteEmoji}>{floor.monster_emoji}</Text>
            <Text style={s.spriteSub}>[ sprite placeholder ]</Text>
          </View>

          <Text style={s.monsterName}>{floor.monster_name}</Text>

          {/* Monster HP bar */}
          <View style={s.barRow}>
            <Text style={s.barLabel}>Monster HP</Text>
            <Text style={s.barValue}>{profile.monster_hp} / {floor.monster_max_hp}</Text>
          </View>
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${monsterPct * 100}%` as any, backgroundColor: monsterBarColor }]} />
          </View>

          {/* Player HP bar */}
          <View style={[s.barRow, { marginTop: 12 }]}>
            <Text style={s.barLabel}>Your HP</Text>
            <Text style={s.barValue}>{profile.player_hp} / {profile.player_max_hp}</Text>
          </View>
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${playerPct * 100}%` as any, backgroundColor: '#4a8a5e' }]} />
          </View>

          {/* Attack timer */}
          <View style={s.attackRow}>
            <Text style={s.attackLabel}>⚔️ Next monster attack in</Text>
            <Text style={s.attackTimer}>{countdown}</Text>
          </View>
          <Text style={s.attackHint}>
            Deals {floor.monster_attack} dmg · every {floor.attack_interval_hours}h
          </Text>
        </View>

        {/* Tip */}
        <View style={s.tip}>
          <Text style={s.tipText}>Complete chores to deal damage and climb the tower.</Text>
        </View>

        {/* Crew */}
        {crewMembers.length > 1 && (
          <View style={s.crewSection}>
            <Text style={s.crewTitle}>🧑 Your Crew</Text>
            {crewMembers.map(m => (
              <View key={m.id} style={[s.crewRow, m.id === profile.id && s.crewRowSelf]}>
                <Text style={s.crewEmoji}>{m.is_leader ? '🏛️' : '🧍'}</Text>
                <View style={s.crewInfo}>
                  <Text style={s.crewName}>{m.username ?? 'Survivor'}{m.id === profile.id ? ' (you)' : ''}</Text>
                  <Text style={s.crewFloor}>Floor {m.tower_floor} · Lv.{m.level}</Text>
                </View>
                <View style={s.crewFloorBadge}>
                  <Text style={s.crewFloorNum}>{m.tower_floor}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#100d0a' },
  scroll:    { padding: 20, paddingBottom: 40 },
  empty:     { alignItems: 'center', paddingTop: 80 },
  emptyEmoji:{ fontSize: 56, marginBottom: 12 },
  emptyTitle:{ color: '#e8d5b8', fontSize: 20, fontWeight: '700' },

  floorBadge:  { alignItems: 'center', marginBottom: 20 },
  floorLabel:  { color: '#8a7a6a', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  floorNum:    { color: '#d4791c', fontSize: 64, fontWeight: '900', lineHeight: 70 },

  monsterCard: {
    backgroundColor: '#1a1208', borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: '#2a1f14', marginBottom: 16,
  },
  spritePlaceholder: {
    height: 160, borderRadius: 12, backgroundColor: '#100d0a',
    borderWidth: 1, borderColor: '#2a1f14', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  spriteEmoji: { fontSize: 64 },
  spriteSub:   { color: '#3a2f24', fontSize: 11, marginTop: 8 },
  monsterName: { color: '#e8d5b8', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 16 },

  barRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { color: '#8a7a6a', fontSize: 12, fontWeight: '600' },
  barValue: { color: '#e8d5b8', fontSize: 12, fontWeight: '700' },
  barTrack: { height: 10, backgroundColor: '#2a1f14', borderRadius: 5, overflow: 'hidden' },
  barFill:  { height: 10, borderRadius: 5 },

  attackRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  attackLabel: { color: '#8a7a6a', fontSize: 13 },
  attackTimer: { color: '#c4a73e', fontSize: 16, fontWeight: '800' },
  attackHint:  { color: '#5a4a3a', fontSize: 11, textAlign: 'right', marginTop: 2 },

  tip:     { backgroundColor: '#1a1208', borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: '#2a1f14' },
  tipText: { color: '#8a7a6a', fontSize: 13, textAlign: 'center' },

  crewSection: { gap: 8 },
  crewTitle:   { color: '#e8d5b8', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  crewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1a1208', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#2a1f14',
  },
  crewRowSelf: { borderColor: '#d4791c' },
  crewEmoji:   { fontSize: 22 },
  crewInfo:    { flex: 1 },
  crewName:    { color: '#e8d5b8', fontWeight: '700', fontSize: 14 },
  crewFloor:   { color: '#8a7a6a', fontSize: 12 },
  crewFloorBadge: {
    backgroundColor: '#d4791c33', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  crewFloorNum: { color: '#d4791c', fontWeight: '800', fontSize: 16 },
});
