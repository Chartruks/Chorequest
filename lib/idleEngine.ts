import { Database } from '../types/database';

type GameState = Database['public']['Tables']['game_state']['Row'];
type BaseModule = Database['public']['Tables']['base_modules']['Row'];

export type ModuleType = 'factory' | 'clinic' | 'laboratory' | 'barracks' | 'watchtower';

export const ALL_MODULE_TYPES: ModuleType[] = [
  'factory', 'clinic', 'laboratory', 'barracks', 'watchtower',
];

type ResourceKey = keyof Pick<
  GameState,
  'energy' | 'knowledge' | 'food' | 'money' | 'population' | 'weapons' | 'medicine' | 'science' | 'army'
>;

interface ProductionSpec {
  consume: Partial<Record<ResourceKey, number>>;
  produce: Partial<Record<ResourceKey, number>>;
}

const BASE_SPECS: Record<ModuleType, ProductionSpec> = {
  factory:    { consume: { energy: 2, food: 1, money: 1 },        produce: { weapons: 3  } },
  clinic:     { consume: { knowledge: 1, food: 1, population: 1 },produce: { medicine: 2 } },
  laboratory: { consume: { energy: 2, knowledge: 2, money: 1 },   produce: { science: 1  } },
  barracks:   { consume: { weapons: 5, population: 2 },            produce: { army: 1     } },
  watchtower: { consume: {},                                        produce: {}             },
};

export const MODULE_BUILD_COSTS: Record<ModuleType, Partial<Record<ResourceKey, number>>> = {
  factory:    { energy: 30, money: 20 },
  clinic:     { knowledge: 20, food: 15 },
  laboratory: { energy: 40, knowledge: 30 },
  barracks:   { money: 15, population: 15 },
  watchtower: { money: 40 },
};

export function getLevelUpCost(
  type: ModuleType,
  currentLevel: number
): Partial<Record<ResourceKey, number>> {
  const base = MODULE_BUILD_COSTS[type];
  const mult = Math.pow(2, currentLevel);
  const result: Partial<Record<ResourceKey, number>> = {};
  for (const [k, v] of Object.entries(base) as [ResourceKey, number][]) {
    result[k] = Math.floor(v * mult);
  }
  return result;
}

export const MODULE_INFO: Record<ModuleType, {
  emoji: string; name: string; description: string;
}> = {
  factory:    { emoji: '🏭', name: 'Factory',      description: 'Converts Energy + Food + Money into Weapons.' },
  clinic:     { emoji: '🏥', name: 'Clinic',        description: 'Converts Knowledge + Food + Population into Medicine.' },
  laboratory: { emoji: '🔬', name: 'Laboratory',    description: 'Converts Energy + Knowledge + Money into Science.' },
  barracks:   { emoji: '⚔️', name: 'Barracks',     description: 'Converts Weapons + Population into Army units.' },
  watchtower: { emoji: '🔭', name: 'Watchtower',    description: 'Reduces scouting mission time by 20% per level.' },
};

export interface IdleDelta {
  energy: number; knowledge: number; food: number; money: number; population: number;
  weapons: number; medicine: number; science: number; army: number;
  moraleDelta: number;
}

