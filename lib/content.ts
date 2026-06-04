// Localization for DB-driven content (monsters, store items, chore templates).
// Monsters & store items are global rows shared by everyone → localized at
// display time. Chore titles are authored per family → localized when picked.
import { LANG } from './i18n';

// ── Monsters. The 100 tower monsters use language-neutral fantasy names, so we
//    display the DB name as-is in both languages. (Kept as a function so callers
//    don't change if we localize specific named generals later.)
export function monsterName(_floor: number, fallback: string): string {
  return fallback;
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
  'Wooden Sword':          ['Espada de Madeira',    ''],
  'Rusty Dagger':          ['Adaga Enferrujada',    ''],
  "Hunter's Sling":        ['Funda de Caçador',     ''],
  'Oak Club':              ['Clava de Carvalho',    ''],
  'Chipped Hatchet':       ['Machadinha Lascada',   ''],
  'Iron Shiv':             ['Estilete de Ferro',    ''],
  'Worn Spear':            ['Lança Gasta',          ''],
  'Field Knife':           ['Faca de Campo',        ''],
  'Hardwood Staff':        ['Bordão de Madeira Rija',''],
  'Bronze Cleaver':        ['Cutelo de Bronze',     ''],
  'Sharpened Sickle':      ['Foice Afiada',         ''],
  'Twin Daggers':          ['Adagas Gémeas',        ''],
  // Weapons — uncommon
  'Stone Axe':             ['Machado de Pedra',     ''],
  'Short Bow':             ['Arco Curto',           ''],
  'Bronze Spear':          ['Lança de Bronze',      ''],
  'Spiked Mace':           ['Maça com Espigões',    ''],
  'Brass Knuckles':        ['Soqueira de Latão',    ''],
  'Curved Saber':          ['Sabre Curvo',          ''],
  'Bearded Axe':           ['Machado Barbado',      ''],
  'War Pick':              ['Picareta de Guerra',   ''],
  'Recurve Bow':           ['Arco Recurvo',         ''],
  'Iron Trident':          ['Tridente de Ferro',    ''],
  'Battle Staff':          ['Bordão de Batalha',    ''],
  'Serrated Blade':        ['Lâmina Serrilhada',    ''],
  // Weapons — rare
  'Iron Sword':            ['Espada de Ferro',      ''],
  'Battle Axe':            ['Machado de Batalha',   ''],
  'Crossbow':              ['Besta',                ''],
  'War Halberd':           ['Alabarda de Guerra',   ''],
  'Flanged Mace':          ['Maça Flangeada',       ''],
  'Longsword':             ['Espada Longa',         ''],
  'Glaive':                ['Glaive',               ''],
  'Heavy Lance':           ['Lança Pesada',         ''],
  'Composite Bow':         ['Arco Composto',        ''],
  'Morning Star':          ['Estrela-da-Manhã',     ''],
  'War Scythe':            ['Foice de Guerra',      ''],
  'Dueling Rapier':        ['Florete de Duelo',     ''],
  // Weapons — elite
  'Steel Greatsword':      ['Montante de Aço',      ''],
  "Knight's Blade":        ['Lâmina do Cavaleiro',  ''],
  'Warhammer':             ['Martelo de Guerra',    ''],
  'Obsidian Glaive':       ['Glaive de Obsidiana',  ''],
  'Halberd of Valor':      ['Alabarda do Valor',    ''],
  'Runed Claymore':        ['Espadão Rúnico',       ''],
  'Twin Falchions':        ['Falchions Gémeos',     ''],
  'Pike of Ruin':          ['Pique da Ruína',       ''],
  'Siege Crossbow':        ['Besta de Cerco',       ''],
  'Mithril Axe':           ['Machado de Mithril',   ''],
  'Voulge of Storms':      ['Voulge das Tempestades',''],
  "Executioner's Edge":    ['Gume do Carrasco',     ''],
  // Weapons — legendary
  'Dragonfang Blade':      ['Lâmina Presa-de-Dragão',''],
  'Soulreaver Scythe':     ['Foice Ceifa-Almas',    ''],
  'Celestial Edge':        ['Gume Celestial',       ''],
  'Underworld Greatsword': ['Montante do Submundo',  ''],
  'Voidpiercer':           ['Perfura-Vazio',        ''],
  'Phoenix Glaive':        ['Glaive da Fénix',      ''],
  'Doombringer':           ['Arauto da Perdição',   ''],
  'Eclipse Saber':         ['Sabre do Eclipse',     ''],
  'Worldender Maul':       ['Marreta Fim-do-Mundo', ''],
  'Abyssal Halberd':       ['Alabarda Abissal',     ''],
  'Starfall Blade':        ['Lâmina Queda-de-Estrela',''],
  'Crown of Sunder':       ['Coroa da Ruptura',     ''],
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
