import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, 
  Phone, 
  Video,
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
  callData?: {
    otherUserId: string;
    otherUserName: string;
    callType: 'audio' | 'video';
    conversationId?: string;
  };
}

const CACHE_KEY = 'chatr_recent_activity';
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

function getCachedActivity(): ActivityItem[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data.map((a: any) => ({ ...a, timestamp: new Date(a.timestamp) }));
  } catch { return null; }
}

function setCachedActivity(items: ActivityItem[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: items, ts: Date.now() }));
  } catch {}
}

export const RecentActivity = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>(() => getCachedActivity() || []);
  const [loading, setLoading] = useState(() => !getCachedActivity());

  useEffect(() => {
    let cancelled = false;

    const fetchRecentActivity = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        // Run both queries in PARALLEL instead of sequential
        const [convResult, callResult] = await Promise.all([
          supabase
            .from('conversation_participants')
            .select(`
              conversation_id,
              conversations!inner(id, updated_at, is_group, group_name)
            `)
            .eq('user_id', user.id)
            .order('conversations(updated_at)', { ascending: false })
            .limit(3),
          supabase
            .from('calls')
            .select('id, call_type, receiver_name, caller_name, created_at, caller_id, receiver_id, conversation_id')
            .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('created_at', { ascending: false })
            .limit(2)
        ]);

        if (cancelled) return;

        const allActivities: ActivityItem[] = [];
        const conversations = convResult.data;
        const calls = callResult.data;

        if (conversations && conversations.length > 0) {
          const convIds = conversations.map(c => (c.conversations as any).id);
          
          const { data: allParticipants } = await supabase
            .from('conversation_participants')
            .select('conversation_id, user_id, profiles!inner(username, full_name)')
            .in('conversation_id', convIds)
            .neq('user_id', user.id);

          if (cancelled) return;

          const nameMap = new Map<string, string>();
          if (allParticipants) {
            for (const p of allParticipants) {
              const profile = p.profiles as any;
              nameMap.set(p.conversation_id, profile.full_name || profile.username || 'Conversation');
            }
          }

          for (const conv of conversations) {
            const c = conv.conversations as any;
            const title = c.is_group 
              ? (c.group_name || 'Group Chat') 
              : (nameMap.get(c.id) || 'Conversation');

            allActivities.push({
              id: c.id,
              type: 'chat',
              title,
              subtitle: 'Tap to continue chat',
              timestamp: new Date(c.updated_at),
              route: `/chat/${c.id}`
            });
          }
        }

        if (calls) {
          const seenKeys = new Set<string>();
          for (const call of calls) {
            const isOutgoing = call.caller_id === user.id;
            const otherUserId = isOutgoing ? call.receiver_id : call.caller_id;
            let otherUserName = isOutgoing ? (call.receiver_name || '') : (call.caller_name || '');

            const looksLikePhone = !otherUserName || /^\+?\d[\d\s\-]{6,}$/.test(otherUserName.trim());
            if (looksLikePhone) {
              const digits = (otherUserName || '').replace(/\D/g, '');
              if (digits.length >= 10) {
                const last10 = digits.slice(-10);
                otherUserName = `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;
              } else {
                otherUserName = 'Unknown caller';
              }
            }

            const dedupeKey = `${otherUserId || otherUserName}-${call.call_type}`;
            if (seenKeys.has(dedupeKey)) continue;
            seenKeys.add(dedupeKey);

            allActivities.push({
              id: call.id,
              type: 'call',
              title: otherUserName,
              subtitle: `${isOutgoing ? 'Outgoing' : 'Incoming'} ${call.call_type} call`,
              timestamp: new Date(call.created_at),
              route: '/calls',
              callData: {
                otherUserId: otherUserId || '',
                otherUserName,
                callType: call.call_type as 'audio' | 'video',
                conversationId: call.conversation_id
              }
            });
          }
        }

        allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const top5 = allActivities.slice(0, 5);
        
        if (!cancelled) {
          setActivities(top5);
          setCachedActivity(top5);
        }
      } catch (error) {
        console.error('Error fetching activity:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRecentActivity();
    return () => { cancelled = true; };
  }, []);

  const handleActivityClick = async (activity: ActivityItem) => {
    if (activity.type === 'chat') {
      navigate(activity.route);
      return;
    }
    
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
        
        let convId = conversationId;
        if (!convId) {
          const { data: existingConvs } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', user.id);
          
          if (existingConvs && existingConvs.length > 0) {
            const convIds = existingConvs.map(c => c.conversation_id);
            const { data: match } = await supabase
              .from('conversation_participants')
              .select('conversation_id')
              .in('conversation_id', convIds)
              .eq('user_id', otherUserId)
              .limit(1)
              .maybeSingle();
            
            if (match) convId = match.conversation_id;
          }
          
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
            await supabase.from('conversation_participants').insert([
              { conversation_id: convId, user_id: user.id },
              { conversation_id: convId, user_id: otherUserId }
            ]);
          }
        }
        
        const { error } = await supabase
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
      } catch (error) {
        console.error('Error initiating call:', error);
        toast.error('Failed to initiate call');
      }
      return;
    }
    
    navigate(activity.route);
  };

  const getActivityBadge = (activity: ActivityItem) => {
    if (activity.type === 'call') {
      const isVideo = activity.callData?.callType === 'video';
      return {
        icon: isVideo ? Video : Phone,
        gradient: 'from-blue-500 to-indigo-600',
        badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
      };
    }
    if (activity.type === 'order') {
      return {
        icon: ShoppingBag,
        gradient: 'from-amber-500 to-orange-600',
        badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
      };
    }
    if (activity.type === 'appointment') {
      return {
        icon: Calendar,
        gradient: 'from-purple-500 to-fuchsia-600',
        badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
      };
    }
    return {
      icon: MessageCircle,
      gradient: 'from-emerald-500 to-teal-600',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    };
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-card/75 backdrop-blur-md border border-border/60 p-3 space-y-2 shadow-xs">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 rounded-2xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-3xl bg-card/75 backdrop-blur-md border border-border/60 p-6 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-2.5">
          <Clock className="w-6 h-6 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-semibold text-foreground">No recent activity</p>
        <p className="text-xs text-muted-foreground mt-0.5">Start a conversation or make a call to connect!</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-card/75 backdrop-blur-md border border-border/60 p-2 sm:p-2.5 shadow-xs divide-y divide-border/40">
      {activities.map((activity) => {
        const badge = getActivityBadge(activity);
        const Icon = badge.icon;
        
        return (
          <button
            key={activity.id}
            onClick={() => handleActivityClick(activity)}
            className="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-muted/50 transition-all duration-200 active:scale-[0.99] group text-left"
          >
            <div className={cn(
              "w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105",
              `bg-gradient-to-br ${badge.gradient}`
            )}>
              <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {activity.title}
              </p>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {activity.subtitle}
              </p>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-medium text-muted-foreground/80 px-2 py-0.5 rounded-full bg-muted/60">
                {formatDistanceToNow(activity.timestamp, { addSuffix: false })}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
          </button>
        );
      })}
    </div>
  );
};
