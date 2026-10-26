import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, PhoneCall, BellRing, Zap, X, ShieldCheck, ChevronRight } from 'lucide-react';
import { isPWA, showInstallPrompt, canInstallPWA } from '@/utils/pwaUtils';
import chatrBrandLogo from '@/assets/chatr-brand-logo.png';

export const MandatoryAppGate: React.FC = () => {
  const [showGate, setShowGate] = useState(false);
  const [hasPrompt, setHasPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // 1. If already inside native Capacitor binary shell, do not gate
    if (Capacitor.isNativePlatform()) {
      return;
    }

    // 2. If running as standalone installed PWA, do not gate
    if (isPWA()) {
      return;
    }

    // 3. Skip gating on explicit download / install or auth onboarding pages
    const exemptPaths = ['/download', '/install', '/.lovable', '/privacy', '/terms'];
    if (exemptPaths.some(p => location.pathname.startsWith(p))) {
      setShowGate(false);
      return;
    }

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isApple);

    // Check if user temporarily bypassed for this session
    const sessionBypassed = sessionStorage.getItem('chatr_install_gate_bypassed');
    if (sessionBypassed === 'true') {
      setShowGate(false);
      return;
    }

    // Show gate after brief 800ms mount animation
    const timer = setTimeout(() => {
      setShowGate(true);
      setHasPrompt(canInstallPWA());
    }, 800);

    const onPromptReady = () => setHasPrompt(true);
    const onInstalled = () => setShowGate(false);

    window.addEventListener('chatr:installpromptready', onPromptReady);
    window.addEventListener('chatr:appinstalled', onInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('chatr:installpromptready', onPromptReady);
      window.removeEventListener('chatr:appinstalled', onInstalled);
    };
  }, [location.pathname]);

  const handleInstallNow = async () => {
    if (canInstallPWA()) {
      const accepted = await showInstallPrompt();
      if (accepted) {
        setShowGate(false);
        return;
      }
    }

    // If install prompt is not directly triggerable (e.g. iOS or browser menu required)
    navigate('/install');
  };

  const handleContinueInWeb = () => {
    sessionStorage.setItem('chatr_install_gate_bypassed', 'true');
    setShowGate(false);
  };

  if (!showGate) {
    return null;
  }

  return (
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
                <p className="text-muted-foreground">Rings continuously with Answer & Decline buttons</p>
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
                <span className="font-semibold text-foreground">Instant Startup & Zero Tab Loss</span>
                <p className="text-muted-foreground">Runs as a dedicated OS binary with offline cache</p>
              </div>
            </div>
          </div>

          {/* iOS Special Note if on Apple device */}
          {isIOS && (
            <div className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 p-2.5 rounded-lg text-left">
              <strong>iOS Safari:</strong> Tap the <strong>Share</strong> button at the bottom of Safari, then tap <strong>"Add to Home Screen"</strong>.
            </div>
          )}

          {/* CTA Buttons */}
          <div className="space-y-2 pt-1">
            <Button
              onClick={handleInstallNow}
              size="lg"
              className="w-full bg-gradient-to-r from-primary via-cyan-500 to-primary font-bold shadow-lg hover:shadow-cyan-500/25 transition-all text-white"
            >
              <Download className="mr-2 h-5 w-5" />
              {hasPrompt ? 'Install Chatr+ App Now' : (isIOS ? 'Show iOS Install Guide' : 'Install / Download Chatr+')}
            </Button>

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
  );
};
