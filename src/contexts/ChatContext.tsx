import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

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

  // Session management with recovery
  React.useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // First, check for existing session
        const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session retrieval error:', sessionError);
          return;
        }

        if (existingSession && mounted) {
          setSession(existingSession);
          setUser(existingSession.user);
          setIsAuthReady(true);
          console.log('✅ Session restored:', existingSession.user.id);
        } else if (mounted) {
          setIsAuthReady(true);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
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
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setActiveConversationId(null);
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
