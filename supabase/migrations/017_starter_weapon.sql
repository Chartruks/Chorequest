-- Free starter weapon so every hero begins at attack 2 (base 1 + starter 1), matching
-- the balance model. It's the only cost-0 weapon; the buyable 60 start at +5 (store, L5).
insert into store_items (name, item_type, is_character, rarity, cost, premium_cost, damage_bonus, hp_bonus, heal_amount, emoji, sort_order)
values ('Training Sword', 'weapon', false, 'common', 0, 0, 1, 0, 0, '🗡️', 9);

-- Grant it (equipped) to every hero who doesn't already own a weapon.
insert into player_items (profile_id, item_id, quantity, equipped)
select p.id, s.id, 1, true
from profiles p
cross join (select id from store_items where item_type='weapon' and cost=0 limit 1) s
where not exists (
  select 1 from player_items pi
  join store_items si on si.id = pi.item_id
  where pi.profile_id = p.id and si.item_type = 'weapon'
);
