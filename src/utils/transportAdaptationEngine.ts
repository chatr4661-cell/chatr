/**
 * CHATR — Transport Adaptation Engine (Phase 2B)
 *
 * 1-second cadence adaptive loop. Replaces the 3 s polling tier loop with a
 * faster, finer-grained controller that respects the priority ladder:
 *
 *   1. preserve audio intelligibility   (never starve audio sender)
 *   2. preserve frame consistency       (drop bitrate before dropping fps)
 *   3. reduce bitrate
 *   4. reduce fps
 *   5. reduce resolution                (last resort)
 *
 * Inputs polled every 1 s via pc.getStats():
 *   - RTT (candidate-pair / remote-inbound-rtp)
 *   - jitter, packet loss (inbound + remote-inbound)
 *   - outbound bitrate (video sender)
 *   - frames per second + frames dropped
 *   - per-frame encode time + decode time
 *   - nack count
 *   - freeze count (inbound video)
 *
 * Adaptation rules (AIMD-style with hysteresis):
 *   - Hard down trigger:  loss >8%, OR rtt >400 ms, OR ≥2 freezes in 5 s
 *                         → step down immediately
 *   - Soft down trigger:  loss >3%, OR rtt >220 ms, OR encodeMs >25 ms
 *                         → 2 consecutive bad samples required
 *   - Up trigger:         loss <1%, rtt <140 ms, no freeze for 5 s
 *                         → 5 consecutive good samples required, then +1 step
 *   - Min cooldown:       2 s between any change, 5 s before an upgrade
 *
 * Strictly observer + setParameters; never renegotiates, never replaces tracks.
 */

import { logDiag } from './rtcDiagnosticsHistory';

export interface TransportSample {
  ts: number;
  rttMs: number;
  jitterMs: number;
  lossRate: number;          // 0..1
  outboundVideoKbps: number;
  encodeMs: number;
  decodeMs: number;
  fps: number;
  framesDropped: number;
  nackCount: number;
  freezeCount: number;
  level: number;             // current ladder index
  reason: string;
}

export type TierChangeReason =
  | 'init'
  | 'hard-loss'
  | 'hard-rtt'
  | 'freeze'
  | 'soft-loss'
  | 'soft-rtt'
  | 'soft-encode'
  | 'recovered';

interface Step {
  /** Video maxBitrate in bps. null = leave encoder's prior cap. */
  maxBitrateBps: number;
  /** Frame rate cap. */
  maxFramerate: number;
  /** scaleResolutionDownBy passed to sender encoding (1 = native). */
  scaleResolutionDownBy: number;
  label: string;
}

/**
 * Ladder (top = best). Step 0 is full-quality; index increases toward survival.
 * Designed so bitrate degrades before fps, fps before resolution.
 */
const LADDER: Step[] = [
  { label: '1080p30 @ 2.5Mbps', maxBitrateBps: 2_500_000, maxFramerate: 30, scaleResolutionDownBy: 1 },
  { label: '1080p30 @ 1.5Mbps', maxBitrateBps: 1_500_000, maxFramerate: 30, scaleResolutionDownBy: 1 },
  { label: '720p30 @ 900kbps',  maxBitrateBps:   900_000, maxFramerate: 30, scaleResolutionDownBy: 1.5 },
  { label: '720p24 @ 600kbps',  maxBitrateBps:   600_000, maxFramerate: 24, scaleResolutionDownBy: 1.5 },
  { label: '540p24 @ 400kbps',  maxBitrateBps:   400_000, maxFramerate: 24, scaleResolutionDownBy: 2 },
  { label: '540p20 @ 280kbps',  maxBitrateBps:   280_000, maxFramerate: 20, scaleResolutionDownBy: 2 },
  { label: '360p15 @ 180kbps',  maxBitrateBps:   180_000, maxFramerate: 15, scaleResolutionDownBy: 3 },
  { label: '270p12 @ 110kbps',  maxBitrateBps:   110_000, maxFramerate: 12, scaleResolutionDownBy: 4 },
];

