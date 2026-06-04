-- Smooth the pre-store floors (1-8): the +1 starter weapon made the HP formula round
-- them all to ~2 HP. Give a gentle linear ramp (2,3,…,9) rising into floor 9's 10 HP.
update tower_floors set monster_max_hp = floor + 1 where floor between 1 and 8;
-- Resync any hero currently sitting on those floors.
update profiles set monster_hp = (select monster_max_hp from tower_floors where floor = profiles.tower_floor)
  where tower_floor between 1 and 8;
