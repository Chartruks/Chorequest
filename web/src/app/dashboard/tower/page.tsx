import { createClient } from '@/lib/supabase/server';

export default async function TowerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  let members: any[] = [];
  let floors: any[] = [];

  if (profile?.household_id) {
    const [{ data: m }, { data: f }] = await Promise.all([
      supabase.from('profiles').select('*')
        .eq('household_id', profile.household_id)
        .order('tower_floor', { ascending: false }),
      supabase.from('tower_floors').select('*').order('floor'),
    ]);
    members = m ?? [];
    floors  = f ?? [];
  }

  const floorMap = Object.fromEntries(floors.map((f: any) => [f.floor, f]));

  return (
    <div>
      <h1 className="text-3xl font-black mb-1" style={{ color: '#d4791c' }}>🏰 Tower</h1>
      <p className="text-sm mb-6" style={{ color: '#8a7a6a' }}>Track your crew&apos;s progress through the tower.</p>

      {members.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <span className="text-6xl mb-4">🏚️</span>
          <p className="text-xl font-bold" style={{ color: '#e8d5b8' }}>No crew yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m: any) => {
            const floor = floorMap[m.tower_floor];
            const monsterPct = floor ? m.monster_hp / floor.monster_max_hp : 0;
            const hpPct = m.player_hp / Math.max(1, m.player_max_hp);
            const isMe = m.id === profile?.id;
            return (
              <div
                key={m.id}
                className="rounded-2xl p-5 border"
                style={{
                  background: '#1a1208',
                  borderColor: isMe ? '#d4791c' : '#2a1f14',
                }}
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{m.is_leader ? '🏛️' : '🧍'}</span>
                  <div className="flex-1">
                    <div className="font-bold" style={{ color: '#e8d5b8' }}>
                      {m.username ?? 'Survivor'}{isMe ? ' (you)' : ''}
                    </div>
                    <div className="text-xs" style={{ color: '#8a7a6a' }}>Lv.{m.level}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black" style={{ color: '#d4791c' }}>{m.tower_floor}</div>
                    <div className="text-xs" style={{ color: '#8a7a6a' }}>floor</div>
                  </div>
                </div>

                {/* Monster */}
                {floor && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{floor.monster_emoji}</span>
                      <span className="text-sm font-semibold" style={{ color: '#e8d5b8' }}>{floor.monster_name}</span>
                    </div>
                    <div className="flex justify-between text-xs mb-1" style={{ color: '#8a7a6a' }}>
                      <span>Monster HP</span>
                      <span>{m.monster_hp} / {floor.monster_max_hp}</span>
                    </div>
                    <div className="h-2 rounded-full mb-3" style={{ background: '#2a1f14' }}>
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${Math.max(0, monsterPct * 100)}%`,
                          background: monsterPct > 0.5 ? '#6b9a4a' : monsterPct > 0.25 ? '#c4a73e' : '#c0392b',
                        }}
                      />
                    </div>
                  </>
                )}

                {/* Player HP */}
                <div className="flex justify-between text-xs mb-1" style={{ color: '#8a7a6a' }}>
                  <span>HP</span>
                  <span>{m.player_hp} / {m.player_max_hp}</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: '#2a1f14' }}>
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${Math.max(0, hpPct * 100)}%`, background: '#4a8a5e' }}
                  />
                </div>

                {/* Money */}
                <div className="mt-3 flex gap-3 text-xs" style={{ color: '#8a7a6a' }}>
                  <span>💰 {m.points}</span>
                  <span>⭐ {m.xp} xp</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
