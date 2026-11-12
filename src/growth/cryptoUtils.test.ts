/**
 * Unit Test Suite for CHATR Growth Layer Cryptographic Security
 * Executed via node:test (Node 25 native runner)
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  generateSecureUUID, 
  generateSecureRoomSlug, 
  generateSecureSessionId, 
  getOrCreateSecureSessionId,
  getCallBaseOrigin
} from './cryptoUtils.js';

describe('cryptoUtils — Fail-Closed Cryptographic Invariants', () => {
  const originalCrypto = globalThis.crypto;

  it('1. Generates 122-bit RFC 4122 UUIDv4 via crypto.randomUUID', () => {
    const uuid = generateSecureUUID();
    assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    const roomSlug = generateSecureRoomSlug();
    assert.strictEqual(roomSlug.startsWith('p-'), true);
    const sessId = generateSecureSessionId();
    assert.strictEqual(sessId.startsWith('u-'), true);
  });

  it('2. Falls back to crypto.getRandomValues if crypto.randomUUID is undefined', () => {
    // Simulate browser without crypto.randomUUID (e.g. older WebCrypto)
    const mockCrypto = {
      getRandomValues: (arr) => originalCrypto.getRandomValues(arr),
    };
    Object.defineProperty(globalThis, 'crypto', {
      value: mockCrypto,
      configurable: true,
      writable: true,
    });

    const uuid = generateSecureUUID();
    assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    // Restore
    Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true, writable: true });
  });

  it('3. Strictly throws SECURE_CRYPTO_UNAVAILABLE when WebCrypto is unavailable', () => {
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    assert.throws(() => generateSecureUUID(), /SECURE_CRYPTO_UNAVAILABLE/);
    assert.throws(() => generateSecureRoomSlug(), /SECURE_CRYPTO_UNAVAILABLE/);
    assert.throws(() => generateSecureSessionId(), /SECURE_CRYPTO_UNAVAILABLE/);

    // Restore
    Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true, writable: true });
  });

  it('4. Gracefully handles sessionStorage read failure (SecurityError/restricted iframe)', () => {
    let writtenKey = '', writtenVal = '';
    const restrictedStorage = {
      getItem: () => { throw new Error('SecurityError: Access is denied'); },
      setItem: (k, v) => { writtenKey = k; writtenVal = v; },
    };

    const sessId = getOrCreateSecureSessionId(restrictedStorage);
    assert.match(sessId, /^u-[0-9a-f-]{36}$/i);
    assert.strictEqual(writtenKey, 'chatr_call_session_id');
    assert.strictEqual(writtenVal, sessId);
  });

  it('5. Gracefully handles sessionStorage write failure (QuotaExceededError)', () => {
    const readOnlyStorage = {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError'); },
    };

    const sessId = getOrCreateSecureSessionId(readOnlyStorage);
    assert.match(sessId, /^u-[0-9a-f-]{36}$/i);
  });

  it('6. Reuses valid existing session ID from storage', () => {
    const mockStorage = {
      data: { 'chatr_call_session_id': 'u-a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6' },
      getItem(k) { return this.data[k] || null; },
      setItem(k, v) { this.data[k] = v; },
    };

    const sessId = getOrCreateSecureSessionId(mockStorage);
    assert.strictEqual(sessId, 'u-a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6');
  });

  it('7. Discards invalid/tampered cached session IDs (e.g. old predictable timestamps)', () => {
    const mockStorage = {
      data: { 'chatr_call_session_id': 'u-1794400000000' }, // Old timestamp format
      getItem(k) { return this.data[k] || null; },
      setItem(k, v) { this.data[k] = v; },
    };

    const sessId = getOrCreateSecureSessionId(mockStorage);
    assert.notStrictEqual(sessId, 'u-1794400000000');
    assert.match(sessId, /^u-[0-9a-f-]{36}$/i);
  });
});
