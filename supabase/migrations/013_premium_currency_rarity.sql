-- Premium currency (gems, bought via IAP) + item rarity tiers + full weapon set.

-- 1. Premium currency on profiles.
alter table profiles add column if not exists gems integer not null default 0;

-- 2. Rarity + premium pricing on store items.
alter table store_items add column if not exists rarity text not null default 'common';
alter table store_items add column if not exists premium_cost integer not null default 0;

alter table store_items drop constraint if exists store_items_rarity_check;
alter table store_items add constraint store_items_rarity_check
  check (rarity in ('common', 'uncommon', 'rare', 'elite', 'legendary'));

-- 3. Reseed weapons as a full set across all five rarity tiers.
--    (Remove old weapons and any owned/equipped references first.)
delete from player_items where item_id in (select id from store_items where item_type = 'weapon');
delete from store_items where item_type = 'weapon';

insert into store_items (name, item_type, is_character, rarity, cost, premium_cost, damage_bonus, hp_bonus, heal_amount, emoji, sort_order) values
  -- Common (gold)
  ('Wooden Sword',          'weapon', false, 'common',    5,  0,  1, 0, 0, '🗡️', 10),
  ('Rusty Dagger',          'weapon', false, 'common',    7,  0,  1, 0, 0, '🔪', 11),
  ('Hunter''s Sling',       'weapon', false, 'common',   10,  0,  2, 0, 0, '🪃', 12),
  ('Oak Club',              'weapon', false, 'common',   13,  0,  2, 0, 0, '🏏', 13),
  -- Uncommon (gold)
  ('Stone Axe',             'weapon', false, 'uncommon', 18,  0,  3, 0, 0, '🪓', 14),
  ('Short Bow',             'weapon', false, 'uncommon', 24,  0,  3, 0, 0, '🏹', 15),
  ('Bronze Spear',          'weapon', false, 'uncommon', 30,  0,  4, 0, 0, '🔱', 16),
  ('Spiked Mace',           'weapon', false, 'uncommon', 38,  0,  4, 0, 0, '⚒️', 17),
  -- Rare (gold)
  ('Iron Sword',            'weapon', false, 'rare',     48,  0,  5, 0, 0, '⚔️', 18),
  ('Battle Axe',            'weapon', false, 'rare',     60,  0,  6, 0, 0, '🪓', 19),
  ('Crossbow',              'weapon', false, 'rare',     72,  0,  6, 0, 0, '🏹', 20),
  ('War Halberd',           'weapon', false, 'rare',     88,  0,  7, 0, 0, '🔱', 21),
  -- Elite (gold)
  ('Steel Greatsword',      'weapon', false, 'elite',   110,  0,  8, 0, 0, '🗡️', 22),
  ('Knight''s Blade',       'weapon', false, 'elite',   140,  0, 10, 0, 0, '⚔️', 23),
  ('Warhammer',             'weapon', false, 'elite',   175,  0, 11, 0, 0, '🔨', 24),
  ('Obsidian Glaive',       'weapon', false, 'elite',   220,  0, 12, 0, 0, '🔱', 25),
  -- Legendary (gems)
  ('Dragonfang Blade',      'weapon', false, 'legendary', 0, 30, 15, 0, 0, '🐉', 26),
  ('Soulreaver Scythe',     'weapon', false, 'legendary', 0, 45, 18, 0, 0, '💀', 27),
  ('Celestial Edge',        'weapon', false, 'legendary', 0, 60, 20, 0, 0, '✨', 28),
  ('Underworld Greatsword', 'weapon', false, 'legendary', 0, 90, 24, 0, 0, '🔥', 29);

-- 4. Characters: tag the starter, then add a roster across all tiers.
update store_items set rarity = 'common' where item_type = 'character';

insert into store_items (name, item_type, is_character, rarity, cost, premium_cost, damage_bonus, hp_bonus, heal_amount, emoji, sort_order) values
  -- Common (gold)
  ('Squire',               'character', true, 'common',     25,  0, 0, 0, 0, '🧒', 2),
  -- Uncommon (gold)
  ('Knight',               'character', true, 'uncommon',   70,  0, 0, 0, 0, '🤴', 3),
  ('Ranger',               'character', true, 'uncommon',  110,  0, 0, 0, 0, '🧝', 4),
  -- Rare (gold)
  ('Sorcerer',             'character', true, 'rare',      180,  0, 0, 0, 0, '🧙', 5),
  ('Berserker',            'character', true, 'rare',      260,  0, 0, 0, 0, '🪓', 6),
  -- Elite (gold)
  ('Paladin',              'character', true, 'elite',     400,  0, 0, 0, 0, '🛡️', 7),
  ('Shadowblade',          'character', true, 'elite',     560,  0, 0, 0, 0, '🥷', 8),
  -- Legendary (gems)
  ('Dragon Knight',        'character', true, 'legendary',   0, 50, 0, 0, 0, '🐲', 9),
  ('Underworld Champion',  'character', true, 'legendary',   0, 90, 0, 0, 0, '😈', 10);
