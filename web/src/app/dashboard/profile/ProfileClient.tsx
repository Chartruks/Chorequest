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
    <div className="h-2 rounded-full overflow-hidden" style={{ background: '#2a1f14' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #d4791c, #c4a73e)' }} />
    </div>
  );
}

const ROLE_INFO: Record<string, { emoji: string; label: string; desc: string }> = {
  engineer:  { emoji: '🔧', label: 'Engineer',  desc: '+50% Energy from Maintenance tasks' },
  scout:     { emoji: '🥾', label: 'Scout',     desc: 'Scouting missions 30% faster' },
  medic:     { emoji: '💊', label: 'Medic',     desc: '+3 Morale/day passive' },
  trader:    { emoji: '💵', label: 'Trader',    desc: '+50% Money from Special tasks' },
  sentinel:  { emoji: '🔫', label: 'Sentinel',  desc: '+30% combat win rate' },
  scholar:   { emoji: '📚', label: 'Scholar',   desc: '+50% Knowledge from Learning tasks' },
};

const GAME_ROLES = Object.keys(ROLE_INFO);

export default function ProfileClient({ profile, householdName, inviteCode }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [setupName, setSetupName] = useState('');
  const [setupLeader, setSetupLeader] = useState(true);
  const [settingUp, setSettingUp] = useState(false);

  const [crewNameInput, setCrewNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-6xl mb-4">⚠️</span>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#e8d5b8' }}>Profile not found</h2>
        <p style={{ color: '#8a7a6a' }}>Try signing out and back in.</p>
      </div>
    );
  }

  const levelPoints = profile.points % 100;

  async function completeSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!setupName.trim()) return;
    setSettingUp(true);
    await supabase.from('profiles').update({ username: setupName.trim(), is_leader: setupLeader }).eq('id', profile!.id);
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
    if (error || !data) { setMsg(error?.message ?? 'Failed to create settlement.'); setLoading(false); return; }
    await supabase.from('profiles').update({ household_id: data.id, is_leader: true }).eq('id', profile!.id);
    setMsg(`✅ Settlement founded! Access code: ${code}`);
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
    if (error || !data) { setMsg('No settlement found with that access code.'); setLoading(false); return; }
    await supabase.from('profiles').update({ household_id: data.id }).eq('id', profile!.id);
    setMsg('✅ Settlement joined! Welcome aboard.');
    setLoading(false);
    router.refresh();
  }

  if (!profile.username) {
    return (
      <div className="max-w-lg">
        <div className="rounded-2xl p-8 border" style={{ background: '#1a1208', borderColor: '#d4791c' }}>
          <div className="text-center mb-6">
            <span className="text-6xl">🏚️</span>
            <h1 className="text-2xl font-black mt-3" style={{ color: '#e8d5b8' }}>Welcome, Survivor</h1>
            <p className="text-sm mt-1" style={{ color: '#8a7a6a' }}>Set up your identity before joining a settlement.</p>
          </div>
          <form onSubmit={completeSetup} className="space-y-4">
            <div>
              <label className="text-sm font-semibold block mb-2" style={{ color: '#8a7a6a' }}>Display Name</label>
              <input
                required
                placeholder="Survivor name (e.g. Asha, Rex, Nora)"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                className="w-full rounded-xl px-4 py-3 outline-none"
                style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }}
              />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2" style={{ color: '#8a7a6a' }}>Role in the Settlement</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSetupLeader(true)}
                  className="p-4 rounded-xl border-2 text-center transition-all"
                  style={{ borderColor: setupLeader ? '#d4791c' : '#2a1f14', background: setupLeader ? '#d4791c11' : 'transparent' }}
                >
                  <div className="text-3xl mb-1">🏛️</div>
                  <div className="font-bold text-sm" style={{ color: '#e8d5b8' }}>Leader</div>
                  <div className="text-xs mt-1" style={{ color: '#8a7a6a' }}>Found settlements, assign & ratify tasks</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSetupLeader(false)}
                  className="p-4 rounded-xl border-2 text-center transition-all"
                  style={{ borderColor: !setupLeader ? '#c4a73e' : '#2a1f14', background: !setupLeader ? '#c4a73e11' : 'transparent' }}
                >
                  <div className="text-3xl mb-1">🧍</div>
                  <div className="font-bold text-sm" style={{ color: '#e8d5b8' }}>Survivor</div>
                  <div className="text-xs mt-1" style={{ color: '#8a7a6a' }}>Accept tasks, earn credits & XP</div>
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={settingUp || !setupName.trim()}
              className="w-full py-3 rounded-xl font-bold disabled:opacity-60 mt-2"
              style={{ backgroundColor: '#d4791c', color: '#100d0a' }}
            >
              {settingUp ? 'Registering…' : 'Confirm Identity →'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const roleInfo = profile.role ? ROLE_INFO[profile.role] : null;

  return (
    <div className="max-w-lg space-y-6">
      {/* Survivor card */}
      <div className="rounded-2xl p-6 border text-center" style={{ background: '#1a1208', borderColor: '#d4791c' }}>
        <span className="text-7xl">{profile.is_leader ? '🏛️' : (roleInfo?.emoji ?? '🧍')}</span>
        <h2 className="text-3xl font-black mt-2" style={{ color: '#e8d5b8' }}>{profile.username}</h2>
        <p className="text-sm mt-1" style={{ color: '#8a7a6a' }}>
          {profile.is_leader ? 'Settlement Leader · Council' : (roleInfo ? `${roleInfo.label} · Survivor` : 'No role chosen')}
        </p>
        <div className="mt-4 flex justify-between text-sm mb-1" style={{ color: '#8a7a6a' }}>
          <span>Level {profile.level}</span>
          <span>{levelPoints} / 100 xp</span>
        </div>
        <XPBar current={levelPoints} max={100} />
        <div className="mt-4 flex justify-center gap-12">
          <div>
            <p className="text-2xl font-black" style={{ color: '#e8d5b8' }}>⭐ {profile.points}</p>
            <p className="text-xs mt-1" style={{ color: '#8a7a6a' }}>Credits</p>
          </div>
          <div>
            <p className="text-2xl font-black" style={{ color: '#c4a73e' }}>Lv.{profile.level}</p>
            <p className="text-xs mt-1" style={{ color: '#8a7a6a' }}>Level</p>
          </div>
        </div>
      </div>

      {/* Settlement */}
      <div className="rounded-2xl p-6 border" style={{ background: '#1a1208', borderColor: '#2a1f14' }}>
        <h3 className="font-bold text-lg mb-4" style={{ color: '#e8d5b8' }}>Settlement</h3>

        {msg && (
          <p className="mb-4 text-sm font-medium" style={{ color: msg.startsWith('✅') ? '#6b9a4a' : '#c04a2a' }}>
            {msg}
          </p>
        )}

        {profile.household_id ? (
          <div>
            <p className="font-semibold text-lg" style={{ color: '#e8d5b8' }}>🏚️ {householdName}</p>
            {inviteCode && (
              <div className="mt-3 p-3 rounded-xl" style={{ background: '#100d0a', border: '1px solid #2a1f14' }}>
                <p className="text-xs mb-1" style={{ color: '#8a7a6a' }}>Share this access code with your group:</p>
                <p className="font-mono font-black text-2xl tracking-widest text-center" style={{ color: '#d4791c' }}>{inviteCode}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <form onSubmit={createHousehold} className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: '#8a7a6a' }}>Found a new settlement</p>
              <input
                required
                placeholder="Settlement name (e.g. Ashen Keep)"
                value={crewNameInput}
                onChange={(e) => setCrewNameInput(e.target.value)}
                className="w-full rounded-xl px-4 py-3 outline-none"
                style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold disabled:opacity-60"
                style={{ backgroundColor: '#d4791c', color: '#100d0a' }}
              >
                {loading ? 'Founding…' : '🏚️ Found Settlement'}
              </button>
            </form>

            <div style={{ borderTop: '1px solid #2a1f14', paddingTop: '1.25rem' }}>
              <form onSubmit={joinHousehold} className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: '#8a7a6a' }}>Join with access code</p>
                <input
                  required
                  placeholder="6-character code"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full rounded-xl px-4 py-3 outline-none font-mono tracking-widest text-center uppercase text-lg"
                  style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold border disabled:opacity-60"
                  style={{ borderColor: '#c4a73e', color: '#c4a73e' }}
                >
                  {loading ? 'Connecting…' : 'Join Settlement'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
