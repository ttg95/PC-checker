import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, requireSupabase, type UserProfile } from '../lib/supabase';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
  consumeScanCredit: () => Promise<UserProfile>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const syncProfile = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setProfile(null);
      return null;
    }

    const client = requireSupabase();
    const { data, error } = await client.rpc('sync_current_user_profile');

    if (error) {
      setAuthError(error.message);
      setProfile(null);
      throw error;
    }

    const nextProfile = data as UserProfile;
    setProfile(nextProfile);
    setAuthError(null);
    return nextProfile;
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setAuthError('Account service is not configured. Check the app environment, then restart the app.');
      return;
    }

    const client = requireSupabase();
    let isMounted = true;

    client.auth.getSession().then(async ({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        setAuthError(error.message);
        setLoading(false);
        return;
      }

      setSession(data.session);
      if (data.session) {
        try {
          await syncProfile();
        } catch {
          // authError is set in syncProfile.
        }
      }
      if (isMounted) setLoading(false);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      syncProfile()
        .catch(() => undefined)
        .finally(() => setLoading(false));
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [syncProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const client = requireSupabase();
    setAuthError(null);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const client = requireSupabase();
    setAuthError(null);
    const { data, error } = await client.auth.signUp({ email, password });

    if (error) {
      setAuthError(error.message);
      throw error;
    }

    if (data.session) {
      await syncProfile();
      return null;
    }

    return 'Account created. Confirm the email address, then sign in.';
  }, [syncProfile]);

  const signOut = useCallback(async () => {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();
    if (error) {
      setAuthError(error.message);
      throw error;
    }
    setSession(null);
    setProfile(null);
  }, []);

  const consumeScanCredit = useCallback(async () => {
    const client = requireSupabase();
    setAuthError(null);
    const { data, error } = await client.rpc('consume_scan_credit');

    if (error) {
      setAuthError(error.message);
      throw error;
    }

    const nextProfile = data as UserProfile;
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    profile,
    loading,
    authError,
    isConfigured: isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    refreshProfile: syncProfile,
    consumeScanCredit,
  }), [authError, consumeScanCredit, loading, profile, session, signIn, signOut, signUp, syncProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
