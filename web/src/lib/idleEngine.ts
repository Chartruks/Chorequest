import { Database } from '@/types/database';

type GameState = Database['public']['Tables']['game_state']['Row'];
type BaseModule = Database['public']['Tables']['base_modules']['Row'];

export type ModuleType = 'reactor' | 'lab' | 'fabricator' | 'medbay' | 'bridge' | 'hangar';

const BASE_RATES: Record<ModuleType, { energy: number; research: number; materials: number; morale: number }> = {
  reactor:    { energy: 5, research: 0, materials: 0, morale: 0 },
  lab:        { energy: 0, research: 4, materials: 0, morale: 0 },
  fabricator: { energy: 0, research: 0, materials: 5, morale: 0 },
  medbay:     { energy: 0, research: 0, materials: 0, morale: 3 },
  bridge:     { energy: 1, research: 1, materials: 1, morale: 1 },
  hangar:     { energy: 0, research: 0, materials: 0, morale: 0 },
};

export function calcModuleRates(modules: BaseModule[]) {
  return modules.reduce(
    (acc, m) => {
      const base = BASE_RATES[m.module_type as ModuleType];
      if (!base) return acc;
      const mult = 1 + (m.level - 1) * 0.5;
      return {
        energy:    acc.energy    + Math.floor(base.energy    * mult),
        research:  acc.research  + Math.floor(base.research  * mult),
        materials: acc.materials + Math.floor(base.materials * mult),
        morale:    acc.morale    + Math.floor(base.morale    * mult),
      };
    },
    { energy: 0, research: 0, materials: 0, morale: 0 }
  );
}

export function calcIdleDelta(gameState: GameState, modules: BaseModule[]) {
  const now = Date.now();
  const lastTick = new Date(gameState.last_idle_tick).getTime();
  const elapsedHours = Math.min((now - lastTick) / 3_600_000, 12);
  const rates = calcModuleRates(modules);
  const decayPerHour = 0.208;
  const netMoraleRatePerHour = rates.morale - decayPerHour;
  return {
    energy:    Math.floor(rates.energy    * elapsedHours),
    research:  Math.floor(rates.research  * elapsedHours),
    materials: Math.floor(rates.materials * elapsedHours),
    moraleDelta: Math.floor(netMoraleRatePerHour * elapsedHours),
  };
}

export function applyMoraleMultiplier(amount: number, morale: number): number {
  if (morale >= 75) return Math.floor(amount * 1.2);
  if (morale < 50)  return Math.floor(amount * 0.8);
  return amount;
}

export const MODULE_BUILD_COSTS: Record<ModuleType, { energy: number; research: number; materials: number }> = {
  reactor:    { energy: 0,   research: 0,   materials: 50 },
  lab:        { energy: 30,  research: 0,   materials: 40 },
  fabricator: { energy: 60,  research: 0,   materials: 0  },
  medbay:     { energy: 0,   research: 50,  materials: 0  },
  bridge:     { energy: 100, research: 100, materials: 0  },
  hangar:     { energy: 0,   research: 0,   materials: 80 },
};

export function getLevelUpCost(moduleType: ModuleType, currentLevel: number) {
  const base = MODULE_BUILD_COSTS[moduleType];
  const mult = Math.pow(2, currentLevel);
  return {
    energy:    Math.floor(base.energy    * mult),
    research:  Math.floor(base.research  * mult),
    materials: Math.floor(base.materials * mult),
  };
}

export const MODULE_INFO: Record<ModuleType, { emoji: string; name: string; description: string; unlocks: string }> = {
  reactor:    { emoji: '⚡', name: 'Reactor Core',   description: 'Generates Energy over time.',          unlocks: 'Station power' },
  lab:        { emoji: '🔬', name: 'Science Lab',    description: 'Generates Research over time.',        unlocks: 'Chapter 2 sectors' },
  fabricator: { emoji: '🪨', name: 'Fabricator',     description: 'Generates Materials over time.',       unlocks: 'Faster builds' },
  medbay:     { emoji: '💜', name: 'Med Bay',        description: 'Slows Morale decay, boosts recovery.', unlocks: 'Medic spec bonus' },
  bridge:     { emoji: '🛸', name: 'Command Bridge', description: 'Generates all resources slowly.',      unlocks: 'Chapter 3 sectors' },
  hangar:     { emoji: '🚀', name: 'Hangar Bay',     description: 'Reduces exploration travel time 20%.', unlocks: 'Extra ship slot' },
};

export const ALL_MODULE_TYPES: ModuleType[] = ['reactor', 'lab', 'fabricator', 'medbay', 'bridge', 'hangar'];
