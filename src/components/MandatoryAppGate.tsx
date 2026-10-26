import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { X, ArrowDown, Download, Smartphone } from 'lucide-react';
import { isPWA, triggerOneTapInstall, canInstallPWA } from '@/utils/pwaUtils';
import chatrBrandLogo from '@/assets/chatr-brand-logo.png';

/**
 * Non-Blocking Zero-Friction App Banner
 * 
 * Never blocks the user from using Chatr+ in their browser.
 * On Android: provides a 1-tap WebAPK install prompt.
 * On iOS: provides a subtle non-intrusive floating indicator pointing to Safari's Share icon.
 */
export const MandatoryAppGate: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSPointer, setShowIOSPointer] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // 1. If inside native Capacitor binary shell, do not show banner
    if (Capacitor.isNativePlatform()) {
      return;
    }

    // 2. If running as standalone installed PWA / WebAPK, do not show banner
    if (isPWA()) {
      return;
    }

    // 3. Skip on explicit policy or call pages
    const exemptPaths = ['/call/', '/calls', '/download', '/privacy', '/terms'];
    if (exemptPaths.some((p) => location.pathname.startsWith(p))) {
      setShowBanner(false);
      return;
    }

    // Detect platform
    const ua = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(ua);
    const isDroid = /android/.test(ua);
    setIsIOS(isApple);
    setIsAndroid(isDroid);

    // Check if user dismissed the banner previously
    const dismissed = localStorage.getItem('chatr_install_banner_dismissed');
    if (dismissed === 'true') {
      setShowBanner(false);
      return;
    }

    // Show non-blocking subtle banner after 3 seconds of natural app usage
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 3000);

    const onInstalled = () => {
      setShowBanner(false);
      setShowIOSPointer(false);
    };

    window.addEventListener('chatr:appinstalled', onInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('chatr:appinstalled', onInstalled);
    };
  }, [location.pathname]);

  const handle1TapInstall = async () => {
    try {
      const res = await triggerOneTapInstall();
      if (res.success) {
        setShowBanner(false);
      }
    } catch (e) {
      console.warn('Install trigger error:', e);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('chatr_install_banner_dismissed', 'true');
    setShowBanner(false);
    setShowIOSPointer(false);
  };

  return (
    <>
      {/* 1. iOS Floating Bouncing Pointer Tooltip (Triggered on demand or tap) */}
      {showIOSPointer && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10000] w-[92%] max-w-sm animate-in fade-in slide-in-from-bottom duration-300">
          <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-blue-500/40 backdrop-blur-xl flex items-center justify-between gap-3 ring-4 ring-blue-500/20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-500/20 text-cyan-400 shrink-0">
                <ArrowDown className="h-5 w-5 animate-bounce" />
              </div>
              <div className="text-xs leading-tight">
                <p className="font-bold text-white text-sm">
                  Tap <span className="text-cyan-400 font-extrabold">[⬆️ Share]</span> below
                </p>
                <p className="text-slate-300 mt-0.5">
                  then select <strong className="text-white">"Add to Home Screen"</strong>
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSPointer(false)}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 shrink-0 transition-colors"
              aria-label="Dismiss pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-slate-900 mx-auto -mt-0.5 filter drop-shadow-md"></div>
        </div>
      )}

      {/* 2. Non-Blocking Subtle Bottom Banner (Zero Modal Wall, Zero Interruption) */}
      {showBanner && !showIOSPointer && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md animate-in fade-in slide-in-from-bottom duration-300">
          <div className="bg-card/95 border border-primary/25 shadow-xl rounded-2xl p-2.5 px-3 flex items-center justify-between gap-2.5 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={chatrBrandLogo}
                alt="Chatr+"
                className="h-8 w-8 rounded-xl object-contain bg-white p-0.5 shadow-xs shrink-0"
              />
              <div className="text-xs leading-tight min-w-0 truncate">
                <p className="font-bold text-foreground truncate">
                  {isIOS ? 'Enable iOS Call Ringing' : 'Install Chatr+ App'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {isIOS
                    ? 'Add to Home Screen for background calls'
                    : '1-tap install for full calls & offline speed'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isIOS ? (
                <Button
                  size="sm"
                  onClick={() => setShowIOSPointer(true)}
                  className="h-7 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
                >
                  Add (⬆️)
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handle1TapInstall}
                  className="h-7 px-3 text-xs font-bold bg-gradient-to-r from-primary to-cyan-500 text-white rounded-lg shadow-xs"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Install
                </Button>
              )}

              <button
                onClick={handleDismiss}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
