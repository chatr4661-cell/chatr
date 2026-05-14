/**
 * CHATR Phase 2 — Network Migration Manager
 *
 * Strictly additive, observability + debounced migration signal.
 *
 * Does NOT:
 *   - call pc.restartIce()
 *   - replace tracks
 *   - rebuild peer connections
 *   - change TURN/STUN/ICE policy
 *   - touch signaling
 *
 * Detects network transitions via:
 *   - navigator.connection (Chrome / Android)
 *   - online / offline events
 *   - ICE connection state transitions (Safari fallback)
 *   - RTT variance & candidate pair changes (Safari fallback)
 *
 * Debounces events 3-5s, then invokes `onStableMigration` so the caller
 * may decide whether an ICE restart is warranted (respecting its own
 * cooldown logic).
 */

import { logDiag } from './rtcDiagnosticsHistory';

export interface MigrationOptions {
  /** Called when a migration event has stabilised (debounced). */
  onStableMigration?: (reason: string) => void;
  /** Called on every raw detected transition (telemetry). */
  onTransition?: (reason: string) => void;
  /** Debounce window. Default 4000ms (within 3-5s spec). */
  debounceMs?: number;
}

interface ConnLike {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  addEventListener?: (t: string, cb: () => void) => void;
  removeEventListener?: (t: string, cb: () => void) => void;
}

function getConnection(): ConnLike | null {
  const nav: any = typeof navigator !== 'undefined' ? navigator : null;
  if (!nav) return null;
  return nav.connection || nav.mozConnection || nav.webkitConnection || null;
}

export class NetworkMigrationManager {
  private pc: RTCPeerConnection;
  private opts: Required<Pick<MigrationOptions, 'debounceMs'>> & MigrationOptions;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingReason: string = '';
  private started = false;

  // Safari fallback state
  private rttSamples: number[] = [];
  private lastCandidatePairId = '';
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  // Cached snapshot
  private lastEffectiveType = '';
  private lastNetType = '';

  constructor(pc: RTCPeerConnection, options: MigrationOptions = {}) {
    this.pc = pc;
    this.opts = {
      debounceMs: options.debounceMs ?? 4000,
      onStableMigration: options.onStableMigration,
      onTransition: options.onTransition,
    };
  }

  start() {
    if (this.started) return;
    this.started = true;

    const conn = getConnection();
    if (conn) {
      this.lastEffectiveType = conn.effectiveType ?? '';
      this.lastNetType = conn.type ?? '';
      conn.addEventListener?.('change', this.handleConnChange);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }

    this.pc.addEventListener('iceconnectionstatechange', this.handleIceState);

    // Safari/iOS fallback poll — RTT variance & candidate pair change.
    this.pollTimer = setInterval(() => this.safariFallbackPoll().catch(() => {}), 3000);

    logDiag('NETWORK', 'migration-manager started');
  }

  stop() {
    if (!this.started) return;
    this.started = false;
    const conn = getConnection();
    conn?.removeEventListener?.('change', this.handleConnChange);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.pc.removeEventListener('iceconnectionstatechange', this.handleIceState);
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.pollTimer = null;
    this.debounceTimer = null;
    logDiag('NETWORK', 'migration-manager stopped');
  }

  private handleConnChange = () => {
    const conn = getConnection();
    if (!conn) return;
    const et = conn.effectiveType ?? '';
    const t = conn.type ?? '';
    if (et === this.lastEffectiveType && t === this.lastNetType) return;
    const reason = `conn-change ${this.lastNetType}/${this.lastEffectiveType} -> ${t}/${et}`;
    this.lastEffectiveType = et;
    this.lastNetType = t;
    this.queue(reason);
  };

  private handleOnline = () => this.queue('online');
  private handleOffline = () => this.queue('offline');

  private handleIceState = () => {
    const s = this.pc.iceConnectionState;
    logDiag('ICE', `iceConnectionState=${s}`);
    if (s === 'disconnected' || s === 'failed') {
      this.queue(`ice-${s}`);
    }
  };

  private async safariFallbackPoll() {
    if (this.pc.connectionState === 'closed') return;
    let rtt = 0;
    let pairId = '';
    try {
      const stats = await this.pc.getStats();
      stats.forEach((r: any) => {
        if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') {
          rtt = (r.currentRoundTripTime || 0) * 1000;
          pairId = r.id || '';
        }
      });
    } catch {
      return;
    }
    if (pairId && this.lastCandidatePairId && pairId !== this.lastCandidatePairId) {
      this.queue(`candidate-pair-switch`);
    }
    if (pairId) this.lastCandidatePairId = pairId;

    if (rtt > 0) {
      this.rttSamples.push(rtt);
      if (this.rttSamples.length > 10) this.rttSamples.shift();
      if (this.rttSamples.length >= 5) {
        const avg = this.rttSamples.reduce((a, b) => a + b, 0) / this.rttSamples.length;
        const variance = Math.max(...this.rttSamples) - Math.min(...this.rttSamples);
        if (variance > 300 && variance > avg) {
          this.queue('rtt-variance');
          this.rttSamples = []; // reset so we don't spam
        }
      }
    }
  }

  private queue(reason: string) {
    this.pendingReason = reason;
    this.opts.onTransition?.(reason);
    logDiag('MOBILITY', `transition: ${reason}`);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const r = this.pendingReason;
      this.debounceTimer = null;
      this.pendingReason = '';
      logDiag('MOBILITY', `stable migration: ${r}`);
      this.opts.onStableMigration?.(r);
    }, this.opts.debounceMs);
  }
}
