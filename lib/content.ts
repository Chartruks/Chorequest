// Localization for DB-driven content (monsters, store items, chore templates).
// Monsters & store items are global rows shared by everyone → localized at
// display time. Chore titles are authored per family → localized when picked.
import { LANG } from './i18n';

// ── Monsters (by floor). PT only; EN falls back to the DB name. ──
const MONSTER_PT: Record<number, string> = {
  1: 'Gloomling',
  2: 'Gravewhisker',
  3: 'Duskwing',
  4: 'Snare, o Batedor',
  5: 'Warg Cinzento',
  6: 'Cavaleiro Oco',
  7: 'Gorehide',
  8: 'Stonemaw',
  9: 'Espectro Chorão',
  10: 'Ignar, o Guardião',
};
export function monsterName(floor: number, fallback: string): string {
  return LANG === 'pt' ? (MONSTER_PT[floor] ?? fallback) : fallback;
}

// ── Store items (keyed by English name). PT [name, description]. ──
const ITEM_PT: Record<string, [string, string]> = {
  'Survivor':        ['Sobrevivente',         'O teu herói inicial.'],
  'Wooden Sword':    ['Espada de Madeira',    'Uma lâmina inicial robusta. +1 ataque.'],
  'Lucky Charm':     ['Amuleto da Sorte',     'Um pouco de sorte. +1 ataque.'],
  'Stone Axe':       ['Machado de Pedra',     'Pesado e fiável. +2 ataque.'],
  'Rune Stone':      ['Pedra Rúnica',         'Gravada com poder. +2 ataque.'],
  'Iron Sword':      ['Espada de Ferro',      'Um fio de aço forjado. +3 ataque.'],
  'Steel Blade':     ['Lâmina de Aço',        'A arma de um guerreiro. +4 ataque.'],
  "Knight's Blade":  ['Lâmina do Cavaleiro',  'Reluzente e mortal. +6 ataque.'],
  'Cloth Tunic':     ['Túnica de Pano',       'Proteção simples. +2 HP.'],
  'Leather Armor':   ['Armadura de Couro',    'Couro resistente. +4 HP.'],
  'Chainmail':       ['Cota de Malha',        'Anéis entrelaçados. +7 HP.'],
  'Plate Armor':     ['Armadura de Placas',   'Proteção total. +12 HP.'],
  'Bread':           ['Pão',                  'Uma dentada rápida. Cura 3 HP.'],
  'Health Potion':   ['Poção de Vida',        'Restaura 10 HP.'],
  'Elixir':          ['Elixir',               'Restaura todo o HP.'],
};
export function itemName(enName: string): string {
  return LANG === 'pt' ? (ITEM_PT[enName]?.[0] ?? enName) : enName;
}
export function itemDesc(enName: string, enDesc: string | null): string {
  if (LANG === 'pt' && ITEM_PT[enName]) return ITEM_PT[enName][1];
  return enDesc ?? '';
}

// ── Chore templates (keyed by English title). Localized when picked,
//    then stored in that language (a family shares one language). ──
const CHORE_PT: Record<string, string> = {
  'Make Your Bed':       'Fazer a Cama',
  'Wash the Dishes':     'Lavar a Loiça',
  'Take Out Trash':      'Deitar o Lixo Fora',
  '20 Min Reading':      'Ler 20 Minutos',
  'Feed the Pets':       'Alimentar os Animais',
  'Tidy Your Room':      'Arrumar o Quarto',
  'Practice Instrument': 'Praticar Instrumento',
  'Family Dinner':       'Jantar em Família',
  'Vacuum All Rooms':    'Aspirar a Casa',
  'Clean Bathroom':      'Limpar a Casa de Banho',
  'Mow the Lawn':        'Cortar a Relva',
  'Grocery Run':         'Ir às Compras',
  'Do the Laundry':      'Lavar a Roupa',
  'Study Session (1h)':  'Sessão de Estudo (1h)',
  'Family Game Night':   'Noite de Jogos em Família',
  'Deep Clean Kitchen':  'Limpeza Profunda da Cozinha',
  'Science Project':     'Projeto de Ciências',
  'Help a Neighbour':    'Ajudar um Vizinho',
};
export function choreTitle(enTitle: string): string {
  return LANG === 'pt' ? (CHORE_PT[enTitle] ?? enTitle) : enTitle;
}
