import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, 
  Phone, 
  ShoppingBag,
  Calendar,
  ChevronRight,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ActivityItem {
  id: string;
  type: 'chat' | 'call' | 'order' | 'appointment';
  title: string;
  subtitle: string;
  timestamp: Date;
  route: string;
  // For calls - store the other party's info for direct calling
  callData?: {
    otherUserId: string;
    otherUserName: string;
    callType: 'audio' | 'video';
    conversationId?: string;
  };
}

export const RecentActivity = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const allActivities: ActivityItem[] = [];

        // Fetch recent conversations with participant info
        const { data: conversations } = await supabase
          .from('conversation_participants')
          .select(`
            conversation_id,
            conversations!inner(
              id,
              updated_at,
              is_group,
              group_name
            )
          `)
          .eq('user_id', user.id)
          .order('conversations(updated_at)', { ascending: false })
          .limit(3);

        if (conversations) {
          for (const conv of conversations) {
            const c = conv.conversations as any;
            
            // For 1:1 chats, get the other participant's name
            let title = c.is_group ? (c.group_name || 'Group Chat') : 'Conversation';
            
            if (!c.is_group) {
              const { data: otherParticipant } = await supabase
                .from('conversation_participants')
                .select('user_id, profiles!inner(username, full_name)')
                .eq('conversation_id', c.id)
                .neq('user_id', user.id)
                .maybeSingle();
              
              if (otherParticipant) {
                const profile = otherParticipant.profiles as any;
                title = profile.full_name || profile.username || 'Conversation';
              }
            }
            
            allActivities.push({
              id: c.id,
              type: 'chat',
              title,
              subtitle: 'Tap to continue',
              timestamp: new Date(c.updated_at),
              route: `/chat/${c.id}`
            });
          }
        }

        // Fetch recent calls with full user info
        const { data: calls } = await supabase
          .from('calls')
          .select('id, call_type, receiver_name, caller_name, created_at, caller_id, receiver_id, conversation_id')
          .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(2);

        if (calls) {
          for (const call of calls) {
            const isOutgoing = call.caller_id === user.id;
            const otherUserId = isOutgoing ? call.receiver_id : call.caller_id;
            const otherUserName = isOutgoing ? (call.receiver_name || 'Unknown') : (call.caller_name || 'Unknown');
            
            allActivities.push({
              id: call.id,
              type: 'call',
              title: otherUserName,
              subtitle: `${call.call_type} call`,
              timestamp: new Date(call.created_at),
              route: '/calls', // Fallback route
              callData: {
                otherUserId: otherUserId || '',
                otherUserName,
                callType: call.call_type as 'audio' | 'video',
                conversationId: call.conversation_id
              }
            });
          }
        }

        // Sort by timestamp and take top 5
        allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setActivities(allActivities.slice(0, 5));
      } catch (error) {
        console.error('Error fetching activity:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentActivity();
  }, []);

  const handleActivityClick = async (activity: ActivityItem) => {
    // For chats - navigate directly to the conversation
    if (activity.type === 'chat') {
      navigate(activity.route);
      return;
    }
    
    // For calls - initiate a call directly
    if (activity.type === 'call' && activity.callData) {
      const { otherUserId, otherUserName, callType, conversationId } = activity.callData;
      
      if (!otherUserId) {
        toast.error('Cannot call - user not found');
        return;
      }
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Please log in to make calls');
          return;
        }
        
        // Find or create conversation
        let convId = conversationId;
        if (!convId) {
          // Try to find existing 1:1 conversation by checking participants
          const { data: existingConvs } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', user.id);
          
          if (existingConvs && existingConvs.length > 0) {
            // Check which conversation also has the other user
            for (const cp of existingConvs) {
              const { data: otherParticipant } = await supabase
                .from('conversation_participants')
                .select('conversation_id')
                .eq('conversation_id', cp.conversation_id)
                .eq('user_id', otherUserId)
                .maybeSingle();
              
              if (otherParticipant) {
                convId = otherParticipant.conversation_id;
                break;
              }
            }
          }
          
          // If still no conversation, create one
          if (!convId) {
            const { data: newConv, error: convError } = await supabase
              .from('conversations')
              .insert({ is_group: false })
              .select('id')
              .single();
            
            if (convError || !newConv) {
              toast.error('Cannot create conversation');
              return;
            }
            
            convId = newConv.id;
            
            // Add both participants
            await supabase.from('conversation_participants').insert([
              { conversation_id: convId, user_id: user.id },
              { conversation_id: convId, user_id: otherUserId }
            ]);
          }
        }
        
        // Create the call record
        const { data: newCall, error } = await supabase
          .from('calls')
          .insert({
            caller_id: user.id,
            receiver_id: otherUserId,
            conversation_id: convId,
            call_type: callType,
            status: 'ringing',
            caller_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'You',
            receiver_name: otherUserName
          })
          .select()
          .single();
        
        if (error) throw error;
        
        toast.success(`Calling ${otherUserName}...`);
        
        // Navigate to call screen
        navigate(`/call/${newCall.id}`, {
          state: {
            callId: newCall.id,
            callType,
            receiverId: otherUserId,
            receiverName: otherUserName,
            conversationId: convId,
            isInitiator: true
          }
        });
      } catch (error) {
        console.error('Error initiating call:', error);
        toast.error('Failed to initiate call');
      }
      return;
    }
    
    // Fallback - navigate to route
    navigate(activity.route);
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'chat': return MessageCircle;
      case 'call': return Phone;
      case 'order': return ShoppingBag;
      case 'appointment': return Calendar;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'chat': return 'bg-green-500/10 text-green-600';
      case 'call': return 'bg-blue-500/10 text-blue-600';
      case 'order': return 'bg-orange-500/10 text-orange-600';
      case 'appointment': return 'bg-purple-500/10 text-purple-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recent activity</p>
        <p className="text-xs">Start chatting or exploring!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => {
        const Icon = getActivityIcon(activity.type);
        const colorClass = getActivityColor(activity.type);
        
        return (
          <button
            key={activity.id}
            onClick={() => handleActivityClick(activity)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-muted/50 border border-border/50 transition-all active:scale-[0.98]"
          >
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", colorClass)}>
              <Icon className="w-5 h-5" />
            </div>
            
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium truncate">{activity.title}</p>
              <p className="text-xs text-muted-foreground">{activity.subtitle}</p>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{formatDistanceToNow(activity.timestamp, { addSuffix: false })}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        );
      })}
    </div>
  );
};
