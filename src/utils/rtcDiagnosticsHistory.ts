/**
 * CHATR Phase 2 — RTC Diagnostics History
 *
 * Strictly additive, telemetry-only. Holds three lightweight ring buffers
 * (last 20 entries each) for network, ICE and quality transitions.
 *
 * NEVER mutates peer connection, signaling, or routing.
 */

export type DiagCategory = 'RTC' | 'ICE' | 'MOBILITY' | 'NETWORK' | 'RECOVERY' | 'QUALITY';

export interface DiagEvent {
  ts: number;
  category: DiagCategory;
  message: string;
  data?: Record<string, unknown>;
}

const MAX = 20;
const networkEvents: DiagEvent[] = [];
const iceEvents: DiagEvent[] = [];
const qualityEvents: DiagEvent[] = [];

function push(buf: DiagEvent[], e: DiagEvent) {
  buf.push(e);
  if (buf.length > MAX) buf.shift();
}

export function logDiag(category: DiagCategory, message: string, data?: Record<string, unknown>) {
  const e: DiagEvent = { ts: Date.now(), category, message, data };
  // Production-safe: one concise line, no spam.
  // eslint-disable-next-line no-console
  console.log(`[${category}] ${message}`, data ?? '');
  if (category === 'NETWORK' || category === 'MOBILITY' || category === 'RECOVERY') push(networkEvents, e);
  if (category === 'ICE') push(iceEvents, e);
  if (category === 'QUALITY') push(qualityEvents, e);
}

export function getDiagHistory() {
  return {
    network: [...networkEvents],
    ice: [...iceEvents],
    quality: [...qualityEvents],
  };
}

// Expose to window for debug consoles (read-only snapshot).
if (typeof window !== 'undefined') {
  (window as any).__chatrDiag = () => getDiagHistory();
}
