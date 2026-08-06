/**
 * Retry with exponential backoff + jitter, and a token-bucket rate limiter.
 * Shared by every connector so provider adapters stay tiny.
 */

export class RateLimitError extends Error {
  constructor(message = 'Rate limited', public retryAfterMs?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);

export function isRetryable(error: any): boolean {
  if (error instanceof RateLimitError) return true;
  const status = error?.status ?? error?.response?.status;
  return typeof status === 'number' ? RETRYABLE.has(status) : true;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { attempts = 3, baseDelayMs = 400, maxDelayMs = 8000, onRetry } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isRetryable(error)) break;
      const hinted = (error as RateLimitError)?.retryAfterMs;
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const delay = hinted ?? backoff + Math.random() * baseDelayMs;
      onRetry?.(attempt, error);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/** Token bucket, one per connector id, sized from the definition's rate hint. */
export class RateLimiter {
  private buckets = new Map<string, { tokens: number; updatedAt: number; perMinute: number }>();

  configure(key: string, perMinute: number): void {
    if (!this.buckets.has(key)) {
      this.buckets.set(key, { tokens: perMinute, updatedAt: Date.now(), perMinute });
    }
  }

  async acquire(key: string, perMinute = 60): Promise<void> {
    this.configure(key, perMinute);
    const bucket = this.buckets.get(key)!;

    const refill = ((Date.now() - bucket.updatedAt) / 60_000) * bucket.perMinute;
    bucket.tokens = Math.min(bucket.perMinute, bucket.tokens + refill);
    bucket.updatedAt = Date.now();

    if (bucket.tokens < 1) {
      const waitMs = ((1 - bucket.tokens) / bucket.perMinute) * 60_000;
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, 5000)));
      bucket.tokens = 1;
    }

    bucket.tokens -= 1;
  }
}

export const rateLimiter = new RateLimiter();
