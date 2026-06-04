'use strict';
// Source of truth for the progression balance. Edit the tunables here, run
// `node scripts/progression-model.js` to regenerate /tmp/floors.sql, /tmp/weapons.sql
// and /tmp/levels.txt, then fold the output into a new migration + lib/towerEngine
// LEVELS table. Validate with `node scripts/progression-validate.js`.
// See migration 014 for the currently-shipped values.
const fs=require('fs');
const round=Math.round, clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const F=100, CPD=2.5, LMAX=30, NW=60;

// ── Final formulas (match model v4) ──
const TKILL=f=>clamp(0.3+6.7*Math.pow(f/F,1.2),0.3,7);
const levelForFloor=f=>clamp(round(1+(LMAX-1)*Math.pow(f/F,0.85)),1,LMAX);
const HP=L=>round(25+8*Math.pow(L,1.4));
const WDMG=w=>w===0?1:round(1+1.7*Math.pow(w,1.28));
const WCOST=w=>round(2.2*Math.pow(w,1.8));
const MONEY=f=>round(7*Math.pow(f,1.05));
const BETA=0.22, BOSS_MD=1.5;

let storeFloor=1; for(let f=1;f<=F;f++){if(storeFloor===1&&levelForFloor(f)>=5){storeFloor=f;break;}}
const weaponForFloor=f=>f<storeFloor?0:clamp(Math.ceil((f-storeFloor+1)/(F-storeFloor)*NW),1,NW);
const boss=f=>f%10===0;

// ── LEVELS table: xp_reward = 1 per floor, so cumXP after floor f = f.
//    reachXp[L] = first floor index whose level >= L.
const reach=[]; for(let L=1;L<=LMAX;L++){let rf=0; for(let f=1;f<=F;f++){if(levelForFloor(f)>=L){rf=f;break;}} reach.push(L===1?0:rf);}
const levelsTS = reach.map((rx,i)=>`  { reachXp: ${rx}, hp: ${HP(i+1)} },`).join('\n');
fs.writeFileSync('/tmp/levels.txt', `const LEVELS: { reachXp: number; hp: number }[] = [\n${levelsTS}\n];`);

// ── Monster names ──
const GENERALS=['Ignar the Gatekeeper','Morok the Veiled','Khaznuul, Maw of Ash','Varkolak the Insatiable',
  'Nyx, the Hollow Queen','Grimmaw the Devourer','Sselith, Coil of Night','Brakka the Bonelord',
  'Velmoth the Soulflayer','Abaddon, Lord of the Underworld'];
const ADJ=['Gloom','Grave','Dusk','Ash','Bone','Mire','Shadow','Rot','Frost','Ember','Murk','Gore','Pale','Dread','Vile','Soot','Wraith','Hex','Blight','Cinder'];
const NOUN=['ling','whisker','wing','fang','crawler','hound','spawn','shade','maw','claw','stalker','husk','lurker','gnawer','revenant','imp','wretch','brute','serpent','ghoul'];
const EMOJI=['👻','🦇','🐺','🦴','🕷️','🐍','👺','🦂','🐲','💀','🦟','🐗','🦅','🐙','🦎','🐀','🦗','🐊','🕸️','👹'];
function monsterName(f){
  if(boss(f)) return GENERALS[(f/10)-1];
  const a=ADJ[(f*7)%ADJ.length], n=NOUN[(f*13)%NOUN.length];
  return a+n;
}
function monsterEmoji(f){ return boss(f)?'😈':EMOJI[(f*5)%EMOJI.length]; }

