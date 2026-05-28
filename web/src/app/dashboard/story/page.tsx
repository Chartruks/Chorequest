import { createClient } from '@/lib/supabase/server';
import StoryClient from './StoryClient';

export default async function StoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  let gameState = null;
  let events: any[] = [];

  if (profile?.household_id) {
    const [{ data: gs }, { data: ev }] = await Promise.all([
      supabase.from('game_state').select('*').eq('household_id', profile.household_id).single(),
      supabase.from('story_events').select('*').eq('household_id', profile.household_id).order('triggered_at'),
    ]);
    gameState = gs;
    events = ev ?? [];
  }

  return <StoryClient profile={profile} gameState={gameState} initialEvents={events} />;
}
