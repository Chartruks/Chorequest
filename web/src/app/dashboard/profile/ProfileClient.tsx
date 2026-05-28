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
  const supabase = createClient();

  // Onboarding state
  const [setupName, setSetupName] = useState('');
  const [setupRole, setSetupRole] = useState<'parent' | 'child'>('parent');
  const [settingUp, setSettingUp] = useState(false);

  // Crew state
  const [crewNameInput, setCrewNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-6xl mb-4">⚠️</span>
        <h2 className="text-2xl font-bold mb-2 text-white">Profile not found</h2>
        <p style={{ color: '#6b6b8a' }}>Try signing out and back in.</p>
      </div>
    );
  }

  const levelPoints = profile.points % 100;

  async function completeSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!setupName.trim()) return;
    setSettingUp(true);
    await supabase.from('profiles').update({ username: setupName.trim(), role: setupRole }).eq('id', profile!.id);
    setSettingUp(false);
    router.refresh();
  }

  async function createHousehold(e: React.FormEvent) {
    e.preventDefault();
    if (!crewNameInput.trim()) return;
    setLoading(true); setMsg('');
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase
      .from('households')
      .insert({ name: crewNameInput.trim(), invite_code: code, created_by: profile!.id })
      .select()
      .single();
    if (error || !data) { setMsg(error?.message ?? 'Failed to create crew.'); setLoading(false); return; }
    await supabase.from('profiles').update({ household_id: data.id }).eq('id', profile!.id);
    setMsg(`✅ Crew established! Access code: ${code}`);
    setLoading(false);
    router.refresh();
  }

  async function joinHousehold(e: React.FormEvent) {
    e.preventDefault();
    if (!codeInput.trim()) return;
    setLoading(true); setMsg('');
    const { data, error } = await supabase
      .from('households')
      .select('id')
      .eq('invite_code', codeInput.trim().toUpperCase())
      .single();
    if (error || !data) { setMsg('No crew found with that access code.'); setLoading(false); return; }
    await supabase.from('profiles').update({ household_id: data.id }).eq('id', profile!.id);
    setMsg('✅ Crew joined! Welcome aboard.');
    setLoading(false);
    router.refresh();
  }

  // Show onboarding if no username set yet
  if (!profile.username) {
    return (
      <div className="max-w-lg">
        <div className="rounded-2xl p-8 border" style={{ background: '#0d0d1f', borderColor: '#00e5ff' }}>
          <div className="text-center mb-6">
            <span className="text-6xl">🛸</span>
            <h1 className="text-2xl font-black mt-3 text-white">Welcome, Agent</h1>
            <p className="text-sm mt-1" style={{ color: '#6b6b8a' }}>Set up your identity before joining the crew.</p>
          </div>
          <form onSubmit={completeSetup} className="space-y-4">
            <div>
              <label className="text-sm font-semibold block mb-2" style={{ color: '#8e8ea0' }}>Display Name</label>
              <input
                required
                placeholder="Call sign (e.g. Nova, Vega, Ghost)"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-white outline-none"
                style={{ background: '#05050f', border: '1px solid #1e1e3f' }}
              />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2" style={{ color: '#8e8ea0' }}>Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSetupRole('parent')}
                  className="p-4 rounded-xl border-2 text-center transition-all"
                  style={{ borderColor: setupRole === 'parent' ? '#00e5ff' : '#1e1e3f', background: setupRole === 'parent' ? '#00e5ff11' : 'transparent' }}
                >
                  <div className="text-3xl mb-1">👩‍✈️</div>
                  <div className="font-bold text-white text-sm">Commander</div>
                  <div className="text-xs mt-1" style={{ color: '#6b6b8a' }}>Create crews, assign & approve missions</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSetupRole('child')}
                  className="p-4 rounded-xl border-2 text-center transition-all"
                  style={{ borderColor: setupRole === 'child' ? '#bf5af2' : '#1e1e3f', background: setupRole === 'child' ? '#bf5af211' : 'transparent' }}
                >
                  <div className="text-3xl mb-1">🤖</div>
                  <div className="font-bold text-white text-sm">Cadet</div>
                  <div className="text-xs mt-1" style={{ color: '#6b6b8a' }}>Accept missions, earn credits & XP</div>
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={settingUp || !setupName.trim()}
              className="w-full py-3 rounded-xl font-bold disabled:opacity-60 mt-2"
              style={{ backgroundColor: '#00e5ff', color: '#05050f' }}
            >
              {settingUp ? 'Transmitting…' : 'Confirm Identity →'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Agent card */}
      <div className="rounded-2xl p-6 border text-center" style={{ background: '#0d0d1f', borderColor: '#00e5ff' }}>
        <span className="text-7xl">{profile.role === 'parent' ? '👩‍✈️' : '🤖'}</span>
        <h2 className="text-3xl font-black mt-2 text-white">{profile.username}</h2>
        <p className="text-sm mt-1" style={{ color: '#6b6b8a' }}>
          {profile.role === 'parent' ? 'Commander · Mission Control' : 'Cadet · Field Agent'}
        </p>
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
            <p className="text-2xl font-black" style={{ color: '#bf5af2' }}>Lv.{profile.level}</p>
            <p className="text-xs mt-1" style={{ color: '#6b6b8a' }}>Level</p>
          </div>
        </div>
      </div>

      {/* Crew */}
      <div className="rounded-2xl p-6 border" style={{ background: '#0d0d1f', borderColor: '#1e1e3f' }}>
        <h3 className="font-bold text-white text-lg mb-4">Crew</h3>

        {msg && (
          <p className="mb-4 text-sm font-medium" style={{ color: msg.startsWith('✅') ? '#30d158' : '#ff6961' }}>
            {msg}
          </p>
        )}

        {profile.household_id ? (
          <div>
            <p className="text-white font-semibold text-lg">🛸 {householdName}</p>
            {inviteCode && (
              <div className="mt-3 p-3 rounded-xl" style={{ background: '#05050f', border: '1px solid #1e1e3f' }}>
                <p className="text-xs mb-1" style={{ color: '#6b6b8a' }}>Share this access code with your crew:</p>
                <p className="font-mono font-black text-2xl tracking-widest text-center" style={{ color: '#00e5ff' }}>{inviteCode}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {profile.role === 'parent' && (
              <form onSubmit={createHousehold} className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: '#8e8ea0' }}>Establish a new crew</p>
                <input
                  required
                  placeholder="Crew name (e.g. House Nova)"
                  value={crewNameInput}
                  onChange={(e) => setCrewNameInput(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-white outline-none"
                  style={{ background: '#05050f', border: '1px solid #1e1e3f' }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold disabled:opacity-60"
                  style={{ backgroundColor: '#00e5ff', color: '#05050f' }}
                >
                  {loading ? 'Establishing…' : '🚀 Establish Crew'}
                </button>
              </form>
            )}

            <div style={{ borderTop: '1px solid #1e1e3f', paddingTop: '1.25rem' }}>
              <form onSubmit={joinHousehold} className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: '#8e8ea0' }}>Join with access code</p>
                <input
                  required
                  placeholder="6-character code"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full rounded-xl px-4 py-3 text-white outline-none font-mono tracking-widest text-center uppercase text-lg"
                  style={{ background: '#05050f', border: '1px solid #1e1e3f' }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold border disabled:opacity-60"
                  style={{ borderColor: '#bf5af2', color: '#bf5af2' }}
                >
                  {loading ? 'Connecting…' : 'Join Crew'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
