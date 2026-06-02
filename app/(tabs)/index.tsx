import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, ActivityIndicator, Dimensions, Image, ImageBackground,
  Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import StoryModal from '../../components/StoryModal';
import { ACHIEVEMENTS, achievementProgress } from '../../lib/achievements';
import {
  calcMaxHp, calcMonsterAttack, getEquippedBonus,
  nextAttackCountdown, xpForNextLevel,
} from '../../lib/towerEngine';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { C, F } from '../../constants/theme';
import ChoresScreen from './chores';
import StoreScreen  from './store';

type TowerFloor = Database['public']['Tables']['tower_floors']['Row'];
type Profile    = Database['public']['Tables']['profiles']['Row'];
type PlayerItem = any;

const SW        = Dimensions.get('window').width;
const SH        = Dimensions.get('window').height;
const SLOT_SIZE = Math.floor((SW - 28 - 32) / 5);

const ARENA_BG     = require('../../assets/backgrounds/1/3.png');
const CHARACTER_BG = require('../../assets/verticalbgs/1/1.png');

// ── Enemy animations (one folder per enemy; add more folders as art lands) ──
const ENEMY_SPRITES: Record<number, any[]> = {
  1: [
    require('../../assets/enemies/1/frame_0000.png'), require('../../assets/enemies/1/frame_0001.png'),
    require('../../assets/enemies/1/frame_0002.png'), require('../../assets/enemies/1/frame_0003.png'),
    require('../../assets/enemies/1/frame_0004.png'), require('../../assets/enemies/1/frame_0005.png'),
    require('../../assets/enemies/1/frame_0006.png'), require('../../assets/enemies/1/frame_0007.png'),
    require('../../assets/enemies/1/frame_0008.png'), require('../../assets/enemies/1/frame_0009.png'),
    require('../../assets/enemies/1/frame_0010.png'), require('../../assets/enemies/1/frame_0011.png'),
    require('../../assets/enemies/1/frame_0012.png'), require('../../assets/enemies/1/frame_0013.png'),
    require('../../assets/enemies/1/frame_0014.png'), require('../../assets/enemies/1/frame_0015.png'),
  ],
  2: [
    require('../../assets/enemies/2/frame_0000.png'), require('../../assets/enemies/2/frame_0001.png'),
    require('../../assets/enemies/2/frame_0002.png'), require('../../assets/enemies/2/frame_0003.png'),
    require('../../assets/enemies/2/frame_0004.png'), require('../../assets/enemies/2/frame_0005.png'),
    require('../../assets/enemies/2/frame_0006.png'), require('../../assets/enemies/2/frame_0007.png'),
    require('../../assets/enemies/2/frame_0008.png'), require('../../assets/enemies/2/frame_0009.png'),
    require('../../assets/enemies/2/frame_0010.png'), require('../../assets/enemies/2/frame_0011.png'),
    require('../../assets/enemies/2/frame_0012.png'), require('../../assets/enemies/2/frame_0013.png'),
    require('../../assets/enemies/2/frame_0014.png'), require('../../assets/enemies/2/frame_0015.png'),
  ],
  3: [
    require('../../assets/enemies/3/frame_0000.png'), require('../../assets/enemies/3/frame_0001.png'),
    require('../../assets/enemies/3/frame_0002.png'), require('../../assets/enemies/3/frame_0003.png'),
    require('../../assets/enemies/3/frame_0004.png'), require('../../assets/enemies/3/frame_0005.png'),
    require('../../assets/enemies/3/frame_0006.png'), require('../../assets/enemies/3/frame_0007.png'),
    require('../../assets/enemies/3/frame_0008.png'), require('../../assets/enemies/3/frame_0009.png'),
    require('../../assets/enemies/3/frame_0010.png'), require('../../assets/enemies/3/frame_0011.png'),
    require('../../assets/enemies/3/frame_0012.png'), require('../../assets/enemies/3/frame_0013.png'),
    require('../../assets/enemies/3/frame_0014.png'), require('../../assets/enemies/3/frame_0015.png'),
  ],
  4: [
    require('../../assets/enemies/4/frame_0000.png'), require('../../assets/enemies/4/frame_0001.png'),
    require('../../assets/enemies/4/frame_0002.png'), require('../../assets/enemies/4/frame_0003.png'),
    require('../../assets/enemies/4/frame_0004.png'), require('../../assets/enemies/4/frame_0005.png'),
    require('../../assets/enemies/4/frame_0006.png'), require('../../assets/enemies/4/frame_0007.png'),
    require('../../assets/enemies/4/frame_0008.png'), require('../../assets/enemies/4/frame_0009.png'),
    require('../../assets/enemies/4/frame_0010.png'), require('../../assets/enemies/4/frame_0011.png'),
    require('../../assets/enemies/4/frame_0012.png'), require('../../assets/enemies/4/frame_0013.png'),
    require('../../assets/enemies/4/frame_0014.png'), require('../../assets/enemies/4/frame_0015.png'),
  ],
};
const ENEMY_FOLDERS = Object.keys(ENEMY_SPRITES).length; // available art
const ENEMY_FRAME_MS = Math.round(2000 / 16); // 125ms