const AUDIO_FLOOR_BPS = 24_000;
const DOWN_COOLDOWN_MS = 2_000;
const UP_COOLDOWN_MS = 5_000;
const SAMPLES_BEFORE_SOFT_DOWN = 2;
const SAMPLES_BEFORE_UP = 5;
const FREEZE_WINDOW_MS = 5_000;

interface Options {
  label?: string;
  intervalMs?: number;
  startLevel?: number;
  onChange?: (level: number, sample: TransportSample, reason: TierChangeReason) => void;
}

interface Prev {
  ts: number;
  videoBytesSent: number;
  packetsSent: number;
  packetsLost: number;
  framesEncoded: number;
  totalEncodeTime: number;
  framesDecoded: number;
  totalDecodeTime: number;
  framesDropped: number;
  nackCount: number;
  freezeCount: number;
  freezeAt: number;            // last time freezeCount increased
}

export class TransportAdaptationEngine {
  private pc: RTCPeerConnection;
  private opts: Required<Pick<Options, 'label' | 'intervalMs'>> & Options;
  private timer: ReturnType<typeof setInterval> | null = null;
  private level: number;
  private lastDownAt = 0;
  private lastUpAt = 0;
  private softBadStreak = 0;
  private goodStreak = 0;
  private lastFreezeBumpAt = 0;
  private freezeBumpsInWindow = 0;
  private prev: Prev | null = null;
  private inFlightApply = false;

  constructor(pc: RTCPeerConnection, options: Options = {}) {
    this.pc = pc;
    this.opts = {
      label: options.label ?? 'TransportAdapt',
      intervalMs: options.intervalMs ?? 1_000,
      ...options,
    };
    this.level = Math.min(Math.max(options.startLevel ?? 0, 0), LADDER.length - 1);
  }

