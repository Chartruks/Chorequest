import { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

const ACTIVE_KEY = 'active_profile_id';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Set the active hero (used by the join-family flow after pick/create). */
  setActiveProfile: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  setActiveProfile: async () => {},
});

async function registerPushToken(profileId: string) {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('chores', {
        name: 'Chore notifications',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'e8e98649-30e5-4c69-813a-dafedc0f95db',
    });
    await supabase.from('profiles').update({ push_token: token.data } as any).eq('id', profileId);
  } catch { /* push token optional */ }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession]     = useState<Session | null>(null);
  const [profile, setProfile]     = useState<Profile | null>(null);
  const [activeId, setActiveId]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  async function fetchProfile(id: string): Promise<Profile | null> {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    setProfile(data ?? null);
    return data ?? null;
  }

  // Resolve the active hero: prefer the locally-saved profile id; for email
  // (non-anonymous) accounts default to the auth user's own profile.
  async function resolveActive(sess: Session | null) {
    let id = await SecureStore.getItemAsync(ACTIVE_KEY);
    if (!id && sess?.user && !(sess.user as any).is_anonymous) {
      id = sess.user.id;
      await SecureStore.setItemAsync(ACTIVE_KEY, id);
    }
    setActiveId(id);
    if (id) {
      const p = await fetchProfile(id);
      if (p) registerPushToken(id);
    } else {
      setProfile(null);
    }
  }

  async function setActiveProfile(id: string) {
    await SecureStore.setItemAsync(ACTIVE_KEY, id);
    setActiveId(id);
    await fetchProfile(id);
    registerPushToken(id);
  }

  async function refreshProfile() {
    if (activeId) await fetchProfile(activeId);
  }

  async function signOut() {
    await SecureStore.deleteItemAsync(ACTIVE_KEY);
    setActiveId(null);
    setProfile(null);
    await supabase.auth.signOut();
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      await resolveActive(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (event === 'SIGNED_OUT') {
        await SecureStore.deleteItemAsync(ACTIVE_KEY);
        setActiveId(null);
        setProfile(null);
        return;
      }
      // Email sign-in → activate the user's own profile. Anonymous device sessions
      // wait for the join flow to call setActiveProfile().
      if (session?.user && !(session.user as any).is_anonymous) {
        await SecureStore.setItemAsync(ACTIVE_KEY, session.user.id);
        setActiveId(session.user.id);
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile, loading, signOut, refreshProfile, setActiveProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
