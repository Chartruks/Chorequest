'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';
import {
  ADVANCEMENTS, ALL_MODULE_TYPES, calcIdleDelta, getLevelUpCost,
  getMedicineRestoreAmount, MODULE_BUILD_COSTS, MODULE_INFO, ModuleType,
} from '@/lib/idleEngine';

type Profile   = Database['public']['Tables']['profiles']['Row'];
type GameState = Database['public']['Tables']['game_state']['Row'];
type BaseModule = Database['public']['Tables']['base_modules']['Row'];
type Advancement = Database['public']['Tables']['advancements']['Row'];

interface Props {
  profile: Profile | null;
  initialGameState: GameState | null;
  initialModules: BaseModule[];
  initialAdvancements: Advancement[];
}

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
  factory:    { input: '⚡2 🥫1 💵1 /hr',  output: '🔫3 /hr'            },
  clinic:     { input: '📚1 🥫1 👥1 /hr',  output: '💊2 /hr'            },
  laboratory: { input: '⚡2 📚2 💵1 /hr',  output: '🔬1 /hr'            },
  barracks:   { input: '🔫5 👥2 /hr',      output: '⚔️1 /hr'            },
  watchtower: { input: '—',                 output: '−20% scout time/lv' },
};

export default function StationClient({ profile, initialGameState, initialModules, initialAdvancements }: Props) {
  const [gameState, setGameState]   = useState(initialGameState);
  const [modules, setModules]       = useState(initialModules);
  const [advancements, setAdvs]     = useState(initialAdvancements);
  const [tab, setTab]               = useState<'buildings' | 'advancements'>('buildings');
  const [busy, setBusy]             = useState<string | null>(null);
  const supabase = createClient();

  const advKeys = advancements.map(a => a.advancement_key);

  async function refresh() {
    if (!profile?.household_id) return;
    const [{ data: gs }, { data: mods }, { data: advs }] = await Promise.all([
      supabase.from('game_state').select('*').eq('household_id', profile.household_id).single(),
      supabase.from('base_modules').select('*').eq('household_id', profile.household_id),
      supabase.from('advancements').select('*').eq('household_id', profile.household_id),
    ]);
    if (gs)   setGameState(gs);
    if (mods) setModules(mods);
    if (advs) setAdvs(advs);
  }

  const applyIdleTick = useCallback(async (gs: GameState, mods: BaseModule[], advKeys: string[]) => {
    const delta = calcIdleDelta(gs, mods, advKeys);
    const hasChange = (Object.keys(delta) as (keyof typeof delta)[])
      .some(k => k !== 'moraleDelta' ? delta[k] !== 0 : delta.moraleDelta !== 0);
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
  }, [supabase]);

  useEffect(() => {
    if (gameState && modules) applyIdleTick(gameState, modules, advKeys);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function build(type: ModuleType) {
    if (!profile?.household_id || !gameState) return;
    const cost = MODULE_BUILD_COSTS[type];
    for (const [k, v] of Object.entries(cost) as [string, number][]) {
      if ((gameState as any)[k] < v) { alert(`Insufficient ${k}.`); return; }
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
    await refresh(); setBusy(null);
  }

  async function upgrade(mod: BaseModule) {
    if (!gameState) return;
    if (mod.level >= 5) { alert('Max level reached!'); return; }
    const cost = getLevelUpCost(mod.module_type as ModuleType, mod.level);
    for (const [k, v] of Object.entries(cost) as [string, number][]) {
      if ((gameState as any)[k] < v) { alert(`Insufficient ${k}.`); return; }
    }
    setBusy(mod.id);
    const costUpdate: Partial<GameState> = {};
    for (const [k, v] of Object.entries(cost) as [string, number][]) {
      (costUpdate as any)[k] = (gameState as any)[k] - v;
    }
    await Promise.all([
      supabase.from('base_modules').update({ level: mod.level + 1 }).eq('id', mod.id),
      supabase.from('game_state').update(costUpdate).eq('household_id', gameState.household_id!),
    ]);
    await refresh(); setBusy(null);
  }

  async function useMedicine() {
    if (!gameState || !profile?.household_id) return;
    if (gameState.medicine < 1) { alert('No medicine available.'); return; }
    if (gameState.morale >= 100) { alert('Morale is already at maximum.'); return; }
    const restore = getMedicineRestoreAmount(advKeys);
    const updated = {
      medicine: gameState.medicine - 1,
      morale: Math.min(100, gameState.morale + restore),
    };
    await supabase.from('game_state').update(updated).eq('household_id', profile.household_id);
    setGameState({ ...gameState, ...updated });
  }

  async function unlockAdvancement(key: string, cost: number) {
    if (!gameState || !profile?.household_id) return;
    if (gameState.science < cost) { alert(`Need ${cost} Science.`); return; }
    setBusy(key);
    await Promise.all([
      supabase.from('advancements').insert({ household_id: profile.household_id, advancement_key: key }),
      supabase.from('game_state').update({ science: gameState.science - cost }).eq('household_id', profile.household_id),
    ]);
    await refresh(); setBusy(null);
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

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-3xl font-black mb-1" style={{ color: '#d4791c' }}>🏚️ Settlement</h1>
        <p className="text-sm" style={{ color: '#8a7a6a' }}>Build structures to process resources and produce supplies.</p>
      </div>

      {/* Base resources */}
      {gameState && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
          {BASE_RESOURCES.map(({ key, emoji, label, color }) => (
            <div key={key} className="rounded-xl p-3 border text-center" style={{ background: '#1a1208', borderColor: '#2a1f14' }}>
              <div className="text-lg">{emoji}</div>
              <div className="text-xl font-black mt-0.5" style={{ color }}>{(gameState as any)[key]}</div>
              <div className="text-xs mt-0.5" style={{ color: '#8a7a6a' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Advanced resources */}
      {gameState && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {ADVANCED_RESOURCES.map(({ key, emoji, label, color }) => (
            <div key={key} className="rounded-xl p-3 border text-center" style={{ background: '#120d08', borderColor: '#2a1f14' }}>
              <div className="text-lg">{emoji}</div>
              <div className="text-xl font-black mt-0.5" style={{ color }}>{(gameState as any)[key]}</div>
              <div className="text-xs mt-0.5" style={{ color: '#8a7a6a' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Use Medicine */}
      {gameState && gameState.medicine > 0 && (
        <button
          onClick={useMedicine}
          className="w-full mb-4 py-3 rounded-xl font-bold text-sm border"
          style={{ background: '#0a1f18', borderColor: '#4a8a6a', color: '#6ab89a' }}
        >
          💊 Use Medicine (+{getMedicineRestoreAmount(advKeys)} Morale) · {gameState.medicine} available
        </button>
      )}

      {/* Tab switcher */}
      <div className="flex gap-2 mb-5">
        {(['buildings', 'advancements'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-xl font-bold text-sm"
            style={{
              background: tab === t ? '#2a1a08' : '#1a1208',
              border: `1px solid ${tab === t ? '#d4791c' : '#2a1f14'}`,
              color: tab === t ? '#d4791c' : '#8a7a6a',
            }}
          >
            {t === 'buildings' ? 'Buildings' : `Advancements${gameState && gameState.science > 0 ? ` (🔬${gameState.science})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'buildings' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_MODULE_TYPES.map((type) => {
            const info     = MODULE_INFO[type];
            const io       = BUILDING_IO[type];
            const existing = modules.find(m => m.module_type === type);
            const cost     = existing ? getLevelUpCost(type, existing.level) : MODULE_BUILD_COSTS[type];
            const isBusy   = busy === type || busy === existing?.id;
            const isMax    = existing?.level === 5;
            const canAfford = gameState
              ? Object.entries(cost).every(([k, v]) => (gameState as any)[k] >= (v as number))
              : false;
            const canAct = profile.is_leader && canAfford && !isBusy && !isMax;

            return (
              <div key={type} className="rounded-2xl p-5 border" style={{ background: '#1a1208', borderColor: existing ? '#4a3a1c' : '#2a1f14' }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{info.emoji}</span>
                  <div>
                    <div className="font-bold" style={{ color: '#e8d5b8' }}>{info.name}</div>
                    {existing && <div className="text-xs font-semibold" style={{ color: '#d4791c' }}>Level {existing.level}/5</div>}
                  </div>
                </div>

                <div className="rounded-lg p-2 mb-3 text-xs space-y-1" style={{ background: '#120d08' }}>
                  <div style={{ color: '#8a7a6a' }}>IN: <span style={{ color: '#c4a73e' }}>{io.input}</span></div>
                  <div style={{ color: '#8a7a6a' }}>OUT: <span style={{ color: '#6b9a4a' }}>{io.output}</span></div>
                </div>

                {!isMax && Object.keys(cost).length > 0 && (
                  <div className="text-xs mb-3 space-y-0.5" style={{ color: '#8a7a6a' }}>
                    <div className="font-semibold mb-1" style={{ color: '#e8d5b8' }}>{existing ? 'Upgrade cost:' : 'Build cost:'}</div>
                    {Object.entries(cost).map(([k, v]) => (
                      <div key={k}>{k.charAt(0).toUpperCase() + k.slice(1)}: {v as number}</div>
                    ))}
                  </div>
                )}

                {existing ? (
                  isMax ? (
                    <div className="text-sm font-bold" style={{ color: '#6b9a4a' }}>✓ Fully Built</div>
                  ) : (
                    <button
                      onClick={() => upgrade(existing)}
                      disabled={!canAct}
                      className="w-full py-2 rounded-xl font-bold text-sm disabled:opacity-40"
                      style={{ backgroundColor: canAct ? '#d4791c' : '#2a1f14', color: canAct ? '#100d0a' : '#5a4a3a' }}
                    >
                      {isBusy ? 'Upgrading…' : !profile.is_leader ? '🔒 Leader Only' : `Upgrade → Lv.${existing.level + 1}`}
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => build(type)}
                    disabled={!canAct}
                    className="w-full py-2 rounded-xl font-bold text-sm disabled:opacity-40"
                    style={{ backgroundColor: canAct ? '#4a3010' : '#2a1f14', color: canAct ? '#e8d5b8' : '#5a4a3a' }}
                  >
                    {isBusy ? 'Building…' : !profile.is_leader ? '🔒 Leader Only' : 'Build'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {ADVANCEMENTS.map((adv) => {
            const unlocked  = advKeys.includes(adv.key);
            const canAfford = gameState ? gameState.science >= adv.cost : false;
            const isBusy    = busy === adv.key;
            return (
              <div key={adv.key} className="rounded-2xl p-5 border" style={{ background: '#1a1208', borderColor: unlocked ? '#4a6a4a' : '#2a1f14' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{adv.emoji}</span>
                  <div>
                    <div className="font-bold" style={{ color: '#e8d5b8' }}>{adv.name}</div>
                    {unlocked && <div className="text-xs font-semibold" style={{ color: '#6b9a4a' }}>✓ Unlocked</div>}
                  </div>
                </div>
                <p className="text-xs mb-1" style={{ color: '#8a7a6a' }}>{adv.description}</p>
                <p className="text-xs mb-3 font-semibold" style={{ color: '#6b9a4a' }}>{adv.effect}</p>
                {!unlocked && (
                  <button
                    onClick={() => unlockAdvancement(adv.key, adv.cost)}
                    disabled={!canAfford || isBusy || !profile.is_leader}
                    className="w-full py-2 rounded-xl font-bold text-sm disabled:opacity-40"
                    style={{ backgroundColor: canAfford && profile.is_leader ? '#1a3a5a' : '#2a1f14', color: canAfford && profile.is_leader ? '#7ab8e8' : '#5a4a3a' }}
                  >
                    {isBusy ? 'Unlocking…' : !profile.is_leader ? '🔒 Leader Only' : `🔬 ${adv.cost} Science`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
