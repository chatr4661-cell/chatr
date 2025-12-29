/**
 * Phone-Only Identity Enforcement
 * Ensures no UUIDs leak to client - all identity is phone-number based
 */

// ============================================
// TYPES
// ============================================

export interface CleanUserIdentity {
  phone: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface CleanCallIdentity {
  callerPhone: string;
  callerName: string;
  callerAvatar: string | null;
  receiverPhone: string;
  receiverName: string;
  receiverAvatar: string | null;
}

export interface CleanConversationIdentity {
  otherUserPhone: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  isGroup: boolean;
  groupName?: string;
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Check if a string looks like a UUID
 */
export function isUUID(str: string | null | undefined): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Check if a string is a valid phone number (E.164 format)
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  // E.164: + followed by 1-15 digits
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

/**
 * Format phone number to E.164 if not already
 */
export function formatToE164(phone: string, defaultCountryCode: string = '+91'): string {
  if (!phone) return '';
  
  // Already E.164
  if (phone.startsWith('+')) {
    return phone.replace(/[^\d+]/g, '');
  }
  
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Add country code
  if (digits.length === 10) {
    return `${defaultCountryCode}${digits}`;
  }
  
  // Assume full number without +
  return `+${digits}`;
}

// ============================================
// SANITIZATION FUNCTIONS
// ============================================

/**
 * Sanitize user data to remove any UUIDs and ensure phone-only identity
 */
export function sanitizeUserForClient(user: {
  id?: string;
  user_id?: string;
  phone_number?: string;
  full_name?: string;
  display_name?: string;
  avatar_url?: string | null;
  [key: string]: any;
}): CleanUserIdentity {
  // Validate phone
  const phone = user.phone_number || '';
  
  if (!phone && (user.id || user.user_id)) {
    console.warn('[Identity] User has UUID but no phone number');
  }
  
  return {
    phone: formatToE164(phone),
    displayName: user.full_name || user.display_name || 'Unknown',
    avatarUrl: user.avatar_url || null,
  };
}

/**
 * Sanitize call data for native shell (phone numbers only)
 */
export function sanitizeCallForNative(call: {
  id?: string;
  caller_id?: string;
  receiver_id?: string;
  caller_phone?: string;
  receiver_phone?: string;
  caller_name?: string;
  receiver_name?: string;
  caller_avatar?: string | null;
  receiver_avatar?: string | null;
  [key: string]: any;
}): CleanCallIdentity {
  // Warn if UUIDs are present without phone numbers
  if (!call.caller_phone && call.caller_id) {
    console.error('[Identity] Call has caller_id but no caller_phone - this will break call logs');
  }
  if (!call.receiver_phone && call.receiver_id) {
    console.error('[Identity] Call has receiver_id but no receiver_phone - this will break call logs');
  }
  
  return {
    callerPhone: formatToE164(call.caller_phone || ''),
    callerName: call.caller_name || 'Unknown',
    callerAvatar: call.caller_avatar || null,
    receiverPhone: formatToE164(call.receiver_phone || ''),
    receiverName: call.receiver_name || 'Unknown',
    receiverAvatar: call.receiver_avatar || null,
  };
}

/**
 * Sanitize conversation for display
 */
export function sanitizeConversationForClient(conversation: {
  id?: string;
  other_user_id?: string;
  other_user_phone?: string;
  other_user_name?: string;
  other_user_avatar?: string | null;
  is_group?: boolean;
  group_name?: string;
  [key: string]: any;
}): CleanConversationIdentity {
  if (!conversation.is_group && !conversation.other_user_phone && conversation.other_user_id) {
    console.warn('[Identity] Conversation has other_user_id but no phone');
  }
  
  return {
    otherUserPhone: formatToE164(conversation.other_user_phone || ''),
    otherUserName: conversation.is_group 
      ? (conversation.group_name || 'Group Chat')
      : (conversation.other_user_name || 'Unknown'),
    otherUserAvatar: conversation.other_user_avatar || null,
    isGroup: conversation.is_group || false,
    groupName: conversation.group_name,
  };
}

// ============================================
// FCM PAYLOAD BUILDER
// ============================================

/**
 * Build FCM payload for incoming call (phone-only)
 */
export function buildCallFCMPayload(call: CleanCallIdentity & { callType: 'audio' | 'video' }): Record<string, string> {
  return {
    type: 'call',
    caller_phone: call.callerPhone,
    caller_name: call.callerName,
    caller_avatar: call.callerAvatar || '',
    receiver_phone: call.receiverPhone,
    receiver_name: call.receiverName,
    call_type: call.callType,
    // NO UUIDs or internal IDs
  };
}

/**
 * Build FCM payload for message notification
 */
export function buildMessageFCMPayload(message: {
  senderPhone: string;
  senderName: string;
  preview: string;
  conversationPhone?: string;
  isGroup?: boolean;
  groupName?: string;
}): Record<string, string> {
  return {
    type: 'message',
    sender_phone: message.senderPhone,
    sender_name: message.senderName,
    preview: message.preview.substring(0, 100), // Limit preview length
    is_group: message.isGroup ? 'true' : 'false',
    group_name: message.groupName || '',
    // NO UUIDs or internal IDs
  };
}

// ============================================
// TEL URI BUILDER
// ============================================

/**
 * Build tel: URI for Android TelecomManager
 */
export function buildTelUri(phone: string): string {
  const formattedPhone = formatToE164(phone);
  
  if (!formattedPhone) {
    console.error('[Identity] Cannot build tel: URI without phone number');
    return 'tel:unknown';
  }
  
  // NEVER use sip:, uuid:, chatr:, or @chatr.local
  return `tel:${formattedPhone}`;
}

/**
 * Validate a URI is a proper tel: URI
 */
export function isValidTelUri(uri: string): boolean {
  if (!uri) return false;
  
  // Must start with tel:
  if (!uri.startsWith('tel:')) {
    console.error('[Identity] Invalid URI scheme:', uri.split(':')[0]);
    return false;
  }
  
  // Must not contain @chatr.local or internal identifiers
  if (uri.includes('@chatr.local') || uri.includes('uuid:') || uri.includes('sip:')) {
    console.error('[Identity] URI contains internal identifier:', uri);
    return false;
  }
  
  return true;
}

// ============================================
// IDENTITY ASSERTION
// ============================================

/**
 * Assert that data being sent to native has no UUIDs
 */
export function assertNoUUIDs(obj: Record<string, any>, context: string): void {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && isUUID(value)) {
      console.error(`[Identity] UUID detected in ${context}.${key}:`, value);
      throw new Error(`UUID leak detected in ${context}.${key}`);
    }
    
    if (typeof value === 'object' && value !== null) {
      assertNoUUIDs(value, `${context}.${key}`);
    }
  }
}

/**
 * Strip all UUID-like fields from an object (for safety)
 */
export function stripUUIDs(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip keys that typically contain UUIDs
    if (['id', 'user_id', 'caller_id', 'receiver_id', 'sender_id', 'conversation_id'].includes(key)) {
      continue;
    }
    
    // Skip UUID values
    if (typeof value === 'string' && isUUID(value)) {
      continue;
    }
    
    // Recursively clean nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = stripUUIDs(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}
