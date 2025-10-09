import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MessageCircle, Flame, Users, User, Grid } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Chats', path: '/chat', icon: MessageCircle },
  { name: 'Stories', path: '/stories', icon: Flame },
  { name: 'Communities', path: '/communities', icon: Users },
  { name: 'Profile', path: '/profile', icon: User },
  { name: 'More', path: '/', icon: Grid },
];

export const BottomNav = () => {
  const location = useLocation();

  // Hide on auth and onboarding pages
  const hiddenPaths = ['/auth', '/onboarding', '/qr-login', '/admin'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));

  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                "hover:bg-accent/50 rounded-lg"
              )}
            >
              <Icon 
                className={cn(
                  "h-6 w-6 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span 
                className={cn(
                  "text-[10px] font-medium transition-colors",
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
