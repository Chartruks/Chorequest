import { createClient } from '@/lib/supabase/server';
import QuestsClient from './QuestsClient';

export default async function QuestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  let chores: any[] = [];
  if (profile?.household_id) {
    const { data } = await supabase
      .from('chores')
      .select('*')
      .eq('household_id', profile.household_id)
      .order('created_at', { ascending: false });
    chores = data ?? [];
  }

  return <QuestsClient profile={profile} initialChores={chores} />;
}
