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
    if (!delta.energy && !delta.knowledge && !delta.money && !delta.food && !delta.moraleDelta) return;
    if (!gs.household_id) return;
    const newGs = {
      energy:    gs.energy    + delta.energy,
      knowledge: gs.knowledge + delta.knowledge,
      money:     gs.money     + delta.money,
      food:      gs.food      + delta.food,
      morale:    Math.max(0, Math.min(100, gs.morale + delta.moraleDelta)),
      last_idle_tick: new Date().toISOString(),
    };
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
    if (gameState.energy < cost.energy || gameState.knowledge < cost.knowledge || gameState.money < cost.money) {
      alert('Insufficient resources!');
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
    await refresh();
    setBusy(null);
  }

  async function upgradeModule(mod: BaseModule) {
    if (!gameState) return;
    if (mod.level >= 5) { alert('Max level reached!'); return; }
    const cost = getLevelUpCost(mod.module_type as ModuleType, mod.level);
    if (gameState.energy < cost.energy || gameState.knowledge < cost.knowledge || gameState.money < cost.money) {
      alert('Insufficient resources!');
      return;
    }
    setBusy(mod.id);
    await Promise.all([
      supabase.from('base_modules').update({ level: mod.level + 1 }).eq('id', mod.id),
      supabase.from('game_state').update({
        energy:    gameState.energy    - cost.energy,
        knowledge: gameState.knowledge - cost.knowledge,
        money:     gameState.money     - cost.money,
      }).eq('household_id', gameState.household_id!),
    ]);
    await refresh();
    setBusy(null);
  }

  if (!profile?.household_id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-6xl mb-4">🏚️</span>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#e8d5b8' }}>No Settlement Yet</h2>
        <p style={{ color: '#8a7a6a' }}>Create or join a settlement to build here.</p>
      </div>
    );
  }

  const rates = calcModuleRates(modules);
  const moraleColor = !gameState ? '#8a7a6a' : gameState.morale >= 75 ? '#6b9a4a' : gameState.morale >= 50 ? '#d4791c' : '#c04a2a';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black mb-1" style={{ color: '#d4791c' }}>🏚️ Settlement</h1>
        <p className="text-sm" style={{ color: '#8a7a6a' }}>Build structures to generate resources passively.</p>
      </div>

      {/* Resource Bar */}
      {gameState && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {[
            { label: '⚡ Energy',    value: gameState.energy,    rate: rates.energy,    color: '#d4791c' },
            { label: '📚 Knowledge', value: gameState.knowledge, rate: rates.knowledge, color: '#c4a73e' },
            { label: '💵 Money',     value: gameState.money,     rate: rates.money,     color: '#6b9a4a' },
            { label: '🥫 Food',      value: gameState.food,      rate: rates.food,      color: '#8a5a2a' },
            { label: '💜 Morale',    value: gameState.morale,    rate: null,            color: moraleColor },
          ].map(({ label, value, rate, color }) => (
            <div key={label} className="rounded-2xl p-4 border" style={{ background: '#1a1208', borderColor: '#2a1f14' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: '#8a7a6a' }}>{label}</div>
              <div className="text-2xl font-black" style={{ color }}>{value}</div>
              {rate !== null && (
                <div className="text-xs mt-1" style={{ color: '#8a7a6a' }}>+{rate}/hr</div>
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
            ? gameState.energy >= cost.energy && gameState.knowledge >= cost.knowledge && gameState.money >= cost.money
            : false;
          const isMaxLevel = existing?.level === 5;
          const isLeader = profile.is_leader;

          return (
            <div key={type} className="rounded-2xl p-5 border" style={{ background: '#1a1208', borderColor: '#2a1f14' }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{info.emoji}</span>
                <div>
                  <div className="font-bold" style={{ color: '#e8d5b8' }}>{info.name}</div>
                  {existing && (
                    <div className="text-xs font-semibold" style={{ color: '#d4791c' }}>Level {existing.level}/5</div>
                  )}
                </div>
              </div>
              <p className="text-sm mb-3" style={{ color: '#8a7a6a' }}>{info.description}</p>
              <p className="text-xs mb-4" style={{ color: '#5a4a3a' }}>Unlocks: {info.unlocks}</p>

              {!isMaxLevel && (
                <div className="text-xs mb-3 space-y-0.5" style={{ color: '#8a7a6a' }}>
                  <div className="font-semibold mb-1" style={{ color: '#e8d5b8' }}>{existing ? 'Upgrade cost:' : 'Build cost:'}</div>
                  {cost.energy    > 0 && <div>⚡ {cost.energy} Energy</div>}
                  {cost.knowledge > 0 && <div>📚 {cost.knowledge} Knowledge</div>}
                  {cost.money     > 0 && <div>💵 {cost.money} Money</div>}
                </div>
              )}

              {existing ? (
                isMaxLevel ? (
                  <div className="text-sm font-bold" style={{ color: '#6b9a4a' }}>✓ Fully Built</div>
                ) : (
                  <button
                    onClick={() => upgradeModule(existing)}
                    disabled={!canAfford || isBusy || !isLeader}
                    className="w-full py-2 rounded-xl font-bold text-sm disabled:opacity-40"
                    style={{ backgroundColor: canAfford && isLeader ? '#d4791c' : '#2a1f14', color: canAfford && isLeader ? '#100d0a' : '#5a4a3a' }}
                  >
                    {isBusy ? 'Upgrading…' : !isLeader ? '🔒 Leader Only' : `Upgrade → Lv.${existing.level + 1}`}
                  </button>
                )
              ) : (
                <button
                  onClick={() => buildModule(type)}
                  disabled={!canAfford || isBusy || !isLeader}
                  className="w-full py-2 rounded-xl font-bold text-sm disabled:opacity-40"
                  style={{ backgroundColor: canAfford && isLeader ? '#6b4a1c' : '#2a1f14', color: canAfford && isLeader ? '#e8d5b8' : '#5a4a3a' }}
                >
                  {isBusy ? 'Building…' : !isLeader ? '🔒 Leader Only' : 'Build'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
