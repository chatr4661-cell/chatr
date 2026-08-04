import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { onAuthStateChange, getSession, signOut } from './SessionManager';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: any | null;
  roles: string[];
  loading: boolean;
  hasRole: (role: string) => boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider — shared auth state (session + profile + roles) for every CHATR
 * client. Both chatr.chat and chatrchat.in read the same profiles/user_roles
 * rows from the shared backend, so a single account works across domains.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const hydrate = async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      setRoles([]);
      return;
    }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', uid),
    ]);
    setProfile(p ?? null);
    setRoles(((r ?? []) as any[]).map((row) => row.role as string));
  };

  useEffect(() => {
    // Register the listener first, then read the existing session.
    const { data: { subscription } } = onAuthStateChange((_event, s) => {
      setSession(s as Session | null);
      void hydrate((s as Session | null)?.user?.id);
      setLoading(false);
    });

    void (async () => {
      const s = await getSession();
      setSession(s as Session | null);
      await hydrate((s as Session | null)?.user?.id);
      setLoading(false);
    })();

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      roles,
      loading,
      hasRole: (role: string) => roles.includes(role),
      refresh: async () => hydrate(session?.user?.id),
      signOut,
    }),
    [session, profile, roles, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
