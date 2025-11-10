import { useState, useEffect } from 'react';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AppSession {
  sessionId: string | null;
  startTime: Date | null;
}

/**
 * Enhanced WebView manager for Indian apps with session tracking
 * and app-specific configurations
 */
export const useWebViewManager = () => {
  const [activeSessions, setActiveSessions] = useState<Map<string, AppSession>>(new Map());

  // App-specific configurations for better WebView experience
  const getAppConfig = (appUrl: string) => {
    const configs: Record<string, any> = {
      'zomato.com': {
        toolbarColor: '#E23744',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'swiggy.com': {
        toolbarColor: '#FC8019',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'paytm.com': {
        toolbarColor: '#00B9F5',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'phonepe.com': {
        toolbarColor: '#5F259F',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'groww.in': {
        toolbarColor: '#00D09C',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'zerodha.com': {
        toolbarColor: '#387ED1',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'meesho.com': {
        toolbarColor: '#9F2089',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'flipkart.com': {
        toolbarColor: '#2874F0',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'myntra.com': {
        toolbarColor: '#FF3F6C',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'jiosaavn.com': {
        toolbarColor: '#2BC5B4',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'gaana.com': {
        toolbarColor: '#E8352E',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'hotstar.com': {
        toolbarColor: '#0F1014',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'irctc.co.in': {
        toolbarColor: '#C44B4B',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'redbus.in': {
        toolbarColor: '#D84E55',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'oyorooms.com': {
        toolbarColor: '#EE2E24',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'naukri.com': {
        toolbarColor: '#4A90E2',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'internshala.com': {
        toolbarColor: '#00A5EC',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'healthifyme.com': {
        toolbarColor: '#7CB342',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'tatacliq.com': {
        toolbarColor: '#D41F3D',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
      'dunzo.com': {
        toolbarColor: '#FF0000',
        enableUrlBarHiding: true,
        enableZoom: false,
      },
    };

    // Find matching config based on domain
    for (const [domain, config] of Object.entries(configs)) {
      if (appUrl.includes(domain)) {
        return config;
      }
    }

    // Default config
    return {
      toolbarColor: '#1a1a2e',
      enableUrlBarHiding: true,
      enableZoom: false,
    };
  };

  const openApp = async (app: { id: string; app_name: string; url: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    try {
      // Start usage session tracking
      let sessionId: string | null = null;
      const startTime = new Date();

      if (user) {
        const { data: sessionData } = await supabase
          .from('app_usage_sessions' as any)
          .insert({
            user_id: user.id,
            app_id: app.id,
            session_start: startTime.toISOString(),
          })
          .select()
          .single() as any;
        
        sessionId = sessionData?.id || null;
        
        // Track active session
        setActiveSessions(prev => new Map(prev).set(app.id, { sessionId, startTime }));
      }

      // Load saved session data
      let sessionData = null;
      if (user) {
        try {
          const { data } = await supabase
            .from('app_session_data' as any)
            .select('session_data')
            .eq('user_id', user.id)
            .eq('app_id', app.id)
            .maybeSingle() as any;
          
          sessionData = data?.session_data || null;
        } catch (err) {
          console.log('Session data not available:', err);
        }
      }

      // Store session data for WebView
      if (sessionData) {
        localStorage.setItem(`app_session_${app.id}`, JSON.stringify(sessionData));
      }

      // Get app-specific configuration
      const appConfig = getAppConfig(app.url);

      // Open in WebView with optimized settings
      toast.loading(`Opening ${app.app_name}...`, { id: `open-${app.id}` });
      
      await Browser.open({
        url: app.url,
        presentationStyle: 'fullscreen',
        toolbarColor: appConfig.toolbarColor,
      });

      toast.success(`${app.app_name} opened`, { id: `open-${app.id}` });

      // Setup browser close listener
      const listener = await Browser.addListener('browserFinished', async () => {
        await handleAppClose(app.id, sessionId, user?.id || null);
        listener.remove();
      });

      return { success: true };
    } catch (error) {
      console.error('Error opening app:', error);
      toast.error(`Failed to open ${app.app_name}`);
      return { success: false, error };
    }
  };

  const handleAppClose = async (appId: string, sessionId: string | null, userId: string | null) => {
    try {
      // End usage session
      if (sessionId && userId) {
        await supabase
          .from('app_usage_sessions' as any)
          .update({
            session_end: new Date().toISOString(),
          })
          .eq('id', sessionId);
      }

      // Sync session data back to server
      const updatedSession = localStorage.getItem(`app_session_${appId}`);
      if (updatedSession && userId) {
        try {
          await supabase
            .from('app_session_data' as any)
            .upsert({
              user_id: userId,
              app_id: appId,
              session_data: JSON.parse(updatedSession),
              last_synced: new Date().toISOString(),
            });
        } catch (err) {
          console.log('Failed to sync session data:', err);
        }
      }

      // Clear active session
      setActiveSessions(prev => {
        const newMap = new Map(prev);
        newMap.delete(appId);
        return newMap;
      });
    } catch (error) {
      console.error('Error handling app close:', error);
    }
  };

  const isAppOpen = (appId: string) => {
    return activeSessions.has(appId);
  };

  const getActiveSessionDuration = (appId: string) => {
    const session = activeSessions.get(appId);
    if (!session?.startTime) return 0;
    
    return Math.floor((new Date().getTime() - session.startTime.getTime()) / 1000);
  };

  return {
    openApp,
    isAppOpen,
    getActiveSessionDuration,
    activeSessions: Array.from(activeSessions.keys()),
  };
};
