import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MessageCircle, Phone, Users, Circle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { supabase } from '@/integrations/supabase/client';

const navItems = [
  { name: 'Chats', path: '/chat', icon: MessageCircle, highlight: false },
  { name: 'Calls', path: '/call-history', icon: Phone, highlight: false },
  { name: 'People', path: '/contacts', icon: Users, highlight: false },
  { name: 'Updates', path: '/stories', icon: Circle, highlight: false },
  { name: 'Settings', path: '/account', icon: User, highlight: false },
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

  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 safe-bottom">
      {/* Premium glass background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" />
      
      {/* Navigation content */}
      <div className="relative flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-2xl transition-all duration-300",
                "hover:bg-accent/50 active:scale-95 min-w-[56px]",
                item.highlight && !isActive && "bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-red-500/10"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Highlight pulse effect */}
              {item.highlight && !isActive && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-full animate-pulse shadow-lg" />
              )}
              
              {/* Icon container */}
              <div className="relative">
                <Icon 
                  className={cn(
                    "h-6 w-6 transition-all duration-300",
                    isActive && item.highlight && "text-white drop-shadow-lg scale-110",
                    isActive && !item.highlight && "text-primary scale-110",
                    !isActive && "text-muted-foreground"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
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
                  "text-[10px] font-semibold transition-all duration-300 tracking-wide",
                  isActive && item.highlight && "text-white drop-shadow-lg",
                  isActive && !item.highlight && "text-primary",
                  !isActive && "text-muted-foreground"
                )}
              >
                {item.name}
              </span>
              
              {/* Active indicator backgrounds */}
              {isActive && item.highlight && (
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl -z-10 shadow-lg animate-in fade-in zoom-in-95 duration-300" />
              )}
              {isActive && !item.highlight && (
                <div className="absolute inset-0 bg-primary/10 rounded-2xl -z-10 animate-in fade-in zoom-in-95 duration-300" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
