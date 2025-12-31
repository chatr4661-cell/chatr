import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { syncAuthToNative } from '@/utils/androidBridge';

interface ChatContextType {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  session: Session | null;
  user: User | null;
  isOnline: boolean;
  isAuthReady: boolean;
}

const ChatContext = React.createContext<ChatContextType | null>(null);

export const useChatContext = () => {
  const context = React.useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [isAuthReady, setIsAuthReady] = React.useState(false);

  // Network status monitoring
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Session management with fast initialization
  React.useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // CRITICAL: Try to hydrate user from cached session BEFORE async call
        const cachedSession = localStorage.getItem('sb-sbayuqgomlflmxgicplz-auth-token');
        if (cachedSession && mounted) {
          try {
            const parsed = JSON.parse(cachedSession);
            // Supabase stores session with user object - hydrate it immediately
            if (parsed?.user?.id && parsed?.access_token) {
              setUser(parsed.user);
              setSession(parsed as Session);
              setIsAuthReady(true);
              console.log('⚡ Instant auth hydration from cache:', parsed.user.id);
            }
          } catch (e) {
            // Invalid cache, continue with normal flow
          }
        }
        
        // Now verify session properly (background validation)
        const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session retrieval error:', sessionError);
          // Clear stale cache if session is invalid
          if (mounted) {
            setUser(null);
            setSession(null);
            setIsAuthReady(true);
          }
          return;
        }

        if (existingSession && mounted) {
          setSession(existingSession);
          setUser(existingSession.user);
          setIsAuthReady(true);
          console.log('✅ Session verified:', existingSession.user.id);
          
          // Sync to native Android on session restore (deferred)
          setTimeout(() => {
            syncAuthToNative('SIGNED_IN', existingSession.user.id, existingSession.access_token);
          }, 100);
        } else if (mounted) {
          // No valid session - clear any stale state
          setUser(null);
          setSession(null);
          setIsAuthReady(true);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) setIsAuthReady(true);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      console.log('🔐 Auth event:', event);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsAuthReady(true);
        
        // Sync SIGNED_IN to native Android
        if (newSession?.user) {
          syncAuthToNative('SIGNED_IN', newSession.user.id, newSession.access_token);
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setActiveConversationId(null);
        
        // Sync SIGNED_OUT to native Android
        syncAuthToNative('SIGNED_OUT', null, null);
      } else if (event === 'USER_UPDATED') {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Removed localStorage persistence to ensure conversation list is always default view

  const value: ChatContextType = {
    activeConversationId,
    setActiveConversationId,
    session,
    user,
    isOnline,
    isAuthReady,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
