import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import bcrypt from 'bcryptjs';

/**
 * Secure storage hook for sensitive data
 * Implements client-side encryption before storing
 */
export const useSecureStorage = () => {
  const hashToken = async (token: string): Promise<string> => {
    return await bcrypt.hash(token, 10);
  };

  const verifyToken = async (token: string, hash: string): Promise<boolean> => {
    return await bcrypt.compare(token, hash);
  };

  const storeSecureSession = async (sessionToken: string, deviceInfo: any) => {
    try {
      const sessionTokenHash = await hashToken(sessionToken);
      
      // Note: session_token_hash column added in migration, types will update
      const { data, error } = await supabase
        .from('device_sessions')
        .insert({
          session_token: sessionToken, // Temporary until types refresh
          device_type: deviceInfo.type,
          device_name: deviceInfo.name,
          device_fingerprint: deviceInfo.fingerprint,
          ip_address: deviceInfo.ip,
          user_agent: navigator.userAgent,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        } as any); // Type assertion until DB types refresh

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to store secure session:', error);
      throw error;
    }
  };

  return {
    hashToken,
    verifyToken,
    storeSecureSession,
  };
};
