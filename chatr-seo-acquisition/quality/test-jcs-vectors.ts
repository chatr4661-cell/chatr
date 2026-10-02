/**
 * RFC 8785 (JSON CANONICALIZATION SCHEME - JCS) COMPATIBILITY TEST SUITE
 *
 * Verifies that canonicalizeJson adheres strictly to RFC 8785 canonicalization
 * rules across primitive strings, Unicode, control characters, integers,
 * floating point numbers, -0 normalization, array order preservation,
 * recursive object key sorting, undefined handling, and non-finite rejection.
 *
 * Usage:
 *   npm run seo:jcs:test
 */

import { canonicalizeJson, computeCanonicalRecordHash } from './provenance-verifier';

interface TestCase {
  name: string;
  input: unknown;
  expected?: string;
  shouldThrow?: boolean;
}

const TEST_CASES: TestCase[] = [
  // 1. Primitive Strings
  {
    name: 'Simple ASCII string',
    input: 'chatr',
    expected: '"chatr"'
  },
  {
    name: 'String with spaces',
    input: 'Chatr Secure Calling',
    expected: '"Chatr Secure Calling"'
  },
  {
    name: 'String with embedded double quotes',
    input: 'She said "hello"',
    expected: '"She said \\"hello\\""'
  },
  {
    name: 'String with backslashes',
    input: 'path\\to\\file',
    expected: '"path\\\\to\\\\file"'
  },

  // 2. Unicode Multilingual Content
  {
    name: 'Devanagari Hindi text',
    input: 'हिन्दी भाषा और कॉलिंग',
    expected: '"हिन्दी भाषा और कॉलिंग"'
  },
  {
    name: 'Tamil text',
    input: 'தமிழ் மொழி',
    expected: '"தமிழ் மொழி"'
  },
  {
    name: 'Marathi text',
    input: 'मराठी संवाद',
    expected: '"मराठी संवाद"'
  },
  {
    name: 'Gurmukhi Punjabi text',
    input: 'ਪੰਜਾਬੀ ਬੋਲੀ',
    expected: '"ਪੰਜਾਬੀ ਬੋਲੀ"'
  },
  {
    name: 'Kannada text',
    input: 'ಕನ್ನಡ ಭಾಷೆ',
    expected: '"ಕನ್ನಡ ಭಾಷೆ"'
  },
  {
    name: 'Emoji characters',
    input: 'Chatr 🚀 Shield 🛡️',
    expected: '"Chatr 🚀 Shield 🛡️"'
  },

  // 3. Escaped Control Characters
  {
    name: 'Newline, tab, and carriage return',
    input: "Line 1\nLine 2\tTabbed\rReturn",
    expected: '"Line 1\\nLine 2\\tTabbed\\rReturn"'
  },

  // 4. Integers
  {
    name: 'Zero integer',
    input: 0,
    expected: '0'
  },
  {
    name: 'Positive integer',
    input: 42,
    expected: '42'
  },
  {
    name: 'Negative integer',
    input: -100,
    expected: '-100'
  },
  {
    name: 'Max safe integer',
    input: 9007199254740991,
    expected: '9007199254740991'
  },

  // 5. Decimals / Floating Point Numbers
  {
    name: 'Positive decimal',
    input: 3.14159,
    expected: '3.14159'
  },
  {
    name: 'Negative decimal',
    input: -0.75,
    expected: '-0.75'
  },

  // 6. RFC 8785 Negative Zero Normalization (§3.2.2.3)
  {
    name: 'Negative zero (-0) normalized to 0',
    input: -0,
    expected: '0'
  },
  {
    name: 'Object with -0 value',
    input: { value: -0 },
    expected: '{"value":0}'
  },

  // 7. Arrays: Element Order Must Be Preserved
  {
    name: 'Empty array',
    input: [],
    expected: '[]'
  },
  {
    name: 'Array of numbers (unsorted order preserved)',
    input: [3, 1, 2],
    expected: '[3,1,2]'
  },
  {
    name: 'Array of strings (unsorted order preserved)',
    input: ['zebra', 'apple', 'mango'],
    expected: '["zebra","apple","mango"]'
  },

  // 8. Objects: Key Ordering (UTF-16 Lexicographical Sorting)
  {
    name: 'Unordered object keys',
    input: { z: 1, a: 2, m: 3 },
    expected: '{"a":2,"m":3,"z":1}'
  },
  {
    name: 'Deeply nested objects',
    input: { b: { y: 10, x: 20 }, a: { d: 4, c: 3 } },
    expected: '{"a":{"c":3,"d":4},"b":{"x":20,"y":10}}'
  },

  // 9. Whitespace Elimination
  {
    name: 'Zero extraneous whitespace',
    input: { name: 'Chatr', active: true, count: 5 },
    expected: '{"active":true,"count":5,"name":"Chatr"}'
  },

  // 10. Undefined Handling
  {
    name: 'Omission of undefined object properties',
    input: { a: 1, b: undefined, c: 3 },
    expected: '{"a":1,"c":3}'
  },
  {
    name: 'Undefined in array normalized to null',
    input: [1, undefined, 3],
    expected: '[1,null,3]'
  },

  // 11. Rejection of Non-Finite Numbers
  {
    name: 'Rejection of NaN',
    input: NaN,
    shouldThrow: true
  },
  {
    name: 'Rejection of Infinity',
    input: Infinity,
    shouldThrow: true
  },
  {
    name: 'Rejection of -Infinity',
    input: -Infinity,
    shouldThrow: true
  }
];

