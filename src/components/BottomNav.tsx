import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MessageCircle, Flame, Users, Bell, Grid, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const navItems = [
  { name: 'Chats', path: '/chat', icon: MessageCircle },
  { name: 'Stories', path: '/stories', icon: Flame },
  { name: 'Communities', path: '/communities', icon: Users },
  { name: 'Notifications', path: '/notifications', icon: Bell, badge: 3 },
  { name: 'More', path: '/', icon: Grid },
];

export const BottomNav = () => {
  const location = useLocation();

  // Hide on auth and onboarding pages
  const hiddenPaths = ['/auth', '/onboarding', '/qr-login', '/admin'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));

  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50 safe-area-bottom shadow-2xl">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2 relative">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          // Add prominent center action button
          if (index === 2) {
            return (
              <React.Fragment key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-xl transition-all duration-200",
                    "hover:bg-accent/30 min-w-[56px]"
                  )}
                >
                  <Icon 
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span 
                    className={cn(
                      "text-[10px] font-bold transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.name}
                  </span>
                </NavLink>
                
                <Button
                  size="icon"
                  className="h-14 w-14 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 -mt-6 bg-gradient-to-br from-primary via-primary to-primary/90 hover:scale-105"
                  onClick={() => {/* Add new action */}}
                >
                  <Plus className="w-6 h-6" />
                </Button>
              </React.Fragment>
            );
          }
          
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
                {'badge' in item && item.badge && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center rounded-full font-bold shadow-md"
                  >
                    {item.badge}
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
