import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  ALL_MODULE_TYPES,
  calcIdleDelta,
  calcModuleRates,
  getLevelUpCost,
  MODULE_BUILD_COSTS,
  MODULE_INFO,
  ModuleType,
} from '../../lib/idleEngine';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';

type GameState = Database['public']['Tables']['game_state']['Row'];
type BaseModule = Database['public']['Tables']['base_modules']['Row'];

const RESOURCE_BAR = [
  { key: 'energy',    emoji: '⚡', label: 'Energy',    color: '#d4791c' },
  { key: 'knowledge', emoji: '📚', label: 'Knowledge', color: '#c4a73e' },
  { key: 'money',     emoji: '💵', label: 'Money',     color: '#6b9a4a' },
  { key: 'food',      emoji: '🥫', label: 'Food',      color: '#8a5a2a' },
  { key: 'morale',    emoji: '💜', label: 'Morale',    color: '#7a5a8a' },
] as const;

export default function SettlementScreen() {
  const { profile, gameState: ctxGs, refreshGameState } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(ctxGs);
  const [modules, setModules] = useState<BaseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    if (!profile?.household_id) { setLoading(false); return; }
    const [{ data: gs }, { data: mods }] = await Promise.all([
      supabase.from('game_state').select('*').eq('household_id', profile.household_id).single(),
      supabase.from('base_modules').select('*').eq('household_id', profile.household_id),
    ]);
    if (gs) setGameState(gs);
    if (mods) setModules(mods ?? []);
    setLoading(false);
  }

  const applyIdleTick = useCallback(async (gs: GameState, mods: BaseModule[]) => {
    const delta = calcIdleDelta(gs, mods);
    if (!delta.energy && !delta.knowledge && !delta.money && !delta.food && !delta.moraleDelta) return;
    if (!gs.household_id) return;
    const updated = {
      energy:    gs.energy    + delta.energy,
      knowledge: gs.knowledge + delta.knowledge,
      money:     gs.money     + delta.money,
      food:      gs.food      + delta.food,
      morale:    Math.max(0, Math.min(100, gs.morale + delta.moraleDelta)),
      last_idle_tick: new Date().toISOString(),
    };
    await supabase.from('game_state').update(updated).eq('household_id', gs.household_id);
    setGameState({ ...gs, ...updated });
    refreshGameState();
  }, [refreshGameState]);

  useEffect(() => {
    load().then(() => {
      if (gameState && modules.length >= 0) applyIdleTick(gameState, modules);
    });
  }, []);

  async function build(type: ModuleType) {
    if (!profile?.household_id || !gameState) return;
    const cost = MODULE_BUILD_COSTS[type];
    if (gameState.energy < cost.energy || gameState.knowledge < cost.knowledge || gameState.money < cost.money) {
      Alert.alert('Insufficient Resources', 'Gather more resources to build this.');
      return;
    }
    setBusy(type);
    await Promise.all([
      supabase.from('base_modules').insert({ household_id: profile.household_id, module_type: type, level: 1 }),
      supabase.from('game_state').update({
        energy:    gameState.energy    - cost.energy,
        knowledge: gameState.knowledge - cost.knowledge,
        money:     gameState.money     - cost.money,
      }).eq('household_id', profile.household_id),
    ]);
    await load();
    setBusy(null);
  }

  async function upgrade(mod: BaseModule) {
    if (!profile?.household_id || !gameState) return;
    if (mod.level >= 5) { Alert.alert('Max Level', 'This building is fully upgraded.'); return; }
    const cost = getLevelUpCost(mod.module_type as ModuleType, mod.level);
    if (gameState.energy < cost.energy || gameState.knowledge < cost.knowledge || gameState.money < cost.money) {
      Alert.alert('Insufficient Resources', 'Gather more resources to upgrade.');
      return;
    }
    setBusy(mod.id);
    await Promise.all([
      supabase.from('base_modules').update({ level: mod.level + 1 }).eq('id', mod.id),
      supabase.from('game_state').update({
        energy:    gameState.energy    - cost.energy,
        knowledge: gameState.knowledge - cost.knowledge,
        money:     gameState.money     - cost.money,
      }).eq('household_id', profile.household_id),
    ]);
    await load();
    setBusy(null);
  }

  if (!profile?.household_id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🏚️</Text>
          <Text style={styles.emptyTitle}>No Settlement Yet</Text>
          <Text style={styles.emptyText}>Join or create a settlement in the Council tab.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const rates = calcModuleRates(modules);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🏚️ Settlement</Text>
          <Text style={styles.headerSub}>Build and upgrade your structures.</Text>
        </View>

        {/* Resource strip */}
        {gameState && (
          <View style={styles.resourceStrip}>
            {RESOURCE_BAR.map(({ key, emoji, label, color }) => (
              <View key={key} style={styles.resourceCell}>
                <Text style={styles.resourceEmoji}>{emoji}</Text>
                <Text style={[styles.resourceValue, { color }]}>{(gameState as any)[key]}</Text>
                <Text style={styles.resourceLabel}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {loading ? (
          <ActivityIndicator color="#d4791c" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grid}>
            {ALL_MODULE_TYPES.map((type) => {
              const info = MODULE_INFO[type];
              const existing = modules.find(m => m.module_type === type);
              const cost = existing ? getLevelUpCost(type, existing.level) : MODULE_BUILD_COSTS[type];
              const isBusy = busy === type || busy === existing?.id;
              const isMaxLevel = existing?.level === 5;
              const canAfford = gameState
                ? gameState.energy >= cost.energy && gameState.knowledge >= cost.knowledge && gameState.money >= cost.money
                : false;
              const canAct = profile.is_leader && canAfford && !isBusy && !isMaxLevel;

              return (
                <View key={type} style={[styles.card, existing && styles.cardBuilt]}>
                  <Text style={styles.cardEmoji}>{info.emoji}</Text>
                  <Text style={styles.cardName}>{info.name}</Text>
                  {existing && (
                    <Text style={styles.cardLevel}>Level {existing.level}/5</Text>
                  )}
                  <Text style={styles.cardDesc}>{info.description}</Text>

                  {!isMaxLevel && (
                    <View style={styles.costs}>
                      <Text style={styles.costsLabel}>{existing ? 'Upgrade cost:' : 'Build cost:'}</Text>
                      {cost.energy    > 0 && <Text style={styles.costLine}>⚡ {cost.energy} Energy</Text>}
                      {cost.knowledge > 0 && <Text style={styles.costLine}>📚 {cost.knowledge} Knowledge</Text>}
                      {cost.money     > 0 && <Text style={styles.costLine}>💵 {cost.money} Money</Text>}
                    </View>
                  )}

                  {existing ? (
                    isMaxLevel ? (
                      <Text style={styles.maxLevel}>✓ Fully Built</Text>
                    ) : (
                      <Pressable
                        style={[styles.btn, !canAct && styles.btnDisabled]}
                        onPress={() => upgrade(existing)}
                        disabled={!canAct}
                      >
                        <Text style={[styles.btnText, !canAct && styles.btnTextDisabled]}>
                          {isBusy ? 'Upgrading…' : !profile.is_leader ? '🔒 Leader Only' : `Upgrade → Lv.${existing.level + 1}`}
                        </Text>
                      </Pressable>
                    )
                  ) : (
                    <Pressable
                      style={[styles.btn, styles.btnBuild, !canAct && styles.btnDisabled]}
                      onPress={() => build(type)}
                      disabled={!canAct}
                    >
                      <Text style={[styles.btnText, !canAct && styles.btnTextDisabled]}>
                        {isBusy ? 'Building…' : !profile.is_leader ? '🔒 Leader Only' : 'Build'}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#100d0a' },
  scroll: { padding: 16, gap: 16 },
  header: { paddingBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#d4791c' },
  headerSub: { fontSize: 13, color: '#8a7a6a', marginTop: 2 },
  resourceStrip: {
    flexDirection: 'row',
    backgroundColor: '#1a1208',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a1f14',
    justifyContent: 'space-around',
  },
  resourceCell: { alignItems: 'center', gap: 2 },
  resourceEmoji: { fontSize: 18 },
  resourceValue: { fontWeight: '800', fontSize: 16 },
  resourceLabel: { color: '#8a7a6a', fontSize: 10 },
  grid: { gap: 12 },
  card: {
    backgroundColor: '#1a1208',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a1f14',
    gap: 6,
  },
  cardBuilt: { borderColor: '#6b4a1c' },
  cardEmoji: { fontSize: 36 },
  cardName: { color: '#e8d5b8', fontWeight: '700', fontSize: 17 },
  cardLevel: { color: '#d4791c', fontWeight: '700', fontSize: 13 },
  cardDesc: { color: '#8a7a6a', fontSize: 13, marginBottom: 4 },
  costs: { gap: 2, marginBottom: 4 },
  costsLabel: { color: '#e8d5b8', fontWeight: '600', fontSize: 12, marginBottom: 2 },
  costLine: { color: '#8a7a6a', fontSize: 12 },
  btn: {
    backgroundColor: '#d4791c',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  btnBuild: { backgroundColor: '#6b4a1c' },
  btnDisabled: { backgroundColor: '#2a1f14' },
  btnText: { color: '#100d0a', fontWeight: '700', fontSize: 14 },
  btnTextDisabled: { color: '#5a4a3a' },
  maxLevel: { color: '#6b9a4a', fontWeight: '700', fontSize: 14, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60, paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { color: '#e8d5b8', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: '#8a7a6a', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
