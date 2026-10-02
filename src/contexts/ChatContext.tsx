import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { syncAuthToNative } from '@/utils/androidBridge';
import { usePresenceTracking } from '@/hooks/usePresenceTracking';

interface ChatContextType {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  session: Session | null;
  user: User | null;
  isOnline: boolean;
  isAuthReady: boolean;
  isUserOnline: (userId: string) => boolean;
  onlineUsers: Set<string>;
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

  // Real-time presence tracking
  const { onlineUsers, isUserOnline } = usePresenceTracking(user?.id);

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

  // Session management with recovery
  React.useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // First, check for existing session
        const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn('[ChatContext] Session retrieval error:', sessionError);
        }

        if (existingSession && mounted) {
          setSession(existingSession);
          setUser(existingSession.user);
          console.log('✅ Session restored:', existingSession.user.id);
          
          // Sync to native Android on session restore
          syncAuthToNative('SIGNED_IN', existingSession.user.id, existingSession.access_token);
        }
      } catch (error) {
        console.error('[ChatContext] Auth initialization error:', error);
      } finally {
        if (mounted) {
          setIsAuthReady(true);
        }
      }
    };

    initializeAuth();

    // Fallback safety: never leave isAuthReady false for more than 1.5s
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setIsAuthReady(true);
      }
    }, 1500);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      console.log('🔐 Auth event:', event);
      setIsAuthReady(true);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
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
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const value: ChatContextType = React.useMemo(() => ({
    activeConversationId,
    setActiveConversationId,
    session,
    user,
    isOnline,
    isAuthReady,
    isUserOnline,
    onlineUsers,
  }), [
    activeConversationId,
    setActiveConversationId,
    session,
    user,
    isOnline,
    isAuthReady,
    isUserOnline,
    onlineUsers,
  ]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
