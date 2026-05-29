import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type TowerFloor = Database['public']['Tables']['tower_floors']['Row'];
type StoreItem = Database['public']['Tables']['store_items']['Row'];
type PlayerItem = Database['public']['Tables']['player_items']['Row'] & { store_items: StoreItem };

export const XP_PER_LEVEL = 100;
export const MAX_FLOOR = 20;

export function calcLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpForNextLevel(xp: number): { current: number; needed: number } {
  const level = calcLevel(xp);
  const base = (level - 1) * XP_PER_LEVEL;
  return { current: xp - base, needed: XP_PER_LEVEL };
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

export function calcTotalDamage(baseDamage: number, profile: Profile, playerItems: PlayerItem[]): number {
  const bonus = getEquippedBonus(playerItems);
  const levelBonus = Math.floor((profile.level - 1) * 2);
  return baseDamage + bonus.damage + levelBonus;
}

export function calcMaxHp(profile: Profile, playerItems: PlayerItem[]): number {
  const bonus = getEquippedBonus(playerItems);
  return profile.player_max_hp + bonus.hp;
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
