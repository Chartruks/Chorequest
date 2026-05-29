'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type GameState = Database['public']['Tables']['game_state']['Row'];
type Sector = Database['public']['Tables']['sectors']['Row'];
type DiscoveredSector = Database['public']['Tables']['discovered_sectors']['Row'];
type BaseModule = Database['public']['Tables']['base_modules']['Row'];

const BIOME_INFO: Record<string, { emoji: string; label: string; color: string }> = {
  nebula:         { emoji: '🏚️', label: 'Ruins',    color: '#d4791c' },
  asteroid_field: { emoji: '🛣️', label: 'Highway',  color: '#c4a73e' },
  deep_space:     { emoji: '🌵', label: 'Wasteland', color: '#8a7a6a' },
  alien_world:    { emoji: '🌲', label: 'Forest',    color: '#6b9a4a' },
  anomaly:        { emoji: '🔦', label: 'Bunker',    color: '#8a5a2a' },
};

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  traveling:  { label: '🥾 Scouting', color: '#d4791c' },
  arrived:    { label: '✅ Arrived',  color: '#6b9a4a' },
  combat:     { label: '⚔️ Combat',   color: '#c04a2a' },
  discovered: { label: '🗺️ Scouted', color: '#8a7a6a' },
};

function formatCountdown(ms: number) {
  if (ms <= 0) return 'Arriving…';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface Props {
  profile: Profile | null;
  gameState: GameState | null;
  sectors: Sector[];
  initialMissions: DiscoveredSector[];
  modules: BaseModule[];
}

export default function GalaxyClient({ profile, gameState: initialGs, sectors, initialMissions, modules }: Props) {
  const [missions, setMissions] = useState(initialMissions);
  const [now, setNow] = useState(Date.now());
  const [launching, setLaunching] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(async () => {
    if (!profile?.household_id) return;
    const { data } = await supabase
      .from('discovered_sectors')
      .select('*')
      .eq('household_id', profile.household_id)
      .order('departs_at', { ascending: false });
    setMissions(data ?? []);
  }, [supabase, profile?.household_id]);

  useEffect(() => {
    // Check for arrivals every 10s
    const t = setInterval(refresh, 10_000);
    return () => clearInterval(t);
  }, [refresh]);

  const currentChapter = initialGs?.current_chapter ?? 1;

  const hangarLevel = modules.find((m) => m.module_type === 'watchtower')?.level ?? 0;
  const hasSpec = profile?.id; // we don't load spec here, just skip navigator bonus

  async function launchMission(sector: Sector) {
    if (!profile?.household_id) return;
    // Check if already active mission to this sector
    const active = missions.find((m) => m.sector_id === sector.id && (m.status === 'traveling' || m.status === 'arrived' || m.status === 'combat'));
    if (active) { alert('A mission to this sector is already underway.'); return; }

    setLaunching(sector.id);
    const baseHours = sector.threat_level * 2;
    const hangarMult = Math.pow(0.8, hangarLevel);
    const travelMs = Math.max(60_000, Math.round(baseHours * 3_600_000 * hangarMult));
    const departNow = new Date();
    const arrives = new Date(departNow.getTime() + travelMs);

    await supabase.from('discovered_sectors').insert({
      household_id: profile.household_id,
      sector_id: sector.id,
      explorer_id: profile.id,
      departs_at: departNow.toISOString(),
      arrives_at: arrives.toISOString(),
      status: 'traveling',
    });
    await refresh();
    setLaunching(null);
  }

  if (!profile?.household_id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-6xl mb-4">🌌</span>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#e8d5b8' }}>No Settlement Yet</h2>
        <p style={{ color: '#8a7a6a' }}>Create or join a settlement to scout the map.</p>
      </div>
    );
  }

  const activeMissions = missions.filter((m) => m.status === 'traveling' || m.status === 'arrived' || m.status === 'combat');
  const discoveredIds = new Set(missions.filter((m) => m.status === 'discovered').map((m) => m.sector_id));

  // Group sectors by biome
  const byBiome = sectors.reduce<Record<string, Sector[]>>((acc, s) => {
    (acc[s.biome] = acc[s.biome] ?? []).push(s);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black mb-1" style={{ color: '#d4791c' }}>🗺️ Map</h1>
        <p className="text-sm" style={{ color: '#8a7a6a' }}>
          Chapter {currentChapter} · {discoveredIds.size}/{sectors.length} zones scouted
        </p>
      </div>

      {/* Active Missions */}
      {activeMissions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-3" style={{ color: '#e8d5b8' }}>Active Scouts</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeMissions.map((m) => {
              const sector = sectors.find((s) => s.id === m.sector_id);
              const biome = BIOME_INFO[sector?.biome ?? ''] ?? { emoji: '🔭', color: '#8e8ea0' };
              const msLeft = new Date(m.arrives_at).getTime() - now;
              const status = STATUS_INFO[m.status] ?? { label: m.status, color: '#8e8ea0' };
              return (
                <div key={m.id} className="rounded-2xl p-4 border" style={{ background: '#1a1208', borderColor: '#2a1f14' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{biome.emoji}</span>
                    <span className="font-bold" style={{ color: '#e8d5b8' }}>{sector?.name ?? 'Unknown'}</span>
                    <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: status.color + '22', color: status.color }}>{status.label}</span>
                  </div>
                  {m.status === 'traveling' && (
                    <div className="text-sm font-bold mt-1" style={{ color: '#d4791c' }}>
                      Returns: {formatCountdown(msLeft)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sector List */}
      {Object.entries(byBiome).map(([biome, sectorList]) => {
        const biomeInfo = BIOME_INFO[biome] ?? { emoji: '🔭', color: '#8e8ea0' };
        return (
          <div key={biome} className="mb-8">
            <h2 className="text-lg font-bold mb-3" style={{ color: biomeInfo.color }}>
              {biomeInfo.emoji} {biome.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sectorList.map((sector) => {
                const locked = sector.unlock_chapter > currentChapter;
                const discovered = discoveredIds.has(sector.id);
                const active = activeMissions.find((m) => m.sector_id === sector.id);
                const isLaunching = launching === sector.id;

                return (
                  <div
                    key={sector.id}
                    className="rounded-2xl p-5 border"
                    style={{ background: '#0d0d1f', borderColor: locked ? '#1e1e3f' : biomeInfo.color + '44', opacity: locked ? 0.5 : 1 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-bold text-white">{sector.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: '#6b6b8a' }}>
                          {'★'.repeat(sector.threat_level)}{'☆'.repeat(5 - sector.threat_level)} Threat {sector.threat_level}
                        </div>
                      </div>
                      {discovered && <span className="text-xs px-2 py-0.5 rounded-lg font-bold" style={{ background: '#8e8ea044', color: '#8e8ea0' }}>Charted</span>}
                      {locked && <span className="text-xs px-2 py-0.5 rounded-lg font-bold" style={{ background: '#ff453a22', color: '#ff453a' }}>Ch.{sector.unlock_chapter}</span>}
                    </div>
                    {sector.description && (
                      <p className="text-xs mb-3" style={{ color: '#6b6b8a' }}>{sector.description}</p>
                    )}
                    <div className="text-xs mb-3" style={{ color: '#6b6b8a' }}>
                      Travel: ~{(sector.threat_level * 2 * Math.pow(0.8, hangarLevel)).toFixed(1)}h
                    </div>
                    {!locked && !active && (
                      <button
                        onClick={() => launchMission(sector)}
                        disabled={isLaunching}
                        className="w-full py-2 rounded-xl font-bold text-sm disabled:opacity-50"
                        style={{ backgroundColor: biomeInfo.color, color: '#05050f' }}
                      >
                        {isLaunching ? 'Launching…' : discovered ? '🔄 Re-explore' : '🚀 Explore'}
                      </button>
                    )}
                    {active && (
                      <div className="text-sm font-bold text-center py-2" style={{ color: '#00e5ff' }}>
                        {STATUS_INFO[active.status]?.label ?? active.status}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
