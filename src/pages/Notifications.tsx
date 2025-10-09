import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare, Phone, UserPlus, Heart, MessageCircle, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: 'message' | 'call' | 'like' | 'comment' | 'friend';
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  avatar?: string;
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'message',
      title: 'New Message',
      description: 'Sarah sent you a message',
      timestamp: new Date(Date.now() - 5 * 60000),
      read: false,
    },
    {
      id: '2',
      type: 'call',
      title: 'Missed Call',
      description: 'John tried to call you',
      timestamp: new Date(Date.now() - 30 * 60000),
      read: false,
    },
    {
      id: '3',
      type: 'like',
      title: 'New Like',
      description: 'Emma liked your wellness post',
      timestamp: new Date(Date.now() - 2 * 60 * 60000),
      read: true,
    },
    {
      id: '4',
      type: 'comment',
      title: 'New Comment',
      description: 'Mike commented on your post',
      timestamp: new Date(Date.now() - 5 * 60 * 60000),
      read: true,
    },
    {
      id: '5',
      type: 'friend',
      title: 'Friend Request',
      description: 'Alex sent you a friend request',
      timestamp: new Date(Date.now() - 24 * 60 * 60000),
      read: true,
    },
  ]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-5 h-5 text-primary" />;
      case 'call':
        return <Phone className="w-5 h-5 text-emerald-500" />;
      case 'like':
        return <Heart className="w-5 h-5 text-rose-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'friend':
        return <UserPlus className="w-5 h-5 text-violet-500" />;
      default:
        return null;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-glass bg-gradient-glass border-b border-glass-border">
        <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/notifications/settings')}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="h-[calc(100vh-73px)]">
        <div className="max-w-2xl mx-auto p-4 space-y-2">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                className={`w-full text-left p-4 rounded-xl transition-all ${
                  notification.read
                    ? 'bg-card hover:bg-accent/5'
                    : 'bg-primary/5 hover:bg-primary/10 border border-primary/20'
                }`}
              >
                <div className="flex gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm">{notification.title}</h3>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {notification.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
