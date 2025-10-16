/**
 * Request Priority Queue for 2G optimization
 * Ensures user actions take priority over background tasks
 */

export type RequestPriority = 'critical' | 'high' | 'medium' | 'low';

interface QueuedRequest {
  id: string;
  priority: RequestPriority;
  request: () => Promise<any>;
  timestamp: number;
  retries: number;
}

class RequestPriorityQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private maxConcurrent = 2; // Limit concurrent requests on slow networks
  private activeRequests = 0;

  /**
   * Add request to priority queue
   */
  async addRequest<T>(
    request: () => Promise<T>,
    priority: RequestPriority = 'medium'
  ): Promise<T> {
    const id = `${Date.now()}_${Math.random()}`;
    
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id,
        priority,
        request: async () => {
          try {
            const result = await request();
            resolve(result);
            return result;
          } catch (error) {
            reject(error);
            throw error;
          }
        },
        timestamp: Date.now(),
        retries: 0,
      };

      this.queue.push(queuedRequest);
      this.sortQueue();
      this.processQueue();
    });
  }

  /**
   * Sort queue by priority
   */
  private sortQueue() {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    this.queue.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp; // FIFO for same priority
    });
  }

  /**
   * Process queue
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    if (this.activeRequests >= this.maxConcurrent) return;

    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const item = this.queue.shift();
      if (!item) break;

      this.activeRequests++;
      
      item.request()
        .catch((error) => {
          console.error('Request failed:', error);
          
          // Retry low priority requests
          if (item.retries < 3 && item.priority === 'low') {
            item.retries++;
            this.queue.push(item);
            this.sortQueue();
          }
        })
        .finally(() => {
          this.activeRequests--;
          this.processQueue();
        });
    }

    this.processing = false;
  }

  /**
   * Cancel low priority requests (called when user takes action)
   */
  cancelLowPriority() {
    this.queue = this.queue.filter(req => 
      req.priority === 'critical' || req.priority === 'high'
    );
  }

  /**
   * Adjust concurrent limit based on network
   */
  setMaxConcurrent(limit: number) {
    this.maxConcurrent = Math.max(1, Math.min(limit, 5));
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

export const requestQueue = new RequestPriorityQueue();
