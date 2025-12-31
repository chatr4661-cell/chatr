import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { GlobalCallNotifications } from './GlobalCallNotifications';

/**
 * UnifiedCallHandler - Handles calls across web and native platforms
 * 
 * Architecture:
 * - Web: Uses GlobalCallNotifications for full WebRTC call handling
 * - Native: Defers to FCM → TelecomManager/CallKit for incoming calls
 *           but still uses web layer for outgoing call initiation
 */
export const UnifiedCallHandler: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted || !user) return;

      setUserId(user.id);

      // Get username from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (mounted && profile?.username) {
        setUsername(profile.username);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (session?.user) {
        setUserId(session.user.id);
        
        // Refresh username on auth change
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single();

        if (mounted && profile?.username) {
          setUsername(profile.username);
        }
      } else {
        setUserId(null);
        setUsername('');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Don't render if no user logged in
  if (!userId) return null;

  // On native platforms, incoming calls are handled by FCM → TelecomManager/CallKit
  // But we still need WebRTC for outgoing calls and call continuation after accept
  // So we render GlobalCallNotifications on ALL platforms for outgoing call support
  // The incoming call UI on native is handled by the system, not this component
  
  return (
    <GlobalCallNotifications 
      userId={userId} 
      username={username || 'User'} 
    />
  );
};
