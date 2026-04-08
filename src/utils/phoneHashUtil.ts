/**
 * Canonical phone normalization to E.164 international format
 * Handles: +, 00 prefix, bare digits
 * Output always starts with +
 */
export function normalizeToInternational(phone: string, defaultCountryCode: string = '+91'): string {
  if (!phone) return '';
  
  // Trim whitespace
  let raw = phone.trim();
  
  // Remove all non-digit chars except leading + or 00
  // Step 1: Detect prefix
  let hasPlus = raw.startsWith('+');
  let hasDoubleZero = raw.startsWith('00');
  
  // Step 2: Strip to digits only
  const digits = raw.replace(/\D/g, '');
  
  if (!digits) return '';
  
  // Step 3: Reconstruct in E.164
  if (hasPlus) {
    // Already international with +, just clean it
    return `+${digits}`;
  }
  
  if (hasDoubleZero) {
    // 00 prefix is international dialing prefix, replace with +
    // e.g., 00919876543210 → +919876543210
    return `+${digits.substring(2)}`;
  }
  
  // No international prefix detected
  // If it looks like a full international number (11+ digits starting with country code)
  if (digits.length > 10) {
    return `+${digits}`;
  }
  
  // Local number — prepend default country code
  // Remove the + from country code for concatenation, then add back
  const codeDigits = defaultCountryCode.replace(/\D/g, '');
  return `+${codeDigits}${digits}`;
}

// Backward-compatible alias
export const normalizePhoneNumber = normalizeToInternational;

// Utility for hashing phone numbers for privacy
export async function hashPhoneNumber(phone: string): Promise<string> {
  const normalized = normalizeToInternational(phone);
  // Hash the full E.164 string including +
  const msgBuffer = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Update phone hash for a user profile
export async function updateUserPhoneHash(
  supabase: any,
  userId: string,
  phoneNumber: string
): Promise<void> {
  const normalized = normalizePhoneNumber(phoneNumber);
  const phoneHash = await hashPhoneNumber(normalized);
  
  await supabase
    .from('profiles')
    .update({ 
      phone_number: normalized,
      phone_hash: phoneHash 
    })
    .eq('id', userId);
}
