import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Phone, CheckCircle2, Volume2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { registerPushTokenForUser } from '@/hooks/useFirebaseMessaging';
import { supabase } from '@/integrations/supabase/client';

interface CallAlertPermissionBannerProps {
  userId?: string;
}

export const CallAlertPermissionBanner: React.FC<CallAlertPermissionBannerProps> = ({ userId }) => {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default';
  });
  const [isActivating, setIsActivating] = useState(false);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const updatePerm = () => setPermission(Notification.permission);
    updatePerm();

    // Check periodically in case user updated in browser settings
    const interval = setInterval(updatePerm, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleEnablePermission = async () => {
    if (!userId) {
      toast.info('Please log in to activate incoming call ringing.');
      return;
    }

    setIsActivating(true);
    try {
      const token = await registerPushTokenForUser(userId);
      const newPerm = Notification.permission;
      setPermission(newPerm);

      if (newPerm === 'granted') {
        toast.success('✅ Incoming call ringing active! Calls will ring even when the app is closed.');
      } else if (newPerm === 'denied') {
        toast.error('Notifications blocked in browser. Click the lock/tune icon near the URL to allow notifications.');
      }
    } catch (err: any) {
      console.error('Error activating incoming call alerts:', err);
      toast.error('Could not activate notifications: ' + (err?.message || 'unknown'));
    } finally {
      setIsActivating(false);
    }
  };

  const handleTestBackgroundCall = async () => {
    if (Notification.permission !== 'granted') {
      toast.error('Please enable notifications first.');
      return;
    }

    toast.info('⏱️ Test call incoming in 5 seconds! Minimize or close this window now to verify.', {
      duration: 5000,
    });

    setTestCountdown(5);
    let secondsLeft = 5;

    const timer = setInterval(async () => {
      secondsLeft -= 1;
      if (secondsLeft > 0) {
        setTestCountdown(secondsLeft);
      } else {
        clearInterval(timer);
        setTestCountdown(null);

        // Dispatch background call notification via active service worker
        try {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            await reg.showNotification('📞 Incoming Video Call', {
              body: 'Chatr Test is calling you on Chatr+...',
              icon: '/chatr-logo.png',
              badge: '/chatr-logo.png',
              tag: 'incoming-call-test-preview',
              requireInteraction: true,
              renotify: true,
              vibrate: [500, 200, 500, 200, 500, 200, 500],
              data: {
                type: 'call',
                callId: 'test-preview-' + Date.now(),
                call_id: 'test-preview-' + Date.now(),
                action_url: '/calls',
              },
              actions: [
                { action: 'accept_call', title: '✅ Answer' },
                { action: 'decline_call', title: '❌ Decline' },
              ],
            });
            console.log('✅ Dispatched test incoming call notification to desktop OS');
          }
        } catch (e) {
          console.warn('Could not show test notification:', e);
        }
      }
    }, 1000);
  };

  // If granted and no test is running, keep UI clean
  if (permission === 'granted' && testCountdown === null) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md z-40 border-b border-emerald-500/30">
      <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center space-x-2">
          <span className="p-1.5 rounded-full bg-white/20 animate-pulse">
            <Phone className="h-4 w-4" />
          </span>
          {permission === 'granted' && testCountdown !== null ? (
            <p className="font-medium text-amber-200">
              ⚡ Test call ringing in <span className="font-bold text-white text-base">{testCountdown}s</span> — Close or minimize this window now!
            </p>
          ) : (
            <p className="font-medium">
              <span className="font-semibold">Enable Closed-App Calling:</span> Get ringing incoming calls & alerts even when Chatr+ is closed.
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {permission !== 'granted' ? (
            <Button
              onClick={handleEnablePermission}
              disabled={isActivating}
              size="sm"
              className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold px-4 py-1 h-8 rounded-full shadow transition-all duration-150 transform hover:scale-105"
            >
              <Bell className="h-3.5 w-3.5 mr-1.5" />
              {isActivating ? 'Activating...' : 'Enable Calling Alerts'}
            </Button>
          ) : (
            <Button
              onClick={handleTestBackgroundCall}
              size="sm"
              variant="secondary"
              className="bg-emerald-800 text-white hover:bg-emerald-900 font-medium px-3 py-1 h-8 rounded-full text-xs"
            >
              <Volume2 className="h-3.5 w-3.5 mr-1" />
              Test Ring in 5s
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
