import { useCallback, useRef } from 'react';

interface BatchRequest<T> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  params: any;
}

export function useRequestBatcher<T>(
  batchFn: (requests: any[]) => Promise<T[]>,
  options: {
    maxBatchSize?: number;
    batchDelay?: number;
  } = {}
) {
  const { maxBatchSize = 10, batchDelay = 10 } = options;
  const queueRef = useRef<BatchRequest<T>[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const processBatch = useCallback(async () => {
    if (queueRef.current.length === 0) return;

    const batch = queueRef.current.splice(0, maxBatchSize);
    const params = batch.map(req => req.params);

    try {
      const results = await batchFn(params);
      batch.forEach((req, index) => {
        req.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach(req => {
        req.reject(error as Error);
      });
    }

    // Process remaining if any
    if (queueRef.current.length > 0) {
      timerRef.current = setTimeout(processBatch, 0);
    }
  }, [batchFn, maxBatchSize]);

  const request = useCallback((params: any): Promise<T> => {
    return new Promise((resolve, reject) => {
      queueRef.current.push({ resolve, reject, params });

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (queueRef.current.length >= maxBatchSize) {
        processBatch();
      } else {
        timerRef.current = setTimeout(processBatch, batchDelay);
      }
    });
  }, [processBatch, maxBatchSize, batchDelay]);

  return request;
}
