'use strict';
// Source of truth for the progression balance. Edit the tunables here, run
// `node scripts/progression-model.js` to regenerate /tmp/floors.sql, /tmp/weapons.sql
// and /tmp/levels.txt, then fold the output into a migration + lib/towerEngine LEVELS.
// Validate with `node scripts/progression-validate.js`.
const fs=require('fs');
const round=Math.round, clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const F=100, CPD=2.5, LMAX=30, NW=60;

// ── Weapons come in PLATEAUS: 20 power steps, 3 weapons each share dmg + cost.
//    So only ~20 of the 60 are real upgrades; the rest are flavour variants.
const NSTEPS=20, PER_STEP=NW/NSTEPS;
const stepOf  = w => Math.ceil(w/PER_STEP);                 // weapon 1..60 -> step 1..20
const stepDmg = s => round(2 + 3*Math.pow(s,1.25));         // flatter curve, top ~+128
const stepCost= s => round(10*Math.pow(s,2.0));             // gold cost, per step

// ── Curves ──
const TKILL=f=>clamp(0.3+6.7*Math.pow(f/F,1.2),0.3,7);       // kill time @ intended gear (<=7d)
const levelForFloor=f=>clamp(round(1+(LMAX-1)*Math.pow(f/F,0.85)),1,LMAX);
const HP=L=>round(25+8*Math.pow(L,1.4));
const MONEY=f=>round(7*Math.pow(f,1.05));
// Attrition fraction ramps UP with depth so the late floors keep demanding the newest
// weapon — falling a step behind near the top is lethal, no coasting.
const BETA=f=>0.18 + 0.12*(f/F);
const BOSS_MD=1.5;

let storeFloor=1; for(let f=1;f<=F;f++){if(storeFloor===1&&levelForFloor(f)>=5){storeFloor=f;break;}}
// Intended power step for a floor (steps unlock from storeFloor up to floor 100).
const intendedStep=f=>f<storeFloor?0:clamp(Math.ceil((f-storeFloor+1)/(F-storeFloor)*NSTEPS),1,NSTEPS);
const intendedDmg=f=>1+(intendedStep(f)===0?1:stepDmg(intendedStep(f)));
// First weapon index of a floor's intended step (what a player would buy).
const weaponForFloor=f=>intendedStep(f)===0?0:(intendedStep(f)-1)*PER_STEP+1;
const boss=f=>f%10===0;

// ── LEVELS table (HP per level unchanged; xp = 1/floor) ──
const reach=[]; for(let L=1;L<=LMAX;L++){let rf=0; for(let f=1;f<=F;f++){if(levelForFloor(f)>=L){rf=f;break;}} reach.push(L===1?0:rf);}
fs.writeFileSync('/tmp/levels.txt', `const LEVELS: { reachXp: number; hp: number }[] = [\n`+
  reach.map((rx,i)=>`  { reachXp: ${rx}, hp: ${HP(i+1)} },`).join('\n')+`\n];`);

// ── Monster names ──
const GENERALS=['Ignar the Gatekeeper','Morok the Veiled','Khaznuul, Maw of Ash','Varkolak the Insatiable',
  'Nyx, the Hollow Queen','Grimmaw the Devourer','Sselith, Coil of Night','Brakka the Bonelord',
  'Velmoth the Soulflayer','Abaddon, Lord of the Underworld'];
const ADJ=['Gloom','Grave','Dusk','Ash','Bone','Mire','Shadow','Rot','Frost','Ember','Murk','Gore','Pale','Dread','Vile','Soot','Wraith','Hex','Blight','Cinder'];
const NOUN=['ling','whisker','wing','fang','crawler','hound','spawn','shade','maw','claw','stalker','husk','lurker','gnawer','revenant','imp','wretch','brute','serpent','ghoul'];
const EMOJI=['👻','🦇','🐺','🦴','🕷️','🐍','👺','🦂','🐲','💀','🦟','🐗','🦅','🐙','🦎','🐀','🦗','🐊','🕸️','👹'];
const monsterName=f=>boss(f)?GENERALS[(f/10)-1]:ADJ[(f*7)%ADJ.length]+NOUN[(f*13)%NOUN.length];
const monsterEmoji=f=>boss(f)?'😈':EMOJI[(f*5)%EMOJI.length];

