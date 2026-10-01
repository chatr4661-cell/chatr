/**
 * CHATR — CANONICAL PHONE-FIRST IDENTITY SERVICE
 * 
 * Central authoritative utility for phone normalization, identity comparison,
 * phone-based user resolution, and Super Admin authorization.
 * 
 * Invariants:
 * - Phone Number = Canonical Business Identity
 * - Supabase Auth UUID = Relational Database Primary Key
 * - Email = Optional / Internal compatibility field only
 */

import { supabase } from '@/integrations/supabase/client';

export const DEFAULT_COUNTRY_CODE = '+91';
export const SUPER_ADMIN_PHONES = ['9910678611', '9717845477'] as const;

const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

/**
 * Normalizes any raw phone input to canonical E.164 international format (+919910678611)
 */
export function normalizePhone(rawPhone?: string | null, defaultCountryCode: string = DEFAULT_COUNTRY_CODE): string {
  if (!rawPhone) return '';

  const raw = rawPhone.trim();
  
  // If synthetic @chatr.local address was passed, strip domain first
  const cleanRaw = raw.includes('@chatr.local') ? raw.split('@')[0] : raw;
  
  const hasPlus = cleanRaw.startsWith('+');
  const hasDoubleZero = cleanRaw.startsWith('00');
  const digits = cleanRaw.replace(/\D/g, '');

  if (!digits) return '';

  let candidate = '';

  if (hasPlus) {
    candidate = `+${digits}`;
  } else if (hasDoubleZero) {
    candidate = `+${digits.substring(2)}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    candidate = `+${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    const codeDigits = defaultCountryCode.replace(/\D/g, '');
    candidate = `+${codeDigits}${digits.substring(1)}`;
  } else if (digits.length === 10) {
    const codeDigits = defaultCountryCode.replace(/\D/g, '');
    candidate = `+${codeDigits}${digits}`;
  } else if (digits.length > 10) {
    candidate = `+${digits}`;
  } else {
    const codeDigits = defaultCountryCode.replace(/\D/g, '');
    candidate = `+${codeDigits}${digits}`;
  }

  return E164_PHONE_REGEX.test(candidate) ? candidate : (digits.length >= 10 ? `+${digits}` : '');
}

/**
 * Normalizes phone to standard 10-digit national number for India context (9910678611)
 */
export function canonicalNationalPhone(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  const raw = rawPhone.includes('@chatr.local') ? rawPhone.split('@')[0] : rawPhone;
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Format phone number for human-friendly user-facing display (+91 99106 78611)
 */
export function formatPhoneDisplay(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  const national = canonicalNationalPhone(rawPhone);
  if (national.length === 10) {
    return `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
  }
  const e164 = normalizePhone(rawPhone);
  return e164 || rawPhone;
}

/**
 * Validates whether a phone number is valid
 */
export function isValidPhone(rawPhone?: string | null): boolean {
  if (!rawPhone) return false;
  const digits = rawPhone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Compares two phone strings for canonical business equality
 */
export function isSamePhone(phoneA?: string | null, phoneB?: string | null): boolean {
  if (!phoneA || !phoneB) return false;
  const nationalA = canonicalNationalPhone(phoneA);
  const nationalB = canonicalNationalPhone(phoneB);
  if (nationalA && nationalB && nationalA === nationalB) return true;
  
  const normA = normalizePhone(phoneA);
  const normB = normalizePhone(phoneB);
  return Boolean(normA && normB && normA === normB);
}

/**
 * Checks if a phone number belongs to the authoritative Super Admin allowlist
 */
export function isSuperAdminPhone(rawPhone?: string | null): boolean {
  if (!rawPhone) return false;
  const national = canonicalNationalPhone(rawPhone);
  return (SUPER_ADMIN_PHONES as readonly string[]).includes(national);
}

/**
 * Strips synthetic internal domains from UI presentation
 */
export function cleanUserFacingIdentity(identifier?: string | null): string {
  if (!identifier) return '';
  if (identifier.endsWith('@chatr.local')) {
    const raw = identifier.replace('@chatr.local', '');
    return formatPhoneDisplay(raw);
  }
  return identifier;
}

/**
 * Database lookup: Find a user's canonical identity and UUID by phone number
 */
export async function findUserByPhone(phone: string): Promise<{
  id: string;
  username: string;
  fullName: string | null;
  displayName: string | null;
  phoneNumber: string;
  avatarUrl: string | null;
  createdAt: string;
} | null> {
  if (!phone) return null;

  try {
    const { data, error } = await supabase.rpc('find_user_by_phone', { p_phone: phone });
    if (error || !data || data.length === 0) {
      return null;
    }
    const user = data[0];
    return {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      displayName: user.display_name,
      phoneNumber: user.phone_number,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at
    };
  } catch (err) {
    console.error('[PhoneIdentity] findUserByPhone error:', err);
    return null;
  }
}
