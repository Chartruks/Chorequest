import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { VT323_400Regular } from '@expo-google-fonts/vt323';
import { View } from 'react-native';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { C } from '../constants/theme';

// Looping background music for the whole app.
function BackgroundMusic() {
  const player = useAudioPlayer(require('../assets/music/theme.wav'));
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    player.loop = true;
    player.volume = 0.4;
    player.play();
    return () => { try { player.pause(); } catch {} };
  }, [player]);
  return null;
}

function RouteGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    // You're "in" once an active hero (profile) is loaded — works for both
    // email leaders and code-only family members.
    if (!profile && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (profile && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [profile, loading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PressStart2P: PressStart2P_400Regular,
    VT323: VT323_400Regular,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  }

  return (
    <AuthProvider>
      <BackgroundMusic />
      <RouteGuard>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </RouteGuard>
    </AuthProvider>
  );
}
