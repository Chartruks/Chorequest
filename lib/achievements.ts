import { Database } from '../types/database';
import { LANG } from './i18n';

type Profile = Database['public']['Tables']['profiles']['Row'];

export type Achievement = {
  id: string;
  icon: string;
  field: 'monsters_defeated' | 'level' | 'gold_spent' | 'deaths' | 'revives' | 'chores_done';
  target: number;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'kill1',   icon: '⚔️', field: 'monsters_defeated', target: 1  },
  { id: 'kill5',   icon: '🗡️', field: 'monsters_defeated', target: 5  },
  { id: 'kill10',  icon: '🪓', field: 'monsters_defeated', target: 10 },
  { id: 'kill20',  icon: '🛡️', field: 'monsters_defeated', target: 20 },
  { id: 'kill50',  icon: '👑', field: 'monsters_defeated', target: 50 },
  { id: 'lvl5',    icon: '⭐', field: 'level', target: 5  },
  { id: 'lvl10',   icon: '🌟', field: 'level', target: 10 },
  { id: 'gold10',  icon: '💰', field: 'gold_spent', target: 10  },
  { id: 'gold50',  icon: '💸', field: 'gold_spent', target: 50  },
  { id: 'gold100', icon: '🏦', field: 'gold_spent', target: 100 },
  { id: 'death1',  icon: '💀', field: 'deaths',  target: 1 },
  { id: 'rev1',    icon: '✚',  field: 'revives', target: 1 },
  { id: 'rev5',    icon: '❤️‍🔥', field: 'revives', target: 5 },
  { id: 'chore1',  icon: '📋', field: 'chores_done', target: 1   },
  { id: 'chore10', icon: '🧹', field: 'chores_done', target: 10  },
  { id: 'chore50', icon: '🧺', field: 'chores_done', target: 50  },
  { id: 'chore100',icon: '🏆', field: 'chores_done', target: 100 },
];

const TEXT: Record<'en' | 'pt', Record<string, [string, string]>> = {
  en: {
    kill1:   ['First Blood',         'Defeat your first monster'],
    kill5:   ['Monster Hunter',      'Defeat 5 monsters'],
    kill10:  ['Slayer',             'Defeat 10 monsters'],
    kill20:  ['Warlord',            'Defeat 20 monsters'],
    kill50:  ['Living Legend',      'Defeat 50 monsters'],
    lvl5:    ['Seasoned',           'Reach level 5'],
    lvl10:   ['Champion',           'Reach level 10'],
    gold10:  ['Shopper',            'Spend 10 gold'],
    gold50:  ['Big Spender',        'Spend 50 gold'],
    gold100: ['Tycoon',             'Spend 100 gold'],
    death1:  ['Setback',            'Get defeated once'],
    rev1:    ['Back from the Brink', 'Revive once'],
    rev5:    ['Unkillable',         'Revive 5 times'],
    chore1:  ['Getting Started',    'Do your first chore'],
    chore10: ['Helper',            'Do 10 chores'],
    chore50: ['Hard Worker',       'Do 50 chores'],
    chore100:['Champion of Chores', 'Do 100 chores'],
  },
  pt: {
    kill1:   ['Primeiro Sangue',     'Derrota o teu primeiro monstro'],
    kill5:   ['Caçador de Monstros', 'Derrota 5 monstros'],
    kill10:  ['Exterminador',        'Derrota 10 monstros'],
    kill20:  ['Senhor da Guerra',    'Derrota 20 monstros'],
    kill50:  ['Lenda Viva',          'Derrota 50 monstros'],
    lvl5:    ['Experiente',          'Chega ao nível 5'],
    lvl10:   ['Campeão',             'Chega ao nível 10'],
    gold10:  ['Comprador',           'Gasta 10 de ouro'],
    gold50:  ['Esbanjador',          'Gasta 50 de ouro'],
    gold100: ['Magnata',             'Gasta 100 de ouro'],
    death1:  ['Revés',               'Sê derrotado uma vez'],
    rev1:    ['De Volta à Vida',     'Revive uma vez'],
    rev5:    ['Imortal',             'Revive 5 vezes'],
    chore1:  ['O Começo',            'Faz a tua primeira tarefa'],
    chore10: ['Ajudante',            'Faz 10 tarefas'],
    chore50: ['Trabalhador',         'Faz 50 tarefas'],
    chore100:['Campeão das Tarefas', 'Faz 100 tarefas'],
  },
};

export function achTitle(id: string): string { return (TEXT[LANG][id] ?? TEXT.en[id] ?? [id, ''])[0]; }
export function achDesc(id: string): string  { return (TEXT[LANG][id] ?? TEXT.en[id] ?? ['', ''])[1]; }

export function achievementProgress(profile: Profile, a: Achievement): { value: number; unlocked: boolean } {
  const value = (profile as any)[a.field] ?? 0;
  return { value, unlocked: value >= a.target };
}
