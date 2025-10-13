import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook for generating SSO tokens for seamless authentication with mini-apps
 * Enables single sign-on between Chatr and external/internal apps
 */
export const useSSOToken = () => {
  const [loading, setLoading] = useState(false);

  const generateToken = async (appId: string): Promise<string | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('generate_sso_token', {
        p_app_id: appId
      });

      if (error) throw error;

      return data as string;
    } catch (error) {
      console.error('Error generating SSO token:', error);
      toast.error('Failed to generate authentication token');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const openAppWithSSO = async (appUrl: string, appId: string) => {
    const token = await generateToken(appId);
    
    if (!token) return;

    // For external URLs, append token as query parameter
    if (!appUrl.startsWith('/')) {
      const separator = appUrl.includes('?') ? '&' : '?';
      const ssoUrl = `${appUrl}${separator}sso_token=${token}`;
      window.open(ssoUrl, '_blank');
    } else {
      // For internal routes, store token in sessionStorage
      sessionStorage.setItem('chatr_sso_token', token);
      sessionStorage.setItem('chatr_sso_app_id', appId);
    }
  };

  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('sso_tokens')
        .select('id, expires_at, used_at')
        .eq('token', token)
        .single();

      if (error || !data) return false;

      // Check if token is expired
      if (new Date(data.expires_at) < new Date()) {
        return false;
      }

      // Check if already used
      if (data.used_at) {
        return false;
      }

      // Mark token as used
      await supabase
        .from('sso_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);

      return true;
    } catch (error) {
      console.error('Error validating SSO token:', error);
      return false;
    }
  };

  return {
    generateToken,
    openAppWithSSO,
    validateToken,
    loading
  };
};
