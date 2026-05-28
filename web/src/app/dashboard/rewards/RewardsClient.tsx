'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Reward = Database['public']['Tables']['rewards']['Row'];
type GameState = Database['public']['Tables']['game_state']['Row'];

type InGameBonus = { type: 'morale_boost'; amount: number } | { type: 'instant_resources'; energy?: number; research?: number; materials?: number };

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
  const [bonusResearch, setBonusResearch] = useState(0);
  const [bonusMaterials, setBonusMaterials] = useState(0);
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
        : { type: 'instant_resources', energy: bonusEnergy || undefined, research: bonusResearch || undefined, materials: bonusMaterials || undefined }
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

    // Apply in-game bonus if applicable
    if (reward.reward_type === 'in_game_boost' && reward.in_game_bonus && gameState && profile.household_id) {
      const bonus = reward.in_game_bonus as unknown as InGameBonus;
      if (bonus.type === 'morale_boost') {
        await supabase.from('game_state').update({
          morale: Math.min(100, gameState.morale + (bonus as any).amount),
        }).eq('household_id', profile.household_id);
      } else if (bonus.type === 'instant_resources') {
        const r = bonus as { type: string; energy?: number; research?: number; materials?: number };
        await supabase.from('game_state').update({
          energy:    gameState.energy    + (r.energy    ?? 0),
          research:  gameState.research  + (r.research  ?? 0),
          materials: gameState.materials + (r.materials ?? 0),
        }).eq('household_id', profile.household_id);
      }
    }

    setRedeeming(null);
    router.refresh();
    const bonusDesc = reward.reward_type === 'in_game_boost' ? ' In-game bonus applied!' : ' Show this to your Commander.';
    alert(`🎉 Reward unlocked: "${reward.title}"!${bonusDesc}`);
  }

  if (!profile?.household_id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-6xl mb-4">💫</span>
        <h2 className="text-2xl font-bold mb-2 text-white">No Crew Yet</h2>
        <p style={{ color: '#6b6b8a' }}>Join a crew to see rewards.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black" style={{ color: '#00e5ff' }}>🎁 Rewards</h1>
          <p className="text-sm mt-1" style={{ color: '#00e5ff' }}>Balance: ⭐ {profile.points} credits</p>
        </div>
        {profile.role === 'parent' && (
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl font-bold" style={{ backgroundColor: '#00e5ff', color: '#05050f' }}>
            + Add Reward
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={addReward} className="rounded-2xl p-6 mb-6 border space-y-3" style={{ background: '#0d0d1f', borderColor: '#00e5ff' }}>
          <h3 className="font-bold text-white">New Reward</h3>
          <input required placeholder="Reward name" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl px-4 py-3 text-white outline-none" style={{ background: '#05050f', border: '1px solid #1e1e3f' }} />
          <input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-xl px-4 py-3 text-white outline-none" style={{ background: '#05050f', border: '1px solid #1e1e3f' }} />
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium" style={{ color: '#8e8ea0' }}>Credit cost:</label>
            <input type="number" min={1} max={9999} value={cost} onChange={(e) => setCost(Number(e.target.value))} className="w-24 rounded-xl px-3 py-2 text-white outline-none text-center" style={{ background: '#05050f', border: '1px solid #1e1e3f' }} />
          </div>

          {/* Reward Type Toggle */}
          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: '#8e8ea0' }}>Reward Type</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRewardType('real_world')}
                className="flex-1 py-2 rounded-xl font-bold text-sm"
                style={{ background: rewardType === 'real_world' ? '#00e5ff' : '#1e1e3f', color: rewardType === 'real_world' ? '#05050f' : '#8e8ea0' }}>
                🌍 Real World
              </button>
              <button type="button" onClick={() => setRewardType('in_game_boost')}
                className="flex-1 py-2 rounded-xl font-bold text-sm"
                style={{ background: rewardType === 'in_game_boost' ? '#bf5af2' : '#1e1e3f', color: rewardType === 'in_game_boost' ? '#fff' : '#8e8ea0' }}>
                🎮 In-Game Boost
              </button>
            </div>
          </div>

          {/* In-game Bonus Config */}
          {rewardType === 'in_game_boost' && (
            <div className="space-y-3 p-4 rounded-xl" style={{ background: '#05050f', border: '1px solid #1e1e3f' }}>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setBonusType('morale_boost')}
                  className="flex-1 py-1.5 rounded-lg text-sm font-bold"
                  style={{ background: bonusType === 'morale_boost' ? '#bf5af2' : '#1e1e3f', color: bonusType === 'morale_boost' ? '#fff' : '#8e8ea0' }}>
                  💜 Morale Boost
                </button>
                <button type="button" onClick={() => setBonusType('instant_resources')}
                  className="flex-1 py-1.5 rounded-lg text-sm font-bold"
                  style={{ background: bonusType === 'instant_resources' ? '#bf5af2' : '#1e1e3f', color: bonusType === 'instant_resources' ? '#fff' : '#8e8ea0' }}>
                  ⚡ Instant Resources
                </button>
              </div>
              {bonusType === 'morale_boost' && (
                <div className="flex items-center gap-3">
                  <label className="text-sm" style={{ color: '#8e8ea0' }}>💜 Morale +</label>
                  <input type="number" min={1} max={100} value={bonusMorale} onChange={(e) => setBonusMorale(Number(e.target.value))} className="w-20 rounded-xl px-3 py-2 text-white outline-none text-center" style={{ background: '#0d0d1f', border: '1px solid #1e1e3f' }} />
                </div>
              )}
              {bonusType === 'instant_resources' && (
                <div className="grid grid-cols-3 gap-2">
                  {[['⚡ Energy', bonusEnergy, setBonusEnergy], ['🔬 Research', bonusResearch, setBonusResearch], ['🪨 Materials', bonusMaterials, setBonusMaterials]].map(([label, val, setter]) => (
                    <div key={label as string}>
                      <label className="text-xs block mb-1" style={{ color: '#8e8ea0' }}>{label as string}</label>
                      <input type="number" min={0} max={500} value={val as number} onChange={(e) => (setter as Function)(Number(e.target.value))} className="w-full rounded-xl px-2 py-2 text-white outline-none text-center text-sm" style={{ background: '#0d0d1f', border: '1px solid #1e1e3f' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl font-bold disabled:opacity-60" style={{ backgroundColor: '#00e5ff', color: '#05050f' }}>{saving ? 'Transmitting…' : 'Add Reward'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-xl font-bold border" style={{ borderColor: '#1e1e3f', color: '#8e8ea0' }}>Cancel</button>
          </div>
        </form>
      )}

      {rewards.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <span className="text-6xl mb-4">💫</span>
          <p className="text-xl font-bold text-white mb-2">No rewards yet</p>
          {profile.role === 'parent' && <p style={{ color: '#6b6b8a' }}>Add rewards for your cadets to spend credits on.</p>}
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
              bonusLabel = [r.energy && `⚡+${r.energy}`, r.research && `🔬+${r.research}`, r.materials && `🪨+${r.materials}`].filter(Boolean).join(' ');
            }
            return (
              <div key={reward.id} className="rounded-2xl p-5 border flex flex-col" style={{ background: '#0d0d1f', borderColor: isInGame ? '#bf5af244' : '#1e1e3f', opacity: !canAfford && profile.role === 'child' ? 0.6 : 1 }}>
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-bold text-white text-lg">{reward.title}</h3>
                  {isInGame && <span className="text-xs px-2 py-0.5 rounded-lg font-bold ml-2 shrink-0" style={{ background: '#bf5af222', color: '#bf5af2' }}>🎮 In-Game</span>}
                </div>
                {reward.description && <p className="text-sm mb-2 flex-1" style={{ color: '#6b6b8a' }}>{reward.description}</p>}
                {bonusLabel && <p className="text-sm mb-2 font-semibold" style={{ color: '#bf5af2' }}>{bonusLabel}</p>}
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-bold text-lg" style={{ color: canAfford ? '#00e5ff' : '#555570' }}>⭐ {reward.points_cost} cr</span>
                  {profile.role === 'child' && (
                    <button
                      onClick={() => redeemReward(reward)}
                      disabled={!canAfford || redeeming === reward.id}
                      className="px-3 py-1.5 rounded-lg text-sm font-bold disabled:opacity-50"
                      style={{ backgroundColor: canAfford ? '#00e5ff' : '#1e1e3f', color: canAfford ? '#05050f' : '#555570' }}
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
