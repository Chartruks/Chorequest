import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import StoryModal from '../../components/StoryModal';
import { useAuth } from '../../context/AuthContext';
import { CHAPTER_TITLES, isEventUnread, STORY_EVENTS } from '../../lib/storyEngine';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';

type StoryEvent = Database['public']['Tables']['story_events']['Row'];

export default function StoryScreen() {
  const { profile, gameState } = useAuth();
  const [events, setEvents] = useState<StoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalEvent, setModalEvent] = useState<StoryEvent | null>(null);

  async function load() {
    if (!profile?.household_id) { setLoading(false); return; }
    const { data } = await supabase
      .from('story_events')
      .select('*')
      .eq('household_id', profile.household_id)
      .order('triggered_at', { ascending: true });
    setEvents(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile?.household_id]);

  // Auto-show first unread event on mount
  useEffect(() => {
    if (!loading && events.length > 0 && profile) {
      const unread = events.find(e => isEventUnread(e, profile.id));
      if (unread) setModalEvent(unread);
    }
  }, [loading]);

  async function markRead(event: StoryEvent) {
    if (!profile) return;
    await supabase.from('story_events').update({
      read_by: [...event.read_by, profile.id],
    }).eq('id', event.id);
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, read_by: [...e.read_by, profile.id] } : e));
    setModalEvent(null);
  }

  const currentChapter = gameState?.current_chapter ?? 1;

  if (!profile?.household_id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📖</Text>
          <Text style={styles.emptyTitle}>No Story Yet</Text>
          <Text style={styles.emptyText}>Create or join a crew to begin the chronicle.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📖 Chronicle</Text>
        <Text style={styles.headerSub}>Chapter {currentChapter}: {CHAPTER_TITLES[currentChapter] ?? 'Unknown'}</Text>
      </View>

      {/* Chapter progress */}
      <View style={styles.chapters}>
        {[1, 2, 3, 4, 5].map(ch => {
          const unlocked = ch <= currentChapter;
          return (
            <View key={ch} style={[styles.chapterDot, unlocked && styles.chapterDotUnlocked]}>
              <Text style={[styles.chapterNum, unlocked && styles.chapterNumUnlocked]}>{ch}</Text>
            </View>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color="#00e5ff" style={{ marginTop: 40 }} />
      ) : events.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📡</Text>
          <Text style={styles.emptyTitle}>Your story has not begun</Text>
          <Text style={styles.emptyText}>Complete missions and explore the galaxy to trigger story events.</Text>
        </View>
      ) : (
        <FlatList
          data={[...events].reverse()}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const def = STORY_EVENTS.find(e => e.key === item.event_key);
            const unread = profile ? isEventUnread(item, profile.id) : false;
            return (
              <View
                style={[styles.entry, unread && styles.entryUnread]}
              >
                <Text style={styles.entryEmoji}>{def?.emoji ?? '📌'}</Text>
                <View style={styles.entryBody}>
                  <View style={styles.entryTitleRow}>
                    <Text style={styles.entryTitle}>{def?.title ?? item.event_key}</Text>
                    {unread && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.entryChapter}>Chapter {item.chapter}: {CHAPTER_TITLES[item.chapter]}</Text>
                  <Text style={styles.entryDate}>{new Date(item.triggered_at).toLocaleDateString()}</Text>
                </View>
                {unread && (
                  <View>
                    <Text style={styles.readBtn} onPress={() => setModalEvent(item)}>Read</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {modalEvent && (
        <StoryModal
          event={modalEvent}
          onDismiss={() => markRead(modalEvent)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05050f' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#00e5ff' },
  headerSub: { fontSize: 13, color: '#bf5af2', marginTop: 2 },
  chapters: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 20 },
  chapterDot: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0d0d1f', borderWidth: 2, borderColor: '#1e1e3f', alignItems: 'center', justifyContent: 'center' },
  chapterDotUnlocked: { borderColor: '#00e5ff', backgroundColor: '#00e5ff22' },
  chapterNum: { color: '#555570', fontWeight: '800', fontSize: 16 },
  chapterNumUnlocked: { color: '#00e5ff' },
  list: { padding: 16, gap: 10 },
  entry: {
    backgroundColor: '#0d0d1f',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1e3f',
    gap: 12,
  },
  entryUnread: { borderColor: '#bf5af2' },
  entryEmoji: { fontSize: 28, width: 36, textAlign: 'center' },
  entryBody: { flex: 1, gap: 2 },
  entryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entryTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#bf5af2' },
  entryChapter: { color: '#6b6b8a', fontSize: 12 },
  entryDate: { color: '#555570', fontSize: 11 },
  readBtn: { color: '#bf5af2', fontWeight: '700', fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: '#6b6b8a', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
