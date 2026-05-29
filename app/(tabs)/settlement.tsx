import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  ADVANCEMENTS, ALL_MODULE_TYPES, calcIdleDelta, getLevelUpCost,
  getMedicineRestoreAmount, MODULE_BUILD_COSTS, MODULE_INFO, ModuleType,
} from '../../lib/idleEngine';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';

type GameState = Database['public']['Tables']['game_state']['Row'];
type BaseModule = Database['public']['Tables']['base_modules']['Row'];
type Advancement = Database['public']['Tables']['advancements']['Row'];

const BASE_RESOURCES = [
  { key: 'energy',     emoji: '⚡', label: 'Energy',     color: '#d4791c' },
  { key: 'knowledge',  emoji: '📚', label: 'Knowledge',  color: '#c4a73e' },
  { key: 'food',       emoji: '🥫', label: 'Food',       color: '#8a5a2a' },
  { key: 'money',      emoji: '💵', label: 'Money',      color: '#6b9a4a' },
  { key: 'population', emoji: '👥', label: 'Population', color: '#5a7a9a' },
  { key: 'morale',     emoji: '💜', label: 'Morale',     color: '#7a5a8a' },
] as const;

const ADVANCED_RESOURCES = [
  { key: 'weapons',  emoji: '🔫', label: 'Weapons',  color: '#c04a2a' },
  { key: 'medicine', emoji: '💊', label: 'Medicine', color: '#4a8a6a' },
  { key: 'science',  emoji: '🔬', label: 'Science',  color: '#4a6a9a' },
  { key: 'army',     emoji: '⚔️', label: 'Army',     color: '#8a3a3a' },
] as const;

const BUILDING_IO: Record<ModuleType, { input: string; output: string }> = {
  factory:    { input: '⚡2 🥫1 💵1 /hr',  output: '🔫3 /hr'  },
  clinic:     { input: '📚1 🥫1 👥1 /hr',  output: '💊2 /hr'  },
  laboratory: { input: '⚡2 📚2 💵1 /hr',  output: '🔬1 /hr'  },
  barracks:   { input: '🔫5 👥2 /hr',      output: '⚔️1 /hr'  },
  watchtower: { input: '—',                 output: '−20% scout time/lv' },
};

