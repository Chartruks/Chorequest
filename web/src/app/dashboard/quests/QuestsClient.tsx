'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Chore = Database['public']['Tables']['chores']['Row'];

const STATUS_COLORS: Record<Chore['status'], string> = {
  pending: '#00e5ff',
  in_progress: '#bf5af2',
  completed: '#30d158',
  approved: '#0abe6a',
};

const STATUS_LABELS: Record<Chore['status'], string> = {
  pending: 'Open',
  in_progress: 'In Progress',
  completed: 'Done ✓',
  approved: 'Authorized ★',
};

interface Props {
  profile: Profile | null;
  initialChores: Chore[];
}

export default function QuestsClient({ profile, initialChores }: Props) {
  const router = useRouter();
  const [chores, setChores] = useState(initialChores);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(10);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  async function refresh() {
    if (!profile?.household_id) return;
    const { data } = await supabase
      .from('chores')
      .select('*')
      .eq('household_id', profile.household_id)
      .order('created_at', { ascending: false });
    setChores(data ?? []);
  }

  async function addChore(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.household_id) return;
    setSaving(true);
    await supabase.from('chores').insert({
      household_id: profile.household_id,
      title,
      description: description || null,
      points_reward: points,
      created_by: profile.id,
    });
    setTitle(''); setDescription(''); setPoints(10); setShowForm(false);
    await refresh();
    setSaving(false);
  }

  async function claimChore(id: string) {
    await supabase.from('chores').update({ assigned_to: profile!.id, status: 'in_progress' }).eq('id', id);
    await refresh();
  }

  async function completeChore(id: string) {
    await supabase.from('chores').update({ status: 'completed' }).eq('id', id);
    await refresh();
  }

  async function approveChore(chore: Chore) {
    await supabase.from('chores').update({ status: 'approved' }).eq('id', chore.id);
    if (chore.assigned_to) {
      const { data: p } = await supabase.from('profiles').select('points, level').eq('id', chore.assigned_to).single();
      if (p) {
        const newPoints = p.points + chore.points_reward;
        const newLevel = Math.floor(newPoints / 100) + 1;
        await supabase.from('profiles').update({ points: newPoints, level: newLevel }).eq('id', chore.assigned_to);
      }
    }
    await refresh();
    router.refresh();
  }

  if (!profile?.household_id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-6xl mb-4">🛸</span>
        <h2 className="text-2xl font-bold mb-2 text-white">No Crew Yet</h2>
        <p style={{ color: '#6b6b8a' }}>Go to your <a href="/dashboard/profile" className="underline" style={{ color: '#00e5ff' }}>Agent profile</a> to create or join a crew.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black" style={{ color: '#00e5ff' }}>🚀 Missions</h1>
          <p className="text-sm mt-1" style={{ color: '#6b6b8a' }}>{chores.filter(c => c.status === 'pending').length} open missions</p>
        </div>
        {profile.role === 'parent' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-xl font-bold transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#00e5ff', color: '#05050f' }}
          >
            + New Mission
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={addChore} className="rounded-2xl p-6 mb-6 border space-y-3" style={{ background: '#0d0d1f', borderColor: '#00e5ff' }}>
          <h3 className="font-bold text-white">New Mission</h3>
          <input
            required
            placeholder="Mission title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-white outline-none"
            style={{ background: '#05050f', border: '1px solid #1e1e3f' }}
          />
          <input
            placeholder="Briefing (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-white outline-none"
            style={{ background: '#05050f', border: '1px solid #1e1e3f' }}
          />
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium" style={{ color: '#8e8ea0' }}>Credit reward:</label>
            <input
              type="number"
              min={1}
              max={500}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-24 rounded-xl px-3 py-2 text-white outline-none text-center"
              style={{ background: '#05050f', border: '1px solid #1e1e3f' }}
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl font-bold disabled:opacity-60" style={{ backgroundColor: '#00e5ff', color: '#05050f' }}>
              {saving ? 'Transmitting…' : 'Deploy Mission'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-xl font-bold border" style={{ borderColor: '#1e1e3f', color: '#8e8ea0' }}>
              Abort
            </button>
          </div>
        </form>
      )}

      {chores.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <span className="text-6xl mb-4">📡</span>
          <p className="text-xl font-bold text-white mb-2">No missions yet</p>
          {profile.role === 'parent' && <p style={{ color: '#6b6b8a' }}>Click &quot;New Mission&quot; to deploy the first one.</p>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chores.map((chore) => (
            <div key={chore.id} className="rounded-2xl p-5 border" style={{ background: '#0d0d1f', borderColor: '#1e1e3f' }}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-white text-lg flex-1 mr-2">{chore.title}</h3>
                <span className="text-xs font-bold px-2 py-1 rounded-lg shrink-0" style={{ background: STATUS_COLORS[chore.status] + '22', color: STATUS_COLORS[chore.status] }}>
                  {STATUS_LABELS[chore.status]}
                </span>
              </div>
              {chore.description && <p className="text-sm mb-3" style={{ color: '#6b6b8a' }}>{chore.description}</p>}
              <div className="flex items-center justify-between mt-3">
                <span className="font-bold" style={{ color: '#00e5ff' }}>⭐ {chore.points_reward} cr</span>
                {chore.status === 'pending' && profile.role === 'child' && (
                  <button onClick={() => claimChore(chore.id)} className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ backgroundColor: '#00e5ff', color: '#05050f' }}>Accept</button>
                )}
                {chore.status === 'in_progress' && chore.assigned_to === profile.id && (
                  <button onClick={() => completeChore(chore.id)} className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ backgroundColor: '#30d158', color: '#05050f' }}>Report Done</button>
                )}
                {chore.status === 'completed' && profile.role === 'parent' && (
                  <button onClick={() => approveChore(chore)} className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ backgroundColor: '#0abe6a', color: '#05050f' }}>Authorize ★</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
