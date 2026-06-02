import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F } from '../constants/theme';

const IDLE_FRAMES = [
  require('../assets/characters/1/frame_0000.png'),
  require('../assets/characters/1/frame_0001.png'),
  require('../assets/characters/1/frame_0002.png'),
  require('../assets/characters/1/frame_0003.png'),
  require('../assets/characters/1/frame_0004.png'),
  require('../assets/characters/1/frame_0005.png'),
  require('../assets/characters/1/frame_0006.png'),
  require('../assets/characters/1/frame_0007.png'),
  require('../assets/characters/1/frame_0008.png'),
  require('../assets/characters/1/frame_0009.png'),
  require('../assets/characters/1/frame_0010.png'),
  require('../assets/characters/1/frame_0011.png'),
  require('../assets/characters/1/frame_0012.png'),
  require('../assets/characters/1/frame_0013.png'),
  require('../assets/characters/1/frame_0014.png'),
];

function IdleSprite() {
  const [frame, setFrame] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    ref.current = setInterval(() => setFrame(f => (f + 1) % IDLE_FRAMES.length), Math.round(2000 / 15));
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);
  return <Image source={IDLE_FRAMES[frame]} style={s.sprite} resizeMode="contain" />;
}

// Two side-by-side hero cards. '1' is the playable hero; the second is locked.
export default function CharacterPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={s.row}>
      <Pressable
        style={[s.card, value === '1' && s.cardActive]}
        onPress={() => onChange('1')}
      >
        <IdleSprite />
        <Text style={[s.label, value === '1' && s.labelActive]}>HERO 1</Text>
      </Pressable>

      <View style={[s.card, s.cardLocked]}>
        <Text style={s.lockEmoji}>❓</Text>
        <Text style={s.lockLabel}>COMING SOON</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row:  { flexDirection: 'row', gap: 12, marginBottom: 20 },
  card: {
    flex: 1, aspectRatio: 0.85,
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border,
    borderBottomWidth: 4, borderBottomColor: C.border,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', gap: 4,
  },
  cardActive: { borderColor: C.primary, borderBottomColor: C.primaryDark, backgroundColor: C.cardAlt },
  cardLocked: { opacity: 0.6 },
  sprite: { width: '85%', height: '78%' },
  label:  { fontFamily: F.pixel, fontSize: 7, color: C.textMuted, letterSpacing: 1, marginBottom: 8 },
  labelActive: { color: C.primary },
  lockEmoji: { fontSize: 44 },
  lockLabel: { fontFamily: F.pixel, fontSize: 6, color: C.textDim, letterSpacing: 1, marginBottom: 8 },
});
