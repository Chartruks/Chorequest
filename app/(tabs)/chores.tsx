import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Dimensions, Modal, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { calcLevel, calcTotalDamage, calcMaxHp, maxHpForLevel, getEquippedBonus, MAX_FLOOR } from '../../lib/towerEngine';
import { playAttackSfx } from '../../lib/sfx';
import { t } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { C, F } from '../../constants/theme';

type Chore = Database['public']['Tables']['chores']['Row'];
type PlayerItem = any;

const SW = Dimensions.get('window').width;
const CARD_W = Math.floor((SW - 24 - 16) / 3);

const STATUS_COLORS: Record<string, string> = {
  pending: C.primary, in_progress: C.gold, completed: C.hp, approved: C.hp,
};
const CATEGORY_EMOJI: Record<string, string> = {
  maintenance: '⚙️', learning: '📚', food: '🍽️', family: '👨‍👩‍👧', work: '💼',
};
const CATEGORY_COLOR: Record<string, string> = {
  maintenance: C.gold, learning: C.xp, food: C.hp, family: '#ff9f9f', work: C.primary,
};

// ── Chore templates ──────────────────────────────────────────────
type Template = { title: string; category: string; recurrence: 'daily' | 'weekly'; points_reward: number; xp_reward: number; damage_reward: number };
const TEMPLATES: Template[] = [
  { title: 'Make Your Bed',       category: 'maintenance', recurrence: 'daily',  points_reward: 10, xp_reward: 10, damage_reward: 5 },
  { title: 'Wash the Dishes',     category: 'maintenance', recurrence: 'daily',  points_reward: 15, xp_reward: 15, damage_reward: 8 },
  { title: 'Take Out Trash',      category: 'maintenance', recurrence: 'daily',  points_reward: 15, xp_reward: 15, damage_reward: 8 },
  { title: '20 Min Reading',      category: 'learning',    recurrence: 'daily',  points_reward: 20, xp_reward: 20, damage_reward: 10 },
  { title: 'Feed the Pets',       category: 'family',      recurrence: 'daily',  points_reward: 15, xp_reward: 15, damage_reward: 8 },
  { title: 'Tidy Your Room',      category: 'maintenance', recurrence: 'daily',  points_reward: 10, xp_reward: 10, damage_reward: 5 },
  { title: 'Practice Instrument', category: 'learning',    recurrence: 'daily',  points_reward: 20, xp_reward: 20, damage_reward: 10 },
  { title: 'Family Dinner',       category: 'family',      recurrence: 'daily',  points_reward: 10, xp_reward: 10, damage_reward: 5 },
  { title: 'Vacuum All Rooms',    category: 'maintenance', recurrence: 'weekly', points_reward: 40, xp_reward: 40, damage_reward: 20 },
  { title: 'Clean Bathroom',      category: 'maintenance', recurrence: 'weekly', points_reward: 35, xp_reward: 35, damage_reward: 18 },
  { title: 'Mow the Lawn',        category: 'maintenance', recurrence: 'weekly', points_reward: 40, xp_reward: 40, damage_reward: 20 },
  { title: 'Grocery Run',         category: 'family',      recurrence: 'weekly', points_reward: 30, xp_reward: 30, damage_reward: 15 },
  { title: 'Do the Laundry',      category: 'maintenance', recurrence: 'weekly', points_reward: 30, xp_reward: 30, damage_reward: 15 },
  { title: 'Study Session (1h)',   category: 'learning',    recurrence: 'weekly', points_reward: 50, xp_reward: 50, damage_reward: 25 },
  { title: 'Family Game Night',   category: 'family',      recurrence: 'weekly', points_reward: 25, xp_reward: 25, damage_reward: 12 },
  { title: 'Deep Clean Kitchen',  category: 'maintenance', recurrence: 'weekly', points_reward: 60, xp_reward: 60, damage_reward: 30 },
  { title: 'Science Project',     category: 'learning',    recurrence: 'weekly', points_reward: 80, xp_reward: 80, damage_reward: 40 },
  { title: 'Help a Neighbour',    category: 'family',      recurrence: 'weekly', points_reward: 50, xp_reward: 50, damage_reward: 25 },
];

