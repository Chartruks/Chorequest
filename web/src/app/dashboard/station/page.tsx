import { createClient } from '@/lib/supabase/server';
import StationClient from './StationClient';

export default async function StationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  let gameState = null;
  let modules: any[] = [];
  let advancements: any[] = [];

  if (profile?.household_id) {
    const [{ data: gs }, { data: mods }, { data: advs }] = await Promise.all([
      supabase.from('game_state').select('*').eq('household_id', profile.household_id).single(),
      supabase.from('base_modules').select('*').eq('household_id', profile.household_id),
      supabase.from('advancements').select('*').eq('household_id', profile.household_id),
    ]);
    gameState = gs;
    modules = mods ?? [];
    advancements = advs ?? [];
  }

  return <StationClient profile={profile} initialGameState={gameState} initialModules={modules} initialAdvancements={advancements} />;
}
