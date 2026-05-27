'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Reward = Database['public']['Tables']['rewards']['Row'];

interface Props { profile: Profile | null; initialRewards: Reward[]; }

export default function RewardsClient({ profile, initialRewards }: Props) {
  const router = useRouter();
  const [rewards, setRewards] = useState(initialRewards);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState(50);
  const [saving, setSaving] = useState(false);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const supabase = createClient();

  async function refresh() {
    if (!profile?.household_id) return;
    const { data } = await supabase.from('rewards').select('*').eq('household_id', profile.household_id).order('points_cost');
    setRewards(data ?? []);
  }

  async function addReward(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.household_id) return;
    setSaving(true);
    await supabase.from('rewards').insert({ household_id: profile.household_id, title, description: description || null, points_cost: cost, created_by: profile.id });
    setTitle(''); setDescription(''); setCost(50); setShowForm(false);
    await refresh();
    setSaving(false);
  }

  async function redeemReward(reward: Reward) {
    if (!profile || profile.points < reward.points_cost) return;
    setRedeeming(reward.id);
    await supabase.from('profiles').update({ points: profile.points - reward.points_cost }).eq('id', profile.id);
    setRedeeming(null);
    router.refresh();
    alert(`🎉 Redeemed "${reward.title}"! Show this to a parent.`);
  }

  if (!profile?.household_id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-6xl mb-4">🎀</span>
        <h2 className="text-2xl font-bold mb-2 text-white">No Household Yet</h2>
        <p style={{ color: '#888' }}>Join a household to see rewards.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black" style={{ color: '#FFD700' }}>🎁 Rewards</h1>
          <p className="text-sm mt-1" style={{ color: '#FFD700' }}>You have ⭐ {profile.points} points</p>
        </div>
        {profile.role === 'parent' && (
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl font-bold" style={{ backgroundColor: '#FFD700', color: '#1a1a2e' }}>
            + Add Reward
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={addReward} className="rounded-2xl p-6 mb-6 border space-y-3" style={{ background: '#16213e', borderColor: '#FFD700' }}>
          <h3 className="font-bold text-white">New Reward</h3>
          <input required placeholder="Reward title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl px-4 py-3 text-white outline-none" style={{ background: '#1a1a2e', border: '1px solid #2a2a5a' }} />
          <input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl px-4 py-3 text-white outline-none" style={{ background: '#1a1a2e', border: '1px solid #2a2a5a' }} />
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium" style={{ color: '#aaa' }}>Points cost:</label>
            <input type="number" min={1} max={9999} value={cost} onChange={(e) => setCost(Number(e.target.value))} className="w-24 rounded-xl px-3 py-2 text-white outline-none text-center" style={{ background: '#1a1a2e', border: '1px solid #2a2a5a' }} />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl font-bold disabled:opacity-60" style={{ backgroundColor: '#FFD700', color: '#1a1a2e' }}>{saving ? 'Saving…' : 'Create Reward'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-xl font-bold border" style={{ borderColor: '#2a2a5a', color: '#aaa' }}>Cancel</button>
          </div>
        </form>
      )}

      {rewards.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <span className="text-6xl mb-4">🎀</span>
          <p className="text-xl font-bold text-white mb-2">No rewards yet</p>
          {profile.role === 'parent' && <p style={{ color: '#888' }}>Add rewards for your heroes to spend points on.</p>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map((reward) => {
            const canAfford = profile.points >= reward.points_cost;
            return (
              <div key={reward.id} className="rounded-2xl p-5 border flex flex-col" style={{ background: '#16213e', borderColor: '#2a2a5a', opacity: !canAfford && profile.role === 'child' ? 0.6 : 1 }}>
                <h3 className="font-bold text-white text-lg mb-1">{reward.title}</h3>
                {reward.description && <p className="text-sm mb-3 flex-1" style={{ color: '#888' }}>{reward.description}</p>}
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-bold text-lg" style={{ color: canAfford ? '#FFD700' : '#888' }}>⭐ {reward.points_cost}</span>
                  {profile.role === 'child' && (
                    <button
                      onClick={() => redeemReward(reward)}
                      disabled={!canAfford || redeeming === reward.id}
                      className="px-3 py-1.5 rounded-lg text-sm font-bold disabled:opacity-50"
                      style={{ backgroundColor: canAfford ? '#FFD700' : '#333', color: canAfford ? '#1a1a2e' : '#666' }}
                    >
                      {redeeming === reward.id ? '…' : canAfford ? 'Redeem' : '🔒'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
