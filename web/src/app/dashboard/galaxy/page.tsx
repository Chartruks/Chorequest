import { createClient } from '@/lib/supabase/server';
import GalaxyClient from './GalaxyClient';

export default async function GalaxyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  let gameState = null;
  let sectors: any[] = [];
  let missions: any[] = [];
  let modules: any[] = [];

  const { data: allSectors } = await supabase.from('sectors').select('*').order('threat_level');
  sectors = allSectors ?? [];

  if (profile?.household_id) {
    const [{ data: gs }, { data: ms }, { data: mods }] = await Promise.all([
      supabase.from('game_state').select('*').eq('household_id', profile.household_id).single(),
      supabase.from('discovered_sectors').select('*').eq('household_id', profile.household_id).order('departs_at', { ascending: false }),
      supabase.from('base_modules').select('*').eq('household_id', profile.household_id),
    ]);
    gameState = gs;
    missions = ms ?? [];
    modules = mods ?? [];
  }

  return (
    <GalaxyClient
      profile={profile}
      gameState={gameState}
      sectors={sectors}
      initialMissions={missions}
      modules={modules}
    />
  );
}
