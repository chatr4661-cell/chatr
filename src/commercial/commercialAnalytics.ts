import type { ImpressionRecord } from './types';

const STORAGE_KEY_IMPRESSIONS = 'chatr_commercial_impressions_v1';
const STORAGE_KEY_LAST_COMMERCIAL = 'chatr_commercial_intro_last_shown';

export function recordCommercialImpression(campaignId: string, viewable: boolean = true, viewableDurationMs: number = 0): void {
  if (typeof window === 'undefined') return;

  const record: ImpressionRecord = {
    campaignId,
    timestamp: new Date().toISOString(),
    viewable,
    viewableDurationMs,
    clicked: false,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY_IMPRESSIONS);
    const list: ImpressionRecord[] = raw ? JSON.parse(raw) : [];
    list.push(record);
    // Keep last 50 events locally to prevent storage bloat
    if (list.length > 50) list.splice(0, list.length - 50);
    localStorage.setItem(STORAGE_KEY_IMPRESSIONS, JSON.stringify(list));
  } catch {
    // Storage quota silent handling
  }
}

export function recordCommercialClick(campaignId: string, placement: string): void {
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_IMPRESSIONS);
    const list: ImpressionRecord[] = raw ? JSON.parse(raw) : [];
    list.push({
      campaignId,
      timestamp: new Date().toISOString(),
      viewable: true,
      viewableDurationMs: 0,
      clicked: true,
    });
    if (list.length > 50) list.splice(0, list.length - 50);
    localStorage.setItem(STORAGE_KEY_IMPRESSIONS, JSON.stringify(list));
  } catch {
    // Silent handling
  }

  // Dispatch first-party custom event for any listening telemetry sinks
  try {
    window.dispatchEvent(new CustomEvent('chatr:commercial_click', {
      detail: { campaignId, placement, timestamp: Date.now() }
    }));
  } catch {
    // Ignore
  }
}

export function shouldShowFirstLaunchCommercial(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Accessibility: respect reduced-motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }

  // 2. Bandwidth: respect Save-Data header or slow connection
  const nav = navigator as any;
  if (nav.connection?.saveData === true || nav.connection?.effectiveType === '2g') {
    return false;
  }

  // 3. Frequency Policy: at most once every 24 hours
  try {
    const lastShown = localStorage.getItem(STORAGE_KEY_LAST_COMMERCIAL);
    if (lastShown) {
      const elapsedHours = (Date.now() - parseInt(lastShown, 10)) / (1000 * 60 * 60);
      if (elapsedHours < 24) {
        return false;
      }
    }
  } catch {
    return false;
  }

  return true;
}

export function markFirstLaunchCommercialShown(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_LAST_COMMERCIAL, Date.now().toString());
  } catch {
    // Silent
  }
}
