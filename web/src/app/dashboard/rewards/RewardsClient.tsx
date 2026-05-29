'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Reward = Database['public']['Tables']['rewards']['Row'];

interface Props {
  profile: Profile | null;
  initialRewards: Reward[];
}

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
    const { data } = await supabase.from('rewards').select('*')
      .eq('household_id', profile.household_id).order('points_cost');
    setRewards(data ?? []);
  }

  async function addReward(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.household_id) return;
    setSaving(true);
    await supabase.from('rewards').insert({
      household_id: profile.household_id,
      title,
      description: description || null,
      points_cost: cost,
      created_by: profile.id,
      reward_type: 'real_world',
    });
    setTitle(''); setDescription(''); setCost(50);
    setShowForm(false);
    await refresh();
    setSaving(false);
  }

  async function redeemReward(reward: Reward) {
    if (!profile || profile.points < reward.points_cost) return;
    setRedeeming(reward.id);
    await supabase.from('profiles').update({ points: profile.points - reward.points_cost }).eq('id', profile.id);
    setRedeeming(null);
    router.refresh();
    alert(`🎉 Reward claimed: "${reward.title}"! Show this to your Leader.`);
  }

  if (!profile?.household_id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-6xl mb-4">🎁</span>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#e8d5b8' }}>No Settlement Yet</h2>
        <p style={{ color: '#8a7a6a' }}>Join a settlement to see rewards.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black" style={{ color: '#d4791c' }}>🎁 Rewards</h1>
          <p className="text-sm mt-1" style={{ color: '#8a7a6a' }}>Balance: 💰 {profile.points}</p>
        </div>
        {profile.is_leader && (
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-xl font-bold"
            style={{ backgroundColor: '#d4791c', color: '#100d0a' }}>
            + Add Reward
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={addReward} className="rounded-2xl p-6 mb-6 border space-y-3" style={{ background: '#1a1208', borderColor: '#d4791c' }}>
          <h3 className="font-bold" style={{ color: '#e8d5b8' }}>New Reward</h3>
          <input required placeholder="Reward name" value={title} onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl px-4 py-3 outline-none"
            style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
          <input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)}
            className="w-full rounded-xl px-4 py-3 outline-none"
            style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium" style={{ color: '#8a7a6a' }}>💰 Cost:</label>
            <input type="number" min={1} max={9999} value={cost} onChange={e => setCost(Number(e.target.value))}
              className="w-24 rounded-xl px-3 py-2 outline-none text-center"
              style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="px-6 py-2 rounded-xl font-bold disabled:opacity-60"
              style={{ backgroundColor: '#d4791c', color: '#100d0a' }}>
              {saving ? 'Saving…' : 'Add Reward'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-6 py-2 rounded-xl font-bold border"
              style={{ borderColor: '#2a1f14', color: '#8a7a6a' }}>Cancel</button>
          </div>
        </form>
      )}

      {rewards.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <span className="text-6xl mb-4">🎁</span>
          <p className="text-xl font-bold mb-2" style={{ color: '#e8d5b8' }}>No rewards yet</p>
          {profile.is_leader && <p style={{ color: '#8a7a6a' }}>Add rewards for your survivors to spend money on.</p>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map(reward => {
            const canAfford = profile.points >= reward.points_cost;
            return (
              <div key={reward.id}
                className="rounded-2xl p-5 border flex flex-col"
                style={{ background: '#1a1208', borderColor: '#2a1f14', opacity: !canAfford && !profile.is_leader ? 0.6 : 1 }}>
                <h3 className="font-bold text-lg mb-1" style={{ color: '#e8d5b8' }}>{reward.title}</h3>
                {reward.description && <p className="text-sm mb-2 flex-1" style={{ color: '#8a7a6a' }}>{reward.description}</p>}
                <div className="flex items-center justify-between mt-auto pt-3">
                  <span className="font-bold text-lg" style={{ color: canAfford ? '#d4791c' : '#5a4a3a' }}>
                    💰 {reward.points_cost}
                  </span>
                  {!profile.is_leader && (
                    <button
                      onClick={() => redeemReward(reward)}
                      disabled={!canAfford || redeeming === reward.id}
                      className="px-3 py-1.5 rounded-lg text-sm font-bold disabled:opacity-50"
                      style={{ backgroundColor: canAfford ? '#d4791c' : '#2a1f14', color: canAfford ? '#100d0a' : '#5a4a3a' }}>
                      {redeeming === reward.id ? '…' : canAfford ? 'Claim' : '🔒'}
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