// ── Floors SQL ──
let floorsSql='insert into tower_floors (floor, monster_name, monster_emoji, monster_max_hp, monster_attack, attack_interval_hours, xp_reward, money_reward) values\n';
const rows=[];
for(let f=1;f<=F;f++){
  const L=levelForFloor(f), b=boss(f), w=weaponForFloor(f);
  const D=1+WDMG(w);
  const H=Math.max(1,round(TKILL(f)*CPD*D));
  // monster_attack = intended total HP lost over the fight / intended # of hits landed,
  // so a single hit is a sensible fraction of the player's HP pool (BETA of it overall).
  const interval=clamp(round(24-16*(f/F)),8,24);
  const intendedLoss=BETA*HP(L)*(b?BOSS_MD:1);
  const ticks=Math.max(1, TKILL(f)*24/interval);
  const atk=Math.max(1, round(intendedLoss/ticks));
  const nm=monsterName(f).replace(/'/g,"''");
  rows.push(`  (${f}, '${nm}', '${monsterEmoji(f)}', ${H}, ${atk}, ${interval}, 1, ${MONEY(f)})`);
}
floorsSql+=rows.join(',\n')+';\n';
fs.writeFileSync('/tmp/floors.sql', floorsSql);

// ── Weapons: 60, 12 per rarity tier. Names per tier with escalating flavor. ──
const RAR=['common','uncommon','rare','elite','legendary'];
const TIER_NAMES=[
  ['Wooden Sword','Rusty Dagger','Hunter\'s Sling','Oak Club','Chipped Hatchet','Iron Shiv','Worn Spear','Field Knife','Hardwood Staff','Bronze Cleaver','Sharpened Sickle','Twin Daggers'],
  ['Stone Axe','Short Bow','Bronze Spear','Spiked Mace','Brass Knuckles','Curved Saber','Bearded Axe','War Pick','Recurve Bow','Iron Trident','Battle Staff','Serrated Blade'],
  ['Iron Sword','Battle Axe','Crossbow','War Halberd','Flanged Mace','Longsword','Glaive','Heavy Lance','Composite Bow','Morning Star','War Scythe','Dueling Rapier'],
  ['Steel Greatsword','Knight\'s Blade','Warhammer','Obsidian Glaive','Halberd of Valor','Runed Claymore','Twin Falchions','Pike of Ruin','Siege Crossbow','Mithril Axe','Voulge of Storms','Executioner\'s Edge'],
  ['Dragonfang Blade','Soulreaver Scythe','Celestial Edge','Underworld Greatsword','Voidpiercer','Phoenix Glaive','Doombringer','Eclipse Saber','Worldender Maul','Abyssal Halberd','Starfall Blade','Crown of Sunder'],
];
const WEMOJI=['🗡️','🔪','🪃','🏏','🪓','⚔️','🔱','🦴','🏹','🪒','🌙','⚡'];
let wSql='insert into store_items (name, item_type, is_character, rarity, cost, premium_cost, damage_bonus, hp_bonus, heal_amount, emoji, sort_order) values\n';
const wRows=[], ptRows=[];
for(let w=1;w<=NW;w++){
  const tier=Math.floor((w-1)/12), idx=(w-1)%12;
  const name=TIER_NAMES[tier][idx].replace(/'/g,"''");
  const emoji=WEMOJI[idx];
  wRows.push(`  ('${name}', 'weapon', false, '${RAR[tier]}', ${WCOST(w)}, 0, ${WDMG(w)}, 0, 0, '${emoji}', ${10+w})`);
}
wSql+=wRows.join(',\n')+';\n';
fs.writeFileSync('/tmp/weapons.sql', wSql);

// ── Report ──
console.log('storeFloor(L5)=',storeFloor);
console.log('reachXp[1..30]=',reach.join(','));
console.log('\nfloor sample: f / name / HP / atk / interval / money');
for(const f of [1,10,25,50,75,100]){const L=levelForFloor(f),w=weaponForFloor(f),D=1+WDMG(w);
  const H=Math.max(1,round(TKILL(f)*CPD*D));const interval=clamp(round(24-16*(f/F)),8,24);
  const ticks=Math.max(1,TKILL(f)*24/interval);const atk=Math.max(1,round(BETA*HP(L)*(boss(f)?BOSS_MD:1)/ticks));
  console.log(`  ${f} ${monsterName(f)} HP${H} atk${atk}/@${interval}h pool${HP(L)} $${MONEY(f)}  (L${L} w${w})`);}
console.log('\nweapon sample: w / name / dmg / cost / rarity');
for(const w of [1,12,24,36,48,60]){const t=Math.floor((w-1)/12);
  console.log(`  w${w} ${TIER_NAMES[t][(w-1)%12]} +${WDMG(w)} $${WCOST(w)} ${RAR[t]}`);}
console.log('\nfiles written: /tmp/floors.sql /tmp/weapons.sql /tmp/levels.txt');
