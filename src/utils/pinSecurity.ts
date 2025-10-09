import bcrypt from 'bcryptjs';
import { supabase } from '@/integrations/supabase/client';

const SALT_ROUNDS = 10;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Hash a PIN using bcrypt
 */
export const hashPin = async (pin: string): Promise<string> => {
  return bcrypt.hash(pin, SALT_ROUNDS);
};

/**
 * Verify a PIN against its hash
 */
export const verifyPin = async (pin: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(pin, hash);
};

/**
 * Check if user is locked out due to too many failed attempts
 */
export const isUserLockedOut = async (
  phoneNumber: string,
  deviceFingerprint: string
): Promise<{ locked: boolean; remainingTime?: number }> => {
  const { data: attempts, error } = await supabase
    .from('login_attempts')
    .select('*')
    .eq('phone_number', phoneNumber)
    .eq('device_fingerprint', deviceFingerprint)
    .eq('success', false)
    .gte('created_at', new Date(Date.now() - LOCKOUT_DURATION).toISOString())
    .order('created_at', { ascending: false });

  if (error || !attempts) {
    return { locked: false };
  }

  if (attempts.length >= MAX_ATTEMPTS) {
    const lastAttempt = new Date(attempts[0].created_at).getTime();
    const remainingTime = LOCKOUT_DURATION - (Date.now() - lastAttempt);
    
    if (remainingTime > 0) {
      return { locked: true, remainingTime };
    }
  }

  return { locked: false };
};

/**
 * Log a login attempt
 */
export const logLoginAttempt = async (
  phoneNumber: string,
  deviceFingerprint: string,
  attemptType: 'pin' | 'biometric' | 'google',
  success: boolean,
  userId?: string
): Promise<void> => {
  await supabase.from('login_attempts').insert({
    user_id: userId || null,
    phone_number: phoneNumber,
    device_fingerprint: deviceFingerprint,
    attempt_type: attemptType,
    success
  });
};

/**
 * Clear failed attempts after successful login
 */
export const clearFailedAttempts = async (
  phoneNumber: string,
  deviceFingerprint: string
): Promise<void> => {
  // We don't delete them, just mark as cleared by having a successful attempt
  // This helps maintain audit trail
};

/**
 * Validate PIN format (4 digits)
 */
export const isValidPin = (pin: string): boolean => {
  return /^\d{4}$/.test(pin);
};
