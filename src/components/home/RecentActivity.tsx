import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, 
  Phone, 
  Video, 
  ShoppingBag,
  Calendar,
  ChevronRight,
  Clock,
  Sparkles,
  PhoneCall
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
  const [filter, setFilter] = useState<'all' | 'chat' | 'call'>('all');

  useEffect(() => {
    let cancelled = false;

    const fetchRecentActivity = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        // Run both queries in PARALLEL
        const [convResult, callResult] = await Promise.all([
          supabase
            .from('conversation_participants')
            .select(`
              conversation_id,
              conversations!inner(id, updated_at, is_group, group_name)
            `)
            .eq('user_id', user.id)
            .order('conversations(updated_at)', { ascending: false })
            .limit(5),
          supabase
            .from('calls')
            .select('id, call_type, receiver_name, caller_name, created_at, caller_id, receiver_id, conversation_id')
            .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('created_at', { ascending: false })
            .limit(4)
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

          const nameMap = new Map<string, { name: string; userId: string }>();
          if (allParticipants) {
            for (const p of allParticipants) {
              const profile = p.profiles as any;
              nameMap.set(p.conversation_id, {
                name: profile.full_name || profile.username || 'Conversation',
                userId: p.user_id
              });
            }
          }

          for (const conv of conversations) {
            const c = conv.conversations as any;
            const participant = nameMap.get(c.id);
            const title = c.is_group 
              ? (c.group_name || 'Group Chat') 
              : (participant?.name || 'Conversation');

            allActivities.push({
              id: c.id,
              type: 'chat',
              title,
              subtitle: 'Tap to open chat',
              timestamp: new Date(c.updated_at),
              route: `/chat/${c.id}`,
              callData: participant?.userId ? {
                otherUserId: participant.userId,
                otherUserName: title,
                callType: 'video',
                conversationId: c.id
              } : undefined
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
        const top = allActivities.slice(0, 6);
        
        if (!cancelled) {
          setActivities(top);
          setCachedActivity(top);
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

  const initiateCall = async (otherUserId: string, otherUserName: string, callType: 'audio' | 'video', conversationId?: string) => {
    if (!otherUserId) {
      toast.error('Cannot initiate call - contact identity missing');
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
      toast.success(`Starting ${callType} call with ${otherUserName}...`);
      navigate('/calls');
    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error('Failed to initiate call');
    }
  };

  const handleActivityClick = async (activity: ActivityItem) => {
    if (activity.type === 'chat') {
      navigate(activity.route);
      return;
    }
    
    if (activity.type === 'call' && activity.callData) {
      await initiateCall(
        activity.callData.otherUserId,
        activity.callData.otherUserName,
        activity.callData.callType,
        activity.callData.conversationId
      );
      return;
    }
    
    navigate(activity.route);
  };

  const filteredActivities = activities.filter(a => {
    if (filter === 'chat') return a.type === 'chat';
    if (filter === 'call') return a.type === 'call';
    return true;
  });

  if (loading) {
    return (
      <div className="rounded-3xl bg-card/75 backdrop-blur-md border border-border/60 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="h-5 w-28 bg-muted/50 rounded-lg animate-pulse" />
          <div className="h-6 w-32 bg-muted/40 rounded-full animate-pulse" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 rounded-2xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-card/75 backdrop-blur-md border border-border/60 p-4 sm:p-5 shadow-xs">
      {/* Header with WhatsApp & FaceTime style tab filters */}
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div>
          <h2 className="text-base font-bold tracking-tight text-foreground">
            Recent Activity
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Direct FaceTime audio/video & WhatsApp messaging
          </p>
        </div>

        {/* WhatsApp & FaceTime Filter Tabs */}
        <div className="flex items-center p-0.5 rounded-full bg-muted/60 border border-border/50 text-[11px] font-semibold">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "px-2.5 py-1 rounded-full transition-all",
              filter === 'all'
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter('chat')}
            className={cn(
              "px-2.5 py-1 rounded-full transition-all flex items-center gap-1",
              filter === 'chat'
                ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Chats
          </button>
          <button
            onClick={() => setFilter('call')}
            className={cn(
              "px-2.5 py-1 rounded-full transition-all flex items-center gap-1",
              filter === 'call'
                ? "bg-background text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Calls
          </button>
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-2">
            <Clock className="w-5 h-5 opacity-60" />
          </div>
          <p className="text-sm font-semibold text-foreground">No recent {filter === 'all' ? 'activity' : filter === 'chat' ? 'chats' : 'calls'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Start connecting instantly with friends & family</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredActivities.map((activity) => {
            const isCall = activity.type === 'call';
            const isVideo = isCall && activity.callData?.callType === 'video';

            return (
              <div
                key={activity.id}
                className="group relative flex items-center justify-between p-2.5 sm:p-3 rounded-2xl hover:bg-muted/50 border border-transparent hover:border-border/50 transition-all duration-200"
              >
                {/* Main clickable contact / item */}
                <div 
                  onClick={() => handleActivityClick(activity)}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
                  {/* Avatar / Badge */}
                  <div className={cn(
                    "w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs text-white font-bold text-sm",
                    isCall 
                      ? isVideo 
                        ? "bg-gradient-to-br from-indigo-500 to-purple-600" 
                        : "bg-gradient-to-br from-blue-500 to-cyan-600"
                      : "bg-gradient-to-br from-emerald-500 to-teal-600"
                  )}>
                    {isCall ? (
                      isVideo ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />
                    ) : (
                      activity.title.slice(0, 1).toUpperCase() || <MessageCircle className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {activity.title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                      {isCall && (
                        <span className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          activity.subtitle.toLowerCase().includes('outgoing') ? "bg-blue-500" : "bg-emerald-500"
                        )} />
                      )}
                      <span>{activity.subtitle}</span>
                    </p>
                  </div>
                </div>

                {/* Right controls: Timestamp + 1-Tap FaceTime & WhatsApp Action Buttons */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
                  <span className="text-[11px] text-muted-foreground hidden sm:inline px-2 py-0.5 rounded-full bg-muted/60">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: false })}
                  </span>

                  {activity.callData?.otherUserId && (
                    <div className="flex items-center gap-1">
                      {/* One-tap Audio Call */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          initiateCall(
                            activity.callData!.otherUserId,
                            activity.callData!.otherUserName,
                            'audio',
                            activity.callData?.conversationId
                          );
                        }}
                        title={`Call ${activity.title}`}
                        className="w-8 h-8 rounded-xl bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 flex items-center justify-center transition-all duration-150 active:scale-95 shadow-2xs"
                      >
                        <Phone className="w-4 h-4" />
                      </button>

                      {/* One-tap FaceTime Video Call */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          initiateCall(
                            activity.callData!.otherUserId,
                            activity.callData!.otherUserName,
                            'video',
                            activity.callData?.conversationId
                          );
                        }}
                        title={`FaceTime Video with ${activity.title}`}
                        className="w-8 h-8 rounded-xl bg-purple-500/10 hover:bg-purple-600 hover:text-white text-purple-600 dark:text-purple-400 flex items-center justify-center transition-all duration-150 active:scale-95 shadow-2xs"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <ChevronRight 
                    onClick={() => handleActivityClick(activity)}
                    className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all cursor-pointer" 
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
