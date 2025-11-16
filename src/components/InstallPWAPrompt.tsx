import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, X } from 'lucide-react';
import { canInstallPWA, showInstallPrompt, isPWA } from '@/utils/pwaUtils';

export const InstallPWAPrompt = () => {
  const [showPrompt, setShowPrompt] = React.useState(false);

  React.useEffect(() => {
    // Don't show if already installed as PWA
    if (isPWA()) {
      setShowPrompt(false);
      return;
    }

    // Check if user dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setShowPrompt(false);
      return;
    }

    // Show after 10 seconds if install is available
    const timer = setTimeout(() => {
      if (canInstallPWA()) {
        setShowPrompt(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const handleInstall = async () => {
    const accepted = await showInstallPrompt();
    if (accepted) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[150] animate-in slide-in-from-bottom-4">
      <Card className="p-4 backdrop-blur-xl bg-gradient-glass border-border shadow-elevated">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Download className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Install Chatr</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Add to your home screen for a better experience. Works offline!
            </p>
            <div className="flex gap-2">
              <Button onClick={handleInstall} size="sm" className="flex-1">
                Install
              </Button>
              <Button onClick={handleDismiss} size="sm" variant="ghost">
                Not Now
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
