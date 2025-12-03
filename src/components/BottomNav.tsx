import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MessageCircle, Phone, Users, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

const navItems = [
  { name: 'Contacts', path: '/contacts', icon: Users, highlight: false },
  { name: 'Calls', path: '/call-history', icon: Phone, highlight: false },
  { name: 'Chats', path: '/chat', icon: MessageCircle, highlight: true },
  { name: 'Settings', path: '/settings', icon: User, highlight: false },
];

export const BottomNav = () => {
  const location = useLocation();
  const [notificationCount, setNotificationCount] = React.useState(0);

  // Only show BottomNav on native apps (iOS/Android), not on web
  const isNative = Capacitor.isNativePlatform();

  // Fetch real notification count
  React.useEffect(() => {
    if (!isNative) return; // Skip if not native
    
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
  }, [isNative]);

  // Hide on web entirely, also hide on auth/onboarding/admin/index pages in native
  if (!isNative) return null;
  
  const hiddenPaths = ['/auth', '/onboarding', '/admin'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path)) || location.pathname === '/';

  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-black/95 backdrop-blur-xl border-t border-white/10 safe-area-pb">
      {/* Navigation content */}
      <div className="relative flex justify-around items-center h-20 max-w-full mx-auto px-4">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center gap-1.5 flex-1 py-2 transition-all duration-300 active:scale-95 min-w-0"
            >
              {/* Background pill for active item */}
              {isActive && index === 0 && (
                <div className="absolute inset-0 bg-white/10 rounded-3xl -m-1" />
              )}
              
              {/* Icon container */}
              <div className="relative z-10">
                <Icon 
                  className={cn(
                    "h-7 w-7 transition-all duration-300",
                    isActive ? "text-white" : "text-white/60"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                
                {/* Notification badge */}
                {item.name === 'Chats' && notificationCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center rounded-full font-bold shadow-md"
                  >
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Badge>
                )}
              </div>
              
              {/* Label */}
              <span 
                className={cn(
                  "text-[10px] font-medium transition-all duration-300 relative z-10",
                  isActive ? "text-white" : "text-white/60"
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
