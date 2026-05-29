import { Database } from '../types/database';

type GameState = Database['public']['Tables']['game_state']['Row'];
type BaseModule = Database['public']['Tables']['base_modules']['Row'];

export type ModuleType =
  | 'generator'
  | 'library'
  | 'workshop'
  | 'clinic'
  | 'communityHall'
  | 'watchtower';

export const ALL_MODULE_TYPES: ModuleType[] = [
  'generator',
  'library',
  'workshop',
  'clinic',
  'communityHall',
  'watchtower',
];

interface ModuleRates {
  energy: number;
  knowledge: number;
  money: number;
  food: number;
  morale: number;
}

const BASE_RATES: Record<ModuleType, ModuleRates> = {
  generator:     { energy: 5, knowledge: 0, money: 0, food: 0, morale: 0 },
  library:       { energy: 0, knowledge: 4, money: 0, food: 0, morale: 0 },
  workshop:      { energy: 0, knowledge: 0, money: 5, food: 0, morale: 0 },
  clinic:        { energy: 0, knowledge: 0, money: 0, food: 0, morale: 3 },
  communityHall: { energy: 1, knowledge: 1, money: 1, food: 2, morale: 1 },
  watchtower:    { energy: 0, knowledge: 0, money: 0, food: 0, morale: 0 },
};

export function calcModuleRates(modules: BaseModule[]): ModuleRates {
  return modules.reduce(
    (acc, m) => {
      const base = BASE_RATES[m.module_type as ModuleType];
      if (!base) return acc;
      const mult = 1 + (m.level - 1) * 0.5;
      return {
        energy:    acc.energy    + Math.floor(base.energy    * mult),
        knowledge: acc.knowledge + Math.floor(base.knowledge * mult),
        money:     acc.money     + Math.floor(base.money     * mult),
        food:      acc.food      + Math.floor(base.food      * mult),
        morale:    acc.morale    + Math.floor(base.morale    * mult),
      };
    },
    { energy: 0, knowledge: 0, money: 0, food: 0, morale: 0 }
  );
}

export interface IdleDelta {
  energy: number;
  knowledge: number;
  money: number;
  food: number;
  moraleDelta: number;
}

export function calcIdleDelta(gameState: GameState, modules: BaseModule[]): IdleDelta {
  const now = Date.now();
  const lastTick = new Date(gameState.last_idle_tick).getTime();
  const elapsedHours = Math.min((now - lastTick) / 3_600_000, 12);

  const rates = calcModuleRates(modules);

  const decayPerHour = 0.208; // −5/day
  const netMoraleRate = rates.morale - decayPerHour;

  return {
    energy:    Math.floor(rates.energy    * elapsedHours),
    knowledge: Math.floor(rates.knowledge * elapsedHours),
    money:     Math.floor(rates.money     * elapsedHours),
    food:      Math.floor(rates.food      * elapsedHours),
    moraleDelta: Math.floor(netMoraleRate * elapsedHours),
  };
}

export function applyMoraleMultiplier(amount: number, morale: number): number {
  if (morale >= 75) return Math.floor(amount * 1.2);
  if (morale < 50)  return Math.floor(amount * 0.8);
  return amount;
}

export const MODULE_BUILD_COSTS: Record<ModuleType, { energy: number; knowledge: number; money: number }> = {
  generator:     { energy: 0,   knowledge: 0,   money: 50  },
  library:       { energy: 30,  knowledge: 0,   money: 40  },
  workshop:      { energy: 60,  knowledge: 0,   money: 0   },
  clinic:        { energy: 0,   knowledge: 50,  money: 0   },
  communityHall: { energy: 100, knowledge: 100, money: 0   },
  watchtower:    { energy: 0,   knowledge: 0,   money: 80  },
};

export function getLevelUpCost(
  moduleType: ModuleType,
  currentLevel: number
): { energy: number; knowledge: number; money: number } {
  const base = MODULE_BUILD_COSTS[moduleType];
  const mult = Math.pow(2, currentLevel);
  return {
    energy:    Math.floor(base.energy    * mult),
    knowledge: Math.floor(base.knowledge * mult),
    money:     Math.floor(base.money     * mult),
  };
}

export const MODULE_INFO: Record<ModuleType, { emoji: string; name: string; description: string; unlocks: string }> = {
  generator:     { emoji: '⚡', name: 'Generator',        description: 'Powers the settlement, generates Energy.', unlocks: 'Settlement power' },
  library:       { emoji: '📚', name: 'Library',          description: 'Preserves knowledge, generates Knowledge.', unlocks: 'Chapter 2 zones' },
  workshop:      { emoji: '🔩', name: 'Workshop',         description: 'Crafts goods and gear, generates Money.',   unlocks: 'Faster construction' },
  clinic:        { emoji: '💊', name: 'Clinic',           description: 'Heals the crew, slows Morale decay.',       unlocks: 'Medic role bonus' },
  communityHall: { emoji: '🏚️', name: 'Community Hall',  description: 'Unites the settlement, generates all resources slowly.', unlocks: 'Chapter 3 zones' },
  watchtower:    { emoji: '🔭', name: 'Watchtower',       description: 'Reduces scouting mission time by 20%.',     unlocks: 'Extra scout slot' },
};
