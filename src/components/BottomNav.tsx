import React, { useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Phone, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';

const navItems = [
  {
    name: 'Home',
    path: '/',
    icon: Home,
    isActive: (pathname: string) =>
      pathname === '/' || pathname === '/home' || pathname === '/chatr-home',
  },
  {
    name: 'Chat',
    path: '/chat',
    icon: MessageCircle,
    isActive: (pathname: string) => pathname.startsWith('/chat'),
  },
  {
    name: 'Call',
    path: '/calls',
    icon: Phone,
    isActive: (pathname: string) =>
      pathname.startsWith('/calls') ||
      pathname.startsWith('/call-history') ||
      pathname.startsWith('/dialer'),
  },
  {
    name: 'Me',
    path: '/profile',
    icon: User,
    isActive: (pathname: string) =>
      pathname.startsWith('/profile') ||
      pathname.startsWith('/account') ||
      pathname.startsWith('/settings'),
  },
];

const isBottomNavRequiredForPlatform = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 1. Phone App: Mobile phones (Android, iPhone / iOS) or mobile viewport
  const isMobileScreen = window.innerWidth < 768;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isCapacitorNative = Boolean((window as any).Capacitor?.isNativePlatform?.());

  if (isMobileScreen || isMobileUA || isCapacitorNative) {
    return true;
  }

  // 2. Desktop App: Installed standalone PWA, window-controls-overlay, or Electron
  const isStandaloneDesktopApp =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (window.navigator as any).standalone === true ||
    navigator.userAgent.includes('Electron') ||
    document.documentElement.classList.contains('native-app') ||
    (typeof document !== 'undefined' && document.body.dataset.standaloneApp === 'true');

  if (isStandaloneDesktopApp) {
    return true;
  }

  // 3. Web: Desktop browsers (Chrome, Edge, Firefox, Safari in normal web tabs) -> NOT required
  return false;
};

export const BottomNav = () => {
  const location = useLocation();
  const haptics = useNativeHaptics();
  const navRef = React.useRef<HTMLElement | null>(null);
  const [isDuplicate, setIsDuplicate] = React.useState(false);
  const [isRequiredPlatform, setIsRequiredPlatform] = React.useState(isBottomNavRequiredForPlatform);
  const [isChatActive, setIsChatActive] = React.useState(() =>
    typeof document !== 'undefined' && document.body.dataset.chatActive === 'true'
  );

  React.useEffect(() => {
    const handlePlatformChange = () => {
      setIsRequiredPlatform(isBottomNavRequiredForPlatform());
    };

    window.addEventListener('resize', handlePlatformChange);
    const mql = window.matchMedia('(display-mode: standalone)');
    mql.addEventListener?.('change', handlePlatformChange);

    const all = document.querySelectorAll('nav[data-chatr-bottomnav="true"]');
    if (all.length > 1 && all[0] !== navRef.current) {
      setIsDuplicate(true);
    }

    const handleChatChange = (e: any) => {
      setIsChatActive(Boolean(e.detail?.active));
    };
    window.addEventListener('chat-active-change', handleChatChange);
    return () => {
      window.removeEventListener('resize', handlePlatformChange);
      mql.removeEventListener?.('change', handlePlatformChange);
      window.removeEventListener('chat-active-change', handleChatChange);
    };
  }, []);

  const handleNavClick = useCallback(() => {
    try {
      haptics.light();
    } catch (_) {}
  }, [haptics]);

  // Not required on desktop web (wide screen and not standalone app)
  if (!isRequiredPlatform) return null;

  // Hide on auth, onboarding, admin, active in-call screens, or active chat thread
  const hiddenPaths = ['/auth', '/onboarding', '/admin', '/call/', '/live-stream'];
  const isChatDetailRoute = location.pathname.startsWith('/chat/') && location.pathname !== '/chat';
  const shouldHide = isDuplicate || isChatActive || isChatDetailRoute || hiddenPaths.some((p) => location.pathname.startsWith(p));
  if (shouldHide) return null;

  return (
    <nav
      ref={navRef}
      data-chatr-bottomnav="true"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[100]",
        // Native Apple glassmorphism effect
        "bg-background/90 dark:bg-background/95 backdrop-blur-2xl",
        "border-t border-border/40 shadow-md",
        "transition-all duration-200"
      )}
      style={{
        WebkitBackdropFilter: 'blur(30px)',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="App Bottom Navigation"
    >
      <div className="grid grid-cols-4 items-center h-[54px] max-w-md mx-auto px-1">
        {navItems.map((item) => {
          const active = item.isActive(location.pathname);
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={handleNavClick}
              className={cn(
                "relative flex flex-col items-center justify-center py-1 transition-all duration-150",
                "touch-manipulation select-none active:scale-95 group"
              )}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {/* Top active pill indicator */}
              {active && (
                <span className="absolute top-0 w-8 h-[2.5px] rounded-full bg-primary shadow-xs transition-all duration-200" />
              )}

              {/* Icon container */}
              <div className="relative flex items-center justify-center w-7 h-7 mb-0.5">
                <Icon
                  className={cn(
                    "w-[22px] h-[22px] transition-all duration-200",
                    active
                      ? "text-primary scale-105"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                  strokeWidth={active ? 2.4 : 1.8}
                  fill={active ? 'currentColor' : 'none'}
                  fillOpacity={active ? 0.16 : 0}
                />
              </div>

              {/* Tab Label */}
              <span
                className={cn(
                  "text-[10px] tracking-tight leading-none transition-colors duration-150",
                  active
                    ? "font-semibold text-primary"
                    : "font-medium text-muted-foreground group-hover:text-foreground"
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