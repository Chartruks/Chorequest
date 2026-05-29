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

const STATUS_COLORS: Record<string, string> = {
  pending:    '#d4791c',
  in_progress:'#c4a73e',
  completed:  '#6b9a4a',
  approved:   '#4a8a5e',
};

const STATUS_LABELS: Record<string, string> = {
  pending:    'Open',
  in_progress:'In Progress',
  completed:  'Done ✓',
  approved:   'Ratified ★',
};

const CATEGORY_EMOJI: Record<string, string> = {
  maintenance: '⚙️',
  learning:    '📚',
  food:        '🍽️',
  family:      '👨‍👩‍👧',
  work:        '💼',
};

const CATEGORIES = ['maintenance', 'learning', 'food', 'family', 'work'];

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
  const [energyReward, setEnergyReward]           = useState(0);
  const [knowledgeReward, setKnowledgeReward]     = useState(0);
  const [moneyReward, setMoneyReward]             = useState(0);
  const [foodReward, setFoodReward]               = useState(0);
  const [populationReward, setPopulationReward]   = useState(0);
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
    setKnowledgeReward(t.knowledge_reward);
    setMoneyReward(t.money_reward);
    setFoodReward(t.food_reward);
    setPopulationReward(t.population_reward);
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
      energy_reward:     t.energy_reward,
      knowledge_reward:  t.knowledge_reward,
      money_reward:      t.money_reward,
      food_reward:       t.food_reward,
      population_reward: t.population_reward,
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
      energy_reward:     energyReward,
      knowledge_reward:  knowledgeReward,
      money_reward:      moneyReward,
      food_reward:       foodReward,
      population_reward: populationReward,
      created_by: profile.id,
    });
    setTitle(''); setDescription(''); setPoints(10); setCategory('maintenance');
    setEnergyReward(0); setKnowledgeReward(0); setMoneyReward(0); setFoodReward(0); setPopulationReward(0);
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
        energy:     gameState.energy      + applyMoraleMultiplier(chore.energy_reward,     morale),
        knowledge:  gameState.knowledge   + applyMoraleMultiplier(chore.knowledge_reward,  morale),
        money:      gameState.money       + applyMoraleMultiplier(chore.money_reward,      morale),
        food:       gameState.food        + applyMoraleMultiplier(chore.food_reward,       morale),
        population: gameState.population  + applyMoraleMultiplier(chore.population_reward, morale),
      }).eq('household_id', profile.household_id);
    }

    await refresh();
    router.refresh();
  }

  if (!profile?.household_id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-6xl mb-4">🏚️</span>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#e8d5b8' }}>No Settlement Yet</h2>
        <p style={{ color: '#8a7a6a' }}>Go to your <a href="/dashboard/profile" className="underline" style={{ color: '#d4791c' }}>profile</a> to create or join a settlement.</p>
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
          <h1 className="text-3xl font-black" style={{ color: '#d4791c' }}>⚡ Chores</h1>
          <p className="text-sm mt-1" style={{ color: '#8a7a6a' }}>{chores.filter(c => c.status === 'pending').length} tasks open</p>
        </div>
        {profile.is_leader && (
          <div className="flex gap-2">
            <button
              onClick={() => { setShowTemplates(!showTemplates); setShowForm(false); }}
              className="px-4 py-2 rounded-xl font-bold border transition-opacity hover:opacity-90"
              style={{ borderColor: '#d4791c', color: '#d4791c' }}
            >
              📋 Templates
            </button>
            <button
              onClick={() => { setShowForm(!showForm); setShowTemplates(false); }}
              className="px-4 py-2 rounded-xl font-bold transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#d4791c', color: '#100d0a' }}
            >
              + New Task
            </button>
          </div>
        )}
      </div>

      {/* Template Browser */}
      {showTemplates && (
        <div className="rounded-2xl p-6 mb-6 border" style={{ background: '#1a1208', borderColor: '#c4a73e' }}>
          <h3 className="font-bold mb-4" style={{ color: '#e8d5b8' }}>Task Templates</h3>
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setTemplateFilter('')}
              className="px-3 py-1 rounded-lg text-xs font-bold"
              style={{ background: !templateFilter ? '#d4791c' : '#2a1f14', color: !templateFilter ? '#100d0a' : '#8a7a6a' }}
            >All</button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setTemplateFilter(cat)}
                className="px-3 py-1 rounded-lg text-xs font-bold"
                style={{ background: templateFilter === cat ? '#d4791c' : '#2a1f14', color: templateFilter === cat ? '#100d0a' : '#8a7a6a' }}
              >
                {CATEGORY_EMOJI[cat]} {cat}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((t) => {
              const resourceLine = [
                t.energy_reward    > 0 && `⚡+${t.energy_reward}`,
                t.knowledge_reward > 0 && `📚+${t.knowledge_reward}`,
                t.money_reward     > 0 && `💵+${t.money_reward}`,
                t.food_reward        > 0 && `🥫+${t.food_reward}`,
                t.population_reward  > 0 && `👥+${t.population_reward}`,
              ].filter(Boolean).join(' ');
              return (
                <div key={t.id} className="rounded-xl p-4 border" style={{ background: '#100d0a', borderColor: '#2a1f14' }}>
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-bold" style={{ color: '#e8d5b8' }}>{CATEGORY_EMOJI[t.category]} {t.title}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: '#2a1f14', color: '#8a7a6a' }}>{t.recurrence}</span>
                  </div>
                  <div className="text-xs mb-2" style={{ color: '#d4791c' }}>⭐ {t.points_reward} cr {resourceLine && `· ${resourceLine}`}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addFromTemplate(t)}
                      disabled={saving}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                      style={{ backgroundColor: '#d4791c', color: '#100d0a' }}
                    >
                      + Add Task
                    </button>
                    <button
                      onClick={() => fillFromTemplate(t)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border"
                      style={{ borderColor: '#2a1f14', color: '#8a7a6a' }}
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

      {/* Custom Task Form */}
      {showForm && (
        <form onSubmit={addChore} className="rounded-2xl p-6 mb-6 border space-y-3" style={{ background: '#1a1208', borderColor: '#d4791c' }}>
          <h3 className="font-bold" style={{ color: '#e8d5b8' }}>New Task</h3>
          <input
            required
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl px-4 py-3 outline-none"
            style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }}
          />
          <input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl px-4 py-3 outline-none"
            style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }}
          />
          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: '#8a7a6a' }}>Category</label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className="px-3 py-1.5 rounded-lg text-sm font-bold"
                  style={{ background: category === cat ? '#d4791c' : '#2a1f14', color: category === cat ? '#100d0a' : '#8a7a6a' }}
                >
                  {CATEGORY_EMOJI[cat]} {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#8a7a6a' }}>⭐ Credits</label>
              <input type="number" min={1} max={500} value={points} onChange={(e) => setPoints(Number(e.target.value))} className="w-full rounded-xl px-3 py-2 outline-none text-center" style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#8a7a6a' }}>⚡ Energy</label>
              <input type="number" min={0} max={100} value={energyReward} onChange={(e) => setEnergyReward(Number(e.target.value))} className="w-full rounded-xl px-3 py-2 outline-none text-center" style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#8a7a6a' }}>📚 Knowledge</label>
              <input type="number" min={0} max={100} value={knowledgeReward} onChange={(e) => setKnowledgeReward(Number(e.target.value))} className="w-full rounded-xl px-3 py-2 outline-none text-center" style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#8a7a6a' }}>💵 Money</label>
              <input type="number" min={0} max={100} value={moneyReward} onChange={(e) => setMoneyReward(Number(e.target.value))} className="w-full rounded-xl px-3 py-2 outline-none text-center" style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#8a7a6a' }}>🥫 Food</label>
              <input type="number" min={0} max={100} value={foodReward} onChange={(e) => setFoodReward(Number(e.target.value))} className="w-full rounded-xl px-3 py-2 outline-none text-center" style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#8a7a6a' }}>👥 Population</label>
              <input type="number" min={0} max={100} value={populationReward} onChange={(e) => setPopulationReward(Number(e.target.value))} className="w-full rounded-xl px-3 py-2 outline-none text-center" style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl font-bold disabled:opacity-60" style={{ backgroundColor: '#d4791c', color: '#100d0a' }}>
              {saving ? 'Adding…' : 'Add Task'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-xl font-bold border" style={{ borderColor: '#2a1f14', color: '#8a7a6a' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {chores.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <span className="text-6xl mb-4">📋</span>
          <p className="text-xl font-bold mb-2" style={{ color: '#e8d5b8' }}>No tasks yet</p>
          {profile.is_leader && <p style={{ color: '#8a7a6a' }}>Click &quot;Templates&quot; or &quot;New Task&quot; to get started.</p>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chores.map((chore) => {
            const resourceLine = [
              chore.energy_reward    > 0 && `⚡+${chore.energy_reward}`,
              chore.knowledge_reward > 0 && `📚+${chore.knowledge_reward}`,
              chore.money_reward     > 0 && `💵+${chore.money_reward}`,
              chore.food_reward        > 0 && `🥫+${chore.food_reward}`,
              chore.population_reward  > 0 && `👥+${chore.population_reward}`,
            ].filter(Boolean).join(' ');
            const statusColor = STATUS_COLORS[chore.status] ?? '#5a4a3a';
            return (
              <div key={chore.id} className="rounded-2xl p-5 border" style={{ background: '#1a1208', borderColor: '#2a1f14' }}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg flex-1 mr-2" style={{ color: '#e8d5b8' }}>
                    {CATEGORY_EMOJI[chore.category] ?? '📋'} {chore.title}
                  </h3>
                  <span className="text-xs font-bold px-2 py-1 rounded-lg shrink-0" style={{ background: statusColor + '22', color: statusColor }}>
                    {STATUS_LABELS[chore.status] ?? chore.status}
                  </span>
                </div>
                {chore.description && <p className="text-sm mb-3" style={{ color: '#8a7a6a' }}>{chore.description}</p>}
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <div className="font-bold" style={{ color: '#d4791c' }}>⭐ {chore.points_reward} cr</div>
                    {resourceLine && <div className="text-xs mt-0.5" style={{ color: '#8a7a6a' }}>{resourceLine}</div>}
                  </div>
                  {chore.status === 'pending' && !profile.is_leader && (
                    <button onClick={() => claimChore(chore.id)} className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ backgroundColor: '#d4791c', color: '#100d0a' }}>Claim</button>
                  )}
                  {chore.status === 'in_progress' && chore.assigned_to === profile.id && (
                    <button onClick={() => completeChore(chore.id)} className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ backgroundColor: '#6b9a4a', color: '#100d0a' }}>Report Done</button>
                  )}
                  {chore.status === 'completed' && profile.is_leader && (
                    <button onClick={() => approveChore(chore)} className="px-3 py-1.5 rounded-lg text-sm font-bold" style={{ backgroundColor: '#4a8a5e', color: '#100d0a' }}>Ratify ★</button>
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
