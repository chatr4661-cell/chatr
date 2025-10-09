// Utility for hashing phone numbers for privacy
export async function hashPhoneNumber(phone: string): Promise<string> {
  const normalized = phone.replace(/\D/g, ''); // Remove non-digits
  const msgBuffer = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Normalize phone to E.164 format (+countrycode + number)
export function normalizePhoneNumber(phone: string, countryCode: string = '+91'): string {
  const cleaned = phone.replace(/\D/g, '');
  
  // If it doesn't start with +, add the country code
  if (!phone.startsWith('+')) {
    // If phone is just the local number (e.g., 10 digits for India)
    return `${countryCode}${cleaned}`;
  }
  
  return phone.startsWith('+') ? phone : `+${cleaned}`;
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