  start(): void {
    if (this.timer) return;
    // Apply initial step (level 0 = full quality) so encoder starts at known cap.
    this.applyStep('init').catch(() => {});
    this.timer = setInterval(() => this.tick().catch(() => {}), this.opts.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  getLevel(): number {
    return this.level;
  }

  private async tick(): Promise<void> {
    const stats = await this.pc.getStats();
    const now = Date.now();

    let videoBytesSent = 0;
    let packetsSent = 0, packetsLost = 0;
    let framesEncoded = 0, totalEncodeTime = 0;
    let framesDecoded = 0, totalDecodeTime = 0;
    let framesDropped = 0, nackCount = 0;
    let freezeCount = 0;
    let rttMs = 0, jitterSec = 0, fps = 0;
    let remoteLossRate: number | null = null;

    stats.forEach((r: any) => {
      if (r.type === 'outbound-rtp' && r.kind === 'video') {
        videoBytesSent += r.bytesSent || 0;
        packetsSent += r.packetsSent || 0;
        framesEncoded += r.framesEncoded || 0;
        totalEncodeTime += r.totalEncodeTime || 0;
        nackCount += r.nackCount || 0;
        framesDropped += r.framesDropped || 0;
        fps = Math.max(fps, r.framesPerSecond || 0);
      } else if (r.type === 'inbound-rtp' && r.kind === 'video') {
        framesDecoded += r.framesDecoded || 0;
        totalDecodeTime += r.totalDecodeTime || 0;
        freezeCount = Math.max(freezeCount, r.freezeCount || 0);
        jitterSec = Math.max(jitterSec, r.jitter || 0);
      } else if (r.type === 'inbound-rtp' && r.kind === 'audio') {
        jitterSec = Math.max(jitterSec, r.jitter || 0);
      } else if (r.type === 'remote-inbound-rtp' && r.kind === 'video') {
        packetsLost += r.packetsLost || 0;
        if (typeof r.fractionLost === 'number') {
          remoteLossRate = r.fractionLost; // 0..1
        }
        if (r.roundTripTime) rttMs = Math.max(rttMs, r.roundTripTime * 1000);
        if (r.jitter) jitterSec = Math.max(jitterSec, r.jitter);
      } else if (r.type === 'candidate-pair' && r.state === 'succeeded' && r.nominated) {
        if (r.currentRoundTripTime) rttMs = Math.max(rttMs, r.currentRoundTripTime * 1000);
      }
    });

    let lossRate = 0;
    let outboundVideoKbps = 0;
    let encodeMs = 0;
    let decodeMs = 0;
    let dFreeze = 0;

    if (this.prev) {
      const dt = Math.max(0.25, (now - this.prev.ts) / 1000);
      const dBytes = Math.max(0, videoBytesSent - this.prev.videoBytesSent);
      outboundVideoKbps = (dBytes * 8) / dt / 1000;

      const dSent = Math.max(0, packetsSent - this.prev.packetsSent);
      const dLost = Math.max(0, packetsLost - this.prev.packetsLost);
      if (remoteLossRate !== null) {
        lossRate = remoteLossRate;
      } else if (dSent + dLost > 0) {
        lossRate = dLost / (dSent + dLost);
      }

      const dEncFrames = Math.max(0, framesEncoded - this.prev.framesEncoded);
      const dEncTime = Math.max(0, totalEncodeTime - this.prev.totalEncodeTime);
      if (dEncFrames > 0) encodeMs = (dEncTime / dEncFrames) * 1000;

      const dDecFrames = Math.max(0, framesDecoded - this.prev.framesDecoded);
      const dDecTime = Math.max(0, totalDecodeTime - this.prev.totalDecodeTime);
      if (dDecFrames > 0) decodeMs = (dDecTime / dDecFrames) * 1000;

      dFreeze = Math.max(0, freezeCount - this.prev.freezeCount);
      if (dFreeze > 0) {
        this.lastFreezeBumpAt = now;
        this.freezeBumpsInWindow += dFreeze;
      }
      // Decay freeze window
      if (now - this.lastFreezeBumpAt > FREEZE_WINDOW_MS) {
        this.freezeBumpsInWindow = 0;
      }
    }

    this.prev = {
      ts: now,
      videoBytesSent, packetsSent, packetsLost,
      framesEncoded, totalEncodeTime,
      framesDecoded, totalDecodeTime,
      framesDropped, nackCount, freezeCount,
      freezeAt: this.lastFreezeBumpAt,
    };

    const jitterMs = jitterSec * 1000;

    // ---- Decision ladder (priority: hard down > soft down > up) -----------
    const canDown = now - this.lastDownAt >= DOWN_COOLDOWN_MS;
    const canUp = now - this.lastUpAt >= UP_COOLDOWN_MS
               && now - this.lastDownAt >= DOWN_COOLDOWN_MS;

    let reason: TierChangeReason | null = null;
    let delta = 0;

    // Hard triggers — immediate step down (skip streak requirement)
    if (canDown && this.level < LADDER.length - 1) {
      if (lossRate > 0.08) { delta = +1; reason = 'hard-loss'; }
      else if (rttMs > 400) { delta = +1; reason = 'hard-rtt'; }
      else if (this.freezeBumpsInWindow >= 2) { delta = +1; reason = 'freeze'; this.freezeBumpsInWindow = 0; }
    }

    // Soft triggers — require streak
    if (!delta && canDown && this.level < LADDER.length - 1) {
      const soft = (lossRate > 0.03)
                || (rttMs > 220)
                || (encodeMs > 25);
      if (soft) {
        this.softBadStreak += 1;
        this.goodStreak = 0;
        if (this.softBadStreak >= SAMPLES_BEFORE_SOFT_DOWN) {
          delta = +1;
          this.softBadStreak = 0;
          reason = lossRate > 0.03 ? 'soft-loss' : rttMs > 220 ? 'soft-rtt' : 'soft-encode';
        }
      } else {
        this.softBadStreak = 0;
      }
    }

    // Recovery — slow ramp up
    if (!delta && canUp && this.level > 0) {
      const good = lossRate < 0.01
                && rttMs > 0 && rttMs < 140
                && this.freezeBumpsInWindow === 0
                && encodeMs < 18;
      if (good) {
        this.goodStreak += 1;
        if (this.goodStreak >= SAMPLES_BEFORE_UP) {
          delta = -1;
          this.goodStreak = 0;
          reason = 'recovered';
        }
      } else {
        this.goodStreak = 0;
      }
    }

    const sample: TransportSample = {
      ts: now,
      rttMs: Math.round(rttMs),
      jitterMs: Math.round(jitterMs),
      lossRate: Number(lossRate.toFixed(4)),
      outboundVideoKbps: Math.round(outboundVideoKbps),
      encodeMs: Number(encodeMs.toFixed(1)),
      decodeMs: Number(decodeMs.toFixed(1)),
      fps: Math.round(fps),
      framesDropped,
      nackCount,
      freezeCount,
      level: this.level,
      reason: reason ?? 'stable',
    };

    if (delta !== 0 && reason && !this.inFlightApply) {
      const newLevel = Math.min(LADDER.length - 1, Math.max(0, this.level + delta));
      if (newLevel !== this.level) {
        const prevLevel = this.level;
        this.level = newLevel;
        if (delta > 0) this.lastDownAt = now;
        else this.lastUpAt = now;
        await this.applyStep(reason);
        try {
          logDiag('info', `[${this.opts.label}] tier ${prevLevel}→${newLevel} (${reason}) ` +
            `loss=${(lossRate*100).toFixed(1)}% rtt=${Math.round(rttMs)}ms ` +
            `freeze=${this.freezeBumpsInWindow} enc=${encodeMs.toFixed(0)}ms`, {
            callId: this.opts.label,
          });
        } catch {}
        this.opts.onChange?.(newLevel, sample, reason);
      }
    }
  }

  private async applyStep(reason: TierChangeReason): Promise<void> {
    if (this.inFlightApply) return;
    this.inFlightApply = true;
    try {
      const step = LADDER[this.level];
      const videoSender = this.pc.getSenders().find((s) => s.track?.kind === 'video');
      if (videoSender) {
        const params = videoSender.getParameters();
        if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
        params.encodings[0].maxBitrate = step.maxBitrateBps;
        params.encodings[0].maxFramerate = step.maxFramerate;
        // @ts-ignore — scaleResolutionDownBy is standard
        params.encodings[0].scaleResolutionDownBy = step.scaleResolutionDownBy;
        // @ts-ignore
        params.encodings[0].networkPriority = 'high';
        // @ts-ignore
        params.degradationPreference = 'maintain-framerate';
        await videoSender.setParameters(params);
      }

      // PRIORITY #1 — protect audio. Never let audio sender drop below floor.
      const audioSender = this.pc.getSenders().find((s) => s.track?.kind === 'audio');
      if (audioSender) {
        try {
          const ap = audioSender.getParameters();
          if (!ap.encodings || ap.encodings.length === 0) ap.encodings = [{}];
          const current = ap.encodings[0].maxBitrate ?? 0;
          if (!current || current < AUDIO_FLOOR_BPS) {
            ap.encodings[0].maxBitrate = 48_000;
            // @ts-ignore
            ap.encodings[0].networkPriority = 'high';
            // @ts-ignore
            ap.encodings[0].priority = 'high';
            await audioSender.setParameters(ap);
          }
        } catch { /* non-fatal */ }
      }
    } catch (err) {
      console.warn(`[${this.opts.label}] applyStep(${reason}) failed:`, err);
    } finally {
      this.inFlightApply = false;
    }
  }
}
