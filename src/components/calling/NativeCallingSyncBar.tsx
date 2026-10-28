import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { registerPushTokenForUser } from '@/hooks/useFirebaseMessaging';
import { useSmartNotificationScheduler } from '@/hooks/useSmartNotificationScheduler';

interface NativeCallingSyncBarProps {
  userId?: string;
}

export const NativeCallingSyncBar: React.FC<NativeCallingSyncBarProps> = ({ userId }) => {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [tokenPreview, setTokenPreview] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const { triggerTest } = useSmartNotificationScheduler(userId);

  const checkTokenStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('privacy_settings')
        .eq('id', userId)
        .single();

      const ps = (profile?.privacy_settings || {}) as Record<string, any>;
      const existingToken = ps.fcm_token || (Array.isArray(ps.device_tokens) && ps.device_tokens[0]);

      if (existingToken && typeof existingToken === 'string') {
        setHasToken(true);
        setTokenPreview(existingToken.slice(0, 14) + '...');
      } else {
        setHasToken(false);
      }
    } catch (e) {
      console.warn('Could not check token status:', e);
      setHasToken(false);
    }
  }, [userId]);

  useEffect(() => {
    checkTokenStatus();
  }, [checkTokenStatus]);

  const handleActivate = useCallback(async (forceRefresh: boolean = false) => {
    if (!userId) {
      toast.info('Please log in first.');
      return;
    }

    setIsSyncing(true);
    try {
      const token = await registerPushTokenForUser(userId, forceRefresh);
      if (token) {
        setHasToken(true);
        setTokenPreview(token.slice(0, 14) + '...');
        toast.success('✅ Calling push token registered & verified!');
      } else {
        const perm = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
        if (perm === 'denied') {
          toast.error('Notifications are blocked in Chrome. Click the tune/lock icon in the address bar to Allow.');
        } else {
          toast.error('Could not acquire push token. Please make sure notifications are allowed.');
        }
      }
    } catch (err: any) {
      console.error('Activation error:', err);
      toast.error('Activation failed: ' + (err?.message || 'unknown error'));
    } finally {
      setIsSyncing(false);
      await checkTokenStatus();
    }
  }, [userId, checkTokenStatus]);

  // Automatic background activation if permission is already granted in Chrome
  useEffect(() => {
    if (userId && typeof Notification !== 'undefined' && Notification.permission === 'granted' && hasToken === false && !isSyncing) {
      handleActivate();
    }
  }, [userId, hasToken, isSyncing, handleActivate]);

  const handleTestCall = async () => {
    toast.info('⏱️ Test call armed in background! You can close or minimize this window right now.', {
      duration: 6000,
    });

    const testCallId = 'test-' + Date.now();

    // 1. Hand off countdown to the Service Worker background daemon thread IMMEDIATELY
    // The Service Worker keeps running even if the user clicks [X] to close the window!
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sw = reg.active || navigator.serviceWorker.controller;
        if (sw) {
          sw.postMessage({
            type: 'SCHEDULE_TEST_CALL',
            delayMs: 5000,
            callData: {
              callId: testCallId,
              callerName: 'Chatr Test (Closed App)',
            },
          });
          console.log('🚀 [CallingSync] Successfully handed test call off to Service Worker daemon');
        }
      }
    } catch (e) {
      console.warn('Could not post test call to SW:', e);
    }

    // 2. Also trigger FCM direct dispatch
    try {
      if (userId) {
        import('@/services/fcmDirectDispatcher').then(({ dispatchDirectFCMCall }) => {
          dispatchDirectFCMCall({
            receiverId: userId,
            callerId: userId,
            callerName: 'Chatr Test',
            callId: testCallId,
            callType: 'video',
          }).catch((err) => console.warn('Direct FCM call test error:', err));
        });
      }
    } catch (fcmErr) {
      console.warn('FCM dispatch import error:', fcmErr);
    }

    // 3. Keep visual countdown on screen if user does NOT close the window
    let secs = 5;
    setCountdown(secs);

    const interval = setInterval(() => {
      secs -= 1;
      if (secs > 0) {
        setCountdown(secs);
      } else {
        clearInterval(interval);
        setCountdown(null);
        // Trigger in-app incoming call screen pop-up!
        window.dispatchEvent(
          new CustomEvent('chatr:trigger-incoming-call', {
            detail: {
              id: testCallId,
              callerName: 'Chatr Test Incoming Call',
              call_type: 'video',
            },
          })
        );
      }
    }, 1000);
  };

  // Expose background call & wellness test triggers for dev/console use without cluttering the UI
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__chatrCalling = {
        testCall: handleTestCall,
        triggerWellness: triggerTest,
        activate: () => handleActivate(true),
        hasToken,
        tokenPreview,
      };
    }
  }, [hasToken, tokenPreview, handleActivate, triggerTest, handleTestCall]);

  // Keep UI clean: do not render the bar when active (hasToken === true) or loading
  if (!userId || hasToken !== false) return null;

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-border/80 shadow-xs mb-3 transition-all duration-200">
      {/* INACTIVE STATE: Attention-grabbing actionable card */}
      <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-red-500/5 p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-amber-500/20 text-amber-600 shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs sm:text-sm font-bold text-foreground">
              Closed-App Calling Inactive
            </p>
            <p className="text-[11px] text-muted-foreground max-w-md">
              Your device token is not registered. Calls cannot wake or ring your device when Chatr+ is closed until activated.
            </p>
          </div>
        </div>

        <Button
          onClick={() => handleActivate()}
          disabled={isSyncing}
          size="sm"
          className="h-8.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold text-xs shadow-sm gap-1.5 active:scale-95 transition-transform"
        >
          <Zap className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Activating...' : '⚡ Activate Closed-App Calling'}</span>
        </Button>
      </div>
    </div>
  );
};