export default function SettlementScreen() {
  const { profile, gameState: ctxGs, refreshGameState } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(ctxGs);
  const [modules, setModules] = useState<BaseModule[]>([]);
  const [advancements, setAdvancements] = useState<Advancement[]>([]);
  const [tab, setTab] = useState<'buildings' | 'advancements'>('buildings');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const advKeys = advancements.map(a => a.advancement_key);

  async function load() {
    if (!profile?.household_id) { setLoading(false); return; }
    const [{ data: gs }, { data: mods }, { data: advs }] = await Promise.all([
      supabase.from('game_state').select('*').eq('household_id', profile.household_id).single(),
      supabase.from('base_modules').select('*').eq('household_id', profile.household_id),
      supabase.from('advancements').select('*').eq('household_id', profile.household_id),
    ]);
    if (gs)   setGameState(gs);
    if (mods) setModules(mods);
    if (advs) setAdvancements(advs);
    setLoading(false);
  }

  const applyIdleTick = useCallback(async (gs: GameState, mods: BaseModule[], advKeys: string[]) => {
    const delta = calcIdleDelta(gs, mods, advKeys);
    const hasChange = Object.entries(delta).some(([k, v]) => k !== 'moraleDelta' && v !== 0) || delta.moraleDelta !== 0;
    if (!hasChange || !gs.household_id) return;
    const updated = {
      energy:     Math.max(0, gs.energy     + delta.energy),
      knowledge:  Math.max(0, gs.knowledge  + delta.knowledge),
      food:       Math.max(0, gs.food       + delta.food),
      money:      Math.max(0, gs.money      + delta.money),
      population: Math.max(0, gs.population + delta.population),
      weapons:    Math.max(0, gs.weapons    + delta.weapons),
      medicine:   Math.max(0, gs.medicine   + delta.medicine),
      science:    Math.max(0, gs.science    + delta.science),
      army:       Math.max(0, gs.army       + delta.army),
      morale:     Math.max(0, Math.min(100, gs.morale + delta.moraleDelta)),
      last_idle_tick: new Date().toISOString(),
    };
    await supabase.from('game_state').update(updated).eq('household_id', gs.household_id);
    setGameState({ ...gs, ...updated });
    refreshGameState();
  }, [refreshGameState]);

  useEffect(() => {
    load().then(() => {
      if (ctxGs) applyIdleTick(ctxGs, modules, advKeys);
    });
  }, []);

  async function build(type: ModuleType) {
    if (!profile?.household_id || !gameState) return;
    const cost = MODULE_BUILD_COSTS[type];
    for (const [k, v] of Object.entries(cost) as [string, number][]) {
      if ((gameState as any)[k] < v) {
        Alert.alert('Insufficient Resources', `Need more ${k}.`); return;
      }
    }
    setBusy(type);
    const costUpdate: Partial<GameState> = {};
    for (const [k, v] of Object.entries(cost) as [string, number][]) {
      (costUpdate as any)[k] = (gameState as any)[k] - v;
    }
    await Promise.all([
      supabase.from('base_modules').insert({ household_id: profile.household_id, module_type: type, level: 1 }),
      supabase.from('game_state').update(costUpdate).eq('household_id', profile.household_id),
    ]);
    await load(); setBusy(null);
  }

  async function upgrade(mod: BaseModule) {
    if (!profile?.household_id || !gameState) return;
    if (mod.level >= 5) { Alert.alert('Max Level', 'Fully upgraded.'); return; }
    const cost = getLevelUpCost(mod.module_type as ModuleType, mod.level);
    for (const [k, v] of Object.entries(cost) as [string, number][]) {
      if ((gameState as any)[k] < v) {
        Alert.alert('Insufficient Resources', `Need more ${k}.`); return;
      }
    }
    setBusy(mod.id);
    const costUpdate: Partial<GameState> = {};
    for (const [k, v] of Object.entries(cost) as [string, number][]) {
      (costUpdate as any)[k] = (gameState as any)[k] - v;
    }
    await Promise.all([
      supabase.from('base_modules').update({ level: mod.level + 1 }).eq('id', mod.id),
      supabase.from('game_state').update(costUpdate).eq('household_id', profile.household_id),
    ]);
    await load(); setBusy(null);
  }

  async function useMedicine() {
    if (!gameState || !profile?.household_id) return;
    if (gameState.medicine < 1) { Alert.alert('No Medicine', 'Produce medicine in the Clinic first.'); return; }
    if (gameState.morale >= 100) { Alert.alert('Full Morale', 'Morale is already at maximum.'); return; }
    const restore = getMedicineRestoreAmount(advKeys);
    const updated = {
      medicine: gameState.medicine - 1,
      morale: Math.min(100, gameState.morale + restore),
    };
    await supabase.from('game_state').update(updated).eq('household_id', profile.household_id);
    setGameState({ ...gameState, ...updated });
    refreshGameState();
  }

  async function unlockAdvancement(key: string, cost: number) {
    if (!gameState || !profile?.household_id) return;
    if (gameState.science < cost) { Alert.alert('Insufficient Science', `Need ${cost} Science.`); return; }
    setBusy(key);
    await Promise.all([
      supabase.from('advancements').insert({ household_id: profile.household_id, advancement_key: key }),
      supabase.from('game_state').update({ science: gameState.science - cost }).eq('household_id', profile.household_id),
    ]);
    await load(); setBusy(null);
  }

  if (!profile?.household_id) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>🏚️</Text>
          <Text style={s.emptyTitle}>No Settlement Yet</Text>
          <Text style={s.emptyText}>Join or create a settlement in the Council tab.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>🏚️ Settlement</Text>

        {/* Base resources */}
        {gameState && (
          <View style={s.resourceGrid}>
            {BASE_RESOURCES.map(({ key, emoji, label, color }) => (
              <View key={key} style={s.resourceCell}>
                <Text style={s.resourceEmoji}>{emoji}</Text>
                <Text style={[s.resourceValue, { color }]}>{(gameState as any)[key]}</Text>
                <Text style={s.resourceLabel}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Advanced resources */}
        {gameState && (
          <View style={s.advancedRow}>
            {ADVANCED_RESOURCES.map(({ key, emoji, label, color }) => (
              <View key={key} style={s.advancedCell}>
                <Text style={s.resourceEmoji}>{emoji}</Text>
                <Text style={[s.resourceValue, { color }]}>{(gameState as any)[key]}</Text>
                <Text style={s.resourceLabel}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Use Medicine */}
        {gameState && gameState.medicine > 0 && (
          <Pressable style={s.medicineBtn} onPress={useMedicine}>
            <Text style={s.medicineBtnText}>
              💊 Use Medicine (+{getMedicineRestoreAmount(advKeys)} Morale) · {gameState.medicine} available
            </Text>
          </Pressable>
        )}

        {/* Tab switcher */}
        <View style={s.tabs}>
          <Pressable style={[s.tab, tab === 'buildings' && s.tabActive]} onPress={() => setTab('buildings')}>
            <Text style={[s.tabText, tab === 'buildings' && s.tabTextActive]}>Buildings</Text>
          </Pressable>
          <Pressable style={[s.tab, tab === 'advancements' && s.tabActive]} onPress={() => setTab('advancements')}>
            <Text style={[s.tabText, tab === 'advancements' && s.tabTextActive]}>
              Advancements {gameState && gameState.science > 0 ? `(🔬${gameState.science})` : ''}
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color="#d4791c" style={{ marginTop: 32 }} />
        ) : tab === 'buildings' ? (
          <View style={s.grid}>
            {ALL_MODULE_TYPES.map((type) => {
              const info   = MODULE_INFO[type];
              const io     = BUILDING_IO[type];
              const existing = modules.find(m => m.module_type === type);
              const cost   = existing ? getLevelUpCost(type, existing.level) : MODULE_BUILD_COSTS[type];
              const isBusy = busy === type || busy === existing?.id;
              const isMax  = existing?.level === 5;
              const canAfford = gameState
                ? Object.entries(cost).every(([k, v]) => (gameState as any)[k] >= v)
                : false;
              const canAct = profile.is_leader && canAfford && !isBusy && !isMax;

              return (
                <View key={type} style={[s.card, existing && s.cardBuilt]}>
                  <View style={s.cardHeader}>
                    <Text style={s.cardEmoji}>{info.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardName}>{info.name}</Text>
                      {existing && <Text style={s.cardLevel}>Level {existing.level}/5</Text>}
                    </View>
                  </View>

                  <View style={s.ioBox}>
                    <Text style={s.ioLabel}>IN:  <Text style={s.ioValue}>{io.input}</Text></Text>
                    <Text style={s.ioLabel}>OUT: <Text style={[s.ioValue, { color: '#6b9a4a' }]}>{io.output}</Text></Text>
                  </View>

                  {!isMax && (
                    <View style={s.costs}>
                      <Text style={s.costsLabel}>{existing ? 'Upgrade cost:' : 'Build cost:'}</Text>
                      {Object.entries(cost).map(([k, v]) => (
                        <Text key={k} style={s.costLine}>
                          {k.charAt(0).toUpperCase() + k.slice(1)}: {v}
                        </Text>
                      ))}
                    </View>
                  )}

                  {existing ? (
                    isMax ? (
                      <Text style={s.maxLevel}>✓ Fully Built</Text>
                    ) : (
                      <Pressable
                        style={[s.btn, !canAct && s.btnOff]}
                        onPress={() => upgrade(existing)}
                        disabled={!canAct}
                      >
                        <Text style={[s.btnText, !canAct && s.btnTextOff]}>
                          {isBusy ? 'Upgrading…' : !profile.is_leader ? '🔒 Leader Only' : `Upgrade → Lv.${existing.level + 1}`}
                        </Text>
                      </Pressable>
                    )
                  ) : (
                    <Pressable
                      style={[s.btn, s.btnBuild, !canAct && s.btnOff]}
                      onPress={() => build(type)}
                      disabled={!canAct}
                    >
                      <Text style={[s.btnText, !canAct && s.btnTextOff]}>
                        {isBusy ? 'Building…' : !profile.is_leader ? '🔒 Leader Only' : 'Build'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={s.grid}>
            {ADVANCEMENTS.map((adv) => {
              const unlocked = advKeys.includes(adv.key);
              const canAfford = gameState ? gameState.science >= adv.cost : false;
              const isBusy = busy === adv.key;
              return (
                <View key={adv.key} style={[s.card, unlocked && s.cardBuilt]}>
                  <View style={s.cardHeader}>
                    <Text style={s.cardEmoji}>{adv.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardName}>{adv.name}</Text>
                      {unlocked && <Text style={s.cardLevel}>✓ Unlocked</Text>}
                    </View>
                  </View>
                  <Text style={s.cardDesc}>{adv.description}</Text>
                  <Text style={[s.ioLabel, { marginBottom: 8 }]}>Effect: <Text style={[s.ioValue, { color: '#6b9a4a' }]}>{adv.effect}</Text></Text>
                  {!unlocked && (
                    <Pressable
                      style={[s.btn, !canAfford && s.btnOff]}
                      onPress={() => unlockAdvancement(adv.key, adv.cost)}
                      disabled={!canAfford || isBusy || !profile.is_leader}
                    >
                      <Text style={[s.btnText, !canAfford && s.btnTextOff]}>
                        {isBusy ? 'Unlocking…' : !profile.is_leader ? '🔒 Leader Only' : `🔬 ${adv.cost} Science`}
                      </Text>
                    </Pressable>
                  )}
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
  container: { flex: 1, backgroundColor: '#100d0a' },
  scroll: { padding: 16, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: '#d4791c', marginBottom: 4 },
  resourceGrid: {
    flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#1a1208',
    borderRadius: 14, padding: 10, borderWidth: 1, borderColor: '#2a1f14', gap: 4,
  },
  resourceCell: { width: '30%', alignItems: 'center', paddingVertical: 6 },
  resourceEmoji: { fontSize: 18 },
  resourceValue: { fontWeight: '800', fontSize: 16 },
  resourceLabel: { color: '#8a7a6a', fontSize: 10 },
  advancedRow: {
    flexDirection: 'row', backgroundColor: '#120d08',
    borderRadius: 14, padding: 10, borderWidth: 1, borderColor: '#2a1f14',
    justifyContent: 'space-around',
  },
  advancedCell: { alignItems: 'center', gap: 2 },
  medicineBtn: {
    backgroundColor: '#1a3028', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#4a8a6a', alignItems: 'center',
  },
  medicineBtnText: { color: '#6ab89a', fontWeight: '700', fontSize: 13 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#1a1208', borderWidth: 1, borderColor: '#2a1f14',
  },
  tabActive: { backgroundColor: '#2a1a08', borderColor: '#d4791c' },
  tabText: { color: '#8a7a6a', fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#d4791c' },
  grid: { gap: 10 },
  card: {
    backgroundColor: '#1a1208', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#2a1f14',
  },
  cardBuilt: { borderColor: '#4a3a1c' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardEmoji: { fontSize: 32 },
  cardName: { color: '#e8d5b8', fontWeight: '700', fontSize: 16 },
  cardLevel: { color: '#d4791c', fontWeight: '600', fontSize: 12, marginTop: 2 },
  cardDesc: { color: '#8a7a6a', fontSize: 12, marginBottom: 6 },
  ioBox: { backgroundColor: '#120d08', borderRadius: 8, padding: 8, marginBottom: 8, gap: 3 },
  ioLabel: { color: '#8a7a6a', fontSize: 12 },
  ioValue: { color: '#c4a73e', fontWeight: '600' },
  costs: { marginBottom: 8, gap: 2 },
  costsLabel: { color: '#e8d5b8', fontWeight: '600', fontSize: 12 },
  costLine: { color: '#8a7a6a', fontSize: 12 },
  btn: {
    backgroundColor: '#d4791c', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', marginTop: 2,
  },
  btnBuild: { backgroundColor: '#4a3010' },
  btnOff: { backgroundColor: '#2a1f14' },
  btnText: { color: '#100d0a', fontWeight: '700', fontSize: 13 },
  btnTextOff: { color: '#5a4a3a' },
  maxLevel: { color: '#6b9a4a', fontWeight: '700', fontSize: 13, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { color: '#e8d5b8', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: '#8a7a6a', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
