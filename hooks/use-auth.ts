import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { identifyUser } from '@/lib/purchases';
import * as Haptics from 'expo-haptics';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_guest: boolean;
  creativity_level: number;
  credits: number;
  primary_goal: string | null;
  interest_areas: string[];
  preferred_tone: string | null;
}

export interface OnboardingData {
  alias: string;
  interests: string[];
  goal: string;
  tone: string;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        identifyUser(session.user.id); // Link to RevenueCat
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
        identifyUser(session.user.id); // Link to RevenueCat
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      
      if (data) {
        setProfile(data);
      }
    } catch (e) {
      console.error('Profile fetch failed', e);
    } finally {
      setLoading(false);
    }
  }

  async function signInGuest(onboarding?: OnboardingData) {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;

      if (data.user) {
        // Initial credits and metadata
        const metadata = {
          full_name: onboarding?.alias || 'Guest',
          primary_goal: onboarding?.goal,
          interest_areas: onboarding?.interests || [],
          preferred_tone: onboarding?.tone,
          credits: 150 // Starting balance
        };

        // Update user metadata for the trigger
        await supabase.auth.updateUser({ data: metadata });
        
        // Manual upsert for immediate availability
        await supabase.from('profiles').upsert({
          id: data.user.id,
          ...metadata,
          is_guest: true,
          updated_at: new Date().toISOString(),
        });

        await fetchProfile(data.user.id);
        await identifyUser(data.user.id);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return { data, error: null };
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }

  /**
   * Placeholder for Social Account Linking (Apple/Google)
   * This is where you would convert an anonymous account to a permanent one.
   */
  async function linkAccount(provider: 'apple' | 'google') {
    // In a real implementation, you would use supabase.auth.signInWithOAuth
    // with options like { redirectTo: '...' }
    // For now, this is a placeholder as per user request.
    console.log(`Linking with ${provider}...`);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  }

  return {
    session,
    user,
    profile,
    loading,
    signInGuest,
    linkAccount,
    signOut,
    isAuthenticated: !!user,
    isGuest: profile?.is_guest ?? false
  };
}
