/**
 * Unit Test Suite for CHATR Growth Layer Cryptographic Security
 * Executed via node:test (Node native runner)
 */

import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  generateSecureUUID, 
  generateSecureRoomSlug, 
  generateSecureSessionId, 
  getOrCreateSecureSessionId,
  isValidSecureSessionId,
  STRICT_SESSION_ID_V4_REGEX,
  getCallBaseOrigin,
  generateCallLink
} from './cryptoUtils.js';

describe('cryptoUtils — Fail-Closed Cryptographic Invariants & Validation', () => {
  const originalCrypto = globalThis.crypto;

  it('1. Generates 122-bit RFC 4122 UUIDv4 via crypto.randomUUID', () => {
    const uuid = generateSecureUUID();
    assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    const roomSlug = generateSecureRoomSlug();
    assert.strictEqual(roomSlug.startsWith('p-'), true);
    const sessId = generateSecureSessionId();
    assert.strictEqual(sessId.startsWith('u-'), true);
    assert.strictEqual(isValidSecureSessionId(sessId), true);
  });

  it('2. Falls back to crypto.getRandomValues if crypto.randomUUID is undefined', () => {
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

    Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true, writable: true });
  });

  it('4. Gracefully handles sessionStorage read failure (SecurityError/restricted iframe)', () => {
    let writtenKey = '', writtenVal = '';
    const restrictedStorage = {
      getItem: () => { throw new Error('SecurityError: Access is denied'); },
      setItem: (k, v) => { writtenKey = k; writtenVal = v; },
    };

    const sessId = getOrCreateSecureSessionId(restrictedStorage);
    assert.match(sessId, STRICT_SESSION_ID_V4_REGEX);
    assert.strictEqual(writtenKey, 'chatr_call_session_id');
    assert.strictEqual(writtenVal, sessId);
  });

  it('5. Gracefully handles sessionStorage write failure (QuotaExceededError)', () => {
    const readOnlyStorage = {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError'); },
    };

    const sessId = getOrCreateSecureSessionId(readOnlyStorage);
    assert.match(sessId, STRICT_SESSION_ID_V4_REGEX);
  });

  describe('Session ID Validation & Reuse (Strict RFC 4122 UUIDv4)', () => {
    it('6. Reuses valid existing UUIDv4 session IDs across all valid variant nibbles (8, 9, a, b)', () => {
      const validVariants = [
        'u-a1b2c3d4-e5f6-47a8-89c0-d1e2f3a4b5c6', // variant 8
        'u-a1b2c3d4-e5f6-47a8-99c0-d1e2f3a4b5c6', // variant 9
        'u-a1b2c3d4-e5f6-47a8-a9c0-d1e2f3a4b5c6', // variant a
        'u-a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6', // variant b
      ];

      for (const validId of validVariants) {
        assert.strictEqual(isValidSecureSessionId(validId), true, `Should accept valid UUIDv4: ${validId}`);
        const mockStorage = {
          data: { 'chatr_call_session_id': validId },
          getItem(k) { return this.data[k] || null; },
          setItem(k, v) { this.data[k] = v; },
        };
        const sessId = getOrCreateSecureSessionId(mockStorage);
        assert.strictEqual(sessId, validId);
      }
    });

    it('7. Strictly rejects timestamp-based IDs and generates fresh UUIDv4', () => {
      const timestampIds = [
        'u-1794400000000',
        'u-1699999999999-123456',
        'u-1731411200000-abc',
      ];
      for (const id of timestampIds) {
        assert.strictEqual(isValidSecureSessionId(id), false, `Should reject timestamp ID: ${id}`);
        const mockStorage = {
          data: { 'chatr_call_session_id': id },
          getItem(k) { return this.data[k] || null; },
          setItem(k, v) { this.data[k] = v; },
        };
        const sessId = getOrCreateSecureSessionId(mockStorage);
        assert.notStrictEqual(sessId, id);
        assert.match(sessId, STRICT_SESSION_ID_V4_REGEX);
      }
    });

    it('8. Strictly rejects arbitrary strings and non-UUID values', () => {
      const arbitraryStrings = [
        'u-session-foobar',
        'u-admin-test-token-12345',
        'random-user-string',
        'u-xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx',
      ];
      for (const s of arbitraryStrings) {
        assert.strictEqual(isValidSecureSessionId(s), false, `Should reject arbitrary string: ${s}`);
      }
    });

    it('9. Strictly rejects malformed UUIDs and incorrect hex characters', () => {
      const malformed = [
        'u-a1b2c3d4-e5f6-47a8-b9c0', // truncated
        'u-a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6-extra', // overly long
        'u-g1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6', // invalid hex char 'g'
        'u-a1b2c3d4_e5f6_47a8_b9c0_d1e2f3a4b5c6', // underscores instead of dashes
      ];
      for (const m of malformed) {
        assert.strictEqual(isValidSecureSessionId(m), false, `Should reject malformed UUID: ${m}`);
      }
    });

    it('10. Strictly rejects incorrect UUID versions (must be version 4)', () => {
      const nonV4 = [
        'u-a1b2c3d4-e5f6-17a8-89c0-d1e2f3a4b5c6', // v1
        'u-a1b2c3d4-e5f6-27a8-89c0-d1e2f3a4b5c6', // v2
        'u-a1b2c3d4-e5f6-37a8-89c0-d1e2f3a4b5c6', // v3
        'u-a1b2c3d4-e5f6-57a8-89c0-d1e2f3a4b5c6', // v5
      ];
      for (const nv of nonV4) {
        assert.strictEqual(isValidSecureSessionId(nv), false, `Should reject non-v4 version: ${nv}`);
      }
    });

    it('11. Strictly rejects incorrect UUID variants (must have 8, 9, a, or b in variant position)', () => {
      const invalidVariants = [
        'u-a1b2c3d4-e5f6-47a8-09c0-d1e2f3a4b5c6', // variant 0
        'u-a1b2c3d4-e5f6-47a8-79c0-d1e2f3a4b5c6', // variant 7
        'u-a1b2c3d4-e5f6-47a8-c9c0-d1e2f3a4b5c6', // variant c
        'u-a1b2c3d4-e5f6-47a8-f9c0-d1e2f3a4b5c6', // variant f
      ];
      for (const iv of invalidVariants) {
        assert.strictEqual(isValidSecureSessionId(iv), false, `Should reject non-RFC 4122 variant: ${iv}`);
      }
    });

    it('12. Strictly rejects empty, truncated, null, and non-string values', () => {
      const invalidTypes: any[] = [
        '',
        'u-',
        'u-a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c', // 35 chars
        null,
        undefined,
        12345,
        {},
        [],
      ];
      for (const it of invalidTypes) {
        assert.strictEqual(isValidSecureSessionId(it), false, `Should reject value: ${String(it)}`);
      }
    });
  });

  describe('Origin Resolution & Secure Call Link Generation', () => {
    it('13. Resolves Cloudflare Pages preview origin without falling back to chatr.chat', () => {
      const previewWin = { location: { origin: 'https://0e16f981.chatr.pages.dev' } };
      const origin = getCallBaseOrigin(previewWin);
      assert.strictEqual(origin, 'https://0e16f981.chatr.pages.dev');
      assert.notStrictEqual(origin, 'https://chatr.chat');
    });

    it('14. Resolves local development origin (http://localhost:5173)', () => {
      const localWin = { location: { origin: 'http://localhost:5173' } };
      const origin = getCallBaseOrigin(localWin);
      assert.strictEqual(origin, 'http://localhost:5173');
      assert.notStrictEqual(origin, 'https://chatr.chat');
    });

    it('15. Resolves explicitly configured staging origin (VITE_APP_ORIGIN)', () => {
      const prev = process.env.VITE_APP_ORIGIN;
      process.env.VITE_APP_ORIGIN = 'https://staging-call.chatr.pages.dev/';
      try {
        const origin = getCallBaseOrigin();
        assert.strictEqual(origin, 'https://staging-call.chatr.pages.dev');
      } finally {
        process.env.VITE_APP_ORIGIN = prev;
      }
    });

    it('16. Strictly throws SECURE_ORIGIN_UNAVAILABLE on null/missing origin, never defaults to production', () => {
      const invalidWin = { location: { origin: 'null' } };
      assert.throws(() => getCallBaseOrigin(invalidWin), /SECURE_ORIGIN_UNAVAILABLE/);
      const emptyWin = { location: { origin: '' } };
      assert.throws(() => getCallBaseOrigin(emptyWin), /SECURE_ORIGIN_UNAVAILABLE/);
    });

    it('17. generateCallLink creates absolute share URLs on Preview and throws on origin failure', () => {
      const previewWin = { location: { origin: 'https://staging-preview.chatr.pages.dev' } };
      const link = generateCallLink('p-test-room-slug', previewWin);
      assert.strictEqual(link, 'https://staging-preview.chatr.pages.dev/call/p-test-room-slug');

      // Rejects empty/invalid room IDs
      assert.throws(() => generateCallLink('', previewWin), /SECURE_CALL_LINK_INVALID/);
      assert.throws(() => generateCallLink('   ', previewWin), /SECURE_CALL_LINK_INVALID/);

      // Fails closed if origin unavailable, never returns relative URL
      const nullWin = { location: { origin: 'null' } };
      assert.throws(() => generateCallLink('p-test-room-slug', nullWin), /SECURE_ORIGIN_UNAVAILABLE/);
    });
  });
});
