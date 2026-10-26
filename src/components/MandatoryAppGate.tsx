import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, PhoneCall, BellRing, Zap, X, ShieldCheck, ArrowDown, Share2 } from 'lucide-react';
import { isPWA, triggerOneTapInstall, canInstallPWA } from '@/utils/pwaUtils';
import chatrBrandLogo from '@/assets/chatr-brand-logo.png';

export const MandatoryAppGate: React.FC = () => {
  const [showGate, setShowGate] = useState(false);
  const [showIOSFloatingPointer, setShowIOSFloatingPointer] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [installing, setInstalling] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // 1. If inside native Capacitor binary shell, do not gate
    if (Capacitor.isNativePlatform()) {
      return;
    }

    // 2. If running as standalone installed PWA / WebAPK, do not gate
    if (isPWA()) {
      return;
    }

    // 3. Skip gating on explicit download or policy pages
    const exemptPaths = ['/download', '/.lovable', '/privacy', '/terms'];
    if (exemptPaths.some((p) => location.pathname.startsWith(p))) {
      setShowGate(false);
      return;
    }

    // Detect platform
    const ua = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(ua);
    const isDroid = /android/.test(ua);
    setIsIOS(isApple);
    setIsAndroid(isDroid);

    // Check if user temporarily bypassed for this session
    const sessionBypassed = sessionStorage.getItem('chatr_install_gate_bypassed');
    if (sessionBypassed === 'true') {
      setShowGate(false);
      return;
    }

    // Show gate after brief 600ms mount animation
    const timer = setTimeout(() => {
      setShowGate(true);
    }, 600);

    const onInstalled = () => {
      setShowGate(false);
      setShowIOSFloatingPointer(false);
    };

    window.addEventListener('chatr:appinstalled', onInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('chatr:appinstalled', onInstalled);
    };
  }, [location.pathname]);

  const handle1TapInstall = async () => {
    setInstalling(true);
    try {
      const res = await triggerOneTapInstall();
      if (res.type === 'prompt' && res.success) {
        setShowGate(false);
      } else if (res.type === 'apk') {
        // Direct download has commenced in background
        setShowGate(false);
      }
    } catch (err) {
      console.warn('Install error:', err);
    } finally {
      setInstalling(false);
    }
  };

  const handleIOSWebClipInstall = () => {
    // 1-Tap iOS Profile WebClip download
    window.location.href = '/chatr-install.mobileconfig';
  };

  const handleShowSafariPointer = () => {
    // Close modal and show floating bouncing arrow pointing directly to Safari toolbar
    setShowGate(false);
    setShowIOSFloatingPointer(true);
  };

  const handleContinueInWeb = () => {
    sessionStorage.setItem('chatr_install_gate_bypassed', 'true');
    setShowGate(false);
    setShowIOSFloatingPointer(false);
  };

  return (
    <>
      {/* 1. iOS Floating Bouncing Pointer (Zero-Instruction Tooltip) */}
      {showIOSFloatingPointer && (
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
              onClick={() => setShowIOSFloatingPointer(false)}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 shrink-0 transition-colors"
              aria-label="Dismiss pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Visual arrow indicator pointing down to Safari center share icon */}
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-slate-900 mx-auto -mt-0.5 filter drop-shadow-md"></div>
        </div>
      )}

      {/* 2. Main High-Conversion App Gate Modal */}
      {showGate && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="max-w-md w-full border-border/60 shadow-2xl bg-card/95 backdrop-blur-xl overflow-hidden relative">
            <button
              onClick={handleContinueInWeb}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-colors"
              title="Continue in browser"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <CardContent className="p-6 text-center space-y-5">
              {/* Official Turquoise Brand Logo */}
              <div className="flex justify-center pt-2">
                <div className="relative">
                  <img
                    src={chatrBrandLogo}
                    alt="Chatr+"
                    className="h-20 w-20 object-contain drop-shadow-lg rounded-2xl p-1 bg-white"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 ring-2 ring-background">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                </div>
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-2">
                  <Zap className="h-3.5 w-3.5" />
                  <span>Mandatory App Setup</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  Install Chatr+ App
                </h2>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  To receive <strong className="text-foreground">incoming calls and instant notifications</strong> when Chatr+ is closed (like WhatsApp and FaceTime), install the app on your device.
                </p>
              </div>

              {/* Benefits Grid */}
              <div className="space-y-2.5 text-left bg-muted/40 p-3.5 rounded-xl border border-border/40 text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <PhoneCall className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Lock-Screen Incoming Calls</span>
                    <p className="text-muted-foreground">Rings continuously with Answer &amp; Decline buttons</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <BellRing className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Killed-App Push Delivery</span>
                    <p className="text-muted-foreground">Never miss high-priority messages or urgent alerts</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Instant Startup &amp; Zero Tab Loss</span>
                    <p className="text-muted-foreground">Runs as a dedicated OS binary with offline cache</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons: 1-Tap Frictionless Flow */}
              <div className="space-y-2.5 pt-1">
                {isIOS ? (
                  // iOS Safari Options (Zero Manual 4-Step Text Screens)
                  <>
                    <Button
                      onClick={handleIOSWebClipInstall}
                      size="lg"
                      className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 font-bold shadow-lg hover:shadow-indigo-500/25 transition-all text-white"
                    >
                      <Download className="mr-2 h-5 w-5" />
                      Install Chatr+ (1-Tap WebClip)
                    </Button>

                    <Button
                      onClick={handleShowSafariPointer}
                      variant="outline"
                      size="sm"
                      className="w-full border-blue-500/30 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Add to Home Screen (Point to Share ⬆️)
                    </Button>
                  </>
                ) : (
                  // Android & Desktop Options (Instant 1-Tap Prompt or Direct APK)
                  <>
                    <Button
                      onClick={handle1TapInstall}
                      disabled={installing}
                      size="lg"
                      className="w-full bg-gradient-to-r from-primary via-cyan-500 to-primary font-bold shadow-lg hover:shadow-cyan-500/25 transition-all text-white"
                    >
                      <Download className="mr-2 h-5 w-5" />
                      {installing
                        ? 'Initiating Install...'
                        : isAndroid
                        ? 'Install Chatr+ (1-Tap WebAPK / APK)'
                        : 'Install Chatr+ App (1-Click)'}
                    </Button>

                    {isAndroid && (
                      <a
                        href="/releases/chatr-plus-latest.apk"
                        download="ChatrPlus.apk"
                        onClick={() => setShowGate(false)}
                        className="inline-flex items-center justify-center w-full py-1.5 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
                      >
                        📥 Direct Download APK (Android Package)
                      </a>
                    )}
                  </>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleContinueInWeb}
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  Continue in Web (Limited Background Calls)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};
