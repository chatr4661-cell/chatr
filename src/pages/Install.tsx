import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Smartphone, Chrome, Apple, CheckCircle2 } from 'lucide-react';
import chatrBrandLogo from '@/assets/chatr-brand-logo.png';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      toast.success('Chatr+ installed successfully! 🎉');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.error('Install prompt not available. Try adding from browser menu.');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast.success('Installing Chatr+...');
    }
    
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-cyan-500/5 p-4">
      <div className="max-w-2xl mx-auto pt-8 pb-20">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src={chatrBrandLogo} 
            alt="Chatr+" 
            className="h-32 mx-auto mb-4 drop-shadow-2xl"
          />
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-cyan-500 to-primary bg-clip-text text-transparent">
            Install Chatr+
          </h1>
          <p className="text-muted-foreground text-lg">
            Get the full app experience on your device
          </p>
        </div>

        {isInstalled ? (
          // Already Installed
          <Card className="border-2 border-green-500/20 bg-green-50/50">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-green-700">Already Installed!</h2>
              <p className="text-muted-foreground mb-4">
                Chatr+ is installed on your device. You can find it on your home screen.
              </p>
              <Button onClick={() => window.location.href = '/'} className="bg-green-500 hover:bg-green-600">
                Open App
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Install Button for Android/Chrome */}
            {deferredPrompt && (
              <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-cyan-500/5">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                      <Smartphone className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">Install Now</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Install Chatr+ for the best experience. Works offline, loads faster, and feels like a native app!
                      </p>
                      <Button 
                        onClick={handleInstallClick}
                        size="lg"
                        className="w-full bg-gradient-to-r from-primary to-cyan-500 hover:shadow-lg"
                      >
                        <Download className="mr-2 h-5 w-5" />
                        Install Chatr+
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* iOS Instructions */}
            {isIOS && (
              <Card className="mb-6 border-2 border-blue-500/20 bg-blue-50/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-2xl">
                      <Apple className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">Install on iPhone/iPad</h3>
                      <p className="text-sm text-muted-foreground">
                        Follow these steps to add Chatr+ to your home screen:
                      </p>
                    </div>
                  </div>
                  
                  <ol className="space-y-3 ml-4">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center font-bold">1</span>
                      <span className="text-sm">Tap the <strong>Share</strong> button (square with arrow) at the bottom of Safari</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center font-bold">2</span>
                      <span className="text-sm">Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center font-bold">3</span>
                      <span className="text-sm">Tap <strong>"Add"</strong> in the top right corner</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center font-bold">4</span>
                      <span className="text-sm">Open Chatr+ from your home screen!</span>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Android/Chrome Instructions */}
            {isAndroid && !deferredPrompt && (
              <Card className="mb-6 border-2 border-green-500/20 bg-green-50/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-green-500/10 rounded-2xl">
                      <Chrome className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">Install on Android</h3>
                      <p className="text-sm text-muted-foreground">
                        Follow these steps to install Chatr+:
                      </p>
                    </div>
                  </div>
                  
                  <ol className="space-y-3 ml-4">
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white text-sm flex items-center justify-center font-bold">1</span>
                      <span className="text-sm">Tap the <strong>menu</strong> (three dots) in Chrome</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white text-sm flex items-center justify-center font-bold">2</span>
                      <span className="text-sm">Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white text-sm flex items-center justify-center font-bold">3</span>
                      <span className="text-sm">Tap <strong>"Install"</strong> to confirm</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white text-sm flex items-center justify-center font-bold">4</span>
                      <span className="text-sm">Open Chatr+ from your home screen!</span>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Benefits */}
            <Card className="border-2 border-border/40">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4">Why Install?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1">Works Offline</h4>
                      <p className="text-sm text-muted-foreground">Access your messages even without internet</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1">Faster Loading</h4>
                      <p className="text-sm text-muted-foreground">Instant startup, no browser overhead</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1">Push Notifications</h4>
                      <p className="text-sm text-muted-foreground">Never miss a message or call</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1">Native Feel</h4>
                      <p className="text-sm text-muted-foreground">Feels like a real app on your device</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Back to App */}
        <div className="text-center mt-8">
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/'}
            className="text-muted-foreground"
          >
            Continue in Browser Instead
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Install;
