import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getChapterForEventKey, getNewStoryEvents } from '../../lib/storyEngine';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';

type Sector = Database['public']['Tables']['sectors']['Row'];
type DiscoveredSector = Database['public']['Tables']['discovered_sectors']['Row'];

const BIOME_EMOJI: Record<string, string> = {
  nebula:         '🏚️',
  asteroid_field: '🛣️',
  deep_space:     '🌵',
  alien_world:    '🌲',
  anomaly:        '🔦',
};

const BIOME_LABEL: Record<string, string> = {
  nebula:         'Ruins',
  asteroid_field: 'Highway',
  deep_space:     'Wasteland',
  alien_world:    'Forest',
  anomaly:        'Bunker',
};

const DANGER_LABEL = ['', '⚠️ Low', '⚠️⚠️ Moderate', '⚠️⚠️⚠️ High', '☠️ Extreme', '☠️☠️ CRITICAL'];

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

function getTravelMs(threatLevel: number, watchtowerLevel: number): number {
  const baseMs = threatLevel * 2 * 3_600_000;
  const reduction = Math.pow(0.8, watchtowerLevel);
  return Math.max(baseMs * reduction, 30_000);
}

export default function MapScreen() {
  const { profile, gameState, refreshGameState } = useAuth();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [discovered, setDiscovered] = useState<DiscoveredSector[]>([]);
  const [watchtowerLevel, setWatchtowerLevel] = useState(0);
  const [loading, setLoading] = useState(true);
  const [, setNow] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    if (!profile?.household_id) { setLoading(false); return; }
    const [{ data: s }, { data: d }, { data: mods }] = await Promise.all([
      supabase.from('sectors').select('*').order('unlock_chapter').order('threat_level'),
      supabase.from('discovered_sectors').select('*').eq('household_id', profile.household_id),
      supabase.from('base_modules').select('*').eq('household_id', profile.household_id).eq('module_type', 'watchtower'),
    ]);
    setSectors(s ?? []);
    setDiscovered(d ?? []);
    setWatchtowerLevel(mods?.[0]?.level ?? 0);
    setLoading(false);
  }

  async function checkArrivals() {
    if (!profile?.household_id || !gameState) return;
    const arrived = discovered.filter(
      d => d.status === 'traveling' && new Date(d.arrives_at).getTime() <= Date.now()
    );
    if (arrived.length === 0) return;

    for (const mission of arrived) {
      const sector = sectors.find(s => s.id === mission.sector_id);
      if (!sector) continue;

      const hasCombat = Math.random() < sector.threat_level * 0.15;
      const combatWon = hasCombat ? Math.random() < (1 - sector.threat_level * 0.15) : true;

      const resourceYield = {
        energy:    sector.biome === 'asteroid_field' || sector.biome === 'deep_space' ? sector.threat_level * 10 : 5,
        knowledge: sector.biome === 'anomaly' || sector.biome === 'alien_world'       ? sector.threat_level * 12 : 5,
        money:     sector.biome === 'nebula'  || sector.biome === 'asteroid_field'    ? sector.threat_level * 10 : 5,
      };

      let combatOutcome = null;
      if (hasCombat) {
        const won = [
          `Your scouts outmaneuvred the hostiles near ${sector.name}. Resources recovered.`,
          `Tactical superiority won the day at ${sector.name}. Minor injuries, no losses.`,
          `Quick thinking secured ${sector.name}. The crew returns with supplies.`,
        ];
        const lost = [
          `The scouts were forced to retreat from ${sector.name}. No resources recovered.`,
          `Overwhelming force at ${sector.name}. Strategic withdrawal executed.`,
        ];
        combatOutcome = {
          result: combatWon ? 'victory' : 'retreat',
          narrative: (combatWon ? won : lost)[Math.floor(Math.random() * (combatWon ? won.length : lost.length))],
        };
        if (!combatWon) { resourceYield.energy = 0; resourceYield.knowledge = 0; resourceYield.money = 0; }
      }

      await supabase.from('discovered_sectors').update({
        status: 'discovered',
        combat_outcome: combatOutcome,
        resource_yield: resourceYield,
      }).eq('id', mission.id);

      if (resourceYield.energy > 0 || resourceYield.knowledge > 0 || resourceYield.money > 0) {
        await supabase.from('game_state').update({
          energy:    gameState.energy    + resourceYield.energy,
          knowledge: gameState.knowledge + resourceYield.knowledge,
          money:     gameState.money     + resourceYield.money,
        }).eq('household_id', profile.household_id);
      }

      // Story triggers
      const allDiscovered = [...discovered.filter(d => d.id !== mission.id), { ...mission, status: 'discovered' }];
      const [{ data: existingEvts }, { data: allMods }] = await Promise.all([
        supabase.from('story_events').select('event_key').eq('household_id', profile.household_id),
        supabase.from('base_modules').select('*').eq('household_id', profile.household_id),
      ]);
      const hasCommunityHall = (allMods ?? []).some(m => m.module_type === 'communityHall');
      const hasAllModules    = (allMods ?? []).length >= 6;

      const newEvents = getNewStoryEvents({
        gameState,
        discoveredSectors: allDiscovered as any,
        hasModuleBridge: hasCommunityHall,
        hasAllModules,
        maxProfileLevel: profile.level,
        approvedChoresTotal: 0,
        existingEventKeys: (existingEvts ?? []).map(e => e.event_key),
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

      const yieldText = hasCombat && !combatWon
        ? 'Hostile encounter — no supplies recovered.'
        : `⚡+${resourceYield.energy}  📚+${resourceYield.knowledge}  💵+${resourceYield.money}`;
      Alert.alert(
        `${BIOME_EMOJI[sector.biome] ?? '🗺️'} ${sector.name}`,
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
  }, [loading]);

  async function launchScout(sector: Sector) {
    if (!profile?.household_id || !gameState) return;
    if (sector.unlock_chapter > gameState.current_chapter) {
      Alert.alert('Zone Locked', `This zone requires Chapter ${sector.unlock_chapter}.`);
      return;
    }
    const activeMission = discovered.find(d => d.sector_id === sector.id && d.status === 'traveling');
    if (activeMission) {
      Alert.alert('Scout Active', `Already scouting ${sector.name}.`);
      return;
    }
    const travelMs = getTravelMs(sector.threat_level, watchtowerLevel);
    const departsAt = new Date().toISOString();
    const arrivesAt = new Date(Date.now() + travelMs).toISOString();
    const travelH   = (travelMs / 3_600_000);

    Alert.alert(
      `Scout ${sector.name}?`,
      `Danger: ${DANGER_LABEL[sector.threat_level]}\nReturn time: ${travelH < 0.017 ? '< 1 min' : `~${travelH.toFixed(1)}h`}\n\n${sector.description ?? ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Scout 🗺️',
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
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={styles.emptyTitle}>No Settlement Yet</Text>
          <Text style={styles.emptyText}>Create or join a settlement to access the map.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const grouped = sectors.reduce<Record<string, Sector[]>>((acc, s) => {
    (acc[s.biome] = acc[s.biome] ?? []).push(s);
    return acc;
  }, {});

  const rows: Array<{ type: 'biome'; biome: string } | { type: 'sector'; sector: Sector }> = [];
  Object.entries(grouped).forEach(([biome, secs]) => {
    rows.push({ type: 'biome', biome });
    secs.forEach(s => rows.push({ type: 'sector', sector: s }));
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🗺️ Map</Text>
        <Text style={styles.headerSub}>{discovered.filter(d => d.status === 'discovered').length} zones scouted</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#d4791c" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, i) => item.type === 'biome' ? `biome-${item.biome}` : `sector-${(item as any).sector.id}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            if (item.type === 'biome') {
              return (
                <View style={styles.biomeHeader}>
                  <Text style={styles.biomeEmoji}>{BIOME_EMOJI[item.biome] ?? '🗺️'}</Text>
                  <Text style={styles.biomeLabel}>{BIOME_LABEL[item.biome] ?? item.biome}</Text>
                </View>
              );
            }

            const sector = item.sector;
            const mission     = discovered.find(d => d.sector_id === sector.id);
            const isScoutd    = mission?.status === 'discovered';
            const isTraveling = mission?.status === 'traveling';
            const isLocked    = gameState ? sector.unlock_chapter > gameState.current_chapter : true;

            return (
              <View style={[styles.card, isScoutd && styles.cardScoutd, isLocked && styles.cardLocked]}>
                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{sector.name}</Text>
                    <Text style={styles.danger}>{DANGER_LABEL[sector.threat_level]}</Text>
                  </View>
                  <Text style={styles.cardDesc}>{sector.description}</Text>
                  {isScoutd && sector.lore && <Text style={styles.lore}>"{sector.lore}"</Text>}
                  {isTraveling && mission && (
                    <Text style={styles.traveling}>🥾 Scouting — {timeUntil(mission.arrives_at)}</Text>
                  )}
                  {isLocked && (
                    <Text style={styles.locked}>🔒 Requires Chapter {sector.unlock_chapter}</Text>
                  )}
                </View>
                {!isScoutd && !isTraveling && !isLocked && (
                  <Pressable style={styles.scoutBtn} onPress={() => launchScout(sector)}>
                    <Text style={styles.scoutBtnText}>🗺️</Text>
                  </Pressable>
                )}
                {isScoutd && <Text style={styles.doneCheck}>✓</Text>}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#100d0a' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#d4791c' },
  headerSub: { fontSize: 13, color: '#8a7a6a', marginTop: 2 },
  list: { padding: 16, gap: 8 },
  biomeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 4 },
  biomeEmoji: { fontSize: 20 },
  biomeLabel: { color: '#c4a73e', fontWeight: '700', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  card: {
    backgroundColor: '#1a1208',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a1f14',
    gap: 10,
  },
  cardScoutd: { borderColor: '#2a3a1a', opacity: 0.7 },
  cardLocked: { opacity: 0.4 },
  cardBody: { flex: 1, gap: 3 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: '#e8d5b8', fontWeight: '700', fontSize: 14 },
  danger: { color: '#c4a73e', fontSize: 11 },
  cardDesc: { color: '#8a7a6a', fontSize: 12 },
  lore: { color: '#d4791c', fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  traveling: { color: '#6b9a4a', fontSize: 12, fontWeight: '600', marginTop: 4 },
  locked: { color: '#5a4a3a', fontSize: 11, marginTop: 4 },
  scoutBtn: { backgroundColor: '#d4791c', borderRadius: 10, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  scoutBtnText: { fontSize: 18 },
  doneCheck: { color: '#6b9a4a', fontSize: 22, fontWeight: '900' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { color: '#e8d5b8', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: '#8a7a6a', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
