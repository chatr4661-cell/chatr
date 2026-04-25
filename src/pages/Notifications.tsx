import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare, Phone, UserPlus, Heart, MessageCircle,
  Settings, Calendar, Sparkles, Wallet, ChevronDown, ChevronUp,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AppleHeader } from '@/components/ui/AppleHeader';
import { AppleCard } from '@/components/ui/AppleCard';
import { AppleIconButton } from '@/components/ui/AppleButton';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  description: string;
  created_at: string;
  read: boolean;
  action_url?: string;
  metadata?: any;
}

type FilterTab = 'all' | 'digest';

export default function Notifications() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const haptics = useNativeHaptics();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab: FilterTab = searchParams.get('tab') === 'digest' ? 'digest' : 'all';
  const [tab, setTab] = useState<FilterTab>(initialTab);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let userIdRef: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      userIdRef = user?.id ?? null;
      await loadNotifications();

      if (userIdRef) {
        channel = supabase
          .channel('notifications')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userIdRef}`,
            },
            () => loadNotifications(),
          )
          .subscribe();
      }
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      if (error) throw error;
      setNotifications(prev =>
        prev.map(notif => (notif.id === id ? { ...notif, read: true } : notif)),
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    haptics.light();

    // Digest items expand inline instead of navigating away
    if (isDigest(notification)) {
      setExpandedId(prev => (prev === notification.id ? null : notification.id));
      if (!notification.read) markAsRead(notification.id);
      return;
    }

    markAsRead(notification.id);
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const isDigest = (n: Notification) =>
    n.type === 'digest' || n.type === 'digest_update';

  const getIcon = (type: string) => {
    const iconClass = 'w-5 h-5';
    switch (type) {
      case 'message':
        return <MessageSquare className={cn(iconClass, 'text-primary')} />;
      case 'call':
        return <Phone className={cn(iconClass, 'text-emerald-500')} />;
      case 'like':
        return <Heart className={cn(iconClass, 'text-rose-500')} />;
      case 'comment':
        return <MessageCircle className={cn(iconClass, 'text-blue-500')} />;
      case 'friend':
        return <UserPlus className={cn(iconClass, 'text-violet-500')} />;
      case 'appointment':
        return <Calendar className={cn(iconClass, 'text-amber-500')} />;
      case 'digest':
      case 'digest_update':
        return <Sparkles className={cn(iconClass, 'text-primary')} />;
      default:
        return <MessageSquare className={cn(iconClass, 'text-muted-foreground')} />;
    }
  };

  const filtered = useMemo(() => {
    if (tab === 'digest') return notifications.filter(isDigest);
    return notifications;
  }, [notifications, tab]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const digestCount = notifications.filter(isDigest).length;

  const handleTabChange = (value: string) => {
    const next = (value as FilterTab) || 'all';
    setTab(next);
    if (next === 'digest') setSearchParams({ tab: 'digest' });
    else setSearchParams({});
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background safe-area-pt">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="mt-4 text-sm text-muted-foreground">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-area-pt safe-area-pb">
      <AppleHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : undefined}
        onBack={() => {
          haptics.light();
          navigate(-1);
        }}
        showBack
        rightElement={
          <AppleIconButton
            icon={<Settings className="w-5 h-5" />}
            onClick={() => {
              haptics.light();
              navigate('/notifications/settings');
            }}
            size="sm"
          />
        }
      />

      <div className="px-4 pt-2">
        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="digest">
              Digests{digestCount > 0 ? ` (${digestCount})` : ''}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="px-4 py-3 space-y-2">
          {tab === 'digest' && (
            <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 mb-2">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Your Chatr digest</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    A short summary of wallet, missions, chats, calls, bookings and
                    more — delivered every 3 hours.
                  </p>
                </div>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                {tab === 'digest' ? (
                  <Sparkles className="w-8 h-8 text-muted-foreground" />
                ) : (
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <p className="text-muted-foreground text-center">
                {tab === 'digest' ? 'No digests yet' : 'No notifications yet'}
              </p>
              <p className="text-sm text-muted-foreground/70 text-center mt-1">
                {tab === 'digest'
                  ? "We'll send a summary every 3 hours when there's news"
                  : "We'll let you know when something happens"}
              </p>
            </div>
          ) : (
            filtered.map((notification) => {
              const digest = isDigest(notification);
              const expanded = expandedId === notification.id;
              const meta = notification.metadata || {};

              return (
                <AppleCard
                  key={notification.id}
                  pressable
                  onPress={() => handleNotificationClick(notification)}
                  className={cn(
                    'transition-all duration-200',
                    !notification.read && 'bg-primary/5 border-primary/20',
                  )}
                  padding="md"
                >
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        'shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                        notification.read ? 'bg-muted/50' : 'bg-primary/10',
                      )}
                    >
                      {getIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={cn(
                            'text-sm line-clamp-1',
                            notification.read ? 'font-medium' : 'font-semibold',
                          )}
                        >
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div className="w-2.5 h-2.5 bg-primary rounded-full shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.description}
                      </p>
                      <div className="flex items-center justify-between mt-1.5 gap-2">
                        <p className="text-xs text-muted-foreground/70">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                          })}
                          {digest && (
                            <span className="ml-1.5 text-muted-foreground/60">
                              · {format(new Date(notification.created_at), 'p')}
                            </span>
                          )}
                        </p>
                        {digest && (
                          <span className="inline-flex items-center gap-1 text-xs text-primary">
                            {expanded ? (
                              <>
                                Hide <ChevronUp className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                Preview <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </span>
                        )}
                      </div>

                      {digest && expanded && (
                        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-3.5 h-3.5 text-primary" />
                            <p className="text-xs font-medium">Digest details</p>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-line">
                            {notification.description}
                          </p>
                          {meta.window_hours && (
                            <p className="text-xs text-muted-foreground">
                              Covers the last {meta.window_hours} hour
                              {String(meta.window_hours) === '1' ? '' : 's'}.
                            </p>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              haptics.light();
                              navigate(meta.route || '/home');
                            }}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Open dashboard →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </AppleCard>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
