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

  // Session management - simple and fast
  React.useEffect(() => {
    let mounted = true;

    // Get session immediately (Supabase caches this internally)
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsAuthReady(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsAuthReady(true);
      
      // Sync to native Android (deferred)
      if (newSession?.user) {
        setTimeout(() => syncAuthToNative('SIGNED_IN', newSession.user.id, newSession.access_token), 50);
      } else if (event === 'SIGNED_OUT') {
        setActiveConversationId(null);
        syncAuthToNative('SIGNED_OUT', null, null);
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
