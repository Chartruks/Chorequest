import { createClient } from '@/lib/supabase/server';
import QuestsClient from './QuestsClient';

export default async function QuestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  let chores: any[] = [];
  let gameState = null;

  const { data: templates } = await supabase
    .from('chore_templates')
    .select('*')
    .order('category')
    .order('recurrence');

  if (profile?.household_id) {
    const [{ data: ch }, { data: gs }] = await Promise.all([
      supabase.from('chores').select('*').eq('household_id', profile.household_id).order('created_at', { ascending: false }),
      supabase.from('game_state').select('*').eq('household_id', profile.household_id).single(),
    ]);
    chores = ch ?? [];
    gameState = gs;
  }

  return <QuestsClient profile={profile} initialChores={chores} templates={templates ?? []} gameState={gameState} />;
}
