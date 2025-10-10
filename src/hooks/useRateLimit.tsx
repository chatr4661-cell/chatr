import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMinutes: 15,
};

export const useRateLimit = () => {
  const [isBlocked, setIsBlocked] = useState(false);

  const checkRateLimit = async (
    identifier: string,
    actionType: string,
    config: RateLimitConfig = DEFAULT_CONFIG
  ): Promise<{ allowed: boolean; remainingAttempts: number; blockedUntil?: Date }> => {
    try {
      // Check existing rate limit
      const { data: existing, error: fetchError } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('identifier', identifier)
        .eq('action_type', actionType)
        .gte('window_start', new Date(Date.now() - config.windowMinutes * 60 * 1000).toISOString())
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // Check if currently blocked
      if (existing?.blocked_until && new Date(existing.blocked_until) > new Date()) {
        setIsBlocked(true);
        return {
          allowed: false,
          remainingAttempts: 0,
          blockedUntil: new Date(existing.blocked_until),
        };
      }

      const currentCount = existing?.attempt_count || 0;

      // If exceeded max attempts, block
      if (currentCount >= config.maxAttempts) {
        const blockedUntil = new Date(Date.now() + config.windowMinutes * 60 * 1000);
        
        await supabase
          .from('rate_limits')
          .upsert({
            identifier,
            action_type: actionType,
            attempt_count: currentCount + 1,
            blocked_until: blockedUntil.toISOString(),
            window_start: new Date().toISOString(),
          });

        setIsBlocked(true);
        return {
          allowed: false,
          remainingAttempts: 0,
          blockedUntil,
        };
      }

      // Increment attempt count
      await supabase
        .from('rate_limits')
        .upsert({
          identifier,
          action_type: actionType,
          attempt_count: currentCount + 1,
          window_start: existing?.window_start || new Date().toISOString(),
        });

      return {
        allowed: true,
        remainingAttempts: config.maxAttempts - (currentCount + 1),
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open for better UX, but log the error
      return { allowed: true, remainingAttempts: config.maxAttempts };
    }
  };

  const resetRateLimit = async (identifier: string, actionType: string) => {
    try {
      await supabase
        .from('rate_limits')
        .delete()
        .eq('identifier', identifier)
        .eq('action_type', actionType);
      
      setIsBlocked(false);
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
    }
  };

  return {
    checkRateLimit,
    resetRateLimit,
    isBlocked,
  };
};
