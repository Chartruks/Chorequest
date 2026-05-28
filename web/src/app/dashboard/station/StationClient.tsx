'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';
import {
  ModuleType,
  ALL_MODULE_TYPES,
  MODULE_INFO,
  MODULE_BUILD_COSTS,
  getLevelUpCost,
  calcModuleRates,
  calcIdleDelta,
} from '@/lib/idleEngine';

type Profile = Database['public']['Tables']['profiles']['Row'];
type GameState = Database['public']['Tables']['game_state']['Row'];
type BaseModule = Database['public']['Tables']['base_modules']['Row'];

interface Props {
  profile: Profile | null;
  initialGameState: GameState | null;
  initialModules: BaseModule[];
}

export default function StationClient({ profile, initialGameState, initialModules }: Props) {
  const [gameState, setGameState] = useState(initialGameState);
  const [modules, setModules] = useState(initialModules);
  const [busy, setBusy] = useState<string | null>(null);
  const supabase = createClient();

  const applyIdleTick = useCallback(async (gs: GameState, mods: BaseModule[]) => {
    const delta = calcIdleDelta(gs, mods);
    if (delta.energy === 0 && delta.research === 0 && delta.materials === 0 && delta.moraleDelta === 0) return;
    const newGs = {
      energy:    gs.energy    + delta.energy,
      research:  gs.research  + delta.research,
      materials: gs.materials + delta.materials,
      morale:    Math.max(0, Math.min(100, gs.morale + delta.moraleDelta)),
      last_idle_tick: new Date().toISOString(),
    };
    if (!gs.household_id) return;
    await supabase.from('game_state').update(newGs).eq('household_id', gs.household_id);
    setGameState({ ...gs, ...newGs });
  }, [supabase]);

  useEffect(() => {
    if (gameState && modules) {
      applyIdleTick(gameState, modules);
    }
  }, []); // only on mount

  async function refresh() {
    if (!profile?.household_id) return;
    const [{ data: gs }, { data: mods }] = await Promise.all([
      supabase.from('game_state').select('*').eq('household_id', profile.household_id).single(),
      supabase.from('base_modules').select('*').eq('household_id', profile.household_id),
    ]);
    if (gs) setGameState(gs);
    if (mods) setModules(mods);
  }

  async function buildModule(type: ModuleType) {
    if (!profile?.household_id || !gameState) return;
    const cost = MODULE_BUILD_COSTS[type];
    if (gameState.energy < cost.energy || gameState.research < cost.research || gameState.materials < cost.materials) {
      alert('Insufficient resources!');
      return;
    }
    setBusy(type);
    await Promise.all([
      supabase.from('base_modules').insert({ household_id: profile.household_id, module_type: type, level: 1 }),
      supabase.from('game_state').update({
        energy:    gameState.energy    - cost.energy,
        research:  gameState.research  - cost.research,
        materials: gameState.materials - cost.materials,
      }).eq('household_id', profile.household_id),
    ]);
    await refresh();
    setBusy(null);
  }

  async function upgradeModule(mod: BaseModule) {
    if (!gameState) return;
    if (mod.level >= 5) { alert('Max level reached!'); return; }
    const cost = getLevelUpCost(mod.module_type as ModuleType, mod.level);
    if (gameState.energy < cost.energy || gameState.research < cost.research || gameState.materials < cost.materials) {
      alert('Insufficient resources!');
      return;
    }
    setBusy(mod.id);
    await Promise.all([
      supabase.from('base_modules').update({ level: mod.level + 1 }).eq('id', mod.id),
      supabase.from('game_state').update({
        energy:    gameState.energy    - cost.energy,
        research:  gameState.research  - cost.research,
        materials: gameState.materials - cost.materials,
      }).eq('household_id', gameState.household_id!),
    ]);
    await refresh();
    setBusy(null);
  }

  if (!profile?.household_id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-6xl mb-4">🏗️</span>
        <h2 className="text-2xl font-bold mb-2 text-white">No Crew Yet</h2>
        <p style={{ color: '#6b6b8a' }}>Create or join a crew to build your station.</p>
      </div>
    );
  }

  const rates = calcModuleRates(modules);
  const moraleColor = !gameState ? '#8e8ea0' : gameState.morale >= 75 ? '#30d158' : gameState.morale >= 50 ? '#00e5ff' : '#ff453a';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black mb-1" style={{ color: '#00e5ff' }}>🏗️ Station</h1>
        <p className="text-sm" style={{ color: '#6b6b8a' }}>Build modules to generate resources passively.</p>
      </div>

      {/* Resource Bar */}
      {gameState && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: '⚡ Energy',    value: gameState.energy,    rate: rates.energy,    color: '#00e5ff' },
            { label: '🔬 Research',  value: gameState.research,  rate: rates.research,  color: '#bf5af2' },
            { label: '🪨 Materials', value: gameState.materials, rate: rates.materials, color: '#ff9f0a' },
            { label: '💜 Morale',    value: gameState.morale,    rate: null,            color: moraleColor },
          ].map(({ label, value, rate, color }) => (
            <div key={label} className="rounded-2xl p-4 border" style={{ background: '#0d0d1f', borderColor: '#1e1e3f' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: '#6b6b8a' }}>{label}</div>
              <div className="text-2xl font-black" style={{ color }}>{value}</div>
              {rate !== null && (
                <div className="text-xs mt-1" style={{ color: '#6b6b8a' }}>+{rate}/hr</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Module Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ALL_MODULE_TYPES.map((type) => {
          const info = MODULE_INFO[type];
          const existing = modules.find((m) => m.module_type === type);
          const cost = existing ? getLevelUpCost(type, existing.level) : MODULE_BUILD_COSTS[type];
          const isBusy = busy === type || busy === existing?.id;
          const canAfford = gameState
            ? gameState.energy >= cost.energy && gameState.research >= cost.research && gameState.materials >= cost.materials
            : false;
          const isMaxLevel = existing?.level === 5;

          return (
            <div key={type} className="rounded-2xl p-5 border" style={{ background: '#0d0d1f', borderColor: existing ? '#1e1e3f' : '#1e1e3f' }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{info.emoji}</span>
                <div>
                  <div className="font-bold text-white">{info.name}</div>
                  {existing && (
                    <div className="text-xs font-semibold" style={{ color: '#bf5af2' }}>Level {existing.level}/5</div>
                  )}
                </div>
              </div>
              <p className="text-sm mb-3" style={{ color: '#6b6b8a' }}>{info.description}</p>
              <p className="text-xs mb-4" style={{ color: '#8e8ea0' }}>Unlocks: {info.unlocks}</p>

              {!isMaxLevel && (
                <div className="text-xs mb-3 space-y-0.5" style={{ color: '#6b6b8a' }}>
                  <div className="font-semibold text-white mb-1">{existing ? 'Upgrade cost:' : 'Build cost:'}</div>
                  {cost.energy > 0    && <div>⚡ {cost.energy} Energy</div>}
                  {cost.research > 0  && <div>🔬 {cost.research} Research</div>}
                  {cost.materials > 0 && <div>🪨 {cost.materials} Materials</div>}
                </div>
              )}

              {existing ? (
                isMaxLevel ? (
                  <div className="text-sm font-bold" style={{ color: '#30d158' }}>✓ Max Level</div>
                ) : (
                  <button
                    onClick={() => upgradeModule(existing)}
                    disabled={!canAfford || isBusy || profile.role !== 'parent'}
                    className="w-full py-2 rounded-xl font-bold text-sm disabled:opacity-40"
                    style={{ backgroundColor: canAfford && profile.role === 'parent' ? '#bf5af2' : '#1e1e3f', color: canAfford && profile.role === 'parent' ? '#fff' : '#6b6b8a' }}
                  >
                    {isBusy ? 'Upgrading…' : profile.role !== 'parent' ? '🔒 Commander Only' : `Upgrade → Lv.${existing.level + 1}`}
                  </button>
                )
              ) : (
                <button
                  onClick={() => buildModule(type)}
                  disabled={!canAfford || isBusy || profile.role !== 'parent'}
                  className="w-full py-2 rounded-xl font-bold text-sm disabled:opacity-40"
                  style={{ backgroundColor: canAfford && profile.role === 'parent' ? '#00e5ff' : '#1e1e3f', color: canAfford && profile.role === 'parent' ? '#05050f' : '#6b6b8a' }}
                >
                  {isBusy ? 'Building…' : profile.role !== 'parent' ? '🔒 Commander Only' : 'Build'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
