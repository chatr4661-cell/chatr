import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * UI Speed Budget — warns when interactions exceed a target latency.
 * Default budget: 100ms (Nielsen "feels instant" threshold).
 *
 * Hooks the browser's PerformanceObserver for `event` entries
 * (Event Timing API) which measures the time from input → next paint.
 *
 * Usage: mount once near the app root.
 */

interface SpeedBudgetOptions {
  /** Max acceptable interaction latency in ms. Default 100ms. */
  budgetMs?: number;
  /** Show a toast when exceeded. Default: only in dev. */
  showToast?: boolean;
  /** Log to console.warn. Default true in dev. */
  logToConsole?: boolean;
  /** Callback for analytics or custom handling. */
  onViolation?: (entry: {
    name: string;
    duration: number;
    target?: string;
  }) => void;
}

const isDev = import.meta.env.DEV;

export function useUISpeedBudget(options: SpeedBudgetOptions = {}) {
  const {
    budgetMs = 100,
    showToast = isDev,
    logToConsole = isDev,
    onViolation,
  } = options;

  const lastWarnRef = useRef<number>(0);

  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return;

    // Avoid flooding: throttle warnings to once per 2s
    const WARN_INTERVAL_MS = 2000;

    let observer: PerformanceObserver | null = null;

    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Event Timing API entries
          const duration = entry.duration;
          if (duration <= budgetMs) continue;

          const target =
            (entry as unknown as { target?: Element }).target?.tagName?.toLowerCase() ||
            'unknown';

          const violation = {
            name: entry.name,
            duration: Math.round(duration),
            target,
          };

          onViolation?.(violation);

          if (logToConsole) {
            console.warn(
              `⚡ UI Speed Budget exceeded: ${violation.name} on <${target}> took ${violation.duration}ms (budget: ${budgetMs}ms)`
            );
          }

          const now = Date.now();
          if (showToast && now - lastWarnRef.current > WARN_INTERVAL_MS) {
            lastWarnRef.current = now;
            toast.warning(
              `Slow interaction: ${violation.duration}ms (budget ${budgetMs}ms)`,
              {
                description: `${violation.name} on <${target}>`,
                duration: 3500,
              }
            );
          }
        }
      });

      // `event` covers click/keydown/pointer interactions (INP-style)
      observer.observe({
        type: 'event',
        buffered: true,
        // @ts-expect-error - durationThreshold is supported in modern browsers
        durationThreshold: budgetMs,
      });
    } catch {
      // Older browsers may reject the type — silently no-op.
    }

    // Long-task observer for blocking JS (>50ms tasks)
    let longTaskObserver: PerformanceObserver | null = null;
    try {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > budgetMs && logToConsole) {
            console.warn(
              `⚠️ Long task blocking UI: ${Math.round(entry.duration)}ms`
            );
          }
        }
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch {
      // longtask not supported — ignore
    }

    return () => {
      observer?.disconnect();
      longTaskObserver?.disconnect();
    };
  }, [budgetMs, showToast, logToConsole, onViolation]);
}
