import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { calcMaxHp, getEquippedBonus, xpForNextLevel } from '../../lib/towerEngine';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { C, F } from '../../constants/theme';

type PlayerItem = any;
type Profile = Database['public']['Tables']['profiles']['Row'];

const SW = Dimensions.get('window').width;
const SLOT_SIZE = Math.floor((SW - 28 - 32) / 5);

const IDLE_FRAMES = [
  require('../../assets/characters/1/frame_0000.png'),
  require('../../assets/characters/1/frame_0001.png'),
  require('../../assets/characters/1/frame_0002.png'),
  require('../../assets/characters/1/frame_0003.png'),
  require('../../assets/characters/1/frame_0004.png'),
  require('../../assets/characters/1/frame_0005.png'),
  require('../../assets/characters/1/frame_0006.png'),
  require('../../assets/characters/1/frame_0007.png'),
  require('../../assets/characters/1/frame_0008.png'),
  require('../../assets/characters/1/frame_0009.png'),
  require('../../assets/characters/1/frame_0010.png'),
  require('../../assets/characters/1/frame_0011.png'),
  require('../../assets/characters/1/frame_0012.png'),
  require('../../assets/characters/1/frame_0013.png'),
  require('../../assets/characters/1/frame_0014.png'),
];

function IdleSprite() {
  const [frame, setFrame] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    ref.current = setInterval(() => setFrame(f => (f + 1) % IDLE_FRAMES.length), Math.round(2000 / 15));
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);
  return <Image source={IDLE_FRAMES[frame]} style={s.spriteImage} resizeMode="contain" />;
}

