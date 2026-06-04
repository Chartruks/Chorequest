import { Database } from '../types/database';
import { getSkills, damageMult, hpMult, regenPerDay } from './skills';

type Profile = Database['public']['Tables']['profiles']['Row'];
type TowerFloor = Database['public']['Tables']['tower_floors']['Row'];
type StoreItem = Database['public']['Tables']['store_items']['Row'];
type PlayerItem = Database['public']['Tables']['player_items']['Row'] & { store_items: StoreItem };

export const MAX_FLOOR = 100;
export const MAX_LEVEL = 30;

// Per-level tuning, generated from the progression model (see /tmp/gen.js):
//   level(f)=round(1+29·(f/100)^0.85), hp(L)=round(25+8·L^1.4), xp = 1 per floor.
// reachXp[L] = cumulative XP (= floors cleared) required to reach that level.
const LEVELS: { reachXp: number; hp: number }[] = [
  { reachXp: 0,  hp: 33  }, // L1
  { reachXp: 1,  hp: 46  },
  { reachXp: 4,  hp: 62  },
  { reachXp: 6,  hp: 81  },
  { reachXp: 9,  hp: 101 }, // L5  (store unlocks)
  { reachXp: 12, hp: 123 },
  { reachXp: 15, hp: 147 },
  { reachXp: 18, hp: 172 },
  { reachXp: 21, hp: 198 },
  { reachXp: 24, hp: 226 }, // L10 (skills unlock)
  { reachXp: 27, hp: 255 },
  { reachXp: 31, hp: 284 },
  { reachXp: 34, hp: 315 },
  { reachXp: 38, hp: 347 },
  { reachXp: 41, hp: 380 },
  { reachXp: 45, hp: 413 },
  { reachXp: 48, hp: 447 },
  { reachXp: 52, hp: 483 },
  { reachXp: 56, hp: 519 },
  { reachXp: 59, hp: 555 },
  { reachXp: 63, hp: 593 },
  { reachXp: 67, hp: 631 },
  { reachXp: 71, hp: 670 },
  { reachXp: 75, hp: 710 },
  { reachXp: 79, hp: 750 },
  { reachXp: 83, hp: 791 },
  { reachXp: 86, hp: 832 },
  { reachXp: 90, hp: 874 },
  { reachXp: 94, hp: 917 },
  { reachXp: 98, hp: 961 }, // L30
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

// Damage = (chore base + equipped weapon) × Power-skill multiplier. Levels grant HP, not
// damage, so weapons (and the Power skill) stay the levers that out-pace monster HP.
export function calcTotalDamage(baseDamage: number, profile: Profile, playerItems: PlayerItem[]): number {
  const raw = baseDamage + getEquippedBonus(playerItems).damage;
  return Math.round(raw * damageMult(getSkills(profile)));
}

// Max HP = level pool × Vigor-skill multiplier + flat armor bonus.
export function calcMaxHp(profile: Profile, playerItems: PlayerItem[]): number {
  const base = Math.round(maxHpForLevel(profile.level) * hpMult(getSkills(profile)));
  return base + getEquippedBonus(playerItems).hp;
}

export interface MonsterAttackResult {
  ticks: number;
  totalDamage: number;
  newHp: number;
  newLastAttack: Date;
}

// Resolves elapsed monster attacks (and any passive Regen) since the last tick.
// Pass maxHp so Regen healing (and the HP cap) can be applied over elapsed time.
export function calcMonsterAttack(profile: Profile, floor: TowerFloor, maxHp?: number): MonsterAttackResult {
  const now = Date.now();
  const last = new Date(profile.last_monster_attack).getTime();
  const intervalMs = floor.attack_interval_hours * 3_600_000;
  const ticks = Math.floor((now - last) / intervalMs);
  const totalDamage = ticks * floor.monster_attack;
  const elapsedDays = (ticks * floor.attack_interval_hours) / 24;
  const cap = maxHp ?? Infinity;
  const afterDmg = Math.max(0, profile.player_hp - totalDamage);
  // Regen heals over elapsed time, but only up to the cap — and never clips current HP
  // downward (so a stale/low maxHp estimate can't hurt the player).
  const regenHeal = Math.round(regenPerDay(getSkills(profile)) * (Number.isFinite(cap) ? cap : 0) * elapsedDays);
  const newHp = afterDmg + Math.min(regenHeal, Math.max(0, cap - afterDmg));
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