export function calcIdleDelta(
  gameState: GameState,
  modules: BaseModule[],
  advancements: string[] = []
): IdleDelta {
  const elapsed = Math.min(
    (Date.now() - new Date(gameState.last_idle_tick).getTime()) / 3_600_000,
    12
  );

  const delta: IdleDelta = {
    energy: 0, knowledge: 0, food: 0, money: 0, population: 0,
    weapons: 0, medicine: 0, science: 0, army: 0, moraleDelta: 0,
  };

  delta.moraleDelta = Math.round(-(5 / 24) * elapsed);

  // Running pool — buildings process in priority order and share resources
  const pool: Record<ResourceKey, number> = {
    energy:     gameState.energy,
    knowledge:  gameState.knowledge,
    food:       gameState.food,
    money:      gameState.money,
    population: gameState.population,
    weapons:    gameState.weapons,
    medicine:   gameState.medicine,
    science:    gameState.science,
    army:       gameState.army,
  };

  // Sort by priority: factory → clinic → laboratory → barracks → watchtower
  const priority = ['factory', 'clinic', 'laboratory', 'barracks', 'watchtower'];
  const sorted = [...modules].sort(
    (a, b) => priority.indexOf(a.module_type) - priority.indexOf(b.module_type)
  );

  for (const mod of sorted) {
    const spec = BASE_SPECS[mod.module_type as ModuleType];
    if (!spec || Object.keys(spec.produce).length === 0) continue;

    const levelMult = 1 + (mod.level - 1) * 0.5;

    let consumeMult = 1;
    let produceMult = 1;
    if (mod.module_type === 'factory') {
      if (advancements.includes('factory_efficiency')) consumeMult = 0.75;
      if (advancements.includes('arms_production'))    produceMult = 1.5;
    }
    if (mod.module_type === 'clinic'      && advancements.includes('advanced_medicine')) produceMult = 1.5;
    if (mod.module_type === 'laboratory'  && advancements.includes('advanced_science'))  produceMult = 1.5;

    // Hours this building can actually run given what's in the pool
    let effectiveHours = elapsed;
    for (const [key, rate] of Object.entries(spec.consume) as [ResourceKey, number][]) {
      const scaledRate = rate * levelMult * consumeMult;
      if (scaledRate > 0) {
        effectiveHours = Math.min(effectiveHours, pool[key] / scaledRate);
      }
    }
    effectiveHours = Math.max(0, effectiveHours);
    if (effectiveHours <= 0) continue;

    // Deduct from pool, add to delta
    for (const [key, rate] of Object.entries(spec.consume) as [ResourceKey, number][]) {
      const consumed = Math.floor(rate * levelMult * consumeMult * effectiveHours);
      pool[key] -= consumed;
      (delta as any)[key] -= consumed;
    }
    for (const [key, rate] of Object.entries(spec.produce) as [ResourceKey, number][]) {
      const produced = Math.floor(rate * levelMult * produceMult * effectiveHours);
      pool[key] += produced;
      (delta as any)[key] += produced;
    }
  }

  return delta;
}

export function applyMoraleMultiplier(amount: number, morale: number): number {
  if (morale >= 75) return Math.floor(amount * 1.2);
  if (morale < 50)  return Math.floor(amount * 0.8);
  return amount;
}

// Advancements catalogue
export interface AdvancementDef {
  key: string;
  emoji: string;
  name: string;
  description: string;
  effect: string;
  cost: number; // science cost
}

export const ADVANCEMENTS: AdvancementDef[] = [
  {
    key: 'field_medicine',
    emoji: '💉',
    name: 'Field Medicine',
    description: 'Improve triage and treatment in the field.',
    effect: 'Medicine restores 20 Morale per use (doubled)',
    cost: 100,
  },
  {
    key: 'factory_efficiency',
    emoji: '⚙️',
    name: 'Factory Efficiency',
    description: 'Streamline production to reduce waste.',
    effect: 'Factory consumes 25% fewer resources',
    cost: 120,
  },
  {
    key: 'advanced_medicine',
    emoji: '🧬',
    name: 'Advanced Medicine',
    description: 'Develop higher-yield treatment protocols.',
    effect: 'Clinic produces 50% more Medicine',
    cost: 150,
  },
  {
    key: 'arms_production',
    emoji: '🔩',
    name: 'Arms Production',
    description: 'Upgrade the Factory production line.',
    effect: 'Factory produces 50% more Weapons',
    cost: 200,
  },
  {
    key: 'military_training',
    emoji: '🎖️',
    name: 'Military Training',
    description: 'Train elite units for wasteland combat.',
    effect: 'Army units are 30% more effective in combat',
    cost: 250,
  },
  {
    key: 'advanced_science',
    emoji: '🧪',
    name: 'Advanced Science',
    description: 'Push the limits of surviving knowledge.',
    effect: 'Laboratory produces 50% more Science',
    cost: 300,
  },
];

export function getMedicineRestoreAmount(advancements: string[]): number {
  return advancements.includes('field_medicine') ? 20 : 10;
}
