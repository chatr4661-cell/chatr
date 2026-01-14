import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Phone, UserPlus, Heart, MessageCircle, Settings, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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

export default function Notifications() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const haptics = useNativeHaptics();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${supabase.auth.getUser().then(u => u.data.user?.id)}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
        .limit(50);

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
        prev.map(notif => (notif.id === id ? { ...notif, read: true } : notif))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    haptics.light();
    markAsRead(notification.id);
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const getIcon = (type: string) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'message':
        return <MessageSquare className={cn(iconClass, "text-primary")} />;
      case 'call':
        return <Phone className={cn(iconClass, "text-emerald-500")} />;
      case 'like':
        return <Heart className={cn(iconClass, "text-rose-500")} />;
      case 'comment':
        return <MessageCircle className={cn(iconClass, "text-blue-500")} />;
      case 'friend':
        return <UserPlus className={cn(iconClass, "text-violet-500")} />;
      case 'appointment':
        return <Calendar className={cn(iconClass, "text-amber-500")} />;
      default:
        return <MessageSquare className={cn(iconClass, "text-muted-foreground")} />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
      {/* Apple-style Header */}
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

      {/* Notifications List */}
      <ScrollArea className="h-[calc(100vh-80px)]">
        <div className="px-4 py-2 space-y-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-center">No notifications yet</p>
              <p className="text-sm text-muted-foreground/70 text-center mt-1">
                We'll let you know when something happens
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <AppleCard
                key={notification.id}
                pressable
                onPress={() => handleNotificationClick(notification)}
                className={cn(
                  "transition-all duration-200",
                  !notification.read && "bg-primary/5 border-primary/20"
                )}
                padding="md"
              >
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className={cn(
                    "shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                    notification.read ? "bg-muted/50" : "bg-primary/10"
                  )}>
                    {getIcon(notification.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={cn(
                        "text-sm line-clamp-1",
                        notification.read ? "font-medium" : "font-semibold"
                      )}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <div className="w-2.5 h-2.5 bg-primary rounded-full shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.description}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1.5">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </AppleCard>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
