import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MessageCircle, Phone, Users, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { supabase } from '@/integrations/supabase/client';

const navItems = [
  { name: 'Contacts', path: '/contacts', icon: Users, highlight: false },
  { name: 'Calls', path: '/call-history', icon: Phone, highlight: false },
  { name: 'Chats', path: '/chat', icon: MessageCircle, highlight: true },
  { name: 'Settings', path: '/settings', icon: User, highlight: false },
];

export const BottomNav = () => {
  const location = useLocation();
  const [notificationCount, setNotificationCount] = React.useState(0);

  // Fetch real notification count
  React.useEffect(() => {
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
  const hiddenPaths = ['/auth', '/onboarding', '/admin'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));

  console.log('BottomNav - pathname:', location.pathname, 'shouldHide:', shouldHide);

  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[999999] bg-background border-t-2 border-primary shadow-2xl safe-area-pb">
      {/* Navigation content */}
      <div className="relative flex justify-around items-center h-20 max-w-md mx-auto px-2 bg-background">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-200",
                "active:scale-95 min-w-0"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Icon container */}
              <div className="relative">
                <Icon 
                  className={cn(
                    "h-[26px] w-[26px] transition-all duration-200",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                
                {/* Notification badge */}
                {item.name === 'Notifications' && notificationCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 min-w-5 px-1.5 text-[10px] flex items-center justify-center rounded-full font-bold shadow-md animate-in zoom-in-50"
                  >
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Badge>
                )}
              </div>
              
              {/* Label */}
              <span 
                className={cn(
                  "text-[11px] font-medium transition-all duration-200",
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