// ── Helper ───────────────────────────────────────────────────────
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={s.sectionHead}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionBadge}><Text style={s.sectionBadgeText}>{count}</Text></View>
    </View>
  );
}

// ── Create Chore Modal ───────────────────────────────────────────
function CreateChoreModal({ visible, householdId, createdBy, onClose, onCreated }: {
  visible: boolean; householdId: string | null; createdBy: string;
  onClose: () => void; onCreated: () => void;
}) {
  const [selected, setSelected]  = useState<Template | null>(null);
  const [title, setTitle]        = useState('');
  const [points, setPoints]      = useState('');
  const [xp, setXp]              = useState('');
  const [dmg, setDmg]            = useState('');
  const [recurrence, setRecurrence] = useState<'daily' | 'weekly'>('daily');
  const [saving, setSaving]      = useState(false);

  function pick(t: Template) {
    setSelected(t);
    setTitle(t.title);
    setPoints(String(t.points_reward));
    setXp(String(t.xp_reward));
    setDmg(String(t.damage_reward));
    setRecurrence(t.recurrence);
  }

  function reset() { setSelected(null); setTitle(''); setPoints(''); setXp(''); setDmg(''); }

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    // Damage is fixed by type: weak (daily) = 1, strong (weekly) = 3.
    // XP + gold now come from defeating monsters, so chore reward fields are 0.
    await supabase.from('chores').insert({
      household_id:   householdId ?? null,
      created_by:     createdBy,
      title:          title.trim(),
      category:       selected?.category ?? 'maintenance',
      recurrence,
      status:         'pending',
      points_reward:  0,
      xp_reward:      0,
      damage_reward:  recurrence === 'weekly' ? 3 : 1,
    });
    setSaving(false);
    reset();
    onCreated();
  }

  const daily  = TEMPLATES.filter(t => t.recurrence === 'daily');
  const weekly = TEMPLATES.filter(t => t.recurrence === 'weekly');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={ms.container}>
        {/* Header */}
        <View style={ms.header}>
          <Text style={ms.headerTitle}>{t('cc.addQuest')}</Text>
          <Pressable onPress={() => { reset(); onClose(); }} style={ms.closeBtn}>
            <Text style={ms.closeTxt}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={ms.scroll} showsVerticalScrollIndicator={false}>

          {/* Template picker */}
          <Text style={ms.sectionLbl}>{t('cc.dailyTemplates')}</Text>
          <View style={ms.tplGrid}>
            {daily.map(t => (
              <Pressable key={t.title} style={[ms.tpl, selected?.title === t.title && ms.tplActive]} onPress={() => pick(t)}>
                <Text style={ms.tplEmoji}>{CATEGORY_EMOJI[t.category] ?? '📋'}</Text>
                <Text style={ms.tplTitle} numberOfLines={2}>{t.title.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[ms.sectionLbl, { marginTop: 16 }]}>{t('cc.weeklyTemplates')}</Text>
          <View style={ms.tplGrid}>
            {weekly.map(t => (
              <Pressable key={t.title} style={[ms.tpl, selected?.title === t.title && ms.tplActive]} onPress={() => pick(t)}>
                <Text style={ms.tplEmoji}>{CATEGORY_EMOJI[t.category] ?? '📋'}</Text>
                <Text style={ms.tplTitle} numberOfLines={2}>{t.title.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>

          {/* Edit form */}
          <View style={ms.formCard}>
            <Text style={ms.sectionLbl}>{t('cc.questDetails')}</Text>

            <TextInput
              style={ms.input}
              placeholder={t('cc.questTitle')}
              placeholderTextColor={C.textDim}
              value={title}
              onChangeText={setTitle}
            />

            {/* Recurrence toggle — daily = weak attack (1 dmg), weekly = strong (3 dmg) */}
            <View style={ms.toggle}>
              {(['daily', 'weekly'] as const).map(r => (
                <Pressable key={r} style={[ms.toggleBtn, recurrence === r && ms.toggleBtnActive]} onPress={() => setRecurrence(r)}>
                  <Text style={[ms.toggleTxt, recurrence === r && ms.toggleTxtActive]}>
                    {r === 'daily' ? t('cc.daily') : t('cc.weekly')}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [ms.saveBtn, saving && { opacity: 0.5 }, pressed && ms.saveBtnPressed]}
              onPress={save} disabled={saving || !title.trim()}
            >
              <Text style={ms.saveTxt}>{saving ? t('cc.adding') : t('cc.add')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Confirm Modal ────────────────────────────────────────────────
function ConfirmChoreModal({ chore, busy, dead, reviveProgress, equipDmg, onClose, onConfirm }: {
  chore: Chore | null;
  busy: boolean;
  dead: boolean;
  reviveProgress: number;
  equipDmg: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!chore) return null;
  const strong = chore.recurrence === 'weekly' || chore.recurrence === 'special';
  return (
    <View style={cm.overlay}>
      <Pressable style={cm.backdrop} onPress={onClose} />
      <View style={cm.sheet}>
        <View style={cm.handle} />
        <Text style={cm.emoji}>{CATEGORY_EMOJI[chore.category] ?? '📋'}</Text>
        <Text style={cm.title}>{chore.title.toUpperCase()}</Text>
        {chore.description ? <Text style={cm.desc}>{chore.description}</Text> : null}
        <View style={cm.rewards}>
          {dead ? (
            <Text style={[cm.chip, { color: C.hp }]}>{t('chores.reviveTag', { n: reviveProgress })}</Text>
          ) : (
            <Text style={[cm.chip, { color: strong ? '#ff7070' : C.gold }]}>
              {strong ? t('chores.tagStrong') : t('chores.tagWeak')} · ⚔️ {chore.damage_reward + equipDmg} DMG
            </Text>
          )}
        </View>
        <Text style={cm.prompt}>{t('chores.didComplete')}</Text>
        <View style={cm.actions}>
          <Pressable
            style={[cm.btn, { backgroundColor: dead ? C.hp : C.damage, borderBottomColor: dead ? '#2d6e43' : '#a03030' }, busy && { opacity: 0.5 }]}
            disabled={busy}
            onPress={onConfirm}
          >
            <Text style={cm.btnTxt}>{busy ? '…' : dead ? t('chores.confirmRevive') : t('chores.confirmAttack')}</Text>
          </Pressable>
          <Pressable style={cm.cancelBtn} onPress={onClose} disabled={busy}><Text style={cm.cancelTxt}>{t('chores.cancel')}</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────
export default function ChoresScreen({ onClose, sheetMode, onDefeat }: { onClose?: () => void; sheetMode?: boolean; onDefeat?: (info: { levelUp: { from: number; to: number; hpGain: number } | null; clearedFloor: number }) => void }) {
  const { profile, refreshProfile } = useAuth();
  const [chores, setChores]           = useState<Chore[]>([]);
  const [playerItems, setPlayerItems] = useState<PlayerItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [selected, setSelected]       = useState<Chore | null>(null);
  const [busy, setBusy]               = useState(false);

  async function load() {
    if (!profile) { setLoading(false); return; }
    // Household chores are shared; solo players see their own (household_id null).
    let choreQ = supabase.from('chores').select('*');
    choreQ = profile.household_id
      ? choreQ.eq('household_id', profile.household_id)
      : choreQ.is('household_id', null).eq('created_by', profile.id);
    const [{ data: c }, { data: pi }] = await Promise.all([
      choreQ.order('created_at', { ascending: false }),
      supabase.from('player_items').select('*, store_items(*)').eq('profile_id', profile.id),
    ]);
    setChores(c ?? []);
    setPlayerItems(pi ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile?.household_id, profile?.id]);

  // Notify every other family member that this player attacked
  async function notifyFamily(chore: Chore, damage: number) {
    if (!profile?.household_id) return;
    try {
      const { data: members } = await supabase
        .from('profiles').select('id, push_token')
        .eq('household_id', profile.household_id);
      const tokens = (members ?? [])
        .filter(m => m.id !== profile.id && (m as any).push_token)
        .map(m => (m as any).push_token);
      if (tokens.length === 0) return;
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          tokens.map(to => ({
            to,
            title: '⚔️ Attack!',
            body: `${profile.username ?? 'A member'} did "${chore.title}" (${damage} dmg)`,
            data: { choreId: chore.id },
          }))
        ),
      });
    } catch { /* silent */ }
  }

  // Tapping a chore = the current player completes it.
  // While alive: damage your monster. While defeated: it counts toward reviving.
  async function executeAttack(chore: Chore) {
    if (!profile) return;
    setBusy(true);

    const dead = profile.player_hp <= 0;
    let defeated = false;
    let levelInfo: { from: number; to: number; hpGain: number } | null = null;

    if (dead) {
      // Revive: 2 chores to come back to life
      const prog = (profile.revive_progress ?? 0) + 1;
      const updates: Record<string, any> = prog >= 2
        ? { revive_progress: 0, player_hp: calcMaxHp(profile, playerItems), revives: (profile.revives ?? 0) + 1 }
        : { revive_progress: prog };
      updates.chores_done = (profile.chores_done ?? 0) + 1;
      await supabase.from('profiles').update(updates).eq('id', profile.id);
    } else {
      playAttackSfx(profile.character_type);   // per-character attack sound
      const damage       = calcTotalDamage(chore.damage_reward, profile, playerItems);
      const newMonsterHp = Math.max(0, profile.monster_hp - damage);
      defeated = newMonsterHp === 0;
      const updates: Record<string, any> = { monster_hp: newMonsterHp };
      updates.chores_done = (profile.chores_done ?? 0) + 1;
      if (defeated) updates.monsters_defeated = (profile.monsters_defeated ?? 0) + 1;

      if (defeated) {
        // Award the defeated floor's xp + gold, then advance (floor 10 repeats).
        const { data: cur } = await supabase
          .from('tower_floors').select('xp_reward, money_reward')
          .eq('floor', profile.tower_floor).single();
        const newXp    = profile.xp + (cur?.xp_reward ?? 0);
        const newLevel = calcLevel(newXp);
        updates.xp     = newXp;
        updates.points = profile.points + (cur?.money_reward ?? 0);
        if (newLevel > profile.level) {
          levelInfo             = { from: profile.level, to: newLevel, hpGain: maxHpForLevel(newLevel) - maxHpForLevel(profile.level) };
          updates.level         = newLevel;
          updates.player_max_hp = maxHpForLevel(newLevel);
          updates.player_hp     = maxHpForLevel(newLevel); // heal to full on level up
        }
        const nextFloor = Math.min(profile.tower_floor + 1, MAX_FLOOR);
        const { data: nf } = await supabase
          .from('tower_floors').select('monster_max_hp').eq('floor', nextFloor).single();
        if (nf) {
          updates.tower_floor = nextFloor;
          updates.monster_hp  = nf.monster_max_hp;
        }
      }
      await supabase.from('profiles').update(updates).eq('id', profile.id);
    }

    // Always log the chore; notify family if in one.
    await supabase.from('chore_log').insert({
      household_id: profile.household_id ?? null,
      profile_id:   profile.id,
      chore_title:  chore.title,
      damage:       dead ? 0 : calcTotalDamage(chore.damage_reward, profile, playerItems),
    } as any);
    if (profile.household_id) await notifyFamily(chore, dead ? 0 : calcTotalDamage(chore.damage_reward, profile, playerItems));

    await refreshProfile();
    setBusy(false);
    setSelected(null);
    await load();
    if (defeated && onDefeat) onDefeat({ levelUp: levelInfo, clearedFloor: profile.tower_floor });
  }

  const weak   = chores.filter(c => c.recurrence !== 'weekly' && c.recurrence !== 'special');
  const strong = chores.filter(c => c.recurrence === 'weekly' || c.recurrence === 'special');
  // Leaders manage the family's chores; solo players (no household) manage their own.
  const canManage = !!profile && (profile.is_leader || !profile.household_id);
  const isDead    = !!profile && profile.player_hp <= 0;
  const equipDmg  = getEquippedBonus(playerItems).damage;   // equipped weapon bonus

  function renderChore(item: Chore) {
    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          s.card,
          pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
        ]}
        onPress={() => setSelected(item)}
      >
        <View style={s.cardTop}>
          <Text style={s.cardEmoji}>{CATEGORY_EMOJI[item.category] ?? '📋'}</Text>
          <View style={s.cardTopRight}>
            <Text style={[s.cardDmg, { color: C.damage }]}>⚔️ {item.damage_reward + equipDmg}</Text>
          </View>
        </View>
        <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
      </Pressable>
    );
  }

  function renderSection(title: string, items: Chore[]) {
    if (items.length === 0) return null;
    return (
      <View style={s.section}>
        <SectionHeader title={title} count={items.length} />
        {chunk(items, 3).map((row, i) => (
          <View key={i} style={s.row}>
            {row.map(renderChore)}
            {row.length < 3 && Array(3 - row.length).fill(null).map((_, j) => (
              <View key={j} style={s.cardPlaceholder} />
            ))}
          </View>
        ))}
      </View>
    );
  }

  if (!profile) return null;

  const Root = sheetMode ? View : SafeAreaView;

  return (
    <Root style={s.container}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          {onClose && (
            <Pressable onPress={onClose} style={s.backBtn}>
              <Text style={s.backBtnText}>←</Text>
            </Pressable>
          )}
          <View>
            <Text style={s.headerTitle}>{isDead ? t('chores.defeated') : t('chores.attack')}</Text>
            <Text style={s.headerSub}>
              {isDead ? t('chores.reviveHint', { n: 2 - (profile.revive_progress ?? 0) }) : t('chores.tapToStrike')}
            </Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <View style={s.moneyBadge}><Text style={s.moneyText}>💰 {profile.points}</Text></View>
          {canManage && (
            <Pressable style={s.addBtn} onPress={() => setShowCreate(true)}>
              <Text style={s.addBtnText}>＋</Text>
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : chores.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>📋</Text>
          <Text style={s.emptyTitle}>{t('chores.noQuests')}</Text>
          <Text style={s.emptyBody}>{t('chores.noQuestsHint')}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
          {renderSection(t('chores.weak'), weak)}
          {renderSection(t('chores.strong'), strong)}
        </ScrollView>
      )}

      {canManage && (
        <CreateChoreModal
          visible={showCreate}
          householdId={profile.household_id}
          createdBy={profile.id}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}

      <ConfirmChoreModal
        chore={selected}
        busy={busy}
        dead={isDead}
        reviveProgress={profile.revive_progress ?? 0}
        equipDmg={equipDmg}
        onClose={() => setSelected(null)}
        onConfirm={() => selected && executeAttack(selected)}
      />
    </Root>
  );
}

// ── Styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn:      { width: 36, height: 36, backgroundColor: C.card, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border },
  backBtnText:  { fontFamily: F.pixel, fontSize: 14, color: C.textMuted, lineHeight: 20 },
  headerTitle:  { fontFamily: F.pixel, fontSize: 12, color: C.primary, marginBottom: 4 },
  headerSub:    { fontFamily: F.body, fontSize: 16, color: C.textMuted },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moneyBadge:   { backgroundColor: C.card, borderWidth: 2, borderColor: C.gold, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  moneyText:    { fontFamily: F.pixel, fontSize: 9, color: C.gold },
  addBtn:       { width: 36, height: 36, backgroundColor: C.primary, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: C.primaryDark },
  addBtnText:   { fontFamily: F.pixel, fontSize: 18, color: C.bg, lineHeight: 22 },

  scroll:  { padding: 12, paddingBottom: 24 },
  section: { marginBottom: 20 },

  sectionHead:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle:     { fontFamily: F.pixel, fontSize: 9, color: C.text, letterSpacing: 1 },
  sectionBadge:     { backgroundColor: C.border, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  sectionBadgeText: { fontFamily: F.pixel, fontSize: 7, color: C.textMuted },

  row:             { flexDirection: 'row', gap: 8, marginBottom: 8 },
  cardPlaceholder: { width: CARD_W },

  card: {
    width: CARD_W, backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderRadius: 16, padding: 10, overflow: 'hidden',
  },
  cardTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 6 },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardEmoji:    { fontSize: 22 },
  cardDmg:      { fontFamily: F.pixel, fontSize: 9 },
  actionPill: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 3 },
  actionText: { fontFamily: F.pixel, fontSize: 6, letterSpacing: 0.3 },
  cardTitle:  { fontFamily: F.pixel, fontSize: 9, color: C.text, lineHeight: 15 },

  empty:      { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontFamily: F.pixel, fontSize: 10, color: C.text, marginBottom: 10, textAlign: 'center' },
  emptyBody:  { fontFamily: F.body, fontSize: 17, color: C.textMuted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 24 },
});

const ms = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 2, borderBottomColor: C.border },
  headerTitle:{ fontFamily: F.pixel, fontSize: 11, color: C.primary, letterSpacing: 1 },
  closeBtn:  { width: 32, height: 32, backgroundColor: C.card, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  closeTxt:  { fontFamily: F.pixel, fontSize: 10, color: C.textMuted },
  scroll:    { padding: 16, paddingBottom: 40 },

  sectionLbl: { fontFamily: F.pixel, fontSize: 8, color: C.textMuted, letterSpacing: 1, marginBottom: 10 },

  tplGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tpl: {
    width: (SW - 32 - 16) / 3, backgroundColor: C.card,
    borderWidth: 2, borderColor: C.border, borderRadius: 14,
    padding: 10, alignItems: 'center', gap: 6,
  },
  tplActive:  { borderColor: C.primary, backgroundColor: C.cardAlt },
  tplEmoji:   { fontSize: 22 },
  tplTitle:   { fontFamily: F.pixel, fontSize: 6, color: C.textMuted, textAlign: 'center', lineHeight: 12 },

  formCard: { marginTop: 20, backgroundColor: C.card, borderWidth: 2, borderColor: C.border, borderRadius: 16, padding: 16 },
  input: {
    backgroundColor: C.bg, borderWidth: 2, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, color: C.text,
    fontFamily: F.pixel, fontSize: 8, marginBottom: 12, letterSpacing: 0.5,
  },
  toggle:        { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toggleBtn:     { flex: 1, backgroundColor: C.bg, borderWidth: 2, borderColor: C.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  toggleBtnActive:{ borderColor: C.primary, backgroundColor: C.cardAlt },
  toggleTxt:     { fontFamily: F.pixel, fontSize: 7, color: C.textMuted },
  toggleTxtActive:{ color: C.primary },

  rewardRow:   { flexDirection: 'row', gap: 8, marginBottom: 16 },
  rewardField: { flex: 1 },
  rewardLbl:   { fontFamily: F.pixel, fontSize: 6, color: C.textMuted, marginBottom: 6 },
  rewardInput: {
    backgroundColor: C.bg, borderWidth: 2, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 10, color: C.text,
    fontFamily: F.pixel, fontSize: 8, textAlign: 'center',
  },

  saveBtn:       { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: C.primaryDark },
  saveBtnPressed:{ borderBottomWidth: 0, marginTop: 4 },
  saveTxt:       { fontFamily: F.pixel, fontSize: 9, color: C.bg, letterSpacing: 1 },
});

const cm = StyleSheet.create({
  overlay:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, elevation: 50 },
  backdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: {
    backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 2, borderColor: C.border,
    paddingHorizontal: 20, paddingBottom: 44, paddingTop: 14,
  },
  handle:  { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  emoji:   { fontSize: 36, textAlign: 'center', marginBottom: 6 },
  title:   { fontFamily: F.pixel, fontSize: 11, color: C.text, textAlign: 'center', marginBottom: 10, letterSpacing: 1, lineHeight: 20 },
  desc:    { fontFamily: F.body, fontSize: 14, color: C.textMuted, textAlign: 'center', marginBottom: 12 },
  rewards: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 12 },
  chip:    { fontFamily: F.pixel, fontSize: 9 },
  prompt:  { fontFamily: F.body, fontSize: 17, color: C.text, textAlign: 'center', marginBottom: 18 },
  actions: { gap: 10 },
  btn: {
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    borderBottomWidth: 3,
  },
  btnTxt:    { fontFamily: F.pixel, fontSize: 9, color: C.bg, letterSpacing: 1 },
  cancelBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 2, borderColor: C.border },
  cancelTxt: { fontFamily: F.pixel, fontSize: 8, color: C.textMuted, letterSpacing: 1 },
});
