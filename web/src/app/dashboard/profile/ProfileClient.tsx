'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface Props { profile: Profile | null; householdName: string | null; inviteCode: string | null; }

function XPBar({ current, max }: { current: number; max: number }) {
  const pct = Math.min((current / max) * 100, 100);
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1e1e3f' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #00e5ff, #bf5af2)' }} />
    </div>
  );
}

export default function ProfileClient({ profile, householdName, inviteCode }: Props) {
  const router = useRouter();
  const [crewNameInput, setCrewNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const supabase = createClient();
  const levelPoints = profile ? profile.points % 100 : 0;

  async function createHousehold(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !crewNameInput.trim()) return;
    setLoading(true); setMsg('');
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase.from('households').insert({ name: crewNameInput.trim(), invite_code: code, created_by: profile.id }).select().single();
    if (error) { setMsg(error.message); setLoading(false); return; }
    await supabase.from('profiles').update({ household_id: data.id }).eq('id', profile.id);
    setMsg(`✅ Crew established! Access code: ${code}`);
    setLoading(false);
    router.refresh();
  }

  async function joinHousehold(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !codeInput.trim()) return;
    setLoading(true); setMsg('');
    const { data, error } = await supabase.from('households').select('id').eq('invite_code', codeInput.trim().toUpperCase()).single();
    if (error || !data) { setMsg('No crew found with that access code.'); setLoading(false); return; }
    await supabase.from('profiles').update({ household_id: data.id }).eq('id', profile.id);
    setMsg('✅ Crew joined! Welcome aboard.');
    setLoading(false);
    router.refresh();
  }

  if (!profile) return null;

  return (
    <div className="max-w-lg space-y-6">
      {/* Agent card */}
      <div className="rounded-2xl p-6 border text-center" style={{ background: '#0d0d1f', borderColor: '#00e5ff' }}>
        <span className="text-7xl">{profile.role === 'parent' ? '👩‍✈️' : '🤖'}</span>
        <h2 className="text-3xl font-black mt-2 text-white">{profile.username ?? 'Agent'}</h2>
        <p className="text-sm mt-1" style={{ color: '#6b6b8a' }}>{profile.role === 'parent' ? 'Commander · Mission Control' : 'Cadet · Field Agent'}</p>

        <div className="mt-4 flex justify-between text-sm mb-1" style={{ color: '#8e8ea0' }}>
          <span>Level {profile.level}</span>
          <span>{levelPoints} / 100 xp</span>
        </div>
        <XPBar current={levelPoints} max={100} />

        <div className="mt-4 flex justify-center gap-12">
          <div>
            <p className="text-2xl font-black text-white">⭐ {profile.points}</p>
            <p className="text-xs mt-1" style={{ color: '#6b6b8a' }}>Credits</p>
          </div>
          <div>
            <p className="text-2xl font-black" style={{ color: '#bf5af2' }}>⚡ {profile.level}</p>
            <p className="text-xs mt-1" style={{ color: '#6b6b8a' }}>Level</p>
          </div>
        </div>
      </div>

      {/* Crew */}
      <div className="rounded-2xl p-6 border" style={{ background: '#0d0d1f', borderColor: '#1e1e3f' }}>
        <h3 className="font-bold text-white text-lg mb-4">Crew</h3>

        {msg && <p className="mb-4 text-sm font-medium" style={{ color: msg.startsWith('✅') ? '#30d158' : '#ff6961' }}>{msg}</p>}

        {profile.household_id ? (
          <div>
            <p className="text-white font-semibold">🛸 {householdName}</p>
            {inviteCode && (
              <p className="mt-2 text-sm" style={{ color: '#6b6b8a' }}>
                Access code: <span className="font-mono font-bold" style={{ color: '#00e5ff' }}>{inviteCode}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {profile.role === 'parent' && (
              <form onSubmit={createHousehold} className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: '#8e8ea0' }}>Establish a new crew</p>
                <input required placeholder="Crew name" value={crewNameInput} onChange={(e) => setCrewNameInput(e.target.value)} className="w-full rounded-xl px-4 py-3 text-white outline-none" style={{ background: '#05050f', border: '1px solid #1e1e3f' }} />
                <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold disabled:opacity-60" style={{ backgroundColor: '#00e5ff', color: '#05050f' }}>Establish Crew</button>
              </form>
            )}
            <form onSubmit={joinHousehold} className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: '#8e8ea0' }}>Join with access code</p>
              <input required placeholder="6-character code" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} maxLength={6} className="w-full rounded-xl px-4 py-3 text-white outline-none font-mono tracking-widest text-center uppercase" style={{ background: '#05050f', border: '1px solid #1e1e3f' }} />
              <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold border disabled:opacity-60" style={{ borderColor: '#bf5af2', color: '#bf5af2' }}>Join Crew</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
