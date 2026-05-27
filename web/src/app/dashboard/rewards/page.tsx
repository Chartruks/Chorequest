import { createClient } from '@/lib/supabase/server';
import RewardsClient from './RewardsClient';

export default async function RewardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  let rewards: any[] = [];
  if (profile?.household_id) {
    const { data } = await supabase
      .from('rewards')
      .select('*')
      .eq('household_id', profile.household_id)
      .order('points_cost', { ascending: true });
    rewards = data ?? [];
  }

  return <RewardsClient profile={profile} initialRewards={rewards} />;
}
