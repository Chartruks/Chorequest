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
  // Weapons — starter
  'Training Sword': ['Espada de Treino', ''],
  // Weapons — common
  'Thornwood Branch':        ['Ramo Espinhoso', ''],
  'Crossguard Blade':        ['Lâmina de Guarda-Cruz', ''],
  'Broadsword':              ['Espada Larga', ''],
  "Footman's Sword":         ['Espada de Soldado', ''],
  'Worn Falchion':           ['Falchion Gasto', ''],
  'Hooked Saber':            ['Sabre Adunco', ''],
  'Bronze Cleaver':          ['Cutelo de Bronze', ''],
  'Cinderbrand':             ['Tição', ''],
  'Twin Ember Blade':        ['Lâminas Gémeas de Brasa', ''],
  'Heavy Cleaver':           ['Cutelo Pesado', ''],
  'Horned Blade':            ['Lâmina Cornada', ''],
  'Venom Fang':              ['Presa Venenosa', ''],
  // Weapons — uncommon
  'Boneguard Saber':         ['Sabre de Osso', ''],
  'Scimitar':                ['Cimitarra', ''],
  'Estoc':                   ['Estoque', ''],
  'Bramble Staff':           ['Bordão de Silvas', ''],
  'Rusted Brand':            ['Espada Enferrujada', ''],
  "Minstrel's Edge":         ['Gume do Menestrel', ''],
  'Rapier':                  ['Florete', ''],
  'Jade Kris':               ['Adaga de Jade', ''],
  'Beastfang Sword':         ['Espada Presa-Fera', ''],
  'Gore Sawblade':           ['Serra Sangrenta', ''],
  'Heavy Crossbow':          ['Besta Pesada', ''],
  'Bloodletter':             ['Sangrador', ''],
  // Weapons — rare
  'Cinderroot Blade':        ['Lâmina Raiz-de-Brasa', ''],
  'Coiled Pike':             ['Pique Enrolado', ''],
  'Wildfire Brand':          ['Espada Fogo-Selvagem', ''],
  'Sunspear':                ['Lança Solar', ''],
  'Glacial Greatsword':      ['Montante Glacial', ''],
  "Reaper's Khopesh":        ['Khopesh do Ceifador', ''],
  'Sugarcone Lance':         ['Lança de Gelado', ''],
  "Tinker's Multitool":      ['Canivete do Latoeiro', ''],
  'Emberchain Whip':         ['Chicote de Brasa', ''],
  'Ripsaw Blade':            ['Lâmina Serra-Elétrica', ''],
  'Glasspane Greatblade':    ['Montante de Vidro', ''],
  "Maestro's Warbow":        ['Arco do Maestro', ''],
  // Weapons — elite
  "Warden's Glaive":         ['Glaive do Guardião', ''],
  'Tidecaller Trident':      ['Tridente das Marés', ''],
  'Solar Halberd':           ['Alabarda Solar', ''],
  'Searing Estoc':           ['Estoque Ardente', ''],
  'Phoenix Plume':           ['Pluma de Fénix', ''],
  'Gilded Falcon Blade':     ['Lâmina do Falcão Dourado', ''],
  'Thornspark Lance':        ['Lança Espinho-Faísca', ''],
  'Infernal Greatsword':     ['Montante Infernal', ''],
  'Starfall Edge':           ['Gume Queda-Estelar', ''],
  'Zephyr Saber':            ['Sabre Zéfiro', ''],
  'Moltenscar':              ['Cicatriz de Magma', ''],
  'Verdant Thornblade':      ['Lâmina Espinho Verdejante', ''],
  // Weapons — legendary
  'Thunderbrand':            ['Espada Trovão', ''],
  'Eye of the Grove':        ['Olho do Bosque', ''],
  'Glacial Maul':            ['Maço Glacial', ''],
  'Tempest Edge':            ['Gume da Tempestade', ''],
  'Emerald Greatblade':      ['Montante Esmeralda', ''],
  'Sakura Greatblade':       ['Montante Sakura', ''],
  'Azure Lightblade':        ['Lâmina de Luz Azul', ''],
  'Rose Rapier':             ['Florete de Rosa', ''],
  'Crystalsong Blade':       ['Lâmina Canto-de-Cristal', ''],
  'Dragoncoil Blade':        ['Lâmina Dragão-Enrolado', ''],
  'Dawnbreaker':             ['Quebra-Alvorada', ''],
  'Abyssal Edge':            ['Gume Abissal', ''],
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
