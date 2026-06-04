// Skill system. Skills unlock at level 10; each level after 10 grants 1 skill point.
// Stat skills scale per point; "unlock" mechanics are one-point toggles.
// Effects are read from profile.skills, a { skillId: pointsSpent } map.

export type SkillKind = 'stat' | 'unlock';

export interface SkillDef {
  id: string;
  icon: string;
  color: string;
  max: number;          // max points investable
  kind: SkillKind;
  perPoint?: number;    // stat effect per point (e.g. 0.10 = +10%)
  // i18n keys: skills.<id>.name / skills.<id>.desc
}

export const SKILLS: SkillDef[] = [
  { id: 'power',     icon: '⚔️', color: '#ff7070', max: 6, kind: 'stat',   perPoint: 0.10 }, // +10% chore damage
  { id: 'fortune',   icon: '💰', color: '#ffd60a', max: 5, kind: 'stat',   perPoint: 0.10 }, // +10% gold
  { id: 'vigor',     icon: '❤️', color: '#52b788', max: 5, kind: 'stat',   perPoint: 0.08 }, // +8% max HP
  { id: 'alchemy',   icon: '🧪', color: '#48bfe3', max: 4, kind: 'stat',   perPoint: 0.15 }, // +15% potion healing
  { id: 'regen',     icon: '♻️', color: '#9b8dff', max: 3, kind: 'stat',   perPoint: 0.05 }, // heal 5% max HP/day
  { id: 'secondwind',icon: '🌬️', color: '#a0e8af', max: 1, kind: 'unlock' }, // revive in 1 chore
  { id: 'critical',  icon: '💥', color: '#ff9f1c', max: 1, kind: 'unlock' }, // 20% chance to double a hit
  { id: 'treasure',  icon: '🪙', color: '#e0aa3e', max: 1, kind: 'unlock' }, // +50% gold from bosses
];

export const CRIT_CHANCE = 0.20;
export const CRIT_MULT = 2;
export const TREASURE_BOSS_BONUS = 0.5;

export type SkillMap = Record<string, number>;

export function getSkills(profile: { skills?: unknown } | null | undefined): SkillMap {
  const raw = profile?.skills;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as SkillMap;
  return {};
}

const pts = (s: SkillMap, id: string) => Math.max(0, s[id] ?? 0);

// ── Effect helpers (all take the skill map) ──
export const damageMult  = (s: SkillMap) => 1 + 0.10 * pts(s, 'power');
export const goldMult     = (s: SkillMap) => 1 + 0.10 * pts(s, 'fortune');
export const hpMult       = (s: SkillMap) => 1 + 0.08 * pts(s, 'vigor');
export const potionMult   = (s: SkillMap) => 1 + 0.15 * pts(s, 'alchemy');
export const regenPerDay  = (s: SkillMap) => 0.05 * pts(s, 'regen');           // fraction of max HP / day
export const hasCritical  = (s: SkillMap) => pts(s, 'critical') > 0;
export const hasSecondWind= (s: SkillMap) => pts(s, 'secondwind') > 0;
export const hasTreasure  = (s: SkillMap) => pts(s, 'treasure') > 0;

export const reviveChoresNeeded = (s: SkillMap) => (hasSecondWind(s) ? 1 : 2);

export function spentPoints(s: SkillMap): number {
  return SKILLS.reduce((sum, d) => sum + pts(s, d.id), 0);
}

// Skill points a profile has earned in total = max(0, level - 10).
export function earnedSkillPoints(level: number): number {
  return Math.max(0, level - 10);
}
