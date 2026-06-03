import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

// All characters reuse hero 1's frames for now (placeholder art).
const FRAMES = [
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

// Unlocked = full colour + animated. Locked = greyed-out, first frame only (static).
export default function HeroSprite({ size, unlocked }: { size: number; unlocked: boolean }) {
  const [frame, setFrame] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!unlocked) { setFrame(0); return; }
    ref.current = setInterval(() => setFrame(f => (f + 1) % FRAMES.length), Math.round(2000 / 15));
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [unlocked]);

  return (
    <View style={{ width: size, height: size }}>
      <Image
        source={FRAMES[unlocked ? frame : 0]}
        style={[s.img, !unlocked && s.locked]}
        resizeMode="contain"
      />
      {!unlocked && <Text style={[s.lock, { fontSize: size * 0.3 }]}>🔒</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  img:    { width: '100%', height: '100%' },
  locked: { opacity: 0.28 },
  lock:   { position: 'absolute', top: '50%', left: 0, right: 0, textAlign: 'center', marginTop: -12 },
});
