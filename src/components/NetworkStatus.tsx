import * as React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { addNetworkListeners } from '@/utils/pwaUtils';

export const NetworkStatus = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [showOfflineAlert, setShowOfflineAlert] = React.useState(!navigator.onLine);

  React.useEffect(() => {
    const cleanup = addNetworkListeners(
      () => {
        setIsOnline(true);
        setShowOfflineAlert(false);
      },
      () => {
        setIsOnline(false);
        setShowOfflineAlert(true);
      }
    );

    return cleanup;
  }, []);

  // Auto-hide online notification after 3 seconds
  React.useEffect(() => {
    if (isOnline && !showOfflineAlert) {
      const timer = setTimeout(() => {
        setShowOfflineAlert(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, showOfflineAlert]);

  if (!showOfflineAlert && isOnline) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-full px-4">
      <Alert 
        variant={isOnline ? "default" : "destructive"}
        className="backdrop-blur-xl bg-background/95 border-2 shadow-lg animate-in fade-in slide-in-from-top-2"
      >
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5" />
          )}
          <AlertDescription>
            {isOnline ? (
              <span className="text-green-600 dark:text-green-400 font-medium">Back online</span>
            ) : (
              <>
                <span className="font-medium">No internet connection</span>
                <p className="text-xs mt-1">Messages will be sent when you're back online</p>
              </>
            )}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
};