export function runJcsTestSuite(): { passed: boolean; passedCount: number; totalCount: number } {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('🧪 RFC 8785 (JCS) COMPATIBILITY TEST SUITE');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  let passedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    try {
      if (tc.shouldThrow) {
        let threw = false;
        try {
          canonicalizeJson(tc.input);
        } catch (e) {
          threw = true;
        }
        if (threw) {
          passedCount++;
          console.log(`  ✅ [${i + 1}/${TEST_CASES.length}] ${tc.name} — Correctly rejected invalid input.`);
        } else {
          failedCount++;
          console.error(`  ❌ [${i + 1}/${TEST_CASES.length}] ${tc.name} — Expected error was not thrown.`);
        }
      } else {
        const actual = canonicalizeJson(tc.input);
        if (actual === tc.expected) {
          passedCount++;
          console.log(`  ✅ [${i + 1}/${TEST_CASES.length}] ${tc.name}`);
        } else {
          failedCount++;
          console.error(`  ❌ [${i + 1}/${TEST_CASES.length}] ${tc.name}`);
          console.error(`     Expected: ${tc.expected}`);
          console.error(`     Actual:   ${actual}`);
        }
      }
    } catch (err) {
      failedCount++;
      console.error(`  ❌ [${i + 1}/${TEST_CASES.length}] ${tc.name} threw unexpected error:`, err);
    }
  }

  // Roundtrip Hash Invariance Test
  console.log('\n🔐 Testing Cryptographic Hash Invariance...');
  const sample1 = { z: 'last', a: 'first', numbers: [1, 2, 3], zero: -0 };
  const sample2 = { a: 'first', zero: 0, numbers: [1, 2, 3], z: 'last' };
  const hash1 = computeCanonicalRecordHash(sample1);
  const hash2 = computeCanonicalRecordHash(sample2);

  if (hash1 === hash2) {
    passedCount++;
    console.log(`  ✅ Hash Invariance Verified: Keys order and -0 produce identical SHA-256 (${hash1.slice(0, 16)}...).`);
  } else {
    failedCount++;
    console.error(`  ❌ Hash Invariance FAILED: ${hash1} !== ${hash2}`);
  }

  const total = TEST_CASES.length + 1;
  console.log(`\n────────────────────────────────────────────────────────────────────────`);
  console.log(`JCS Test Summary: ${passedCount}/${total} tests passed (${failedCount} failures).`);
  console.log(`────────────────────────────────────────────────────────────────────────\n`);

  return {
    passed: failedCount === 0,
    passedCount,
    totalCount: total
  };
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('test-jcs-vectors')) {
  const result = runJcsTestSuite();
  if (!result.passed) {
    process.exit(1);
  }
}
