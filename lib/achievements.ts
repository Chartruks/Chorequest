import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export type Achievement = {
  id: string;
  title: string;
  desc: string;
  icon: string;
  field: 'monsters_defeated' | 'level' | 'gold_spent' | 'deaths' | 'revives' | 'chores_done';
  target: number;
};

// Thresholds are tuned to the grounded economy (10 floors, low gold).
export const ACHIEVEMENTS: Achievement[] = [
  // ── Combat ──
  { id: 'kill1',   title: 'First Blood',        desc: 'Defeat your first monster', icon: '⚔️', field: 'monsters_defeated', target: 1  },
  { id: 'kill5',   title: 'Monster Hunter',     desc: 'Defeat 5 monsters',         icon: '🗡️', field: 'monsters_defeated', target: 5  },
  { id: 'kill10',  title: 'Slayer',             desc: 'Defeat 10 monsters',        icon: '🪓', field: 'monsters_defeated', target: 10 },
  { id: 'kill20',  title: 'Warlord',            desc: 'Defeat 20 monsters',        icon: '🛡️', field: 'monsters_defeated', target: 20 },
  { id: 'kill50',  title: 'Living Legend',      desc: 'Defeat 50 monsters',        icon: '👑', field: 'monsters_defeated', target: 50 },
  // ── Levels ──
  { id: 'lvl5',    title: 'Seasoned',           desc: 'Reach level 5',             icon: '⭐', field: 'level', target: 5  },
  { id: 'lvl10',   title: 'Champion',           desc: 'Reach level 10',            icon: '🌟', field: 'level', target: 10 },
  // ── Gold ──
  { id: 'gold10',  title: 'Shopper',            desc: 'Spend 10 gold',             icon: '💰', field: 'gold_spent', target: 10  },
  { id: 'gold50',  title: 'Big Spender',        desc: 'Spend 50 gold',             icon: '💸', field: 'gold_spent', target: 50  },
  { id: 'gold100', title: 'Tycoon',             desc: 'Spend 100 gold',            icon: '🏦', field: 'gold_spent', target: 100 },
  // ── Death & revival ──
  { id: 'death1',  title: 'Setback',            desc: 'Get defeated once',         icon: '💀', field: 'deaths',  target: 1 },
  { id: 'rev1',    title: 'Back from the Brink',desc: 'Revive once',               icon: '✚',  field: 'revives', target: 1 },
  { id: 'rev5',    title: 'Unkillable',         desc: 'Revive 5 times',            icon: '❤️‍🔥', field: 'revives', target: 5 },
  // ── Chores ──
  { id: 'chore1',  title: 'Getting Started',    desc: 'Do your first chore',       icon: '📋', field: 'chores_done', target: 1   },
  { id: 'chore10', title: 'Helper',             desc: 'Do 10 chores',              icon: '🧹', field: 'chores_done', target: 10  },
  { id: 'chore50', title: 'Hard Worker',        desc: 'Do 50 chores',              icon: '🧺', field: 'chores_done', target: 50  },
  { id: 'chore100',title: 'Champion of Chores', desc: 'Do 100 chores',             icon: '🏆', field: 'chores_done', target: 100 },
];

export function achievementProgress(profile: Profile, a: Achievement): { value: number; unlocked: boolean } {
  const value = (profile as any)[a.field] ?? 0;
  return { value, unlocked: value >= a.target };
}
