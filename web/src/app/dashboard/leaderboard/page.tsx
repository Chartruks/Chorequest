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
        <span className="text-6xl mb-4">🏅</span>
        <h2 className="text-2xl font-bold mb-2 text-white">No Household Yet</h2>
        <p style={{ color: '#888' }}>Join a household to see the leaderboard.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-6" style={{ color: '#FFD700' }}>🏆 Hero Rankings</h1>

      <div className="space-y-3 max-w-xl">
        {members.map((member, i) => {
          const isMe = member.id === profile.id;
          return (
            <div
              key={member.id}
              className="flex items-center gap-4 rounded-2xl p-4 border"
              style={{ background: '#16213e', borderColor: isMe ? '#FFD700' : '#2a2a5a' }}
            >
              <span className="text-3xl w-10 text-center">{MEDALS[i] ?? `#${i + 1}`}</span>
              <div className="flex-1">
                <p className="font-bold text-white">{member.username ?? 'Hero'}{isMe && <span className="ml-2 text-xs" style={{ color: '#FFD700' }}>(you)</span>}</p>
                <p className="text-xs mt-0.5" style={{ color: '#888' }}>{member.role === 'parent' ? '👑 Parent' : '⚡ Child'}</p>
              </div>
              <div className="text-right">
                <p className="font-bold" style={{ color: '#4FC3F7' }}>Lv. {member.level}</p>
                <p className="font-bold text-lg" style={{ color: '#FFD700' }}>⭐ {member.points}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
