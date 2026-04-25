import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  MessageSquare, Phone, UserPlus, Heart, MessageCircle,
  Settings, Calendar as CalendarIcon, Sparkles, Wallet,
  ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Clock,
  Trash2, Check, SlidersHorizontal, X,
} from 'lucide-react';
import { formatDistanceToNow, format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek } from 'date-fns';
import type { DateRange } from 'react-day-picker';
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
  delivery_status?: 'delivered' | 'failed' | 'pending' | string | null;
  delivery_error?: string | null;
}

type FilterTab = 'all' | 'digest';

const SWIPE_REVEAL = 88; // px each side
const SWIPE_TRIGGER = 64;

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
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [pickerOpen, setPickerOpen] = useState(false);

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
          .on('postgres_changes', {
            event: '*', schema: 'public', table: 'notifications',
            filter: `user_id=eq.${userIdRef}`,
          }, () => loadNotifications())
          .subscribe();
      }
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
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
        .limit(200);
      if (error) throw error;
      setNotifications((data as Notification[]) || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({ title: 'Error', description: 'Failed to load notifications', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) console.error('mark read failed', error);
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) {
      console.error('delete failed', error);
      toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
      loadNotifications();
    }
  };

  const isDigest = (n: Notification) => n.type === 'digest' || n.type === 'digest_update';

  const handleNotificationClick = (notification: Notification) => {
    haptics.light();
    if (isDigest(notification)) {
      setExpandedId(prev => (prev === notification.id ? null : notification.id));
      if (!notification.read) markAsRead(notification.id);
      return;
    }
    if (!notification.read) markAsRead(notification.id);
    if (notification.action_url) navigate(notification.action_url);
  };

  const getIcon = (type: string) => {
    const c = 'w-5 h-5';
    switch (type) {
      case 'message': return <MessageSquare className={cn(c, 'text-primary')} />;
      case 'call': return <Phone className={cn(c, 'text-emerald-500')} />;
      case 'like': return <Heart className={cn(c, 'text-rose-500')} />;
      case 'comment': return <MessageCircle className={cn(c, 'text-blue-500')} />;
      case 'friend': return <UserPlus className={cn(c, 'text-violet-500')} />;
      case 'appointment': return <CalendarIcon className={cn(c, 'text-amber-500')} />;
      case 'digest':
      case 'digest_update': return <Sparkles className={cn(c, 'text-primary')} />;
      default: return <MessageSquare className={cn(c, 'text-muted-foreground')} />;
    }
  };

  const filtered = useMemo(() => {
    let list = tab === 'digest' ? notifications.filter(isDigest) : notifications;
    if (dateRange?.from) {
      const from = startOfDay(dateRange.from).getTime();
      const to = (dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from)).getTime();
      list = list.filter(n => {
        const t = new Date(n.created_at).getTime();
        return t >= from && t <= to;
      });
    }
    return list;
  }, [notifications, tab, dateRange]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const digestCount = notifications.filter(isDigest).length;

  const handleTabChange = (value: string) => {
    const next = (value as FilterTab) || 'all';
    setTab(next);
    if (next === 'digest') setSearchParams({ tab: 'digest' });
    else setSearchParams({});
  };

  const setQuickRange = (kind: 'today' | 'yesterday' | '7d' | 'thisWeek') => {
    const now = new Date();
    if (kind === 'today') setDateRange({ from: startOfDay(now), to: endOfDay(now) });
    else if (kind === 'yesterday') {
      const y = subDays(now, 1);
      setDateRange({ from: startOfDay(y), to: endOfDay(y) });
    } else if (kind === '7d') setDateRange({ from: startOfDay(subDays(now, 6)), to: endOfDay(now) });
    else if (kind === 'thisWeek') setDateRange({ from: startOfWeek(now), to: endOfWeek(now) });
    setPickerOpen(false);
  };

  const dateLabel = dateRange?.from
    ? dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime()
      ? `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d')}`
      : format(dateRange.from, 'MMM d, yyyy')
    : null;

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
        onBack={() => { haptics.light(); navigate(-1); }}
        showBack
        rightElement={
          <AppleIconButton
            icon={<Settings className="w-5 h-5" />}
            onClick={() => { haptics.light(); navigate('/notifications/settings'); }}
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

      <div className="px-4 pt-3 flex items-center gap-2 flex-wrap">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {dateLabel ?? 'Date range'}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-3">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setQuickRange('today')}>Today</Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setQuickRange('yesterday')}>Yesterday</Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setQuickRange('7d')}>Last 7 days</Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setQuickRange('thisWeek')}>This week</Button>
            </div>
            <Calendar
              mode="range"
              numberOfMonths={1}
              selected={dateRange}
              onSelect={setDateRange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {dateRange?.from && (
          <Button
            size="sm" variant="ghost" className="h-8 gap-1 text-muted-foreground"
            onClick={() => setDateRange(undefined)}
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} item{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="px-4 py-3 space-y-2">
          {tab === 'digest' && (
            <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 mb-2">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Your Chatr digest</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    A short summary every 3 hours. Swipe left to delete, right to mark read.
                  </p>
                </div>
                <Button
                  size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => navigate('/notifications/digest-settings')}
                >
                  Categories
                </Button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState tab={tab} hasDateFilter={!!dateRange?.from} />
          ) : (
            filtered.map((n) => {
              const digest = isDigest(n);
              const expanded = expandedId === n.id;
              return (
                <SwipeRow
                  key={n.id}
                  onMarkRead={n.read ? undefined : () => { haptics.light(); markAsRead(n.id); }}
                  onDelete={() => { haptics.light(); deleteNotification(n.id); }}
                >
                  <AppleCard
                    pressable
                    onPress={() => handleNotificationClick(n)}
                    className={cn(
                      'transition-all duration-200',
                      !n.read && 'bg-primary/5 border-primary/20',
                    )}
                    padding="md"
                  >
                    <div className="flex gap-3">
                      <div className={cn(
                        'shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                        n.read ? 'bg-muted/50' : 'bg-primary/10',
                      )}>
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={cn('text-sm line-clamp-1', n.read ? 'font-medium' : 'font-semibold')}>
                            {n.title}
                          </h3>
                          {!n.read && <div className="w-2.5 h-2.5 bg-primary rounded-full shrink-0 mt-1" />}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {n.description}
                        </p>

                        <div className="flex items-center justify-between mt-1.5 gap-2 flex-wrap">
                          <p className="text-xs text-muted-foreground/70">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            {digest && (
                              <span className="ml-1.5 text-muted-foreground/60">
                                · {format(new Date(n.created_at), 'p')}
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2">
                            {digest && <DeliveryBadge status={n.delivery_status} error={n.delivery_error} />}
                            {digest && (
                              <span className="inline-flex items-center gap-1 text-xs text-primary">
                                {expanded ? <>Hide <ChevronUp className="w-3 h-3" /></> : <>Preview <ChevronDown className="w-3 h-3" /></>}
                              </span>
                            )}
                          </div>
                        </div>

                        {digest && expanded && (
                          <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Wallet className="w-3.5 h-3.5 text-primary" />
                              <p className="text-xs font-medium">Digest details</p>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-line">{n.description}</p>
                            {n.metadata?.window_hours && (
                              <p className="text-xs text-muted-foreground">
                                Covers the last {n.metadata.window_hours} hour
                                {String(n.metadata.window_hours) === '1' ? '' : 's'}.
                              </p>
                            )}
                            {n.delivery_status === 'failed' && n.delivery_error && (
                              <p className="text-xs text-destructive">Delivery error: {n.delivery_error}</p>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                haptics.light();
                                navigate(n.metadata?.route || '/home');
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
                </SwipeRow>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function EmptyState({ tab, hasDateFilter }: { tab: FilterTab; hasDateFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        {tab === 'digest' ? <Sparkles className="w-8 h-8 text-muted-foreground" /> : <MessageSquare className="w-8 h-8 text-muted-foreground" />}
      </div>
      <p className="text-muted-foreground text-center">
        {hasDateFilter ? 'No notifications in this range' : tab === 'digest' ? 'No digests yet' : 'No notifications yet'}
      </p>
      <p className="text-sm text-muted-foreground/70 text-center mt-1">
        {hasDateFilter ? 'Try a different date range' : tab === 'digest' ? "We'll send a summary every 3 hours" : "We'll let you know when something happens"}
      </p>
    </div>
  );
}

function DeliveryBadge({ status, error }: { status?: string | null; error?: string | null }) {
  const s = (status ?? 'delivered').toLowerCase();
  if (s === 'delivered') {
    return (
      <Badge variant="secondary" className="h-5 px-1.5 gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" /> Delivered
      </Badge>
    );
  }
  if (s === 'pending') {
    return (
      <Badge variant="secondary" className="h-5 px-1.5 gap-1 text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
        <Clock className="w-3 h-3" /> Pending
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="h-5 px-1.5 gap-1 text-[10px] bg-destructive/10 text-destructive border-destructive/20" title={error ?? undefined}>
      <AlertTriangle className="w-3 h-3" /> Failed
    </Badge>
  );
}

function SwipeRow({
  children,
  onMarkRead,
  onDelete,
}: {
  children: React.ReactNode;
  onMarkRead?: () => void;
  onDelete: () => void;
}) {
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const moving = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    moving.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current == null) return;
    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - (startY.current ?? 0);
    if (!moving.current) {
      if (Math.abs(deltaX) < 8 || Math.abs(deltaY) > Math.abs(deltaX)) return;
      moving.current = true;
    }
    let clamped = deltaX;
    if (deltaX > 0 && !onMarkRead) clamped = 0;
    clamped = Math.max(-SWIPE_REVEAL * 1.4, Math.min(SWIPE_REVEAL * 1.4, clamped));
    setDx(clamped);
  };
  const onPointerUp = () => {
    if (!moving.current) { startX.current = null; setDx(0); return; }
    if (dx <= -SWIPE_TRIGGER) onDelete();
    else if (dx >= SWIPE_TRIGGER && onMarkRead) onMarkRead();
    setDx(0);
    startX.current = null;
    moving.current = false;
  };

  const showRead = dx > 0 && onMarkRead;
  const showDelete = dx < 0;

  return (
    <div className="relative overflow-hidden rounded-xl select-none">
      {/* Right (mark read) action bg */}
      {showRead && (
        <div className="absolute inset-y-0 left-0 flex items-center justify-start pl-4 bg-emerald-500/15 text-emerald-600 w-full rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Check className="w-4 h-4" /> Mark read
          </div>
        </div>
      )}
      {/* Left (delete) action bg */}
      {showDelete && (
        <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-destructive/15 text-destructive w-full rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            Delete <Trash2 className="w-4 h-4" />
          </div>
        </div>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ transform: `translateX(${dx}px)`, transition: dx === 0 ? 'transform 200ms ease' : 'none', touchAction: 'pan-y' }}
      >
        {children}
      </div>
    </div>
  );
}
