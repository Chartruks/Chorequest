import { createClient } from '@/lib/supabase/server';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  let householdName: string | null = null;
  let inviteCode: string | null = null;
  if (profile?.household_id) {
    const { data } = await supabase.from('households').select('name, invite_code').eq('id', profile.household_id).single();
    householdName = data?.name ?? null;
    inviteCode = data?.invite_code ?? null;
  }

  return <ProfileClient profile={profile} householdName={householdName} inviteCode={inviteCode} />;
}
