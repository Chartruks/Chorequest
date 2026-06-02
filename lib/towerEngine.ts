import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type TowerFloor = Database['public']['Tables']['tower_floors']['Row'];
type StoreItem = Database['public']['Tables']['store_items']['Row'];
type PlayerItem = Database['public']['Tables']['player_items']['Row'] & { store_items: StoreItem };

export const MAX_FLOOR = 10;
export const MAX_LEVEL = 10;

// Per-level tuning. reachXp = cumulative XP required to *reach* that level.
// Per-level needs are 1,2,3,5,7,9,12,15,19 → clearing all 10 floors hits L10.
const LEVELS: { reachXp: number; hp: number }[] = [
  { reachXp: 0,  hp: 5  }, // L1
  { reachXp: 1,  hp: 7  }, // L2
  { reachXp: 3,  hp: 10 }, // L3
  { reachXp: 6,  hp: 13 }, // L4
  { reachXp: 11, hp: 17 }, // L5
  { reachXp: 18, hp: 21 }, // L6
  { reachXp: 27, hp: 26 }, // L7
  { reachXp: 39, hp: 31 }, // L8
  { reachXp: 54, hp: 37 }, // L9
  { reachXp: 73, hp: 44 }, // L10
];

export function calcLevel(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].reachXp) level = i + 1;
  }
  return Math.min(level, MAX_LEVEL);
}

export function maxHpForLevel(level: number): number {
  const idx = Math.min(Math.max(level, 1), MAX_LEVEL) - 1;
  return LEVELS[idx].hp;
}

export function xpForNextLevel(xp: number): { current: number; needed: number } {
  const level = calcLevel(xp);
  if (level >= MAX_LEVEL) return { current: 1, needed: 1 }; // maxed → full bar
  const base = LEVELS[level - 1].reachXp;
  const next = LEVELS[level].reachXp;
  return { current: xp - base, needed: next - base };
}

export function getEquippedBonus(playerItems: PlayerItem[]): { damage: number; hp: number } {
  const equipped = playerItems.filter(pi => pi.equipped);
  return equipped.reduce(
    (acc, pi) => ({
      damage: acc.damage + pi.store_items.damage_bonus,
      hp: acc.hp + pi.store_items.hp_bonus,
    }),
    { damage: 0, hp: 0 }
  );
}

// Damage comes from the chore + equipped gear (levels grant HP, not damage),
// so weapons stay meaningful.
export function calcTotalDamage(baseDamage: number, _profile: Profile, playerItems: PlayerItem[]): number {
  return baseDamage + getEquippedBonus(playerItems).damage;
}

export function calcMaxHp(profile: Profile, playerItems: PlayerItem[]): number {
  return maxHpForLevel(profile.level) + getEquippedBonus(playerItems).hp;
}

export interface MonsterAttackResult {
  ticks: number;
  totalDamage: number;
  newHp: number;
  newLastAttack: Date;
}

export function calcMonsterAttack(profile: Profile, floor: TowerFloor): MonsterAttackResult {
  const now = Date.now();
  const last = new Date(profile.last_monster_attack).getTime();
  const intervalMs = floor.attack_interval_hours * 3_600_000;
  const ticks = Math.floor((now - last) / intervalMs);
  const totalDamage = ticks * floor.monster_attack;
  const newHp = Math.max(0, profile.player_hp - totalDamage);
  const newLastAttack = new Date(last + ticks * intervalMs);
  return { ticks, totalDamage, newHp, newLastAttack };
}

export function nextAttackCountdown(profile: Profile, floor: TowerFloor): string {
  const last = new Date(profile.last_monster_attack).getTime();
  const intervalMs = floor.attack_interval_hours * 3_600_000;
  const ticks = Math.floor((Date.now() - last) / intervalMs);
  const nextAttack = last + (ticks + 1) * intervalMs;
  const remaining = Math.max(0, nextAttack - Date.now());
  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}
