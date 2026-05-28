import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CHAPTER_TITLES, STORY_EVENTS } from '../lib/storyEngine';
import { Database } from '../types/database';

type StoryEvent = Database['public']['Tables']['story_events']['Row'];

interface Props {
  event: StoryEvent;
  onDismiss: () => void;
}

export default function StoryModal({ event, onDismiss }: Props) {
  const def = STORY_EVENTS.find(e => e.key === event.event_key);

  return (
    <Modal animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.chapter}>Chapter {event.chapter}: {CHAPTER_TITLES[event.chapter]}</Text>
            <Text style={styles.emoji}>{def?.emoji ?? '📌'}</Text>
            <Text style={styles.title}>{def?.title ?? event.event_key}</Text>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.narrative}>{def?.narrative ?? 'A new event has occurred.'}</Text>
          </ScrollView>

          <Pressable style={styles.dismissBtn} onPress={onDismiss}>
            <Text style={styles.dismissText}>Acknowledged ›</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000cc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#0d0d1f',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#bf5af2',
    maxHeight: '80%',
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderColor: '#1e1e3f',
    gap: 8,
  },
  chapter: { color: '#bf5af2', fontWeight: '700', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  emoji: { fontSize: 52 },
  title: { color: '#fff', fontWeight: '800', fontSize: 22, textAlign: 'center' },
  scroll: { maxHeight: 300 },
  scrollContent: { padding: 24 },
  narrative: { color: '#c8c8e0', fontSize: 15, lineHeight: 24 },
  dismissBtn: {
    backgroundColor: '#bf5af2',
    margin: 20,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dismissText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
