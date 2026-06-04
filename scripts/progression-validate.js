'use strict';
// Integration check: parse the SHIPPED floor/weapon data and run a discrete
// (tick-based) rolling sim with the real LEVELS HP table. Confirms beatable + walls.
const fs=require('fs');
const floorsSql=fs.readFileSync('/tmp/floors.sql','utf8');
const weaponsSql=fs.readFileSync('/tmp/weapons.sql','utf8');

const floors=[...floorsSql.matchAll(/\((\d+), '[^']*(?:''[^']*)*', '[^']*', (\d+), (\d+), (\d+), (\d+), (\d+)\)/g)]
  .map(m=>({f:+m[1],hp:+m[2],atk:+m[3],interval:+m[4],money:+m[6]}));
const weapons=[...weaponsSql.matchAll(/\('[^']*(?:''[^']*)*', 'weapon', false, '\w+', (\d+), 0, (\d+),/g)]
  .map((m,i)=>({w:i+1,cost:+m[1],dmg:+m[2]}));

const LVLHP=[33,46,62,81,101,123,147,172,198,226,255,284,315,347,380,413,447,483,519,555,593,631,670,710,750,791,832,874,917,961];
const REACH=[0,1,4,6,9,12,15,18,21,24,27,31,34,38,41,45,48,52,56,59,63,67,71,75,79,83,86,90,94,98];
const calcLevel=xp=>{let L=1;for(let i=0;i<REACH.length;i++)if(xp>=REACH[i])L=i+1;return Math.min(L,30);};
const CPD=2.5, storeFloor=9;
const weaponForFloor=f=>f<storeFloor?0:Math.min(60,Math.ceil((f-storeFloor+1)/(100-storeFloor)*60));

console.log('parsed floors:',floors.length,'weapons:',weapons.length);

// Discrete sim: HP carries; level-up full heal; potions = bounded band buffer (0.6 pool);
// monster lands floor(killDays*24/interval) hits of `atk`.
function sim({upgradeEvery=5, stopAt=999}={}){
  let gold=0, xp=0, level=1, hp=LVLHP[0], ownedW=0, bandPot=0;
  for(const fl of floors){
    const before=calcLevel(xp);
    if(before>level){level=before; hp=LVLHP[level-1]; bandPot=0;}
    const pool=LVLHP[level-1];
    if(fl.f>=storeFloor && fl.f<=stopAt && (fl.f%upgradeEvery===0||ownedW===0)){
      const tgt=weaponForFloor(fl.f);
      if(tgt>ownedW && gold>=weapons[tgt-1].cost){gold-=weapons[tgt-1].cost; ownedW=tgt;}
    }
    const dmgPerChore=1+(ownedW>0?weapons[ownedW-1].dmg:1);
    const killDays=fl.hp/(CPD*dmgPerChore);
    const hits=Math.floor(killDays*24/fl.interval);
    let dmg=hits*fl.atk;
    hp-=dmg;
    if(hp<pool*0.35){const room=0.6*pool-bandPot; if(room>0){const heal=Math.min(room,pool-hp); hp+=heal; bandPot+=heal;}}
    if(hp<=0) return {diedAt:fl.f, killDays, ownedW};
    gold+=fl.money; xp+=1;
  }
  return {diedAt:null, ownedW};
}

const maxKill=Math.max(...floors.map(fl=>fl.hp/(CPD*(1+(weaponForFloor(fl.f)>0?weapons[weaponForFloor(fl.f)-1].dmg:1)))));
console.log('max kill time @intended weapon:',maxKill.toFixed(2),'days');
const s=sim({upgradeEvery:5});
console.log('INTENDED (upgrade ~every 5 floors):', s.diedAt?('DIED '+s.diedAt):'SURVIVED to 100', 'endW',s.ownedW);
console.log('WALLS (stop upgrading at floor S):');
for(const S of [15,25,35,45,55,65,75]){const r=sim({upgradeEvery:5,stopAt:S});
  console.log(`  stop@${S} (own w${weaponForFloor(S)}) -> ${r.diedAt?('dies '+r.diedAt):'survives'}`);}
console.log('never upgrade ->', sim({upgradeEvery:5,stopAt:0}).diedAt ? 'dies floor '+sim({upgradeEvery:5,stopAt:0}).diedAt : 'survives');
