import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Phone, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';

const navItems = [
  { name: 'Home', path: '/chatr-home', icon: Home },
  { name: 'Calls', path: '/calls', icon: Phone },
  { name: 'Profile', path: '/profile', icon: User },
];

export const BottomNav = () => {
  const location = useLocation();

  // Only show BottomNav on native apps (iOS/Android), not on web
  const isNative = Capacitor.isNativePlatform();

  // Hide on web entirely
  if (!isNative) return null;
  
  // Hide on auth/onboarding/admin pages
  const hiddenPaths = ['/auth', '/onboarding', '/admin'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path)) || location.pathname === '/';

  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-xl border-t border-border safe-area-pb">
      <div className="relative flex justify-around items-center h-16 max-w-full mx-auto px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path === '/chatr-home' && location.pathname === '/home');
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-200 active:scale-95"
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
              )}
              
              <Icon 
                className={cn(
                  "h-6 w-6 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                strokeWidth={isActive ? 2.5 : 2}
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