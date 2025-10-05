import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface RealtimeDebugPanelProps {
  userId: string;
  conversationId?: string | null;
}

export const RealtimeDebugPanel = ({ userId, conversationId }: RealtimeDebugPanelProps) => {
  const [channels, setChannels] = useState<any[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [callCount, setCallCount] = useState(0);
  const [lastEvent, setLastEvent] = useState<any>(null);

  useEffect(() => {
    console.log('🔍 Debug Panel - User ID:', userId);
    console.log('🔍 Debug Panel - Conversation ID:', conversationId);

    // Monitor all supabase channels
    const interval = setInterval(() => {
      const allChannels = (supabase as any).getChannels();
      setChannels(allChannels || []);
    }, 1000);

    return () => clearInterval(interval);
  }, [userId, conversationId]);

  const testMessageSubscription = async () => {
    if (!conversationId) {
      console.error('❌ No conversation selected');
      return;
    }

    console.log('🧪 Testing message subscription for conversation:', conversationId);
    
    const testChannel = supabase
      .channel(`test-messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        console.log('✅ TEST MESSAGE RECEIVED:', payload);
        setMessageCount(prev => prev + 1);
        setLastEvent({ type: 'message', payload, time: new Date() });
      })
      .subscribe((status) => {
        console.log('🧪 Test subscription status:', status);
      });

    setTimeout(() => {
      supabase.removeChannel(testChannel);
      console.log('🧪 Test channel removed');
    }, 30000);
  };

  const testCallSubscription = async () => {
    console.log('🧪 Testing call subscription for user:', userId);
    
    const testChannel = supabase
      .channel(`test-calls:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'calls',
        filter: `receiver_id=eq.${userId}`,
      }, (payload) => {
        console.log('✅ TEST CALL RECEIVED:', payload);
        setCallCount(prev => prev + 1);
        setLastEvent({ type: 'call', payload, time: new Date() });
      })
      .subscribe((status) => {
        console.log('🧪 Test call subscription status:', status);
      });

    setTimeout(() => {
      supabase.removeChannel(testChannel);
      console.log('🧪 Test call channel removed');
    }, 30000);
  };

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-96 overflow-auto z-50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          Realtime Debug Panel
          <Badge variant="outline" className="text-xs">
            {channels.length} channels
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs space-y-1">
          <div><strong>User ID:</strong> {userId.slice(0, 8)}...</div>
          <div><strong>Conversation:</strong> {conversationId ? conversationId.slice(0, 8) + '...' : 'None'}</div>
          <div><strong>Messages Received:</strong> {messageCount}</div>
          <div><strong>Calls Received:</strong> {callCount}</div>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={testMessageSubscription} 
            size="sm" 
            className="w-full text-xs"
            disabled={!conversationId}
          >
            Test Message Subscription
          </Button>
          <Button 
            onClick={testCallSubscription} 
            size="sm" 
            className="w-full text-xs"
            variant="secondary"
          >
            Test Call Subscription
          </Button>
        </div>

        {lastEvent && (
          <div className="p-2 bg-muted rounded text-xs">
            <div><strong>Last Event:</strong> {lastEvent.type}</div>
            <div className="text-muted-foreground">
              {lastEvent.time.toLocaleTimeString()}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <div className="text-xs font-semibold">Active Channels:</div>
          {channels.map((ch: any, idx: number) => (
            <div key={idx} className="text-xs p-1 bg-muted rounded truncate">
              {ch.topic || 'unknown'}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
