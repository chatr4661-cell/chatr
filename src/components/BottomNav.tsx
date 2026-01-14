import React, { useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Phone, User, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';

const navItems = [
  { name: 'Home', path: '/chatr-home', icon: Home },
  { name: 'Chats', path: '/chat', icon: MessageCircle },
  { name: 'Calls', path: '/calls', icon: Phone },
  { name: 'Profile', path: '/profile', icon: User },
];

export const BottomNav = () => {
  const location = useLocation();
  const haptics = useNativeHaptics();

  // Only show BottomNav on native apps (iOS/Android), not on web
  const isNative = Capacitor.isNativePlatform();

  // Hide on web entirely
  if (!isNative) return null;
  
  // Hide on auth/onboarding/admin/call pages
  const hiddenPaths = ['/auth', '/onboarding', '/admin', '/call'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path)) || location.pathname === '/';

  if (shouldHide) return null;

  const handleNavClick = useCallback(() => {
    haptics.light();
  }, [haptics]);

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[100]",
        // Apple-style glass effect
        "bg-background/80 backdrop-blur-2xl",
        // Subtle top border
        "border-t border-border/30",
        // Safe area padding
        "safe-area-pb"
      )}
      style={{ 
        WebkitBackdropFilter: 'blur(40px)',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))'
      }}
    >
      <div className="flex justify-around items-center h-[50px] max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = 
            location.pathname === item.path || 
            location.pathname.startsWith(item.path + '/') ||
            (item.path === '/chatr-home' && location.pathname === '/home');
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "flex-1 py-1.5",
                // Apple-style touch feedback
                "touch-manipulation",
                "transition-transform duration-100 active:scale-95"
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {/* Icon with fill effect when active (iOS style) */}
              <div className={cn(
                "relative flex items-center justify-center",
                "w-7 h-7 mb-0.5",
                "transition-colors duration-200"
              )}>
                <Icon 
                  className={cn(
                    "w-[22px] h-[22px] transition-all duration-200",
                    isActive 
                      ? "text-primary" 
                      : "text-muted-foreground"
                  )}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  fill={isActive ? 'currentColor' : 'none'}
                />
              </div>
              
              {/* Label - iOS style small text */}
              <span 
                className={cn(
                  "text-[10px] font-medium leading-tight",
                  "transition-colors duration-200",
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