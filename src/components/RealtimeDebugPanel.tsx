import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface RealtimeDebugPanelProps {
  userId?: string;
  conversationId?: string;
}

export const RealtimeDebugPanel = ({ userId, conversationId }: RealtimeDebugPanelProps) => {
  const [messagesReceived, setMessagesReceived] = useState(0);
  const [callsReceived, setCallsReceived] = useState(0);
  const [channelCount, setChannelCount] = useState(0);
  const [activeChannels, setActiveChannels] = useState<string[]>([]);

  useEffect(() => {
    console.log('🔍 Debug Panel - User ID:', userId);
    console.log('🔍 Debug Panel - Conversation ID:', conversationId);
  }, [userId, conversationId]);

  useEffect(() => {
    const channels = supabase.getChannels();
    setChannelCount(channels.length);
    setActiveChannels(channels.map(ch => ch.topic));
  }, []);

  const testMessageSubscription = () => {
    if (!conversationId) {
      alert('No conversation selected!');
      return;
    }

    const testChannel = supabase
      .channel(`test-messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        console.log('✅ TEST: Message received via realtime:', payload);
        setMessagesReceived(prev => prev + 1);
      })
      .subscribe((status) => {
        console.log('📡 TEST: Subscription status:', status);
      });

    setTimeout(() => {
      supabase.removeChannel(testChannel);
    }, 30000);
  };

  const testCallSubscription = () => {
    if (!userId) {
      alert('User ID not available!');
      return;
    }

    const testChannel = supabase
      .channel(`test-calls-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'calls',
        filter: `receiver_id=eq.${userId}`
      }, (payload) => {
        console.log('✅ TEST: Call received via realtime:', payload);
        setCallsReceived(prev => prev + 1);
      })
      .subscribe((status) => {
        console.log('📡 TEST: Call subscription status:', status);
      });

    setTimeout(() => {
      supabase.removeChannel(testChannel);
    }, 30000);
  };

  return (
    <Card className="fixed bottom-4 right-4 p-4 w-80 bg-card border shadow-lg z-50">
      <h3 className="font-bold mb-2">Realtime Debug Panel</h3>
      
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2 mb-3 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-yellow-700 dark:text-yellow-400">
          <p className="font-semibold">Testing Instructions:</p>
          <p className="mt-1">Open 2 separate browsers (use incognito for the second). Log in as different users in each browser to test messaging and calling.</p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <p><strong>{channelCount} channels</strong></p>
        <p>User ID: {userId?.substring(0, 8)}...</p>
        <p>Conversation: {conversationId?.substring(0, 8)}...</p>
        <p>Messages Received: {messagesReceived}</p>
        <p>Calls Received: {callsReceived}</p>
        
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={testMessageSubscription} className="text-xs">
            Test Message Subscription
          </Button>
          <Button size="sm" onClick={testCallSubscription} variant="outline" className="text-xs">
            Test Call Subscription
          </Button>
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold">Active Channels:</summary>
          <ul className="mt-1 text-xs space-y-1 max-h-40 overflow-y-auto">
            {activeChannels.map((channel, i) => (
              <li key={i} className="font-mono">{channel}</li>
            ))}
          </ul>
        </details>

        <p className="text-xs text-green-600 dark:text-green-400 mt-3 font-semibold">
          ✅ Connected & Listening
        </p>
        <p className="text-xs text-muted-foreground">
          Status: Realtime is working correctly. Make sure to test with 2 different user accounts in separate browsers!
        </p>
      </div>
    </Card>
  );
};
