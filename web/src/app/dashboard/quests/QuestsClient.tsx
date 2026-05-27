'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Chore = Database['public']['Tables']['chores']['Row'];

const STATUS_COLORS: Record<Chore['status'], string> = {
  pending: '#FFD700',
  in_progress: '#4FC3F7',
  completed: '#81C784',
  approved: '#A5D6A7',
};

const STATUS_LABELS: Record<Chore['status'], string> = {
  pending: 'Open',
  in_progress: 'In Progress',
  completed: 'Done ✓',
  approved: 'Approved ★',
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
        <span className="text-6xl mb-4">🏰</span>
        <h2 className="text-2xl font-bold mb-2 text-white">No Household Yet</h2>
        <p style={{ color: '#888' }}>Go to your <a href="/dashboard/profile" className="underline" style={{ color: '#FFD700' }}>Hero profile</a> to create or join a household.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black" style={{ color: '#FFD700' }}>⚔️ Quests</h1>
          <p className="text-sm mt-1" style={{ color: '#888' }}>{chores.filter(c => c.status === 'pending').length} open quests</p>
        </div>
        {profile.role === 'parent' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-xl font-bold transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#FFD700', color: '#1a1a2e' }}
          >
            + Add Quest
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={addChore} className="rounded-2xl p-6 mb-6 border space-y-3" style={{ background: '#16213e', borderColor: '#FFD700' }}>
          <h3 className="font-bold text-white">New Quest</h3>
          <input
            required
            placeholder="Quest title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-white outline-none"
            style={{ background: '#1a1a2e', border: '1px solid #2a2a5a' }}
          />
          <input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-white outline-none"
            style={{ background: '#1a1a2e', border: '1px solid #2a2a5a' }}
          />
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium" style={{ color: '#aaa' }}>Points reward:</label>
            <input
              type="number"
              min={1}
              max={500}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-24 rounded-xl px-3 py-2 text-white outline-none text-center"
              style={{ background: '#1a1a2e', border: '1px solid #2a2a5a' }}
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl font-bold disabled:opacity-60" style={{ backgroundColor: '#FFD700', color: '#1a1a2e' }}>
              {saving ? 'Saving…' : 'Create Quest'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-xl font-bold border" style={{ borderColor: '#2a2a5a', color: '#aaa' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {chores.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <span className="text-6xl mb-4">📜</span>
          <p className="text-xl font-bold text-white mb-2">No quests yet</p>
          {profile.role === 'parent' && <p style={{ color: '#888' }}>Click &quot;Add Quest&quot; to create the first one.</p>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chores.map((chore) => (
            <div key={chore.id} className="rounded-2xl p-5 border" style={{ background: '#16213e', borderColor: '#2a2a5a' }}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-white text-lg flex-1 mr-2">{chore.title}</h3>
                <span className="text-xs font-bold px-2 py-1 rounded-lg shrink-0" style={{ background: STATUS_COLORS[chore.status] + '22', color: STATUS_COLORS[chore.status] }}>
                  {STATUS_LABELS[chore.status]}
                </span>
              </div>
              {chore.description && <p className="text-sm mb-3" style={{ color: '#888' }}>{chore.description}</p>}
              <div className="flex items-center justify-between mt-3">
                <span className="font-bold" style={{ color: '#FFD700' }}>⭐ {chore.points_reward} pts</span>
                {chore.status === 'pending' && profile.role === 'child' && (
                  <button onClick={() => claimChore(chore.id)} className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ backgroundColor: '#FFD700', color: '#1a1a2e' }}>Claim</button>
                )}
                {chore.status === 'in_progress' && chore.assigned_to === profile.id && (
                  <button onClick={() => completeChore(chore.id)} className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ backgroundColor: '#81C784', color: '#1a1a2e' }}>Complete</button>
                )}
                {chore.status === 'completed' && profile.role === 'parent' && (
                  <button onClick={() => approveChore(chore)} className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ backgroundColor: '#A5D6A7', color: '#1a1a2e' }}>Approve ★</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
