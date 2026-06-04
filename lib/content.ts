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
  // Armor
  'Cloth Tunic':     ['Túnica de Pano',       'Proteção simples. +2 HP.'],
  'Leather Armor':   ['Armadura de Couro',    'Couro resistente. +4 HP.'],
  'Chainmail':       ['Cota de Malha',        'Anéis entrelaçados. +7 HP.'],
  'Plate Armor':     ['Armadura de Placas',   'Proteção total. +12 HP.'],
  // Consumables
  'Bread':           ['Pão',                  'Uma dentada rápida. Cura 3 HP.'],
  'Health Potion':   ['Poção de Vida',        'Restaura 10 HP.'],
  'Elixir':          ['Elixir',               'Restaura todo o HP.'],
  // Weapons — common
  'Wooden Sword':          ['Espada de Madeira',    'Uma lâmina inicial robusta.'],
  'Rusty Dagger':          ['Adaga Enferrujada',    'Pequena mas afiada.'],
  "Hunter's Sling":        ['Funda de Caçador',     'Atira pedras à distância.'],
  'Oak Club':              ['Clava de Carvalho',    'Madeira pesada e sólida.'],
  // Weapons — uncommon
  'Stone Axe':             ['Machado de Pedra',     'Pesado e fiável.'],
  'Short Bow':             ['Arco Curto',           'Rápido e preciso.'],
  'Bronze Spear':          ['Lança de Bronze',      'Alcance e perfuração.'],
  'Spiked Mace':           ['Maça com Espigões',    'Esmaga qualquer armadura.'],
  // Weapons — rare
  'Iron Sword':            ['Espada de Ferro',      'Um fio de aço forjado.'],
  'Battle Axe':            ['Machado de Batalha',   'Feito para a guerra.'],
  'Crossbow':              ['Besta',                'Virotes que furam tudo.'],
  'War Halberd':           ['Alabarda de Guerra',   'Lâmina e ponta numa só arma.'],
  // Weapons — elite
  'Steel Greatsword':      ['Montante de Aço',      'Uma lâmina enorme de aço.'],
  "Knight's Blade":        ['Lâmina do Cavaleiro',  'Reluzente e mortal.'],
  'Warhammer':             ['Martelo de Guerra',    'Um golpe esmagador.'],
  'Obsidian Glaive':       ['Glaive de Obsidiana',  'Vidro vulcânico afiado.'],
  // Weapons — legendary
  'Dragonfang Blade':      ['Lâmina Presa-de-Dragão', 'Forjada com presas de dragão.'],
  'Soulreaver Scythe':     ['Foice Ceifa-Almas',    'Ceifa a própria alma.'],
  'Celestial Edge':        ['Gume Celestial',       'Brilha com luz divina.'],
  'Underworld Greatsword': ['Montante do Submundo', 'A arma do próprio senhor das trevas.'],
  // Characters
  'Survivor':            ['Sobrevivente',         'O teu herói inicial.'],
  'Squire':              ['Escudeiro',            'Um aprendiz determinado.'],
  'Knight':              ['Cavaleiro',            'Honra e aço.'],
  'Ranger':              ['Patrulheiro',          'Mestre da natureza selvagem.'],
  'Sorcerer':            ['Feiticeiro',           'Domina as artes arcanas.'],
  'Berserker':           ['Berserker',            'Fúria sem limites.'],
  'Paladin':             ['Paladino',             'Um campeão sagrado.'],
  'Shadowblade':         ['Lâmina Sombria',       'Mata sem fazer um som.'],
  'Dragon Knight':       ['Cavaleiro Dragão',     'Cavalga a fúria dos dragões.'],
  'Underworld Champion': ['Campeão do Submundo',  'Erguido das próprias trevas.'],
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
