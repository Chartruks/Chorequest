'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';
import { calcLevel, calcTotalDamage } from '@/lib/towerEngine';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Chore = Database['public']['Tables']['chores']['Row'];
type ChoreTemplate = Database['public']['Tables']['chore_templates']['Row'];

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
}

export default function QuestsClient({ profile, initialChores, templates }: Props) {
  const router = useRouter();
  const [chores, setChores] = useState(initialChores);
  const [showForm, setShowForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateFilter, setTemplateFilter] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(10);
  const [category, setCategory] = useState('maintenance');
  const [xpReward, setXpReward]         = useState(10);
  const [damageReward, setDamageReward] = useState(5);
  const [saving, setSaving] = useState(false);
  const [confirmChore, setConfirmChore] = useState<Chore | null>(null);
  const [attacking, setAttacking] = useState(false);

  const supabase = createClient();

  async function refresh() {
    if (!profile?.household_id) return;
    const { data } = await supabase
      .from('chores').select('*')
      .eq('household_id', profile.household_id)
      .order('created_at', { ascending: false });
    setChores(data ?? []);
  }

  function fillFromTemplate(t: ChoreTemplate) {
    setTitle(t.title);
    setDescription(t.description ?? '');
    setPoints(t.points_reward);
    setCategory(t.category);
    setXpReward(t.xp_reward);
    setDamageReward(t.damage_reward);
    setShowTemplates(false);
    setShowForm(true);
  }

  async function addFromTemplate(t: ChoreTemplate) {
    if (!profile?.household_id) return;
    setSaving(true);
    await supabase.from('chores').insert({
      household_id:  profile.household_id,
      title:         t.title,
      description:   t.description ?? null,
      points_reward: t.points_reward,
      category:      t.category,
      xp_reward:     t.xp_reward,
      damage_reward: t.damage_reward,
      created_by:    profile.id,
      template_id:   t.id,
    });
    await refresh();
    setSaving(false);
  }

  async function addChore(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.household_id) return;
    setSaving(true);
    await supabase.from('chores').insert({
      household_id:  profile.household_id,
      title,
      description:   description || null,
      points_reward: points,
      category,
      xp_reward:     xpReward,
      damage_reward: damageReward,
      created_by:    profile.id,
    });
    setTitle(''); setDescription(''); setPoints(10); setCategory('maintenance');
    setXpReward(10); setDamageReward(5);
    setShowForm(false);
    await refresh();
    setSaving(false);
  }

  // Notify every other family member that this player attacked
  async function notifyFamily(chore: Chore, damage: number) {
    if (!profile?.household_id) return;
    try {
      const { data: members } = await supabase
        .from('profiles').select('id, push_token')
        .eq('household_id', profile.household_id);
      const tokens = (members ?? [])
        .filter((m: any) => m.id !== profile.id && m.push_token)
        .map((m: any) => m.push_token);
      if (tokens.length === 0) return;
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          tokens.map((to: string) => ({
            to,
            title: '⚔️ Attack!',
            body: `${profile.username ?? 'A member'} did "${chore.title}" (${damage} dmg)`,
            data: { choreId: chore.id },
          }))
        ),
      });
    } catch { /* silent */ }
  }

  // Tapping a chore = the current player completes it → damage their own monster
  async function executeAttack(chore: Chore) {
    if (!profile) return;
    setAttacking(true);

    const { data: pi } = await supabase.from('player_items').select('*, store_items(*)').eq('profile_id', profile.id);
    const damage       = calcTotalDamage(chore.damage_reward, profile, pi ?? []);
    const newMonsterHp = Math.max(0, profile.monster_hp - damage);
    const updates: Record<string, any> = { monster_hp: newMonsterHp };

    if (newMonsterHp === 0 && profile.tower_floor < 20) {
      const nextFloor = profile.tower_floor + 1;
      const { data: fd } = await supabase.from('tower_floors').select('*').eq('floor', nextFloor).single();
      if (fd) {
        const newXp = profile.xp + fd.xp_reward;
        updates.tower_floor = nextFloor;
        updates.monster_hp  = fd.monster_max_hp;
        updates.xp          = newXp;
        updates.level       = calcLevel(newXp);
        updates.points      = profile.points + fd.money_reward;
      }
    }

    await supabase.from('profiles').update(updates as any).eq('id', profile.id);

    if (profile.household_id) {
      await supabase.from('chore_log').insert({
        household_id: profile.household_id,
        profile_id:   profile.id,
        chore_title:  chore.title,
        damage,
      } as any);
      await notifyFamily(chore, damage);
    }

    setAttacking(false);
    setConfirmChore(null);
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

  const filteredTemplates = templates.filter(t => !templateFilter || t.category === templateFilter);
  const weak   = chores.filter(c => c.recurrence !== 'weekly' && c.recurrence !== 'special');
  const strong = chores.filter(c => c.recurrence === 'weekly' || c.recurrence === 'special');

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-black" style={{ color: '#d4791c' }}>⚔️ Attack</h1>
          <p className="text-sm mt-1" style={{ color: '#8a7a6a' }}>Click a chore to strike the enemy</p>
        </div>
        {profile.is_leader && (
          <div className="flex gap-2">
            <button
              onClick={() => { setShowTemplates(!showTemplates); setShowForm(false); }}
              className="px-4 py-2 rounded-xl font-bold border transition-opacity hover:opacity-90"
              style={{ borderColor: '#d4791c', color: '#d4791c' }}
            >📋 Templates</button>
            <button
              onClick={() => { setShowForm(!showForm); setShowTemplates(false); }}
              className="px-4 py-2 rounded-xl font-bold transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#d4791c', color: '#100d0a' }}
            >+ New Task</button>
          </div>
        )}
      </div>

      {/* Template Browser */}
      {showTemplates && (
        <div className="rounded-2xl p-6 mb-6 border" style={{ background: '#1a1208', borderColor: '#c4a73e' }}>
          <h3 className="font-bold mb-4" style={{ color: '#e8d5b8' }}>Task Templates</h3>
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => setTemplateFilter('')} className="px-3 py-1 rounded-lg text-xs font-bold"
              style={{ background: !templateFilter ? '#d4791c' : '#2a1f14', color: !templateFilter ? '#100d0a' : '#8a7a6a' }}>All</button>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setTemplateFilter(cat)} className="px-3 py-1 rounded-lg text-xs font-bold"
                style={{ background: templateFilter === cat ? '#d4791c' : '#2a1f14', color: templateFilter === cat ? '#100d0a' : '#8a7a6a' }}>
                {CATEGORY_EMOJI[cat]} {cat}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map(t => (
              <div key={t.id} className="rounded-xl p-4 border" style={{ background: '#100d0a', borderColor: '#2a1f14' }}>
                <div className="font-bold text-sm mb-1" style={{ color: '#e8d5b8' }}>{CATEGORY_EMOJI[t.category]} {t.title}</div>
                <div className="flex gap-2 mb-3">
                  <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#2a1f14', color: '#c4a73e' }}>💰{t.points_reward}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#2a1f14', color: '#c4a73e' }}>⭐{t.xp_reward}xp</span>
                  <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#2a1f14', color: '#c4a73e' }}>⚔️{t.damage_reward}dmg</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => addFromTemplate(t)} disabled={saving}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                    style={{ backgroundColor: '#d4791c', color: '#100d0a' }}>+ Add</button>
                  <button onClick={() => fillFromTemplate(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border"
                    style={{ borderColor: '#2a1f14', color: '#8a7a6a' }}>Edit</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Task Form */}
      {showForm && (
        <form onSubmit={addChore} className="rounded-2xl p-6 mb-6 border space-y-3" style={{ background: '#1a1208', borderColor: '#d4791c' }}>
          <h3 className="font-bold" style={{ color: '#e8d5b8' }}>New Task</h3>
          <input required placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl px-4 py-3 outline-none"
            style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
          <input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)}
            className="w-full rounded-xl px-4 py-3 outline-none"
            style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
          <div>
            <label className="text-sm font-medium block mb-2" style={{ color: '#8a7a6a' }}>Category</label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <button key={cat} type="button" onClick={() => setCategory(cat)}
                  className="px-3 py-1.5 rounded-lg text-sm font-bold"
                  style={{ background: category === cat ? '#d4791c' : '#2a1f14', color: category === cat ? '#100d0a' : '#8a7a6a' }}>
                  {CATEGORY_EMOJI[cat]} {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#8a7a6a' }}>💰 Money</label>
              <input type="number" min={0} max={500} value={points} onChange={e => setPoints(Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2 outline-none text-center"
                style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#8a7a6a' }}>⭐ XP</label>
              <input type="number" min={0} max={500} value={xpReward} onChange={e => setXpReward(Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2 outline-none text-center"
                style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#8a7a6a' }}>⚔️ Damage</label>
              <input type="number" min={0} max={500} value={damageReward} onChange={e => setDamageReward(Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2 outline-none text-center"
                style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl font-bold disabled:opacity-60"
              style={{ backgroundColor: '#d4791c', color: '#100d0a' }}>{saving ? 'Adding…' : 'Add Task'}</button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-6 py-2 rounded-xl font-bold border" style={{ borderColor: '#2a1f14', color: '#8a7a6a' }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Chore list */}
      {chores.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <span className="text-6xl mb-4">📋</span>
          <p className="text-xl font-bold mb-2" style={{ color: '#e8d5b8' }}>No chores yet</p>
          {profile.is_leader && <p style={{ color: '#8a7a6a' }}>Click &quot;Templates&quot; or &quot;New Task&quot; to get started.</p>}
        </div>
      ) : (
        <div className="space-y-8 mt-4">
          {([
            { label: '⚡ Weak Attacks',   items: weak },
            { label: '💥 Strong Attacks', items: strong },
          ] as const).filter(g => g.items.length > 0).map(group => (
            <div key={group.label}>
              <h2 className="text-sm font-black mb-3" style={{ color: '#c4a73e' }}>{group.label}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map(chore => (
                  <button
                    key={chore.id}
                    onClick={() => setConfirmChore(chore)}
                    className="text-left rounded-2xl p-5 border transition-transform hover:scale-[1.02] active:scale-95"
                    style={{ background: '#1a1208', borderColor: '#2a1f14' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-lg flex-1 mr-2" style={{ color: '#e8d5b8' }}>
                        {CATEGORY_EMOJI[chore.category] ?? '📋'} {chore.title}
                      </h3>
                      <span className="text-sm font-bold px-2 py-1 rounded-lg shrink-0" style={{ background: '#2a1f14', color: '#ff7070' }}>
                        ⚔️ {chore.damage_reward}
                      </span>
                    </div>
                    {chore.description && <p className="text-sm" style={{ color: '#8a7a6a' }}>{chore.description}</p>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm attack dialog */}
      {confirmChore && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => !attacking && setConfirmChore(null)}>
          <div className="w-full max-w-sm rounded-2xl p-6 border" style={{ background: '#1a1208', borderColor: '#d4791c' }}
            onClick={e => e.stopPropagation()}>
            <div className="text-center text-4xl mb-2">{CATEGORY_EMOJI[confirmChore.category] ?? '📋'}</div>
            <h3 className="text-center font-black text-xl mb-1" style={{ color: '#e8d5b8' }}>{confirmChore.title}</h3>
            <p className="text-center text-sm mb-1" style={{ color: '#ff7070' }}>
              {confirmChore.recurrence === 'weekly' || confirmChore.recurrence === 'special' ? '💥 Strong' : '⚡ Weak'} · ⚔️ {confirmChore.damage_reward} dmg
            </p>
            <p className="text-center text-sm mb-5" style={{ color: '#8a7a6a' }}>Did you complete this chore?</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => executeAttack(confirmChore)} disabled={attacking}
                className="py-3 rounded-xl font-bold disabled:opacity-50"
                style={{ backgroundColor: '#ff7070', color: '#100d0a' }}>
                {attacking ? 'Attacking…' : 'Confirm Attack ⚔️'}
              </button>
              <button onClick={() => setConfirmChore(null)} disabled={attacking}
                className="py-2.5 rounded-xl font-bold border" style={{ borderColor: '#2a1f14', color: '#8a7a6a' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
