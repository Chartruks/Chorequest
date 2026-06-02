import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { C, F } from '../constants/theme';

interface Props {
  visible: boolean;
  title?: string;
  body?: string;
  onClose: () => void;
}

// Centered, game-styled story popup. Content is a placeholder for now.
export default function StoryModal({ visible, title, body, onClose }: Props) {
  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.emoji}>📖</Text>
          <Text style={s.title}>{title ?? 'THE STORY SO FAR'}</Text>
          <ScrollView style={s.scroll} contentContainerStyle={{ paddingVertical: 4 }}>
            <Text style={s.body}>{body ?? '…'}</Text>
          </ScrollView>
          <Pressable style={({ pressed }) => [s.btn, pressed && s.btnPressed]} onPress={onClose}>
            <Text style={s.btnText}>CONTINUE →</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  card: {
    width: '100%', maxWidth: 420,
    backgroundColor: C.card, borderWidth: 2, borderColor: C.primary,
    borderBottomWidth: 5, borderBottomColor: C.primaryDark,
    borderRadius: 16, padding: 22, alignItems: 'center',
  },
  emoji:  { fontSize: 40, marginBottom: 8 },
  title:  { fontFamily: F.pixel, fontSize: 12, color: C.primary, letterSpacing: 1, textAlign: 'center', marginBottom: 14 },
  scroll: { maxHeight: 260, alignSelf: 'stretch' },
  body:   { fontFamily: F.body, fontSize: 18, color: C.text, lineHeight: 26, textAlign: 'center' },
  btn: {
    marginTop: 18, backgroundColor: C.primary, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center',
    borderBottomWidth: 4, borderBottomColor: C.primaryDark,
  },
  btnPressed: { borderBottomWidth: 0, marginTop: 22 },
  btnText:    { fontFamily: F.pixel, fontSize: 10, color: C.bg, letterSpacing: 1 },
});
