import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MessageCircle, Flame, Users, Bell, Grid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { supabase } from '@/integrations/supabase/client';

const navItems = [
  { name: 'Chats', path: '/chat', icon: MessageCircle },
  { name: 'Stories', path: '/stories', icon: Flame },
  { name: 'Communities', path: '/communities', icon: Users },
  { name: 'Notifications', path: '/notifications', icon: Bell },
  { name: 'More', path: '/', icon: Grid },
];

export const BottomNav = () => {
  const location = useLocation();
  const [notificationCount, setNotificationCount] = useState(0);

  // Fetch real notification count
  useEffect(() => {
    const fetchNotificationCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setNotificationCount(count || 0);
    };

    fetchNotificationCount();

    // Subscribe to notification changes
    const channel = supabase
      .channel('notifications-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          fetchNotificationCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Hide on auth and onboarding pages
  const hiddenPaths = ['/auth', '/onboarding', '/qr-login', '/admin'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));

  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50 safe-area-bottom shadow-2xl">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2 relative">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-xl transition-all duration-200",
                "hover:bg-accent/30 min-w-[56px]"
              )}
            >
              <div className="relative">
                <Icon 
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
                {item.name === 'Notifications' && notificationCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center rounded-full font-bold shadow-md"
                  >
                    {notificationCount}
                  </Badge>
                )}
              </div>
              <span 
                className={cn(
                  "text-[10px] font-bold transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.name}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
