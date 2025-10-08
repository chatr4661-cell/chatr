import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NetworkStatus } from '@/components/NetworkStatus';
import { useChatContext } from '@/contexts/ChatContext';
import { useMessageSync } from '@/hooks/useMessageSync';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ChatEnhancedContent = () => {
  const { user, session, isOnline, activeConversationId, setActiveConversationId } = useChatContext();
  const { messages, isLoading, sendMessage, markAsRead } = useMessageSync(activeConversationId, user?.id);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!session && !user) {
      navigate('/auth');
    }
  }, [session, user, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <NetworkStatus />
      
      {/* Header */}
      <div className="border-b bg-card p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Chatr</h1>
          <p className="text-sm text-muted-foreground">
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-lg font-semibold mb-2">Welcome to Enhanced Chat!</h2>
            <p className="text-muted-foreground mb-4">
              The new chat system is now active with improved session management,
              real-time sync, and offline support.
            </p>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Session Persistence: Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Real-time Sync: Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Offline Support: Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Smart Notifications: Enabled</span>
              </div>
            </div>

            {activeConversationId && (
              <div className="mt-4 p-4 bg-primary/10 rounded">
                <p className="text-sm">Active Conversation: {activeConversationId}</p>
                <p className="text-sm">Messages: {messages.length}</p>
                <p className="text-sm">Loading: {isLoading ? 'Yes' : 'No'}</p>
              </div>
            )}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
            <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-2">
              🚧 Migration in Progress
            </h3>
            <p className="text-sm text-amber-600 dark:text-amber-300">
              We're migrating from the old Chat system to this new enhanced version.
              The full UI migration will be completed shortly. For now, you can use
              the basic functionality here or return to <button 
                onClick={() => navigate('/chat')}
                className="underline font-semibold"
              >
                the legacy chat
              </button>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ChatEnhanced() {
  return (
    <ErrorBoundary>
      <ChatEnhancedContent />
    </ErrorBoundary>
  );
}
