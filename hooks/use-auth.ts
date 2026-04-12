import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { identifyUser } from '@/lib/purchases';
import * as Haptics from 'expo-haptics';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_guest: boolean;
  credits: number;
  is_pro: boolean;
  discovery_source: string | null;
  country: string | null;
  onboarding_completed: boolean;
  revenuecat_id: string | null;
}

export interface BrandData {
  id: string;
  user_id: string;
  shop_name: string | null;
  industry: string | null;
  brand_identity: string | null;
  has_local_shop: boolean;
  marketing_frequency: string | null;
  primary_goal: string | null;
  preferred_tone: string | null;
  is_default: boolean;
}

export interface OnboardingParams {
  fullName: string;
  discoverySource: string;
  shopName: string;
  industry: string;
  brandIdentity: string;
  hasLocalShop: boolean;
  frequency: string;
  goal: string;
  tone: string;
  platforms: string[];
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [brands, setBrands] = useState<BrandData[]>([]);
  const [loading, setLoading] = useState(true);
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUser(session.user.id);
        if (identifiedUserId.current !== session.user.id) {
          identifyUser(session.user.id); 
          identifiedUserId.current = session.user.id;
        }
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUser(session.user.id);
        if (identifiedUserId.current !== session.user.id) {
          identifyUser(session.user.id); 
          identifiedUserId.current = session.user.id;
        }
      } else {
        setProfile(null);
        setBrands([]);
        setLoading(false);
        identifiedUserId.current = null;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchUser(userId: string) {
    try {
      // 1. Fetch Core User Data
      const { data: uData, error: uError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (uError && uError.code !== 'PGRST116') {
        console.error('Error fetching user:', uError);
      } else if (uData) {
        setProfile(uData);
      } else {
        // Record missing in 'users' table but Auth session exists
        // Clear profile to trigger redirect to onboarding
        setProfile(null);
      }
      
      // 2. Fetch Associated Brands
      const { data: bData, error: bError } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', userId);
        
      if (bData) {
        setBrands(bData);
      }

    } catch (e) {
      console.error('Fetch user failed', e);
    } finally {
      setLoading(false);
    }
  }

  async function signInGuest() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      
      // Identify guest in RevenueCat
      if (data?.user) {
        await identifyUser(data.user.id);
      }
      
      return { data, error: null };
    } catch (error: any) {
      console.error("[Auth] signInGuest error:", error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }

  async function completeOnboarding(params: OnboardingParams) {
    // If state user isn't updated yet (common in long async chains), fetch directly from client
    const currentUser = user || (await supabase.auth.getUser()).data.user;
    if (!currentUser) return { error: new Error('Not authenticated') };
    setLoading(true);
    try {
      
      // Attempt to silently geolocate the user's country
      let resolvedCountry = 'Unknown';
      try {
        const geoResponse = await fetch('https://ipapi.co/json/');
        if (geoResponse.ok) {
           const geoData = await geoResponse.json();
           resolvedCountry = `${geoData.city}, ${geoData.country_name}`;
        }
      } catch (e) {
        console.warn("Geolocation fetch failed, defaulting to Unknown.");
      }

      // 1. Update/Create Core User Table (using upsert to avoid FK errors)
      const { error: userError } = await supabase.from('users').upsert({
        id: currentUser.id,
        full_name: params.fullName,
        discovery_source: params.discoverySource,
        country: resolvedCountry,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      });

      if (userError) throw userError;

      // 2. Insert Default Brand Table
      const { data: brand, error: brandError } = await supabase.from('brands').insert({
        user_id: currentUser.id,
        shop_name: params.shopName,
        industry: params.industry,
        brand_identity: params.brandIdentity,
        has_local_shop: params.hasLocalShop,
        marketing_frequency: params.frequency,
        primary_goal: params.goal,
        preferred_tone: params.tone,
        is_default: true
      }).select().single();

      if (brandError) throw brandError;

      // 3. Map Platforms to Brand
      if (brand && params.platforms.length > 0) {
        // Simple mapping: lowercase and alphanumeric only (e.g., 'Twitter/X' -> 'twitterx')
        const platformMap: Record<string, string> = {
          'Instagram': 'instagram',
          'Facebook': 'facebook',
          'TikTok': 'tiktok',
          'Twitter/X': 'twitter',
          'LinkedIn': 'linkedin',
          'YouTube': 'youtube'
        };

        const platformInserts = params.platforms
          .filter(p => platformMap[p])
          .map(p => ({
            brand_id: brand.id,
            platform_id: platformMap[p]
           }));
           
        if (platformInserts.length > 0) {
          await supabase.from('brand_platforms').insert(platformInserts);
        }
      }

      await fetchUser(currentUser.id);
      return { error: null };
    } catch (err: any) {
      console.error("[Auth] completeOnboarding error", err);
      return { error: err };
    } finally {
      setLoading(false);
    }
  }

  async function linkAccount(provider: 'apple' | 'google') {
    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const redirectUrl = Linking.createURL('/(tabs)');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: !!(Platform.OS === 'ios' || Platform.OS === 'android')
        }
      });

      if (error) throw error;
      
      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (res.type === 'success' && res.url) {
           const { error: sessionError, data: sData } = await supabase.auth.getSessionFromUrl({ url: res.url });
           if (sessionError) throw sessionError;
           
           // Identify user in RevenueCat after successful link/login
           if (sData?.user) {
             await identifyUser(sData.user.id);
           }
        }
      }
      
      return { data, error: null };
    } catch (e: any) {
      Alert.alert("Link Failed", e.message);
      return { data: null, error: e };
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setBrands([]);
    setUser(null);
    setSession(null);
    identifiedUserId.current = null;
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase.from('users').update({
      ...updates,
      updated_at: new Date().toISOString()
    }).eq('id', user.id);
    
    if (!error) await fetchUser(user.id);
    return { error };
  }

  async function updateDefaultBrand(updates: Partial<BrandData>) {
    if (!user) return { error: new Error('Not authenticated') };
    const defaultBrandId = brands.find(b => b.is_default)?.id || brands[0]?.id;
    if (!defaultBrandId) return { error: new Error('No brand found') };

    const { error } = await supabase.from('brands').update({
      ...updates,
      updated_at: new Date().toISOString()
    }).eq('id', defaultBrandId);

    if (!error) await fetchUser(user.id);
    return { error };
  }

  async function updateBrandPlatforms(platformIds: string[]) {
    if (!user) return { error: new Error('Not authenticated') };
    const defaultBrandId = brands.find(b => b.is_default)?.id || brands[0]?.id;
    if (!defaultBrandId) return { error: new Error('No brand found') };

    // 1. Clear old platforms
    await supabase.from('brand_platforms').delete().eq('brand_id', defaultBrandId);

    // 2. Insert new platforms
    if (platformIds.length > 0) {
      const inserts = platformIds.map(pid => ({
        brand_id: defaultBrandId,
        platform_id: pid
      }));
      await supabase.from('brand_platforms').insert(inserts);
    }
    
    return { error: null };
  }

  return {
    session,
    user,
    profile,
    brands,
    defaultBrand: brands.find(b => b.is_default) || brands[0] || null,
    loading,
    signInGuest,
    completeOnboarding,
    linkAccount,
    signOut,
    isAuthenticated: !!user,
    isGuest: profile?.is_guest ?? false,
    hasCompletedOnboarding: profile?.onboarding_completed ?? false
  };
}
