import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { calcIdleDelta, getLevelUpCost, MODULE_BUILD_COSTS, MODULE_INFO, ModuleType } from '../../lib/idleEngine';
import { getModuleCostMultiplier } from '../../lib/specializations';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';

type BaseModule = Database['public']['Tables']['base_modules']['Row'];
type GameState = Database['public']['Tables']['game_state']['Row'];
type CrewSpec = Database['public']['Tables']['crew_specializations']['Row'];

const MODULE_ORDER: ModuleType[] = ['reactor', 'lab', 'fabricator', 'medbay', 'bridge', 'hangar'];

function ResourceBar({ gameState }: { gameState: GameState }) {
  return (
    <View style={styles.resourceBar}>
      <View style={styles.res}><Text style={styles.resVal}>⚡ {gameState.energy}</Text><Text style={styles.resLabel}>Energy</Text></View>
      <View style={styles.res}><Text style={styles.resVal}>🔬 {gameState.research}</Text><Text style={styles.resLabel}>Research</Text></View>
      <View style={styles.res}><Text style={styles.resVal}>🪨 {gameState.materials}</Text><Text style={styles.resLabel}>Materials</Text></View>
      <View style={[styles.res, { borderRightWidth: 0 }]}>
        <Text style={[styles.resVal, { color: gameState.morale >= 75 ? '#30d158' : gameState.morale < 50 ? '#ff453a' : '#fff' }]}>
          💜 {gameState.morale}
        </Text>
        <Text style={styles.resLabel}>Morale</Text>
      </View>
    </View>
  );
}

