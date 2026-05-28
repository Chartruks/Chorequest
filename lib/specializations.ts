export type CadetSpec = 'engineer' | 'scientist' | 'navigator' | 'medic' | 'combat';
export type CommanderSpec = 'admiral' | 'strategist' | 'diplomat';
export type Spec = CadetSpec | CommanderSpec;

export interface SpecInfo {
  emoji: string;
  name: string;
  description: string;
  role: 'child' | 'parent';
}

export const SPEC_INFO: Record<Spec, SpecInfo> = {
  engineer:   { emoji: '⚙️',  name: 'Engineer',    description: '+50% Energy from Maintenance missions',      role: 'child' },
  scientist:  { emoji: '🔬', name: 'Scientist',    description: '+50% Research from Learning missions',       role: 'child' },
  navigator:  { emoji: '🧭', name: 'Navigator',    description: 'Travel time −30% on your explorations',     role: 'child' },
  medic:      { emoji: '💉', name: 'Medic',        description: '+3 Morale per day passive',                 role: 'child' },
  combat:     { emoji: '⚔️',  name: 'Combat Spec',  description: '+30% combat win rate in sector battles',    role: 'child' },
  admiral:    { emoji: '🎖️',  name: 'Admiral',      description: '+1 simultaneous exploration slot',          role: 'parent' },
  strategist: { emoji: '📐', name: 'Strategist',   description: 'Module build costs −20%',                   role: 'parent' },
  diplomat:   { emoji: '🕊️',  name: 'Diplomat',     description: 'Morale decay −50% for the whole crew',     role: 'parent' },
};

export const CADET_SPECS: CadetSpec[]    = ['engineer', 'scientist', 'navigator', 'medic', 'combat'];
export const COMMANDER_SPECS: CommanderSpec[] = ['admiral', 'strategist', 'diplomat'];

export function applySpecToResourceReward(
  spec: Spec | null,
  category: string,
  rewards: { energy: number; research: number; materials: number; morale: number }
) {
  if (!spec) return rewards;
  const r = { ...rewards };
  if (spec === 'engineer'  && category === 'maintenance') r.energy   = Math.floor(r.energy   * 1.5);
  if (spec === 'scientist' && category === 'learning')    r.research  = Math.floor(r.research  * 1.5);
  return r;
}

export function getTravelTimeMs(
  threatLevel: number,
  spec: Spec | null,
  hangarLevel: number
): number {
  let hours = threatLevel * 2;
  if (spec === 'navigator') hours *= 0.7;
  hours *= Math.pow(0.8, hangarLevel); // each hangar level = -20%
  return Math.max(hours * 3_600_000, 60_000); // minimum 1 minute for dev/testing
}

export function getCombatWinChance(threatLevel: number, spec: Spec | null): number {
  const base = 1 - threatLevel * 0.15;
  if (spec === 'combat') return Math.min(base + 0.3, 0.95);
  return Math.max(base, 0.1);
}

export function getModuleCostMultiplier(commanderSpec: Spec | null): number {
  return commanderSpec === 'strategist' ? 0.8 : 1.0;
}

export function getMoraleDecayMultiplier(commanderSpecs: (Spec | null)[]): number {
  return commanderSpecs.some(s => s === 'diplomat') ? 0.5 : 1.0;
}