// ── Floors SQL ──
let floorsSql='insert into tower_floors (floor, monster_name, monster_emoji, monster_max_hp, monster_attack, attack_interval_hours, xp_reward, money_reward) values\n';
const rows=[];
for(let f=1;f<=F;f++){
  const L=levelForFloor(f), b=boss(f);
  // Pre-store floors (1..storeFloor-1) only have the +1 starter, so the formula rounds
  // them all to ~2 HP. Override with a gentle linear ramp up to floor `storeFloor`'s HP
  // so each early floor feels like a distinct step (2,3,4,… → 10 at floor 9).
  const H = f < storeFloor ? f + 1 : Math.max(1,round(TKILL(f)*CPD*intendedDmg(f)));
  const interval=clamp(round(24-16*(f/F)),8,24);
  const intendedLoss=BETA(f)*HP(L)*(b?BOSS_MD:1);
  const ticks=Math.max(1, TKILL(f)*24/interval);
  const atk=Math.max(1, round(intendedLoss/ticks));
  rows.push(`  (${f}, '${monsterName(f).replace(/'/g,"''")}', '${monsterEmoji(f)}', ${H}, ${atk}, ${interval}, 1, ${MONEY(f)})`);
}
fs.writeFileSync('/tmp/floors.sql', floorsSql+rows.join(',\n')+';\n');

// ── Weapons SQL (60, plateaus of 3 sharing dmg+cost) ──
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
const wRows=[];
for(let w=1;w<=NW;w++){
  const tier=Math.floor((w-1)/12), idx=(w-1)%12, s=stepOf(w);
  wRows.push(`  ('${TIER_NAMES[tier][idx].replace(/'/g,"''")}', 'weapon', false, '${RAR[tier]}', ${stepCost(s)}, 0, ${stepDmg(s)}, 0, 0, '${WEMOJI[idx]}', ${10+w})`);
}
fs.writeFileSync('/tmp/weapons.sql', wSql+wRows.join(',\n')+';\n');

// ── Report ──
console.log('storeFloor(L5)=',storeFloor,' steps:',NSTEPS,'x',PER_STEP);
console.log('\nfloor  L  boss  step  dmg  monHP  atk/@int  kill@int');
for(const f of [1,10,25,50,75,90,95,100]){const L=levelForFloor(f),s=intendedStep(f);
  const H=Math.max(1,round(TKILL(f)*CPD*intendedDmg(f)));const interval=clamp(round(24-16*(f/F)),8,24);
  const ticks=Math.max(1,TKILL(f)*24/interval);const atk=Math.max(1,round(BETA(f)*HP(L)*(boss(f)?BOSS_MD:1)/ticks));
  console.log(`  ${String(f).padStart(3)} ${String(L).padStart(2)} ${boss(f)?'YES':' . '}  ${String(s).padStart(3)} ${String(intendedDmg(f)).padStart(4)} ${String(H).padStart(5)}  ${atk}/@${interval}  ${TKILL(f).toFixed(2)}`);}
console.log('\nweapon steps (dmg / cost):');
for(let s=1;s<=NSTEPS;s++) process.stdout.write(`s${s}:+${stepDmg(s)}/$${stepCost(s)}  `+(s%5===0?'\n':''));
const tot=[];for(let f=1;f<=F;f++)tot.push(MONEY(f));
console.log('total gold(100):',tot.reduce((a,b)=>a+b,0),'| sum of 20 step costs:',Array.from({length:NSTEPS},(_,i)=>stepCost(i+1)).reduce((a,b)=>a+b,0));
console.log('files written: /tmp/floors.sql /tmp/weapons.sql /tmp/levels.txt');
