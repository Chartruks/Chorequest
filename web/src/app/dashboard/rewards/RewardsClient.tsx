'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Reward = Database['public']['Tables']['rewards']['Row'];
type GameState = Database['public']['Tables']['game_state']['Row'];

type InGameBonus = { type: 'morale_boost'; amount: number } | { type: 'instant_resources'; energy?: number; knowledge?: number; money?: number };

interface Props {
  profile: Profile | null;
  initialRewards: Reward[];
  gameState: GameState | null;
}

export default function RewardsClient({ profile, initialRewards, gameState }: Props) {
  const router = useRouter();
  const [rewards, setRewards] = useState(initialRewards);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState(50);
  const [rewardType, setRewardType] = useState<'real_world' | 'in_game_boost'>('real_world');
  const [bonusType, setBonusType] = useState<'morale_boost' | 'instant_resources'>('morale_boost');
  const [bonusMorale, setBonusMorale] = useState(20);
  const [bonusEnergy, setBonusEnergy] = useState(0);
  const [bonusKnowledge, setBonusKnowledge] = useState(0);
  const [bonusMoney, setBonusMoney] = useState(0);
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
    const inGameBonus: InGameBonus | null = rewardType === 'in_game_boost'
      ? bonusType === 'morale_boost'
        ? { type: 'morale_boost', amount: bonusMorale }
        : { type: 'instant_resources', energy: bonusEnergy || undefined, knowledge: bonusKnowledge || undefined, money: bonusMoney || undefined }
      : null;
    await supabase.from('rewards').insert({
      household_id: profile.household_id,
      title,
      description: description || null,
      points_cost: cost,
      created_by: profile.id,
      reward_type: rewardType,
      in_game_bonus: inGameBonus as any,
    });
    setTitle(''); setDescription(''); setCost(50); setRewardType('real_world');
    setShowForm(false);
    await refresh();
    setSaving(false);
  }

  async function redeemReward(reward: Reward) {
    if (!profile || profile.points < reward.points_cost) return;
    setRedeeming(reward.id);
    await supabase.from('profiles').update({ points: profile.points - reward.points_cost }).eq('id', profile.id);

    if (reward.reward_type === 'in_game_boost' && reward.in_game_bonus && gameState && profile.household_id) {
      const bonus = reward.in_game_bonus as unknown as InGameBonus;
      if (bonus.type === 'morale_boost') {
        await supabase.from('game_state').update({
          morale: Math.min(100, gameState.morale + (bonus as any).amount),
        }).eq('household_id', profile.household_id);
      } else if (bonus.type === 'instant_resources') {
        const r = bonus as { type: string; energy?: number; knowledge?: number; money?: number };
        await supabase.from('game_state').update({
          energy:    gameState.energy    + (r.energy    ?? 0),
          knowledge: gameState.knowledge + (r.knowledge ?? 0),
          money:     gameState.money     + (r.money     ?? 0),
        }).eq('household_id', profile.household_id);
      }
    }

    setRedeeming(null);
    router.refresh();
    const bonusDesc = reward.reward_type === 'in_game_boost' ? ' Settlement resources applied!' : ' Show this to your Leader.';
    alert(`🎉 Reward claimed: "${reward.title}"!${bonusDesc}`);
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
          <p className="text-sm mt-1" style={{ color: '#8a7a6a' }}>Balance: ⭐ {profile.points} credits</p>
        </div>
        {profile.is_leader && (
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl font-bold" style={{ backgroundColor: '#d4791c', color: '#100d0a' }}>
            + Add Reward
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={addReward} className="rounded-2xl p-6 mb-6 border space-y-3" style={{ background: '#1a1208', borderColor: '#d4791c' }}>
          <h3 className="font-bold" style={{ color: '#e8d5b8' }}>New Reward</h3>
          <input required placeholder="Reward name" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl px-4 py-3 outline-none" style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
          <input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl px-4 py-3 outline-none" style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium" style={{ color: '#8a7a6a' }}>Credit cost:</label>
            <input type="number" min={1} max={9999} value={cost} onChange={(e) => setCost(Number(e.target.value))} className="w-24 rounded-xl px-3 py-2 outline-none text-center" style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
          </div>

          {/* Reward Type Toggle */}
          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: '#8a7a6a' }}>Reward Type</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRewardType('real_world')}
                className="flex-1 py-2 rounded-xl font-bold text-sm"
                style={{ background: rewardType === 'real_world' ? '#d4791c' : '#2a1f14', color: rewardType === 'real_world' ? '#100d0a' : '#8a7a6a' }}>
                🌍 Real World
              </button>
              <button type="button" onClick={() => setRewardType('in_game_boost')}
                className="flex-1 py-2 rounded-xl font-bold text-sm"
                style={{ background: rewardType === 'in_game_boost' ? '#6b9a4a' : '#2a1f14', color: rewardType === 'in_game_boost' ? '#100d0a' : '#8a7a6a' }}>
                🎮 Settlement Boost
              </button>
            </div>
          </div>

          {/* In-game Bonus Config */}
          {rewardType === 'in_game_boost' && (
            <div className="space-y-3 p-4 rounded-xl" style={{ background: '#100d0a', border: '1px solid #2a1f14' }}>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setBonusType('morale_boost')}
                  className="flex-1 py-1.5 rounded-lg text-sm font-bold"
                  style={{ background: bonusType === 'morale_boost' ? '#6b9a4a' : '#2a1f14', color: bonusType === 'morale_boost' ? '#100d0a' : '#8a7a6a' }}>
                  💜 Morale Boost
                </button>
                <button type="button" onClick={() => setBonusType('instant_resources')}
                  className="flex-1 py-1.5 rounded-lg text-sm font-bold"
                  style={{ background: bonusType === 'instant_resources' ? '#6b9a4a' : '#2a1f14', color: bonusType === 'instant_resources' ? '#100d0a' : '#8a7a6a' }}>
                  ⚡ Instant Resources
                </button>
              </div>
              {bonusType === 'morale_boost' && (
                <div className="flex items-center gap-3">
                  <label className="text-sm" style={{ color: '#8a7a6a' }}>💜 Morale +</label>
                  <input type="number" min={1} max={100} value={bonusMorale} onChange={(e) => setBonusMorale(Number(e.target.value))} className="w-20 rounded-xl px-3 py-2 outline-none text-center" style={{ background: '#1a1208', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
                </div>
              )}
              {bonusType === 'instant_resources' && (
                <div className="grid grid-cols-3 gap-2">
                  {[['⚡ Energy', bonusEnergy, setBonusEnergy], ['📚 Knowledge', bonusKnowledge, setBonusKnowledge], ['💵 Money', bonusMoney, setBonusMoney]].map(([label, val, setter]) => (
                    <div key={label as string}>
                      <label className="text-xs block mb-1" style={{ color: '#8a7a6a' }}>{label as string}</label>
                      <input type="number" min={0} max={500} value={val as number} onChange={(e) => (setter as Function)(Number(e.target.value))} className="w-full rounded-xl px-2 py-2 outline-none text-center text-sm" style={{ background: '#1a1208', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl font-bold disabled:opacity-60" style={{ backgroundColor: '#d4791c', color: '#100d0a' }}>{saving ? 'Saving…' : 'Add Reward'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-xl font-bold border" style={{ borderColor: '#2a1f14', color: '#8a7a6a' }}>Cancel</button>
          </div>
        </form>
      )}

      {rewards.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <span className="text-6xl mb-4">🎁</span>
          <p className="text-xl font-bold mb-2" style={{ color: '#e8d5b8' }}>No rewards yet</p>
          {profile.is_leader && <p style={{ color: '#8a7a6a' }}>Add rewards for your survivors to spend credits on.</p>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map((reward) => {
            const canAfford = profile.points >= reward.points_cost;
            const isInGame = reward.reward_type === 'in_game_boost';
            const bonus = isInGame && reward.in_game_bonus ? reward.in_game_bonus as unknown as InGameBonus : null;
            let bonusLabel = '';
            if (bonus?.type === 'morale_boost') bonusLabel = `💜 +${(bonus as any).amount} Morale`;
            else if (bonus?.type === 'instant_resources') {
              const r = bonus as any;
              bonusLabel = [r.energy && `⚡+${r.energy}`, r.knowledge && `📚+${r.knowledge}`, r.money && `💵+${r.money}`].filter(Boolean).join(' ');
            }
            return (
              <div key={reward.id} className="rounded-2xl p-5 border flex flex-col" style={{ background: '#1a1208', borderColor: isInGame ? '#6b9a4a44' : '#2a1f14', opacity: !canAfford && !profile.is_leader ? 0.6 : 1 }}>
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-bold text-lg" style={{ color: '#e8d5b8' }}>{reward.title}</h3>
                  {isInGame && <span className="text-xs px-2 py-0.5 rounded-lg font-bold ml-2 shrink-0" style={{ background: '#6b9a4a22', color: '#6b9a4a' }}>🎮 Boost</span>}
                </div>
                {reward.description && <p className="text-sm mb-2 flex-1" style={{ color: '#8a7a6a' }}>{reward.description}</p>}
                {bonusLabel && <p className="text-sm mb-2 font-semibold" style={{ color: '#6b9a4a' }}>{bonusLabel}</p>}
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-bold text-lg" style={{ color: canAfford ? '#d4791c' : '#5a4a3a' }}>⭐ {reward.points_cost} cr</span>
                  {!profile.is_leader && (
                    <button
                      onClick={() => redeemReward(reward)}
                      disabled={!canAfford || redeeming === reward.id}
                      className="px-3 py-1.5 rounded-lg text-sm font-bold disabled:opacity-50"
                      style={{ backgroundColor: canAfford ? '#d4791c' : '#2a1f14', color: canAfford ? '#100d0a' : '#5a4a3a' }}
                    >
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