export default function CharacterScreen({ onClose }: { onClose?: () => void }) {
  const { profile } = useAuth();
  const [playerItems, setPlayerItems] = useState<PlayerItem[]>([]);
  const [family, setFamily]           = useState<Profile[]>([]);
  const [inviteCode, setInviteCode]   = useState('');
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!profile) return;
    const p1 = supabase.from('player_items').select('*, store_items(*)').eq('profile_id', profile.id);
    const p2 = profile.household_id
      ? supabase.from('profiles').select('*').eq('household_id', profile.household_id).neq('id', profile.id)
      : Promise.resolve({ data: [] as Profile[] });
    const p3 = profile.household_id && profile.is_leader
      ? supabase.from('households').select('invite_code').eq('id', profile.household_id).single()
      : Promise.resolve({ data: null });
    Promise.all([p1, p2, p3]).then(([{ data: items }, { data: fam }, { data: hh }]) => {
      setPlayerItems(items ?? []);
      setFamily(fam ?? []);
      if (hh && 'invite_code' in hh) setInviteCode((hh as any).invite_code ?? '');
      setLoading(false);
    });
  }, [profile?.id]);

  if (!profile) return null;
  if (loading) return (
    <SafeAreaView style={s.container}>
      <ActivityIndicator color={C.primary} style={{ marginTop: 80 }} />
    </SafeAreaView>
  );

  const xp      = xpForNextLevel(profile.xp);
  const xpPct   = xp.current / xp.needed;
  const maxHp   = calcMaxHp(profile, playerItems);
  const hpPct   = profile.player_hp / Math.max(1, maxHp);
  const bonus   = getEquippedBonus(playerItems);
  const equipped = playerItems.filter((pi: any) => pi.equipped);

  return (
    <SafeAreaView style={s.container}>
      {onClose && (
        <Pressable onPress={onClose} style={s.backBtn}>
          <Text style={s.backBtnText}>← BACK</Text>
        </Pressable>
      )}
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── TOP ROW ── */}
        <View style={s.topRow}>

          {/* Sprite */}
          <View style={s.spriteCol}>
            <View style={s.spriteBox}>
              <IdleSprite />
            </View>
          </View>

          {/* Stats */}
          <View style={s.infoCol}>
            <Text style={s.name} numberOfLines={1}>{(profile.username ?? 'HERO').toUpperCase()}</Text>

            <View style={s.badgeRow}>
              <View style={s.lvBadge}><Text style={s.lvText}>LV.{profile.level}</Text></View>
              <View style={s.floorBadge}><Text style={s.floorText}>FL.{profile.tower_floor}</Text></View>
            </View>

            <View style={s.barBlock}>
              <View style={s.barHead}>
                <Text style={s.barLbl}>XP</Text>
                <Text style={s.barVal}>{xp.current}/{xp.needed}</Text>
              </View>
              <View style={s.track}>
                <View style={[s.fill, { width: `${xpPct * 100}%` as any, backgroundColor: C.xp }]} />
              </View>
            </View>

            <View style={s.barBlock}>
              <View style={s.barHead}>
                <Text style={s.barLbl}>HP</Text>
                <Text style={s.barVal}>{profile.player_hp}/{maxHp}</Text>
              </View>
              <View style={s.track}>
                <View style={[s.fill, { width: `${hpPct * 100}%` as any, backgroundColor: C.hp }]} />
              </View>
            </View>

            {/* Attack + Defense row */}
            <View style={s.statsRow}>
              <Text style={[s.stat, { color: C.damage }]}>⚔️  +{bonus.damage}</Text>
              <Text style={[s.stat, { color: C.hp }]}>🛡️  +{bonus.hp}</Text>
            </View>

            {/* Money row */}
            <View style={s.moneyRow}>
              <Text style={[s.stat, { color: C.gold }]}>💰  {profile.points}</Text>
            </View>

            {/* Invite code */}
            {profile.is_leader && inviteCode ? (
              <View style={s.inviteBox}>
                <Text style={s.inviteLbl}>FAMILY CODE</Text>
                <Text style={s.inviteCode}>{inviteCode}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── EQUIPMENT SLOTS ── */}
        <View style={s.slotsRow}>
          {[0, 1, 2, 3, 4].map(i => {
            const item = equipped[i];
            return (
              <View key={i} style={s.slot}>
                {item
                  ? <Text style={s.slotEmoji}>{item.store_items.emoji}</Text>
                  : <Text style={s.slotPlus}>+</Text>
                }
              </View>
            );
          })}
        </View>

        {/* ── FAMILY ── */}
        {family.length > 0 && (
          <View style={s.familySection}>
            <View style={s.sectionHead}>
              <Text style={s.sectionHeadText}>FAMILY</Text>
            </View>
            {family.map(m => {
              const mHpPct = Math.max(0, m.player_hp / Math.max(1, m.player_max_hp));
              return (
                <View key={m.id} style={s.memberRow}>
                  <Text style={{ fontSize: 24 }}>{m.is_leader ? '👑' : '🧑'}</Text>
                  <View style={s.memberInfo}>
                    <View style={s.memberTopRow}>
                      <Text style={s.memberName}>{(m.username ?? 'HERO').toUpperCase()}</Text>
                      <Text style={s.memberSub}>LV.{m.level} · FL.{m.tower_floor}</Text>
                    </View>
                    <View style={s.track}>
                      <View style={[s.fill, { width: `${mHpPct * 100}%` as any, backgroundColor: C.hp }]} />
                    </View>
                  </View>
                  <Text style={s.memberHp}>{m.player_hp}/{m.player_max_hp}</Text>
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  backBtn:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtnText: { fontFamily: F.pixel, fontSize: 9, color: C.textMuted, letterSpacing: 1 },
  scroll:    { padding: 14, paddingBottom: 48 },

  topRow:    { flexDirection: 'row', alignItems: 'stretch', gap: 12, marginBottom: 16 },
  spriteCol: { flex: 1 },
  spriteBox: {
    flex: 1, minHeight: 260,
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  spriteImage: { width: '100%' as any, height: '100%' as any },

  infoCol: { flex: 1 },

  name:      { fontFamily: F.pixel, fontSize: 16, color: C.text, marginBottom: 10, letterSpacing: 1, lineHeight: 26 },
  badgeRow:  { flexDirection: 'row', gap: 6, marginBottom: 12 },
  lvBadge:   { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: 3, borderBottomColor: C.primaryDark },
  lvText:    { fontFamily: F.pixel, fontSize: 9, color: C.bg },
  floorBadge:{ backgroundColor: C.card, borderWidth: 2, borderColor: C.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  floorText: { fontFamily: F.pixel, fontSize: 9, color: C.textMuted },

  barBlock: { marginBottom: 10 },
  barHead:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLbl:   { fontFamily: F.pixel, fontSize: 8, color: C.textMuted, letterSpacing: 1 },
  barVal:   { fontFamily: F.pixel, fontSize: 8, color: C.text },
  track:    { height: 10, backgroundColor: C.cardAlt, borderRadius: 3, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  fill:     { height: 10, borderRadius: 3 },

  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  moneyRow: { marginBottom: 10 },
  stat:     { fontFamily: F.pixel, fontSize: 12, lineHeight: 22 },

  inviteBox:  { marginTop: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  inviteLbl:  { fontFamily: F.pixel, fontSize: 6, color: C.textMuted, letterSpacing: 1, marginBottom: 3 },
  inviteCode: { fontFamily: F.pixel, fontSize: 11, color: C.primary, letterSpacing: 3 },

  slotsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  slot: {
    width: SLOT_SIZE, height: SLOT_SIZE,
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  slotEmoji: { fontSize: 22 },
  slotPlus:  { fontFamily: F.pixel, fontSize: 18, color: C.border },

  familySection:   { gap: 8 },
  sectionHead:     { backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 4, borderRadius: 12 },
  sectionHeadText: { fontFamily: F.pixel, fontSize: 8, color: C.bg, letterSpacing: 1 },

  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderRadius: 14, padding: 12,
  },
  memberInfo:   { flex: 1 },
  memberTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  memberName:   { fontFamily: F.pixel, fontSize: 8, color: C.text },
  memberSub:    { fontFamily: F.pixel, fontSize: 7, color: C.textMuted },
  memberHp:     { fontFamily: F.pixel, fontSize: 7, color: C.textMuted, minWidth: 44, textAlign: 'right' },
});
