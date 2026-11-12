/**
 * Cryptographically Secure Identifiers & Origin Management for CHATR Private Calling
 *
 * NON-NEGOTIABLE SECURITY INVARIANT:
 * Zero fallback to Math.random(), Date.now(), or predictable PRNGs.
 * If hardware-backed WebCrypto is unavailable, the system strictly fails closed.
 */

export function generateSecureUUID(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      // Set RFC 4122 v4 version (0100) and variant (10) bits
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const h = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    }
  }
  throw new Error('SECURE_CRYPTO_UNAVAILABLE: Hardware-backed Web Cryptography API is required.');
}

export function generateSecureRoomSlug(): string {
  return `p-${generateSecureUUID()}`;
}

export function generateSecureSessionId(): string {
  return `u-${generateSecureUUID()}`;
}

export function getOrCreateSecureSessionId(storage: Storage | null = typeof sessionStorage !== 'undefined' ? sessionStorage : null): string {
  // 1. Attempt reading existing session ID from storage
  if (storage) {
    try {
      const existing = storage.getItem('chatr_call_session_id');
      if (existing && /^u-[0-9a-f-]{16,}$/i.test(existing)) {
        return existing;
      }
    } catch {
      // Storage read error (e.g. SecurityError in restricted sandboxed iframe); proceed to generate fresh
    }
  }

  // 2. Generate secure session identifier (fails closed if WebCrypto is unavailable)
  const freshId = generateSecureSessionId();

  // 3. Attempt persisting to storage
  if (storage) {
    try {
      storage.setItem('chatr_call_session_id', freshId);
    } catch {
      // Storage write error (e.g. QuotaExceededError or private browsing restrictions); safe to continue in memory
    }
  }

  return freshId;
}

export function getCallBaseOrigin(): string {
  // 1. Check explicit environment configuration
  const envOrigin = (import.meta as any).env?.VITE_APP_ORIGIN || (import.meta as any).env?.VITE_PUBLIC_URL;
  if (envOrigin && typeof envOrigin === 'string' && envOrigin.startsWith('http')) {
    return envOrigin.replace(/\/+$/, '');
  }

  // 2. Dynamic runtime browser origin (works on preview deployments, localhost, staging)
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    if (origin && origin !== 'null' && origin.startsWith('http')) {
      return origin.replace(/\/+$/, '');
    }
  }

  // 3. Fail closed: Never silently fall back to hardcoded production chatr.chat
  throw new Error('SECURE_ORIGIN_UNAVAILABLE: Application origin could not be resolved safely.');
}
