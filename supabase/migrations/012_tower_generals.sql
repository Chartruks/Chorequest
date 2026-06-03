-- 012_tower_generals.sql
-- Rename the 10 guardians to the Lord of the Underworld's beasts/generals (story).
UPDATE tower_floors SET monster_name = 'Gloomling',           monster_emoji = '🟢' WHERE floor = 1;
UPDATE tower_floors SET monster_name = 'Gravewhisker',        monster_emoji = '🐀' WHERE floor = 2;
UPDATE tower_floors SET monster_name = 'Duskwing',            monster_emoji = '🦇' WHERE floor = 3;
UPDATE tower_floors SET monster_name = 'Snare the Scout',     monster_emoji = '👺' WHERE floor = 4;
UPDATE tower_floors SET monster_name = 'Gray Warg',           monster_emoji = '🐺' WHERE floor = 5;
UPDATE tower_floors SET monster_name = 'Hollow Knight',       monster_emoji = '💀' WHERE floor = 6;
UPDATE tower_floors SET monster_name = 'Gorehide',            monster_emoji = '👹' WHERE floor = 7;
UPDATE tower_floors SET monster_name = 'Stonemaw',            monster_emoji = '🧌' WHERE floor = 8;
UPDATE tower_floors SET monster_name = 'Weeping Wraith',      monster_emoji = '👻' WHERE floor = 9;
UPDATE tower_floors SET monster_name = 'Ignar the Gatekeeper', monster_emoji = '🐉' WHERE floor = 10;
