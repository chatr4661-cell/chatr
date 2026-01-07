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

interface ActivityItem {
  id: string;
  type: 'chat' | 'call' | 'order' | 'appointment';
  title: string;
  subtitle: string;
  timestamp: Date;
  route: string;
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

        // Fetch recent conversations
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
            allActivities.push({
              id: c.id,
              type: 'chat',
              title: c.is_group ? (c.group_name || 'Group Chat') : 'Conversation',
              subtitle: 'Tap to continue',
              timestamp: new Date(c.updated_at),
              route: `/chat/${c.id}`
            });
          }
        }

        // Fetch recent calls
        const { data: calls } = await supabase
          .from('calls')
          .select('id, call_type, receiver_name, caller_name, created_at, caller_id')
          .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(2);

        if (calls) {
          for (const call of calls) {
            const isOutgoing = call.caller_id === user.id;
            allActivities.push({
              id: call.id,
              type: 'call',
              title: isOutgoing ? (call.receiver_name || 'Outgoing call') : (call.caller_name || 'Incoming call'),
              subtitle: `${call.call_type} call`,
              timestamp: new Date(call.created_at),
              route: '/calls'
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
            onClick={() => navigate(activity.route)}
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
