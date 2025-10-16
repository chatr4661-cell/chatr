/**
 * Request deduplication to prevent multiple identical requests
 * Optimizes performance on slow networks
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest>();
  private cacheTime = 1000; // 1 second deduplication window

  /**
   * Execute request with deduplication
   */
  async dedupe<T>(
    key: string,
    requestFn: () => Promise<T>,
    cacheDuration: number = this.cacheTime
  ): Promise<T> {
    const now = Date.now();
    const pending = this.pendingRequests.get(key);

    // Return existing request if within cache window
    if (pending && (now - pending.timestamp) < cacheDuration) {
      return pending.promise as Promise<T>;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      // Clean up after request completes
      setTimeout(() => {
        const current = this.pendingRequests.get(key);
        if (current?.promise === promise) {
          this.pendingRequests.delete(key);
        }
      }, cacheDuration);
    });

    this.pendingRequests.set(key, { promise, timestamp: now });
    return promise;
  }

  /**
   * Clear all pending requests
   */
  clear() {
    this.pendingRequests.clear();
  }

  /**
   * Generate cache key from request details
   */
  static generateKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }
}

export const requestDeduplicator = new RequestDeduplicator();

/**
 * Fetch wrapper with automatic deduplication
 */
export async function deduplicatedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const key = RequestDeduplicator.generateKey(url, options);
  
  return requestDeduplicator.dedupe(
    key,
    () => fetch(url, options),
    2000 // 2 second deduplication for fetch
  );
}
