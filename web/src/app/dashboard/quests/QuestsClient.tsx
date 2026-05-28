'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';
import { applyMoraleMultiplier } from '@/lib/idleEngine';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Chore = Database['public']['Tables']['chores']['Row'];
type ChoreTemplate = Database['public']['Tables']['chore_templates']['Row'];
type GameState = Database['public']['Tables']['game_state']['Row'];

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

const CATEGORY_EMOJI: Record<string, string> = {
  maintenance: '⚙️',
  learning: '📚',
  cleanliness: '🧹',
  family: '👨‍👩‍👧',
  special: '⭐',
};

const CATEGORIES = ['maintenance', 'learning', 'cleanliness', 'family', 'special'];

interface Props {
  profile: Profile | null;
  initialChores: Chore[];
  templates: ChoreTemplate[];
  gameState: GameState | null;
}

export default function QuestsClient({ profile, initialChores, templates, gameState }: Props) {
  const router = useRouter();
  const [chores, setChores] = useState(initialChores);
  const [showForm, setShowForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateFilter, setTemplateFilter] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(10);
  const [category, setCategory] = useState('maintenance');
  const [energyReward, setEnergyReward] = useState(0);
  const [researchReward, setResearchReward] = useState(0);
  const [materialsReward, setMaterialsReward] = useState(0);
  const [moraleReward, setMoraleReward] = useState(0);
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

  function fillFromTemplate(t: ChoreTemplate) {
    setTitle(t.title);
    setDescription(t.description ?? '');
    setPoints(t.points_reward);
    setCategory(t.category);
    setEnergyReward(t.energy_reward);
    setResearchReward(t.research_reward);
    setMaterialsReward(t.materials_reward);
    setMoraleReward(t.morale_reward);
    setShowTemplates(false);
    setShowForm(true);
  }

  async function addFromTemplate(t: ChoreTemplate) {
    if (!profile?.household_id) return;
    setSaving(true);
    await supabase.from('chores').insert({
      household_id: profile.household_id,
      title: t.title,
      description: t.description ?? null,
      points_reward: t.points_reward,
      category: t.category,
      energy_reward: t.energy_reward,
      research_reward: t.research_reward,
      materials_reward: t.materials_reward,
      morale_reward: t.morale_reward,
      created_by: profile.id,
      template_id: t.id,
    });
    await refresh();
    setSaving(false);
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
      category,
      energy_reward: energyReward,
      research_reward: researchReward,
      materials_reward: materialsReward,
      morale_reward: moraleReward,
      created_by: profile.id,
    });
    setTitle(''); setDescription(''); setPoints(10); setCategory('maintenance');
    setEnergyReward(0); setResearchReward(0); setMaterialsReward(0); setMoraleReward(0);
    setShowForm(false);
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
    const morale = gameState?.morale ?? 75;

    if (chore.assigned_to) {
      const { data: p } = await supabase.from('profiles').select('points, level').eq('id', chore.assigned_to).single();
      if (p) {
        const rawPoints = applyMoraleMultiplier(chore.points_reward, morale);
        const newPoints = p.points + rawPoints;
        const newLevel = Math.floor(newPoints / 100) + 1;
        await supabase.from('profiles').update({ points: newPoints, level: newLevel }).eq('id', chore.assigned_to);
      }
    }

    if (profile?.household_id && gameState) {
      await supabase.from('game_state').update({
        energy:    gameState.energy    + applyMoraleMultiplier(chore.energy_reward,    morale),
        research:  gameState.research  + applyMoraleMultiplier(chore.research_reward,  morale),
        materials: gameState.materials + applyMoraleMultiplier(chore.materials_reward, morale),
        morale:    Math.min(100, gameState.morale + applyMoraleMultiplier(chore.morale_reward, morale)),
      }).eq('household_id', profile.household_id);
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

  const filteredTemplates = templates.filter((t) =>
    !templateFilter || t.category === templateFilter
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black" style={{ color: '#00e5ff' }}>🚀 Missions</h1>
          <p className="text-sm mt-1" style={{ color: '#6b6b8a' }}>{chores.filter(c => c.status === 'pending').length} open missions</p>
        </div>
        {profile.role === 'parent' && (
          <div className="flex gap-2">
            <button
              onClick={() => { setShowTemplates(!showTemplates); setShowForm(false); }}
              className="px-4 py-2 rounded-xl font-bold border transition-opacity hover:opacity-90"
              style={{ borderColor: '#00e5ff', color: '#00e5ff' }}
            >
              📋 Templates
            </button>
            <button
              onClick={() => { setShowForm(!showForm); setShowTemplates(false); }}
              className="px-4 py-2 rounded-xl font-bold transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#00e5ff', color: '#05050f' }}
            >
              + New Mission
            </button>
          </div>
        )}
      </div>

      {/* Template Browser */}
      {showTemplates && (
        <div className="rounded-2xl p-6 mb-6 border" style={{ background: '#0d0d1f', borderColor: '#bf5af2' }}>
          <h3 className="font-bold text-white mb-4">Mission Templates</h3>
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setTemplateFilter('')}
              className="px-3 py-1 rounded-lg text-xs font-bold"
              style={{ background: !templateFilter ? '#00e5ff' : '#1e1e3f', color: !templateFilter ? '#05050f' : '#8e8ea0' }}
            >All</button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setTemplateFilter(cat)}
                className="px-3 py-1 rounded-lg text-xs font-bold"
                style={{ background: templateFilter === cat ? '#00e5ff' : '#1e1e3f', color: templateFilter === cat ? '#05050f' : '#8e8ea0' }}
              >
                {CATEGORY_EMOJI[cat]} {cat}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((t) => {
              const resourceLine = [
                t.energy_reward > 0    && `⚡+${t.energy_reward}`,
                t.research_reward > 0  && `🔬+${t.research_reward}`,
                t.materials_reward > 0 && `🪨+${t.materials_reward}`,
                t.morale_reward > 0    && `💜+${t.morale_reward}`,
              ].filter(Boolean).join(' ');
              return (
                <div key={t.id} className="rounded-xl p-4 border" style={{ background: '#05050f', borderColor: '#1e1e3f' }}>
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-bold text-white">{CATEGORY_EMOJI[t.category]} {t.title}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: '#1e1e3f', color: '#8e8ea0' }}>{t.recurrence}</span>
                  </div>
                  <div className="text-xs mb-2" style={{ color: '#00e5ff' }}>⭐ {t.points_reward} cr {resourceLine && `· ${resourceLine}`}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addFromTemplate(t)}
                      disabled={saving}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                      style={{ backgroundColor: '#00e5ff', color: '#05050f' }}
                    >
                      + Add to Crew
                    </button>
                    <button
                      onClick={() => fillFromTemplate(t)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border"
                      style={{ borderColor: '#1e1e3f', color: '#8e8ea0' }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Mission Form */}
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
          {/* Category */}
          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: '#8e8ea0' }}>Category</label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className="px-3 py-1.5 rounded-lg text-sm font-bold"
                  style={{ background: category === cat ? '#00e5ff' : '#1e1e3f', color: category === cat ? '#05050f' : '#8e8ea0' }}
                >
                  {CATEGORY_EMOJI[cat]} {cat}
                </button>
              ))}
            </div>
          </div>
          {/* Credits + Resources */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#8e8ea0' }}>⭐ Credits</label>
              <input type="number" min={1} max={500} value={points} onChange={(e) => setPoints(Number(e.target.value))} className="w-full rounded-xl px-3 py-2 text-white outline-none text-center" style={{ background: '#05050f', border: '1px solid #1e1e3f' }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#8e8ea0' }}>⚡ Energy</label>
              <input type="number" min={0} max={100} value={energyReward} onChange={(e) => setEnergyReward(Number(e.target.value))} className="w-full rounded-xl px-3 py-2 text-white outline-none text-center" style={{ background: '#05050f', border: '1px solid #1e1e3f' }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#8e8ea0' }}>🔬 Research</label>
              <input type="number" min={0} max={100} value={researchReward} onChange={(e) => setResearchReward(Number(e.target.value))} className="w-full rounded-xl px-3 py-2 text-white outline-none text-center" style={{ background: '#05050f', border: '1px solid #1e1e3f' }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#8e8ea0' }}>🪨 Materials</label>
              <input type="number" min={0} max={100} value={materialsReward} onChange={(e) => setMaterialsReward(Number(e.target.value))} className="w-full rounded-xl px-3 py-2 text-white outline-none text-center" style={{ background: '#05050f', border: '1px solid #1e1e3f' }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#8e8ea0' }}>💜 Morale</label>
              <input type="number" min={0} max={100} value={moraleReward} onChange={(e) => setMoraleReward(Number(e.target.value))} className="w-full rounded-xl px-3 py-2 text-white outline-none text-center" style={{ background: '#05050f', border: '1px solid #1e1e3f' }} />
            </div>
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
          {profile.role === 'parent' && <p style={{ color: '#6b6b8a' }}>Click &quot;Templates&quot; or &quot;New Mission&quot; to get started.</p>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chores.map((chore) => {
            const resourceLine = [
              chore.energy_reward    > 0 && `⚡+${chore.energy_reward}`,
              chore.research_reward  > 0 && `🔬+${chore.research_reward}`,
              chore.materials_reward > 0 && `🪨+${chore.materials_reward}`,
              chore.morale_reward    > 0 && `💜+${chore.morale_reward}`,
            ].filter(Boolean).join(' ');
            return (
              <div key={chore.id} className="rounded-2xl p-5 border" style={{ background: '#0d0d1f', borderColor: '#1e1e3f' }}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-white text-lg flex-1 mr-2">
                    {CATEGORY_EMOJI[chore.category] ?? '📋'} {chore.title}
                  </h3>
                  <span className="text-xs font-bold px-2 py-1 rounded-lg shrink-0" style={{ background: STATUS_COLORS[chore.status] + '22', color: STATUS_COLORS[chore.status] }}>
                    {STATUS_LABELS[chore.status]}
                  </span>
                </div>
                {chore.description && <p className="text-sm mb-3" style={{ color: '#6b6b8a' }}>{chore.description}</p>}
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <div className="font-bold" style={{ color: '#00e5ff' }}>⭐ {chore.points_reward} cr</div>
                    {resourceLine && <div className="text-xs mt-0.5" style={{ color: '#6b6b8a' }}>{resourceLine}</div>}
                  </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
