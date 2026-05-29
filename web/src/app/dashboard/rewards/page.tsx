import { createClient } from '@/lib/supabase/server';
import RewardsClient from './RewardsClient';

export default async function RewardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  let rewards: any[] = [];
  if (profile?.household_id) {
    const { data: r } = await supabase
      .from('rewards').select('*')
      .eq('household_id', profile.household_id)
      .order('points_cost');
    rewards = r ?? [];
  }

  return <RewardsClient profile={profile} initialRewards={rewards} />;
}
