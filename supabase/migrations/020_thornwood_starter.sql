-- Thornwood Branch becomes the free, non-purchasable starter weapon (+1), replacing the
-- old "Training Sword". The store hides cost-0 weapons, so Thornwood won't be buyable.
update store_items set cost = 0, damage_bonus = 1 where item_type = 'weapon' and sort_order = 11;

-- Remove the old Training Sword (and any references).
delete from player_items where item_id in (select id from store_items where name = 'Training Sword' and item_type = 'weapon');
delete from store_items where name = 'Training Sword' and item_type = 'weapon';

-- Grant Thornwood (equipped) to every hero who doesn't already have a weapon.
insert into player_items (profile_id, item_id, quantity, equipped)
select p.id, s.id, 1, true
from profiles p
cross join (select id from store_items where item_type = 'weapon' and cost = 0 limit 1) s
where not exists (
  select 1 from player_items pi join store_items si on si.id = pi.item_id
  where pi.profile_id = p.id and si.item_type = 'weapon'
);