export default function StationScreen() {
  const { profile, gameState, refreshGameState } = useAuth();
  const [modules, setModules] = useState<BaseModule[]>([]);
  const [commanderSpec, setCommanderSpec] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticking, setTicking] = useState(false);

  async function load() {
    if (!profile?.household_id) { setLoading(false); return; }
    const [{ data: mods }, { data: specs }] = await Promise.all([
      supabase.from('base_modules').select('*').eq('household_id', profile.household_id),
      supabase.from('crew_specializations').select('*'),
    ]);
    setModules(mods ?? []);
    // Find this household's commander spec
    const mySpec = specs?.find(s => s.profile_id === profile.id);
    setCommanderSpec(mySpec?.spec ?? null);
    setLoading(false);
  }

  async function applyIdleTick() {
    if (!gameState || !profile?.household_id || ticking) return;
    const delta = calcIdleDelta(gameState, modules);
    if (delta.energy === 0 && delta.research === 0 && delta.materials === 0 && delta.moraleDelta === 0) return;
    setTicking(true);
    await supabase.from('game_state').update({
      energy:    Math.max(0, gameState.energy    + delta.energy),
      research:  Math.max(0, gameState.research  + delta.research),
      materials: Math.max(0, gameState.materials + delta.materials),
      morale:    Math.min(100, Math.max(0, gameState.morale + delta.moraleDelta)),
      last_idle_tick: new Date().toISOString(),
    }).eq('household_id', profile.household_id);
    await refreshGameState();
    setTicking(false);
  }

  useEffect(() => { load(); }, [profile?.household_id]);
  useEffect(() => { if (!loading) applyIdleTick(); }, [loading]);

  async function buildModule(type: ModuleType) {
    if (!profile?.household_id || !gameState) return;
    const existing = modules.find(m => m.module_type === type);
    const costMult = getModuleCostMultiplier(commanderSpec as any);

    let cost: { energy: number; research: number; materials: number };
    if (existing) {
      const raw = getLevelUpCost(type, existing.level);
      cost = {
        energy:    Math.floor(raw.energy    * costMult),
        research:  Math.floor(raw.research  * costMult),
        materials: Math.floor(raw.materials * costMult),
      };
    } else {
      const raw = MODULE_BUILD_COSTS[type][0];
      cost = {
        energy:    Math.floor(raw.energy    * costMult),
        research:  Math.floor(raw.research  * costMult),
        materials: Math.floor(raw.materials * costMult),
      };
    }

    if (gameState.energy < cost.energy || gameState.research < cost.research || gameState.materials < cost.materials) {
      Alert.alert('Insufficient Resources', `Need ⚡${cost.energy} 🔬${cost.research} 🪨${cost.materials}`);
      return;
    }

    const action = existing ? `Upgrade to Level ${existing.level + 1}` : 'Build';
    Alert.alert(
      `${action}: ${MODULE_INFO[type].name}`,
      `Cost: ⚡${cost.energy}  🔬${cost.research}  🪨${cost.materials}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          onPress: async () => {
            await supabase.from('game_state').update({
              energy:    gameState.energy    - cost.energy,
              research:  gameState.research  - cost.research,
              materials: gameState.materials - cost.materials,
            }).eq('household_id', profile.household_id!);

            if (existing) {
              await supabase.from('base_modules').update({ level: existing.level + 1 }).eq('id', existing.id);
            } else {
              await supabase.from('base_modules').insert({ household_id: profile.household_id, module_type: type, level: 1 });
            }
            await Promise.all([load(), refreshGameState()]);
          },
        },
      ]
    );
  }

  if (!profile?.household_id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}><Text style={styles.emptyEmoji}>🏗️</Text><Text style={styles.emptyTitle}>No Station Yet</Text><Text style={styles.emptyText}>Create or join a crew to start building.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏗️ Station</Text>
        {gameState && <Text style={styles.headerSub}>Ch. {gameState.current_chapter} · {gameState.morale >= 75 ? '✨ High Morale ×1.2' : gameState.morale < 50 ? '⚠️ Low Morale ×0.8' : '⚖️ Stable Morale'}</Text>}
      </View>

      {gameState && <ResourceBar gameState={gameState} />}

      {loading ? (
        <ActivityIndicator color="#00e5ff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={MODULE_ORDER}
          keyExtractor={(t) => t}
          contentContainerStyle={styles.list}
          renderItem={({ item: type }) => {
            const info = MODULE_INFO[type];
            const existing = modules.find(m => m.module_type === type);
            const costMult = getModuleCostMultiplier(commanderSpec as any);
            const rawCost = existing ? getLevelUpCost(type, existing.level) : MODULE_BUILD_COSTS[type][0];
            const cost = {
              energy:    Math.floor(rawCost.energy    * costMult),
              research:  Math.floor(rawCost.research  * costMult),
              materials: Math.floor(rawCost.materials * costMult),
            };
            const canAfford = gameState
              ? gameState.energy >= cost.energy && gameState.research >= cost.research && gameState.materials >= cost.materials
              : false;
            const maxed = existing && existing.level >= 5;

            return (
              <View style={[styles.card, existing && styles.cardBuilt]}>
                <View style={styles.cardLeft}>
                  <Text style={styles.moduleEmoji}>{info.emoji}</Text>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{info.name}</Text>
                    {existing && <Text style={styles.levelBadge}>Lv {existing.level}</Text>}
                  </View>
                  <Text style={styles.cardDesc}>{info.description}</Text>
                  <Text style={styles.cardUnlocks}>Unlocks: {info.unlocks}</Text>
                  {!maxed && (
                    <Text style={styles.costText}>
                      {existing ? 'Upgrade: ' : 'Build: '}
                      {cost.energy > 0 ? `⚡${cost.energy} ` : ''}
                      {cost.research > 0 ? `🔬${cost.research} ` : ''}
                      {cost.materials > 0 ? `🪨${cost.materials}` : ''}
                    </Text>
                  )}
                </View>
                <View style={styles.cardRight}>
                  {maxed ? (
                    <Text style={styles.maxText}>MAX</Text>
                  ) : (
                    <Pressable
                      style={[styles.buildBtn, !canAfford && styles.buildBtnDisabled]}
                      onPress={() => buildModule(type)}
                      disabled={!canAfford}
                    >
                      <Text style={styles.buildBtnText}>{existing ? '⬆️' : '🔨'}</Text>
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
  container: { flex: 1, backgroundColor: '#05050f' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#00e5ff' },
  headerSub: { fontSize: 13, color: '#6b6b8a', marginTop: 2 },
  resourceBar: {
    flexDirection: 'row',
    backgroundColor: '#0d0d1f',
    borderBottomWidth: 1,
    borderColor: '#1e1e3f',
    paddingVertical: 10,
  },
  res: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderColor: '#1e1e3f' },
  resVal: { color: '#fff', fontWeight: '700', fontSize: 14 },
  resLabel: { color: '#6b6b8a', fontSize: 10, marginTop: 2 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#0d0d1f',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1e3f',
    gap: 12,
  },
  cardBuilt: { borderColor: '#00e5ff33' },
  cardLeft: { width: 44, alignItems: 'center' },
  moduleEmoji: { fontSize: 32 },
  cardBody: { flex: 1, gap: 3 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  levelBadge: { backgroundColor: '#00e5ff22', color: '#00e5ff', fontSize: 11, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  cardDesc: { color: '#6b6b8a', fontSize: 12 },
  cardUnlocks: { color: '#bf5af288', fontSize: 11 },
  costText: { color: '#8e8ea0', fontSize: 11, marginTop: 2 },
  cardRight: { width: 44, alignItems: 'center' },
  buildBtn: { backgroundColor: '#00e5ff', borderRadius: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  buildBtnDisabled: { backgroundColor: '#1e1e3f' },
  buildBtnText: { fontSize: 18 },
  maxText: { color: '#30d158', fontWeight: '800', fontSize: 11 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: '#6b6b8a', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