function framesForFloor(floor: number): any[] {
  const idx = ((floor - 1) % ENEMY_FOLDERS) + 1;   // cycle through available art
  return ENEMY_SPRITES[idx];
}

function EnemySprite({ floor }: { floor: number }) {
  const frames = framesForFloor(floor);
  const [frame, setFrame] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    setFrame(0);
    ref.current = setInterval(() => setFrame(f => (f + 1) % frames.length), ENEMY_FRAME_MS);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [floor]);
  return <Image source={frames[frame]} style={s.enemyImage} resizeMode="contain" />;
}

// ── Character idle animation ─────────────────────────────────────
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
  return <Image source={IDLE_FRAMES[frame]} style={s.idleImage} resizeMode="contain" />;
}

// ── Main screen ──────────────────────────────────────────────────
export default function GameScreen() {
  const { profile, refreshProfile, signOut } = useAuth();

  // tower
  const [floor, setFloor]       = useState<TowerFloor | null>(null);
  const [countdown, setCountdown] = useState('');

  // character
  const [playerItems, setPlayerItems] = useState<PlayerItem[]>([]);
  const [family, setFamily]           = useState<Profile[]>([]);
  const [inviteCode, setInviteCode]   = useState('');

  const [loading, setLoading]         = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  // modals
  const [showQuests,       setShowQuests]       = useState(false);
  const [showStore,        setShowStore]        = useState(false);
  const [showGuild,        setShowGuild]        = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showBag,          setShowBag]          = useState(false);
  const [showLogs,         setShowLogs]         = useState(false);
  const [logs,             setLogs]             = useState<any[]>([]);
  const [creating,         setCreating]         = useState(false);
  const [resetting,        setResetting]        = useState(false);
  const [showStory,        setShowStory]        = useState(false);
  const [storyText,        setStoryText]        = useState<string | undefined>(undefined);
  const storyShownRef = useRef(false);

  // measured height of the arena sprite section — quest sheet opens to just below it,
  // covering the opaque info row (monster stats + attack button)
  const [arenaHeight, setArenaHeight] = useState(SH * 0.42 + 20);

  // monster name animation (0 = resting in stats row, 1 = risen into arena)
  const attackAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(attackAnim, {
      toValue: showQuests ? 1 : 0,
      duration: showQuests ? 280 : 200,
      useNativeDriver: true,
    }).start();
  }, [showQuests]);

  async function load() {
    if (!profile) return;

    const { data: fp } = await supabase.from('profiles').select('*').eq('id', profile.id).single();
    if (!fp) return;
    const { data: fd } = await supabase.from('tower_floors').select('*').eq('floor', fp.tower_floor).single();
    if (!fd) return;

    // monster attack tick — damage sticks; if it hits 0 the hero is defeated
    // (revive by doing 2 chores), no auto-heal.
    const attack = calcMonsterAttack(fp, fd);
    if (attack.ticks > 0) {
      const justDied = fp.player_hp > 0 && attack.newHp <= 0;
      await supabase.from('profiles').update({
        player_hp: attack.newHp,
        last_monster_attack: attack.newLastAttack.toISOString(),
        ...(justDied ? { deaths: (fp.deaths ?? 0) + 1 } : {}),
      }).eq('id', profile.id);
      await refreshProfile();
    }

    setFloor(fd);

    const hid = profile.household_id;
    const [{ data: pi }, { data: fam }, { data: ch }, hh] = await Promise.all([
      supabase.from('player_items').select('*, store_items(*)').eq('profile_id', profile.id),
      hid
        ? supabase.from('profiles').select('*').eq('household_id', hid).neq('id', profile.id)
        : Promise.resolve({ data: [] as any[] }),
      hid
        ? supabase.from('chores').select('id').eq('household_id', hid)
        : supabase.from('chores').select('id').is('household_id', null).eq('created_by', profile.id),
      hid
        ? supabase.from('households').select('invite_code').eq('id', hid).single()
        : Promise.resolve({ data: null }),
    ]);
    setPlayerItems(pi ?? []);
    setFamily(fam ?? []);
    setPendingCount(ch?.length ?? 0);
    setInviteCode(hh?.data ? ((hh.data as any).invite_code ?? '') : '');
    setLoading(false);
  }

  const insets = useSafeAreaInsets();

  async function toggleEquip(pi: PlayerItem) {
    if (!profile) return;
    if (pi.equipped) {
      await supabase.from('player_items').update({ equipped: false }).eq('id', pi.id);
    } else {
      // Unequip any equipped item of the same type, then equip this one
      const sameType = playerItems.filter(
        (o: PlayerItem) => o.equipped && o.store_items.item_type === pi.store_items.item_type
      );
      for (const old of sameType) {
        await supabase.from('player_items').update({ equipped: false }).eq('id', old.id);
      }
      await supabase.from('player_items').update({ equipped: true }).eq('id', pi.id);
    }
    await load();
  }

  async function openLogs() {
    if (!profile) return;
    setShowLogs(true);
    let q = supabase.from('chore_log').select('*');
    q = profile.household_id
      ? q.eq('household_id', profile.household_id)
      : q.is('household_id', null).eq('profile_id', profile.id);
    const { data } = await q.order('created_at', { ascending: false }).limit(300);
    setLogs(data ?? []);
  }

  // member id -> display name (self + family)
  const nameById: Record<string, string> = {};
  if (profile) nameById[profile.id] = (profile.username ?? 'HERO').toUpperCase();
  for (const m of family) nameById[m.id] = (m.username ?? 'HERO').toUpperCase();

  // group logs by calendar day (YYYY-MM-DD in local time)
  const logsByDay: { day: string; label: string; entries: any[] }[] = [];
  {
    const map = new Map<string, any[]>();
    for (const l of logs) {
      const d = new Date(l.created_at);
      const day = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(l);
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (const [, entries] of map) {
      const d = new Date(entries[0].created_at);
      const dMid = new Date(d); dMid.setHours(0, 0, 0, 0);
      const diff = Math.round((today.getTime() - dMid.getTime()) / 86_400_000);
      const label = diff === 0 ? 'TODAY' : diff === 1 ? 'YESTERDAY'
        : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
      logsByDay.push({ day: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, label, entries });
    }
  }

  // Create a guild (household) from the Guild tab. Migrates any solo chores/logs into it.
  async function createHousehold() {
    if (!profile) return;
    setCreating(true);
    const code = Array.from({ length: 6 }, () =>
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
    ).join('');
    const { data: hh, error } = await supabase
      .from('households')
      .insert({
        name: `${(profile.username ?? 'MY').toUpperCase()} GUILD`,
        invite_code: code,
        created_by: profile.id,
      } as any)
      .select('id, invite_code')
      .single();
    if (!error && hh) {
      await supabase.from('profiles').update({ household_id: hh.id, is_leader: true }).eq('id', profile.id);
      // Bring the player's solo chores + logs into the new guild
      await supabase.from('chores').update({ household_id: hh.id }).is('household_id', null).eq('created_by', profile.id);
      await supabase.from('chore_log').update({ household_id: hh.id }).is('household_id', null).eq('profile_id', profile.id);
      setInviteCode((hh as any).invite_code);
      await refreshProfile();
      await load();
    }
    setCreating(false);
  }

  // Reset this hero back to level 1 (wipes progression + owned gear).
  async function resetProgress() {
    if (!profile) return;
    Alert.alert(
      'RESET PROGRESS?',
      'This sets your hero back to level 1 and clears your gold, XP, floor and items. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset', style: 'destructive',
          onPress: async () => {
            setResetting(true);
            const { data: f1 } = await supabase
              .from('tower_floors').select('monster_max_hp').eq('floor', 1).single();
            await supabase.from('player_items').delete().eq('profile_id', profile.id);
            await supabase.from('profiles').update({
              level: 1, xp: 0, points: 0, tower_floor: 1,
              player_hp: 5, player_max_hp: 5,
              monster_hp: f1?.monster_max_hp ?? 1,
              revive_progress: 0,
              last_monster_attack: new Date().toISOString(),
            } as any).eq('id', profile.id);
            await refreshProfile();
            await load();
            setResetting(false);
          },
        },
      ],
    );
  }

  // Story popup once per launch, after the hero loads.
  useEffect(() => {
    if (profile && !storyShownRef.current) {
      storyShownRef.current = true;
      setStoryText(undefined);   // placeholder intro story
      setShowStory(true);
    }
  }, [profile]);

  function handleDefeat() {
    // Close the quest sheet first, then show the story once it has fully
    // dismissed — stacking/closing modals at the same time freezes touches in RN.
    setShowQuests(false);
    setStoryText(undefined);     // placeholder defeat-snippet story
    setTimeout(() => setShowStory(true), 450);
  }

  useFocusEffect(useCallback(() => { load(); }, [profile?.id]));

  useEffect(() => {
    if (!profile || !floor) return;
    const tick = () => setCountdown(nextAttackCountdown(profile, floor));
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [profile, floor]);

  // Keep the displayed floor (denominator of monster HP) in sync with the
  // profile after an attack advances the floor — without a full reload.
  useEffect(() => {
    if (!profile?.tower_floor) return;
    if (floor && floor.floor === profile.tower_floor) return;
    supabase.from('tower_floors').select('*').eq('floor', profile.tower_floor).single()
      .then(({ data }) => { if (data) setFloor(data); });
  }, [profile?.tower_floor]);

  if (loading || !floor) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator color={C.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const monsterPct   = Math.max(0, profile.monster_hp / floor.monster_max_hp);
  const monsterColor = monsterPct > 0.5 ? C.hp : monsterPct > 0.25 ? C.gold : C.damage;

  const xp      = xpForNextLevel(profile.xp);
  const xpPct   = xp.current / xp.needed;
  const maxHp   = calcMaxHp(profile, playerItems);
  const hpPct   = profile.player_hp / Math.max(1, maxHp);
  const bonus   = getEquippedBonus(playerItems);
  const equipped = playerItems.filter((pi: any) => pi.equipped);
  const dead    = profile.player_hp <= 0;

  return (
    <View style={s.container}>
      {/* ── BACKGROUND IMAGE covers arena + info row ── */}
      <ImageBackground source={ARENA_BG} resizeMode="cover">

        {/* Arena section — enemy (left) vs character (right) */}
        <View
          style={[s.arenaSection, { paddingTop: insets.top }]}
          onLayout={e => setArenaHeight(e.nativeEvent.layout.height)}
        >
          <EnemySprite floor={profile.tower_floor} />
          {/* Monster name rises into arena when attack modal opens */}
          <Animated.View
            pointerEvents="none"
            style={[s.monsterOverlay, {
              opacity: attackAnim,
              transform: [{ translateY: attackAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            }]}
          >
            <View style={s.monsterOverlayRow}>
              <Text style={s.monsterOverlayName}>{floor?.monster_name.toUpperCase()}</Text>
              <Text style={s.monsterOverlayHp}>{profile.monster_hp} / {floor?.monster_max_hp}</Text>
            </View>
            <View style={s.overlayTrack}>
              <View style={[s.overlayFill, { width: `${monsterPct * 100}%` as any, backgroundColor: monsterColor }]} />
            </View>
          </Animated.View>
        </View>

        {/* Info row — 80% dark overlay so background bleeds through */}
        <View style={s.infoOverlay}>
          <View style={s.infoRow}>
            <View style={s.enemyStats}>
              <Animated.View style={{ opacity: attackAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
                <View style={s.monsterRow}>
                  <Text style={s.monsterName}>{floor.monster_name.toUpperCase()}</Text>
                  <Text style={s.monsterHpVal}>{profile.monster_hp} / {floor.monster_max_hp}</Text>
                </View>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${monsterPct * 100}%` as any, backgroundColor: monsterColor }]} />
                </View>
              </Animated.View>
              <Text style={s.timerLabel}>⚔️ NEXT ATTACK  <Text style={s.timerVal}>{countdown}</Text></Text>
              <Text style={s.timerHint}>{floor.monster_attack} DMG · EVERY {floor.attack_interval_hours}H</Text>
            </View>
            <Pressable
              style={({ pressed }) => [s.attackBtn, pressed && s.attackBtnPressed]}
              onPress={() => setShowQuests(true)}
            >
              {pendingCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
                </View>
              )}
              <Text style={s.attackEmoji}>{dead ? '💀' : '⚔️'}</Text>
              <Text style={s.attackLabel}>{dead ? 'REVIVE' : 'ATTACK'}</Text>
            </Pressable>
          </View>
        </View>

      </ImageBackground>

      {/* Below — character + family on solid background */}
      <View style={[s.belowArena, { paddingBottom: insets.bottom }]}>

          <View style={s.divider} />

          {/* ── CHARACTER ── */}
          <View style={s.characterSection}>
            <View style={s.topRow}>

              {/* Idle sprite */}
              <View style={s.spriteCol}>
                <ImageBackground source={ARENA_BG} resizeMode="cover" style={s.spriteBox} imageStyle={s.spriteBoxImg}>
                  <IdleSprite />
                </ImageBackground>
              </View>

              {/* Stats — space-between distributes groups across available height */}
              <View style={s.infoCol}>

                {/* Group 1: name + level + gold */}
                <View style={{ gap: 4 }}>
                  <Text style={s.heroName} numberOfLines={1}>{(profile.username ?? 'HERO').toUpperCase()}</Text>
                  <View style={s.badgeRow}>
                    <Text style={s.lvText}>LV.{profile.level}</Text>
                    <Text style={s.goldText}>{profile.points} 💰</Text>
                  </View>
                </View>

                {/* Group 2: bars */}
                <View style={s.barsGroup}>
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
                </View>

                {/* Group 3: combat stats + store */}
                <View style={s.statsWithStore}>
                  <View style={s.combatStats}>
                    <Text style={[s.stat, { color: C.damage }]}>⚔️ +{bonus.damage}</Text>
                    <Text style={[s.stat, { color: C.hp }]}>🛡️ +{bonus.hp}</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [s.actionTile, s.storeTile, pressed && s.actionTilePressed]}
                    onPress={() => setShowStore(true)}
                  >
                    <Text style={s.actionTileEmoji}>🛒</Text>
                    <Text style={[s.actionTileLabel, { color: '#cce8ff' }]}>STORE</Text>
                  </Pressable>
                </View>

                {/* Group 4: achievements + guild */}
                <View style={s.bottomActions}>
                  <Pressable
                    style={({ pressed }) => [s.actionTile, s.achieveTile, pressed && s.actionTilePressed]}
                    onPress={() => setShowAchievements(true)}
                  >
                    <Text style={s.actionTileEmoji}>🏆</Text>
                    <Text style={[s.actionTileLabel, { color: '#fffacc' }]}>FEATS</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [s.actionTile, s.guildTile, pressed && s.actionTilePressed]}
                    onPress={() => setShowGuild(true)}
                  >
                    <Text style={s.actionTileEmoji}>🏰</Text>
                    <Text style={[s.actionTileLabel, { color: '#fff5cc' }]}>GUILD</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Equipment slots — tap to open bag */}
            <View style={s.slotsRow}>
              {[0, 1, 2, 3, 4].map(i => {
                const item = equipped[i];
                return (
                  <Pressable
                    key={i}
                    style={({ pressed }) => [s.slot, pressed && { opacity: 0.7 }]}
                    onPress={() => setShowBag(true)}
                  >
                    {item
                      ? <Text style={s.slotEmoji}>{item.store_items.emoji}</Text>
                      : <Text style={s.slotPlus}>+</Text>}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── FAMILY ── */}
          {family.length > 0 && (
            <>
              <View style={s.divider} />
              <View style={s.familySection}>
                <View style={s.sectionHead}>
                  <Text style={s.sectionHeadText}>FAMILY</Text>
                </View>
                <View style={s.familyList}>
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
              </View>
            </>
          )}

      </View>{/* end belowArena */}

      {/* ── MODALS ── */}
      <Modal visible={showQuests} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowQuests(false)}>
        <View style={{ flex: 1 }}>
          <Pressable style={{ height: arenaHeight }} onPress={() => setShowQuests(false)} />
          <View style={[s.choreSheet, { flex: 1 }]}>
            {showQuests && <ChoresScreen sheetMode onClose={() => setShowQuests(false)} onDefeat={handleDefeat} />}
          </View>
        </View>
      </Modal>
      <Modal visible={showStore} animationType="slide" onRequestClose={() => setShowStore(false)}>
        {showStore && <StoreScreen onClose={() => setShowStore(false)} />}
      </Modal>
      <Modal visible={showBag} animationType="slide" onRequestClose={() => setShowBag(false)}>
        {showBag && (
          <SafeAreaView style={s.guildModal}>
            <View style={s.guildHeader}>
              <Pressable onPress={() => setShowBag(false)} style={s.guildBack}>
                <Text style={s.guildBackTxt}>←</Text>
              </Pressable>
              <Text style={[s.guildTitle, { color: C.primary }]}>🎒 BAG</Text>
            </View>
            {playerItems.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Text style={{ fontSize: 40 }}>🎒</Text>
                <Text style={{ fontFamily: F.pixel, fontSize: 8, color: C.textMuted, letterSpacing: 1 }}>BAG IS EMPTY</Text>
                <Text style={{ fontFamily: F.body, fontSize: 15, color: C.textDim }}>Buy gear in the store.</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={s.bagList}>
                {playerItems.map((pi: PlayerItem) => (
                  <Pressable
                    key={pi.id}
                    style={({ pressed }) => [s.bagRow, pi.equipped && s.bagRowEquipped, pressed && { opacity: 0.7 }]}
                    onPress={() => toggleEquip(pi)}
                  >
                    <Text style={s.bagEmoji}>{pi.store_items.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.bagName}>{pi.store_items.name.toUpperCase()}</Text>
                      <View style={s.bagStats}>
                        {pi.store_items.damage_bonus > 0 && <Text style={[s.bagStat, { color: C.damage }]}>⚔️ +{pi.store_items.damage_bonus}</Text>}
                        {pi.store_items.hp_bonus > 0 && <Text style={[s.bagStat, { color: C.hp }]}>🛡️ +{pi.store_items.hp_bonus}</Text>}
                      </View>
                    </View>
                    <View style={[s.bagTag, pi.equipped ? s.bagTagOn : s.bagTagOff]}>
                      <Text style={[s.bagTagTxt, { color: pi.equipped ? C.bg : C.textMuted }]}>
                        {pi.equipped ? 'EQUIPPED' : 'EQUIP'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </SafeAreaView>
        )}
      </Modal>
      <Modal visible={showAchievements} animationType="slide" onRequestClose={() => setShowAchievements(false)}>
        {showAchievements && (
          <SafeAreaView style={s.guildModal}>
            <View style={s.guildHeader}>
              <Pressable onPress={() => setShowAchievements(false)} style={s.guildBack}>
                <Text style={s.guildBackTxt}>←</Text>
              </Pressable>
              <Text style={[s.guildTitle, { color: C.gold, flex: 1 }]}>🏆 FEATS</Text>
              <Text style={s.featCount}>{ACHIEVEMENTS.filter(a => achievementProgress(profile, a).unlocked).length}/{ACHIEVEMENTS.length}</Text>
            </View>
            <ScrollView contentContainerStyle={s.featList}>
              {ACHIEVEMENTS.map(a => {
                const { value, unlocked } = achievementProgress(profile, a);
                const pct = Math.min(1, value / a.target);
                return (
                  <View key={a.id} style={[s.featRow, !unlocked && { opacity: 0.55 }]}>
                    <Text style={s.featIcon}>{unlocked ? a.icon : '🔒'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.featTitle}>{a.title.toUpperCase()}</Text>
                      <Text style={s.featDesc}>{a.desc}</Text>
                      {!unlocked && (
                        <View style={s.featTrack}>
                          <View style={[s.featFill, { width: `${pct * 100}%` as any }]} />
                        </View>
                      )}
                    </View>
                    {unlocked
                      ? <Text style={s.featDone}>✓</Text>
                      : <Text style={s.featProg}>{Math.min(value, a.target)}/{a.target}</Text>}
                  </View>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
      <Modal
        visible={showGuild}
        animationType="slide"
        onRequestClose={() => { setShowGuild(false); setShowLogs(false); }}
      >
        {showGuild && (
          <SafeAreaView style={s.guildModal}>
            <View style={s.guildHeader}>
              <Pressable
                onPress={() => showLogs ? setShowLogs(false) : setShowGuild(false)}
                style={s.guildBack}
              >
                <Text style={s.guildBackTxt}>←</Text>
              </Pressable>
              <Text style={[s.guildTitle, { flex: 1 }]}>{showLogs ? '📜 CHORE LOGS' : '🏰 GUILD'}</Text>
              {!showLogs && (
                <Pressable onPress={openLogs} style={s.logsBtn}>
                  <Text style={s.logsBtnTxt}>📜 LOGS</Text>
                </Pressable>
              )}
            </View>

            {showLogs ? (
              logsByDay.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 40 }}>📜</Text>
                  <Text style={{ fontFamily: F.pixel, fontSize: 8, color: C.textMuted, letterSpacing: 1 }}>NO CHORES YET</Text>
                </View>
              ) : (
                <ScrollView contentContainerStyle={s.logList}>
                  {logsByDay.map(group => (
                    <View key={group.day} style={s.logDay}>
                      <Text style={s.logDayLabel}>{group.label}</Text>
                      {group.entries.map(e => {
                        const t = new Date(e.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                        return (
                          <View key={e.id} style={s.logRow}>
                            <Text style={s.logTime}>{t}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={s.logTitle}>{e.chore_title}</Text>
                              <Text style={s.logWho}>{nameById[e.profile_id] ?? 'SOMEONE'}</Text>
                            </View>
                            <Text style={s.logDmg}>⚔️ {e.damage}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </ScrollView>
              )
            ) : (
              <View style={{ flex: 1 }}>
                {inviteCode ? (
                  <View style={s.guildCodeBox}>
                    <Text style={s.guildCodeLbl}>FAMILY CODE</Text>
                    <Text style={s.guildCode}>{inviteCode}</Text>
                  </View>
                ) : (
                  <View style={s.guildCreateBox}>
                    <Text style={s.guildCreateHint}>You&apos;re playing solo. Create a guild to invite family and share quests.</Text>
                    <Pressable
                      style={({ pressed }) => [s.setupBtn, creating && { opacity: 0.5 }, pressed && s.setupBtnPressed]}
                      onPress={createHousehold}
                      disabled={creating}
                    >
                      <Text style={s.setupBtnText}>{creating ? 'CREATING…' : '＋ CREATE GUILD'}</Text>
                    </Pressable>
                  </View>
                )}
                <View style={s.guildFooter}>
                  <Pressable style={s.resetBtn} onPress={resetProgress} disabled={resetting}>
                    <Text style={s.resetText}>{resetting ? 'RESETTING…' : '↺ RESET PROGRESS'}</Text>
                  </Pressable>
                  <Pressable style={s.signOutBtn} onPress={signOut}>
                    <Text style={s.signOutText}>SIGN OUT</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </SafeAreaView>
        )}
      </Modal>

      <StoryModal visible={showStory} body={storyText} onClose={() => setShowStory(false)} />
    </View>
  );

}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cardAlt },
  belowArena: { flex: 1, backgroundColor: C.bg },
  choreSheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    overflow: 'hidden',
  },

  empty:      { flex: 1, alignItems: 'center', paddingTop: 100 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontFamily: F.pixel, fontSize: 12, color: C.text, marginBottom: 10 },
  emptyBody:  { fontFamily: F.body, fontSize: 18, color: C.textMuted },

  // Guild creation (shown in the Guild tab when playing solo)
  setupBtn:        { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 28, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: C.primaryDark },
  setupBtnPressed: { borderBottomWidth: 0, marginTop: 4 },
  setupBtnText:    { fontFamily: F.pixel, fontSize: 10, color: C.bg, letterSpacing: 1 },
  guildCreateBox:  { margin: 16, gap: 16, alignItems: 'center' },
  guildCreateHint: { fontFamily: F.body, fontSize: 17, color: C.textMuted, textAlign: 'center', lineHeight: 24 },
  guildFooter:     { marginTop: 'auto', padding: 16, gap: 10 },
  resetBtn:        { paddingVertical: 14, alignItems: 'center', borderWidth: 2, borderColor: '#8b2020', borderRadius: 12 },
  resetText:       { fontFamily: F.pixel, fontSize: 8, color: '#ff7070', letterSpacing: 1 },
  signOutBtn:      { paddingVertical: 14, alignItems: 'center', borderWidth: 2, borderColor: C.border, borderRadius: 12 },
  signOutText:     { fontFamily: F.pixel, fontSize: 8, color: C.textMuted, letterSpacing: 1 },

  // ── Arena sprite section ──
  arenaSection: {
    width: '100%', height: SH * 0.42 + 20,
    alignItems: 'center', justifyContent: 'flex-end',
    paddingBottom: 16, overflow: 'hidden',
  },
  enemyImage: { width: 220, height: 220 },

  // ── Info row — background image shows through at 20% ──
  infoOverlay: { backgroundColor: 'rgba(10, 14, 26, 0.8)' },

  // ── Two-column row under arena ──
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, gap: 12,
  },
  enemyStats: { flex: 1, gap: 6 },
  monsterOverlay:     { position: 'absolute', bottom: 14, left: 16, right: 16, gap: 6 },
  monsterOverlayRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  monsterOverlayName: { fontFamily: F.pixel, fontSize: 11, color: '#fff', letterSpacing: 1 },
  monsterOverlayHp:   { fontFamily: F.body, fontSize: 16, color: '#fff' },
  overlayTrack:       { height: 10, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 3, overflow: 'hidden' },
  overlayFill:        { height: 10, borderRadius: 3 },

  monsterRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  monsterName:   { fontFamily: F.pixel, fontSize: 11, color: C.text, letterSpacing: 1 },
  monsterHpVal:  { fontFamily: F.body, fontSize: 15, color: C.text },
  timerLabel:  { fontFamily: F.pixel, fontSize: 7, color: C.textMuted, letterSpacing: 1 },
  timerVal:    { fontFamily: F.pixel, fontSize: 8, color: C.gold },
  timerHint:   { fontFamily: F.pixel, fontSize: 7, color: C.textMuted },

  // ── Attack button (right of enemy stats) ──
  attackBtn: {
    width: 144, height: 72,
    backgroundColor: '#e8321c',
    borderWidth: 2, borderColor: '#9b1a0a',
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    gap: 6, borderBottomWidth: 4, borderBottomColor: '#9b1a0a',
  },
  attackBtnPressed: { borderBottomWidth: 2, marginTop: 2 },
  attackEmoji: { fontSize: 34 },
  attackLabel: { fontFamily: F.pixel, fontSize: 10, color: '#ffd0cc', letterSpacing: 1 },

  // ── Store + Guild tiles ──
  bottomActions: { flexDirection: 'row', gap: 8 },
  actionTile: {
    flex: 1, height: 70,
    borderRadius: 12, borderWidth: 2, borderBottomWidth: 4,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  actionTilePressed: { borderBottomWidth: 2, marginTop: 2 },
  actionTileEmoji:   { fontSize: 24 },
  actionTileLabel:   { fontFamily: F.pixel, fontSize: 8, letterSpacing: 1 },
  storeTile:   { backgroundColor: '#3d9be9', borderColor: '#1c5f99', borderBottomColor: '#1c5f99' },
  achieveTile: { backgroundColor: '#2d9e5f', borderColor: '#1a5c38', borderBottomColor: '#1a5c38' },
  guildTile:   { backgroundColor: '#e8b432', borderColor: '#9b6f0a', borderBottomColor: '#9b6f0a' },

  // ── Guild modal ──
  guildModal:   { flex: 1, backgroundColor: C.bg },
  guildHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  guildBack:    { width: 36, height: 36, backgroundColor: C.card, borderRadius: 10, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  guildBackTxt: { fontFamily: F.pixel, fontSize: 14, color: C.textMuted, lineHeight: 20 },
  guildTitle:   { fontFamily: F.pixel, fontSize: 12, color: '#e8b432', letterSpacing: 1 },
  // ── Feats (achievements) ──
  featCount: { fontFamily: F.pixel, fontSize: 9, color: C.gold },
  featList:  { padding: 14, gap: 10 },
  featRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderRadius: 12, padding: 12,
  },
  featIcon:  { fontSize: 26, width: 32, textAlign: 'center' },
  featTitle: { fontFamily: F.pixel, fontSize: 9, color: C.text, marginBottom: 3 },
  featDesc:  { fontFamily: F.body, fontSize: 15, color: C.textMuted },
  featTrack: { height: 6, backgroundColor: C.cardAlt, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  featFill:  { height: 6, backgroundColor: C.gold, borderRadius: 3 },
  featDone:  { fontFamily: F.pixel, fontSize: 12, color: C.hp },
  featProg:  { fontFamily: F.pixel, fontSize: 7, color: C.textMuted },

  guildCodeBox: { margin: 16, backgroundColor: C.card, borderWidth: 2, borderColor: '#e8b432', borderRadius: 14, padding: 16, alignItems: 'center', gap: 6 },
  guildCodeLbl: { fontFamily: F.pixel, fontSize: 7, color: C.textMuted, letterSpacing: 2 },
  guildCode:    { fontFamily: F.pixel, fontSize: 22, color: '#e8b432', letterSpacing: 6 },

  // ── Bag modal ──
  bagList:        { padding: 14, gap: 10 },
  bagRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderRadius: 14, padding: 12,
  },
  bagRowEquipped: { borderColor: C.primary },
  bagEmoji:       { fontSize: 30 },
  bagName:        { fontFamily: F.pixel, fontSize: 9, color: C.text, marginBottom: 4 },
  bagStats:       { flexDirection: 'row', gap: 10 },
  bagStat:        { fontFamily: F.pixel, fontSize: 8 },
  bagTag:         { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  bagTagOn:       { backgroundColor: C.primary },
  bagTagOff:      { backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border },
  bagTagTxt:      { fontFamily: F.pixel, fontSize: 7, letterSpacing: 1 },

  // ── Logs ──
  logsBtn:      { backgroundColor: C.card, borderWidth: 2, borderColor: C.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  logsBtnTxt:   { fontFamily: F.pixel, fontSize: 7, color: C.primary, letterSpacing: 1 },
  logList:      { padding: 14, gap: 16 },
  logDay:       { gap: 8 },
  logDayLabel:  { fontFamily: F.pixel, fontSize: 8, color: C.gold, letterSpacing: 1, marginBottom: 2 },
  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderRadius: 12, padding: 10,
  },
  logTime:  { fontFamily: F.pixel, fontSize: 7, color: C.textMuted, minWidth: 44 },
  logTitle: { fontFamily: F.body, fontSize: 16, color: C.text },
  logWho:   { fontFamily: F.pixel, fontSize: 7, color: C.textMuted, letterSpacing: 1, marginTop: 2 },
  logDmg:   { fontFamily: F.pixel, fontSize: 8, color: C.damage },
  badge: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: C.primary, borderRadius: 9,
    minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { fontFamily: F.pixel, fontSize: 7, color: C.bg },

  divider: { height: 2, backgroundColor: C.border, marginHorizontal: 14 },

  // ── Character section — fills remaining space ──
  characterSection: { flex: 1, padding: 14, paddingTop: 10, gap: 8 },

  // ── Shared bars ──
  barBlock: {},
  barHead:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLbl:   { fontFamily: F.pixel, fontSize: 8, color: C.textMuted, letterSpacing: 1 },
  barVal:   { fontFamily: F.pixel, fontSize: 8, color: C.text },
  track:    { height: 10, backgroundColor: C.cardAlt, borderRadius: 3, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  fill:     { height: 10, borderRadius: 3 },

  // ── Character top row — stretches to fill remaining space ──
  topRow:    { flex: 1, flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  spriteCol: { flex: 1 },
  spriteBox: {
    flex: 1, overflow: 'hidden',
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  spriteBoxImg: { borderRadius: 14 },
  idleImage: { width: '100%' as any, height: '100%' as any },
  infoCol:   { flex: 1, justifyContent: 'space-between' },

  heroName:   { fontFamily: F.pixel, fontSize: 16, color: C.text, marginBottom: 6, letterSpacing: 1, lineHeight: 26 },
  badgeRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barsGroup:  { gap: 8 },
  lvText:   { fontFamily: F.pixel, fontSize: Math.round(SH * 0.013), color: C.textMuted },
  goldText: { fontFamily: F.pixel, fontSize: Math.round(SH * 0.013), color: C.gold },

  statsWithStore: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  combatStats:    { flex: 1, justifyContent: 'center' },
  stat:           { fontFamily: F.pixel, fontSize: 12, lineHeight: 22 },


  // ── Equipment slots ──
  slotsRow: { flexDirection: 'row', gap: 8 },
  slot: {
    width: SLOT_SIZE, height: SLOT_SIZE,
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  slotEmoji: { fontSize: 22 },
  slotPlus:  { fontFamily: F.pixel, fontSize: 18, color: C.border },

  familySection: { padding: 14, gap: 10 },

  // ── Family ──
  sectionHead:     { backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  sectionHeadText: { fontFamily: F.pixel, fontSize: 8, color: C.bg, letterSpacing: 1 },
  familyList:      { gap: 8 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderRadius: 14, padding: 12,
  },
  memberInfo:   { flex: 1 },
  memberTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  memberName:   { fontFamily: F.pixel, fontSize: 8, color: C.text },
  memberSub:    { fontFamily: F.body, fontSize: 14, color: C.textMuted },
  memberHp:     { fontFamily: F.pixel, fontSize: 7, color: C.textMuted, minWidth: 44, textAlign: 'right' },
});
