import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Smartphone, Apple, CheckCircle2, ArrowDown, Share2, ArrowLeft, ShieldCheck, Zap } from 'lucide-react';
import chatrBrandLogo from '@/assets/chatr-brand-logo.png';
import { toast } from 'sonner';
import { triggerOneTapInstall, isPWA } from '@/utils/pwaUtils';

export default function Install() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showIOSFloatingPointer, setShowIOSFloatingPointer] = useState(false);
  const [installing, setInstalling] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already running standalone
    if (isPWA()) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for successful install
    const onInstalled = () => {
      setIsInstalled(true);
      setShowIOSFloatingPointer(false);
      toast.success('Chatr+ installed successfully! 🎉');
    };

    window.addEventListener('chatr:appinstalled', onInstalled);

    return () => {
      window.removeEventListener('chatr:appinstalled', onInstalled);
    };
  }, []);

  const handle1TapInstall = async () => {
    setInstalling(true);
    try {
      const res = await triggerOneTapInstall();
      if (res.type === 'prompt' && res.success) {
        setIsInstalled(true);
      }
    } catch (e) {
      console.warn('Install failed:', e);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-cyan-500/5 p-4 relative">
      {/* iOS Floating Bouncing Pointer Tooltip */}
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
              ✕
            </button>
          </div>
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-slate-900 mx-auto -mt-0.5 filter drop-shadow-md"></div>
        </div>
      )}

      <div className="max-w-xl mx-auto pt-6 pb-20">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="rounded-full text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Continue in Browser
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="relative inline-block mb-3">
            <img 
              src={chatrBrandLogo} 
              alt="Chatr+" 
              className="h-24 mx-auto object-contain drop-shadow-xl rounded-3xl p-1 bg-white"
            />
            <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 ring-2 ring-background">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>

          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary via-cyan-500 to-primary bg-clip-text text-transparent">
            Install Chatr+ App
          </h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Get instant incoming calls, killed-app notifications, and offline speed with zero friction.
          </p>
        </div>

        {isInstalled ? (
          // Already Installed Confirmation
          <Card className="border-2 border-green-500/30 bg-green-50/50 dark:bg-green-950/20 text-center p-6 rounded-2xl">
            <CardContent className="space-y-4 p-0">
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
              <div>
                <h2 className="text-xl font-bold text-green-800 dark:text-green-300">Chatr+ is Installed!</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  You can now launch Chatr+ directly from your Home Screen.
                </p>
              </div>
              <Button onClick={() => navigate('/')} className="w-full bg-green-600 hover:bg-green-700 font-bold">
                Open Chatr+ Now
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* 1-Tap Mobile Actions */}
            {isIOS ? (
              // iOS Options
              <Card className="border-2 border-blue-500/20 bg-card/90 shadow-xl rounded-2xl overflow-hidden backdrop-blur-xl">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-600 dark:text-blue-400 shrink-0">
                      <Apple className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">iPhone / iPad 1-Tap Installation</h3>
                      <p className="text-xs text-muted-foreground">Add to Home Screen without manual hunting</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <Button
                      onClick={() => setShowIOSFloatingPointer(true)}
                      size="lg"
                      className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-bold shadow-lg hover:shadow-indigo-500/25 transition-all"
                    >
                      <Share2 className="mr-2 h-5 w-5" />
                      Add to Home Screen (Point to Share ⬆️)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Android & Desktop Options
              <Card className="border-2 border-primary/20 bg-card/90 shadow-xl rounded-2xl overflow-hidden backdrop-blur-xl">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary shrink-0">
                      <Smartphone className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">
                        {isAndroid ? 'Android 1-Tap Native Install' : 'Desktop 1-Click Install'}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {isAndroid ? 'Instant WebAPK or direct package download' : 'Install standalone app window'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <Button
                      onClick={handle1TapInstall}
                      disabled={installing}
                      size="lg"
                      className="w-full bg-gradient-to-r from-primary via-cyan-500 to-primary text-white font-bold shadow-lg hover:shadow-cyan-500/25 transition-all"
                    >
                      <Download className="mr-2 h-5 w-5" />
                      {installing
                        ? 'Initiating Install...'
                        : isAndroid
                        ? 'Install Chatr+ (1-Tap WebAPK)'
                        : 'Install Chatr+ App (1-Click)'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Why Install Highlights */}
            <Card className="border border-border/50 bg-card/60 rounded-2xl">
              <CardContent className="p-5 space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Why Install the Native App?
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Continuous lock-screen call ringing</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Push notifications when app is closed</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Instant boot under 50ms</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Full offline messaging cache</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
