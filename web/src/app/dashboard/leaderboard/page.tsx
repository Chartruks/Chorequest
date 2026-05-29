import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

const MEDALS = ['🥇', '🥈', '🥉'];

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  let members: Profile[] = [];
  if (profile?.household_id) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('household_id', profile.household_id)
      .order('points', { ascending: false });
    members = data ?? [];
  }

  if (!profile?.household_id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-6xl mb-4">🏆</span>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#e8d5b8' }}>No Settlement Yet</h2>
        <p style={{ color: '#8a7a6a' }}>Join a settlement to see the rankings.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-6" style={{ color: '#d4791c' }}>🏆 Survivor Ranks</h1>

      <div className="space-y-3 max-w-xl">
        {members.map((member, i) => {
          const isMe = member.id === profile.id;
          return (
            <div
              key={member.id}
              className="flex items-center gap-4 rounded-2xl p-4 border"
              style={{ background: '#1a1208', borderColor: isMe ? '#d4791c' : '#2a1f14' }}
            >
              <span className="text-3xl w-10 text-center">{MEDALS[i] ?? `#${i + 1}`}</span>
              <div className="flex-1">
                <p className="font-bold" style={{ color: '#e8d5b8' }}>
                  {member.username ?? 'Survivor'}
                  {isMe && <span className="ml-2 text-xs" style={{ color: '#d4791c' }}>(you)</span>}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#8a7a6a' }}>
                  {member.is_leader ? '🏛️ Leader' : '🧍 Survivor'}
                  {member.role ? ` · ${member.role.charAt(0).toUpperCase() + member.role.slice(1)}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold" style={{ color: '#c4a73e' }}>Lv. {member.level}</p>
                <p className="font-bold text-lg" style={{ color: '#d4791c' }}>⭐ {member.points}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
