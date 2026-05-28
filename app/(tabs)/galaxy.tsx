import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getCombatWinChance, getTravelTimeMs } from '../../lib/specializations';
import { getChapterForEventKey, getNewStoryEvents } from '../../lib/storyEngine';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';

type Sector = Database['public']['Tables']['sectors']['Row'];
type DiscoveredSector = Database['public']['Tables']['discovered_sectors']['Row'];
type CrewSpec = Database['public']['Tables']['crew_specializations']['Row'];

const BIOME_EMOJI: Record<string, string> = {
  nebula: '🌌',
  asteroid_field: '☄️',
  deep_space: '🌑',
  alien_world: '🪐',
  anomaly: '🌀',
};

const BIOME_LABEL: Record<string, string> = {
  nebula: 'Nebula',
  asteroid_field: 'Asteroid Field',
  deep_space: 'Deep Space',
  alien_world: 'Alien World',
  anomaly: 'Anomaly',
};

const THREAT_LABEL = ['', '⚠️ Low', '⚠️⚠️ Moderate', '⚠️⚠️⚠️ High', '☠️ Extreme', '☠️☠️ CRITICAL'];

function timeUntil(isoString: string): string {
  const diff = new Date(isoString).getTime() - Date.now();
  if (diff <= 0) return 'Arriving…';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function GalaxyScreen() {
  const { profile, gameState, refreshGameState } = useAuth();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [discovered, setDiscovered] = useState<DiscoveredSector[]>([]);
  const [mySpec, setMySpec] = useState<string | null>(null);
  const [hangarLevel, setHangarLevel] = useState(0);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    if (!profile?.household_id) { setLoading(false); return; }
    const [{ data: s }, { data: d }, { data: spec }, { data: mods }] = await Promise.all([
      supabase.from('sectors').select('*').order('unlock_chapter').order('threat_level'),
      supabase.from('discovered_sectors').select('*').eq('household_id', profile.household_id),
      supabase.from('crew_specializations').select('*').eq('profile_id', profile.id).single(),
      supabase.from('base_modules').select('*').eq('household_id', profile.household_id).eq('module_type', 'hangar'),
    ]);
    setSectors(s ?? []);
    setDiscovered(d ?? []);
    setMySpec(spec?.spec ?? null);
    setHangarLevel(mods?.[0]?.level ?? 0);
    setLoading(false);
  }

  async function checkArrivals() {
    if (!profile?.household_id || !gameState) return;
    const traveling = discovered.filter(d => d.status === 'traveling' && new Date(d.arrives_at).getTime() <= Date.now());
    if (traveling.length === 0) return;

    for (const mission of traveling) {
      const sector = sectors.find(s => s.id === mission.sector_id);
      if (!sector) continue;

      const winChance = getCombatWinChance(sector.threat_level, mySpec as any);
      const hasCombat = Math.random() < sector.threat_level * 0.15;
      const combatWon = hasCombat ? Math.random() < winChance : true;

      const resourceYield = {
        energy: sector.biome === 'asteroid_field' || sector.biome === 'deep_space' ? sector.threat_level * 10 : 5,
        research: sector.biome === 'anomaly' || sector.biome === 'alien_world' ? sector.threat_level * 12 : 5,
        materials: sector.biome === 'nebula' || sector.biome === 'asteroid_field' ? sector.threat_level * 10 : 5,
      };

      let combatOutcome = null;
      if (hasCombat) {
        const narratives = combatWon ? [
          `Your crew outmaneuvred the hostile force near ${sector.name}. Combat systems performed flawlessly.`,
          `Tactical superiority won the day at ${sector.name}. Minor hull damage; no casualties.`,
          `The encounter was brief and decisive. ${sector.name} is secure.`,
        ] : [
          `Your ship was forced to retreat from ${sector.name}. The crew escaped with minimal losses but no resources.`,
          `The hostile force at ${sector.name} proved overwhelming. Strategic withdrawal executed.`,
        ];
        combatOutcome = {
          result: combatWon ? 'victory' : 'retreat',
          narrative: narratives[Math.floor(Math.random() * narratives.length)],
        };
        if (!combatWon) { resourceYield.energy = 0; resourceYield.research = 0; resourceYield.materials = 0; }
      }

      await supabase.from('discovered_sectors').update({
        status: 'discovered',
        combat_outcome: combatOutcome,
        resource_yield: resourceYield,
      }).eq('id', mission.id);

      // Apply resources
      if (resourceYield.energy > 0 || resourceYield.research > 0 || resourceYield.materials > 0) {
        await supabase.from('game_state').update({
          energy:    gameState.energy    + resourceYield.energy,
          research:  gameState.research  + resourceYield.research,
          materials: gameState.materials + resourceYield.materials,
        }).eq('household_id', profile.household_id);
      }

      // Check story triggers
      const allDiscovered = [...discovered.filter(d => d.id !== mission.id), { ...mission, status: 'discovered' }];
      const existingEvents = (await supabase.from('story_events').select('event_key').eq('household_id', profile.household_id)).data ?? [];
      const bridgeModule = (await supabase.from('base_modules').select('*').eq('household_id', profile.household_id).eq('module_type', 'bridge')).data;
      const allModulesData = (await supabase.from('base_modules').select('*').eq('household_id', profile.household_id)).data ?? [];

      const newEvents = getNewStoryEvents({
        gameState,
        discoveredSectors: allDiscovered as any,
        hasModuleBridge: (bridgeModule?.length ?? 0) > 0,
        hasAllModules: allModulesData.length >= 6,
        maxProfileLevel: profile.level,
        approvedChoresTotal: 0,
        existingEventKeys: existingEvents.map(e => e.event_key),
      });

      for (const ev of newEvents) {
        await supabase.from('story_events').insert({
          household_id: profile.household_id,
          chapter: getChapterForEventKey(ev.key),
          event_key: ev.key,
        });
        if (ev.chapter > gameState.current_chapter) {
          await supabase.from('game_state').update({ current_chapter: ev.chapter }).eq('household_id', profile.household_id);
        }
      }

      // Show result alert
      const yieldText = hasCombat && !combatWon
        ? 'Combat: Retreat — no resources recovered.'
        : `⚡+${resourceYield.energy}  🔬+${resourceYield.research}  🪨+${resourceYield.materials}`;
      Alert.alert(
        `${BIOME_EMOJI[sector.biome]} ${sector.name}`,
        `${hasCombat ? (combatWon ? '⚔️ Victory! ' : '⚔️ Retreat. ') : ''}${yieldText}`,
      );
    }

    await Promise.all([load(), refreshGameState()]);
  }

  useEffect(() => {
    load();
    timerRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [profile?.household_id]);

  useEffect(() => {
    if (!loading) checkArrivals();
  }, [now, loading]);

  async function launchMission(sector: Sector) {
    if (!profile?.household_id || !gameState) return;

    // Check chapter lock
    if (sector.unlock_chapter > gameState.current_chapter) {
      Alert.alert('Locked', `This sector requires Chapter ${sector.unlock_chapter}.`);
      return;
    }

    // Check already traveling
    const activeMission = discovered.find(d => d.sector_id === sector.id && (d.status === 'traveling'));
    if (activeMission) {
      Alert.alert('Mission Active', `Already exploring ${sector.name}.`);
      return;
    }

    const travelMs = getTravelTimeMs(sector.threat_level, mySpec as any, hangarLevel);
    const departsAt = new Date().toISOString();
    const arrivesAt = new Date(Date.now() + travelMs).toISOString();
    const travelH = Math.round(travelMs / 3_600_000 * 10) / 10;

    Alert.alert(
      `Launch to ${sector.name}?`,
      `Threat: ${THREAT_LABEL[sector.threat_level]}\nTravel time: ${travelH < 0.017 ? '< 1 min' : `~${travelH}h`}\n\n${sector.description ?? ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Launch 🚀',
          onPress: async () => {
            await supabase.from('discovered_sectors').insert({
              household_id: profile.household_id,
              sector_id: sector.id,
              explorer_id: profile.id,
              departs_at: departsAt,
              arrives_at: arrivesAt,
              status: 'traveling',
            });
            load();
          },
        },
      ]
    );
  }

  if (!profile?.household_id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}><Text style={styles.emptyEmoji}>🌌</Text><Text style={styles.emptyTitle}>No Crew Yet</Text><Text style={styles.emptyText}>Create or join a crew to access the galaxy.</Text></View>
      </SafeAreaView>
    );
  }

  const groupedByBiome = sectors.reduce<Record<string, Sector[]>>((acc, s) => {
    (acc[s.biome] = acc[s.biome] ?? []).push(s);
    return acc;
  }, {});

  const rows: Array<{ type: 'biome'; biome: string } | { type: 'sector'; sector: Sector }> = [];
  Object.entries(groupedByBiome).forEach(([biome, secs]) => {
    rows.push({ type: 'biome', biome });
    secs.forEach(s => rows.push({ type: 'sector', sector: s }));
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌌 Galaxy</Text>
        <Text style={styles.headerSub}>{discovered.filter(d => d.status === 'discovered').length} sectors charted</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#00e5ff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, i) => item.type === 'biome' ? `biome-${item.biome}` : `sector-${item.sector.id}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            if (item.type === 'biome') {
              return (
                <View style={styles.biomeHeader}>
                  <Text style={styles.biomeEmoji}>{BIOME_EMOJI[item.biome]}</Text>
                  <Text style={styles.biomeLabel}>{BIOME_LABEL[item.biome]}</Text>
                </View>
              );
            }

            const sector = item.sector;
            const mission = discovered.find(d => d.sector_id === sector.id);
            const isDiscovered = mission?.status === 'discovered';
            const isTraveling = mission?.status === 'traveling';
            const isLocked = gameState ? sector.unlock_chapter > gameState.current_chapter : true;

            return (
              <View style={[styles.card, isDiscovered && styles.cardDiscovered, isLocked && styles.cardLocked]}>
                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{sector.name}</Text>
                    <Text style={styles.threat}>{THREAT_LABEL[sector.threat_level]}</Text>
                  </View>
                  <Text style={styles.cardDesc}>{sector.description}</Text>
                  {isDiscovered && sector.lore && <Text style={styles.lore}>"{sector.lore}"</Text>}
                  {isTraveling && mission && (
                    <Text style={styles.traveling}>🚀 In transit — {timeUntil(mission.arrives_at)}</Text>
                  )}
                  {isLocked && (
                    <Text style={styles.locked}>🔒 Requires Chapter {sector.unlock_chapter}</Text>
                  )}
                </View>
                {!isDiscovered && !isTraveling && !isLocked && (
                  <Pressable style={styles.launchBtn} onPress={() => launchMission(sector)}>
                    <Text style={styles.launchBtnText}>🚀</Text>
                  </Pressable>
                )}
                {isDiscovered && (
                  <Text style={styles.doneCheck}>✓</Text>
                )}
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
  list: { padding: 16, gap: 8 },
  biomeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 4 },
  biomeEmoji: { fontSize: 20 },
  biomeLabel: { color: '#bf5af2', fontWeight: '700', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  card: {
    backgroundColor: '#0d0d1f',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1e3f',
    gap: 10,
  },
  cardDiscovered: { borderColor: '#30d15833', opacity: 0.7 },
  cardLocked: { opacity: 0.4 },
  cardBody: { flex: 1, gap: 3 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  threat: { color: '#ff9500', fontSize: 11 },
  cardDesc: { color: '#6b6b8a', fontSize: 12 },
  lore: { color: '#bf5af2', fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  traveling: { color: '#00e5ff', fontSize: 12, fontWeight: '600', marginTop: 4 },
  locked: { color: '#555570', fontSize: 11, marginTop: 4 },
  launchBtn: { backgroundColor: '#00e5ff', borderRadius: 10, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  launchBtnText: { fontSize: 18 },
  doneCheck: { color: '#30d158', fontSize: 22, fontWeight: '900' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: '#6b6b8a', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
