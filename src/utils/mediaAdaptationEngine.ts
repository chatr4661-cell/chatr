/**
 * CHATR — FINAL LOCKED Media Adaptation Engine
 *
 * Strictly additive. Does NOT:
 *   - touch signaling
 *   - touch transceivers
 *   - recreate peer connections
 *   - replace tracks
 *   - renegotiate
 *
 * Responsibilities:
 *   - Safe Opus SDP parameter injection (FEC, DTX, narrow bitrate)
 *   - Audio sender bitrate cap (~32 kbps)
 *   - Video tier engine (GOOD / MEDIUM / WEAK / SURVIVAL) with hysteresis
 *   - Audio-only survival mode (track.enabled=false)
 *   - Cross-browser safe stats reading (Firefox/Safari may omit availableOutgoingBitrate)
 *   - Stagnant-media (frozen) detection -> delegated ICE-restart callback
 */

import { logDiag } from './rtcDiagnosticsHistory';

export type NetworkTier = 'GOOD' | 'MEDIUM' | 'WEAK' | 'SURVIVAL';

/**
 * Phase 2 safety floors. Soft constraints only — browser GCC still controls
 * congestion. We just refuse to let encoders fully starve.
 */
export const VIDEO_MIN_BITRATE = 80_000; // 80 kbps floor
export const VIDEO_MIN_FRAMERATE = 10;   // 10 fps floor
export const AUDIO_MAX_BITRATE = 32_000; // existing voice cap

export interface VideoProfile {
  name: NetworkTier;
  maxBitrate: number;
  maxFramerate: number;
  scaleResolutionDownBy: number;
}

export const GOOD_PROFILE: VideoProfile = {
  name: 'GOOD',
  maxBitrate: 1_200_000,
  maxFramerate: 30,
  scaleResolutionDownBy: 1,
};

export const MEDIUM_PROFILE: VideoProfile = {
  name: 'MEDIUM',
  maxBitrate: 500_000,
  maxFramerate: 24,
  scaleResolutionDownBy: 1.5,
};

export const WEAK_PROFILE: VideoProfile = {
  name: 'WEAK',
  maxBitrate: 150_000,
  maxFramerate: 15,
  scaleResolutionDownBy: 2,
};

const TIER_ORDER: Record<NetworkTier, number> = {
  GOOD: 4,
  MEDIUM: 3,
  WEAK: 2,
  SURVIVAL: 1,
};

/**
 * Safe Opus SDP parameter injection.
 * Adds FEC + DTX + narrow bitrate without overwriting existing keys.
 */
export function applyOpusParameters(sdp: string): string {
  if (!sdp) return sdp;
  const opusMatch = sdp.match(/a=rtpmap:(\d+) opus\/48000/i);
  if (!opusMatch) {
    console.warn('[OPUS] Opus codec not found');
    return sdp;
  }
  const pt = opusMatch[1];
  const fmtpRegex = new RegExp(`a=fmtp:${pt} (.*)\\r\\n`);
  const desired = ['minptime=10', 'useinbandfec=1', 'usedtx=1', 'maxaveragebitrate=32000'];

  if (!fmtpRegex.test(sdp)) {
    // No existing fmtp line — insert one after the rtpmap line.
    return sdp.replace(
      new RegExp(`(a=rtpmap:${pt} opus/48000[^\\r\\n]*\\r\\n)`, 'i'),
      `$1a=fmtp:${pt} ${desired.join(';')}\r\n`,
    );
  }

  return sdp.replace(fmtpRegex, (_match, params: string) => {
    const existing = params.split(';').filter(Boolean);
    const existingKeys = existing.map((p) => p.split('=')[0]);
    const filtered = desired.filter((p) => !existingKeys.includes(p.split('=')[0]));
    const updated = [...existing, ...filtered].join(';');
    return `a=fmtp:${pt} ${updated}\r\n`;
  });
}

interface EngineOptions {
  label?: string;
  intervalMs?: number;
  /** Called when media has been frozen for >=3 cycles. Engine does NOT restart ICE itself. */
  onStagnantMedia?: () => void | Promise<void>;
  /** Tier change observer (telemetry only). */
  onTierChange?: (tier: NetworkTier, metrics: AdaptationMetrics) => void;
}

export interface AdaptationMetrics {
  bitrate: number;
  rtt: number;
  jitter: number;
  lossRate: number;
  tier: NetworkTier;
}

function determineNetworkTier(args: { bitrate: number; rtt: number; lossRate: number }): NetworkTier {
  const { bitrate, rtt, lossRate } = args;
  // bitrate may be undefined/0 on Firefox & Safari — do NOT treat 0 as congestion.
  const bitrateKnown = bitrate > 0;

  if ((bitrateKnown && bitrate < 100_000) || lossRate > 10) return 'SURVIVAL';
  if ((bitrateKnown && bitrate < 300_000) || rtt > 250 || lossRate > 5) return 'WEAK';
  if ((bitrateKnown && bitrate < 800_000) || rtt > 120 || lossRate > 2) return 'MEDIUM';
  return 'GOOD';
}

export class MediaAdaptationEngine {
  private pc: RTCPeerConnection;
  private opts: Required<Omit<EngineOptions, 'onStagnantMedia' | 'onTierChange'>> &
    Pick<EngineOptions, 'onStagnantMedia' | 'onTierChange'>;
  private timer: ReturnType<typeof setInterval> | null = null;

  private lastInboundBytes = 0;
  private lastOutboundBytes = 0;
  private lastPacketsLost = 0;
  private lastPacketsSent = 0;

  private stagnantCycles = 0;
  private goodCycles = 0;
  private currentTier: NetworkTier | '' = '';
  private started = false;

  constructor(pc: RTCPeerConnection, options: EngineOptions = {}) {
    this.pc = pc;
    this.opts = {
      label: options.label ?? 'MediaAdaptation',
      intervalMs: options.intervalMs ?? 3000,
      onStagnantMedia: options.onStagnantMedia,
      onTierChange: options.onTierChange,
    };
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    await this.configureAudioSender();
    this.timer = setInterval(() => {
      this.tick().catch((err) => console.warn(`[${this.opts.label}] tick error`, err));
    }, this.opts.intervalMs);
    console.log(`📡 [${this.opts.label}] started (interval=${this.opts.intervalMs}ms)`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.started = false;
    console.log(`📡 [${this.opts.label}] stopped`);
  }

  private async configureAudioSender(): Promise<void> {
    const audioSender = this.pc.getSenders().find((s) => s.track?.kind === 'audio');
    if (!audioSender) return;
    const params = audioSender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      console.warn(`[${this.opts.label}] audio encodings unavailable`);
      return;
    }
    params.encodings[0] = { ...params.encodings[0], maxBitrate: 32_000 };
    try {
      await audioSender.setParameters(params);
    } catch (err) {
      console.error(`[${this.opts.label}] audio setParameters failed`, err);
    }
  }

  private async applyVideoProfile(profile: VideoProfile): Promise<void> {
    const videoSender = this.pc.getSenders().find((s) => s.track?.kind === 'video');
    if (!videoSender) return;
    const params = videoSender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      console.warn(`[${this.opts.label}] video encodings unavailable`);
      return;
    }
    params.encodings[0] = {
      ...params.encodings[0],
      maxBitrate: profile.maxBitrate,
      maxFramerate: profile.maxFramerate,
      // @ts-ignore - scaleResolutionDownBy is widely supported
      scaleResolutionDownBy: profile.scaleResolutionDownBy,
    };
    try {
      await videoSender.setParameters(params);
      console.log(`[${this.opts.label}] video profile ->`, profile.name);
    } catch (err) {
      console.error(`[${this.opts.label}] video setParameters failed`, err);
    }
  }

  private enableAudioOnlyMode(): void {
    const videoSender = this.pc.getSenders().find((s) => s.track?.kind === 'video');
    if (videoSender?.track && videoSender.track.enabled) {
      videoSender.track.enabled = false;
      console.warn(`[${this.opts.label}] SURVIVAL: video paused`);
    }
  }

  private restoreVideo(): void {
    const videoSender = this.pc.getSenders().find((s) => s.track?.kind === 'video');
    if (videoSender?.track && !videoSender.track.enabled) {
      videoSender.track.enabled = true;
      console.log(`[${this.opts.label}] video restored`);
    }
  }

  private async applyTier(tier: NetworkTier): Promise<void> {
    switch (tier) {
      case 'GOOD':
        this.restoreVideo();
        await this.applyVideoProfile(GOOD_PROFILE);
        break;
      case 'MEDIUM':
        this.restoreVideo();
        await this.applyVideoProfile(MEDIUM_PROFILE);
        break;
      case 'WEAK':
        this.restoreVideo();
        await this.applyVideoProfile(WEAK_PROFILE);
        break;
      case 'SURVIVAL':
        this.enableAudioOnlyMode();
        break;
    }
  }

  private async tick(): Promise<void> {
    if (!this.pc) return;
    if (this.pc.connectionState === 'closed' || this.pc.connectionState === 'failed') {
      this.stop();
      return;
    }

    let stats: RTCStatsReport;
    try {
      stats = await this.pc.getStats();
    } catch {
      return;
    }

    let inboundBytes = 0;
    let outboundBytes = 0;
    let packetsLost = 0;
    let packetsSent = 0;
    let rtt = 0;
    let jitter = 0;
    let bitrate = 0;

    stats.forEach((report: any) => {
      if (report.type === 'inbound-rtp') {
        inboundBytes += report.bytesReceived || 0;
        packetsLost += report.packetsLost || 0;
        if (typeof report.jitter === 'number') jitter = report.jitter;
      }
      if (report.type === 'outbound-rtp') {
        outboundBytes += report.bytesSent || 0;
        packetsSent += report.packetsSent || 0;
      }
      if (report.type === 'candidate-pair' && report.nominated && report.state === 'succeeded') {
        rtt = (report.currentRoundTripTime || 0) * 1000;
        bitrate = report.availableOutgoingBitrate ?? 0;
      }
    });

    const deltaInbound = inboundBytes - this.lastInboundBytes;
    const deltaOutbound = outboundBytes - this.lastOutboundBytes;
    this.lastInboundBytes = inboundBytes;
    this.lastOutboundBytes = outboundBytes;

    const deltaPacketsLost = packetsLost - this.lastPacketsLost;
    const deltaPacketsSent = packetsSent - this.lastPacketsSent;
    this.lastPacketsLost = packetsLost;
    this.lastPacketsSent = packetsSent;

    // Counter-reset protection (e.g. transport restart)
    if (deltaInbound < 0 || deltaOutbound < 0) {
      console.log(`[${this.opts.label}] counter reset detected`);
      this.stagnantCycles = 0;
      return;
    }

    const lossRate =
      deltaPacketsSent > 0 ? (deltaPacketsLost / deltaPacketsSent) * 100 : 0;

    const mediaFrozen = deltaInbound === 0 && deltaOutbound === 0;
    if (mediaFrozen) this.stagnantCycles++;
    else this.stagnantCycles = 0;

    // Mobility recovery — delegated to caller (do NOT restart ICE for quality alone)
    if (this.stagnantCycles >= 3) {
      this.stagnantCycles = 0;
      try {
        await this.opts.onStagnantMedia?.();
      } catch (err) {
        console.warn(`[${this.opts.label}] stagnant callback error`, err);
      }
    }

    const nextTier = determineNetworkTier({ bitrate, rtt, lossRate });

    if (!this.currentTier) {
      this.currentTier = nextTier;
      this.goodCycles = 0;
      await this.applyTier(this.currentTier);
      this.opts.onTierChange?.(this.currentTier, { bitrate, rtt, jitter, lossRate, tier: this.currentTier });
    } else if (nextTier !== this.currentTier) {
      if (TIER_ORDER[nextTier] < TIER_ORDER[this.currentTier]) {
        // Immediate downgrade
        this.currentTier = nextTier;
        this.goodCycles = 0;
        await this.applyTier(this.currentTier);
        this.opts.onTierChange?.(this.currentTier, { bitrate, rtt, jitter, lossRate, tier: this.currentTier });
      } else {
        // Delayed upgrade (hysteresis)
        this.goodCycles++;
        if (this.goodCycles >= 3) {
          this.currentTier = nextTier;
          this.goodCycles = 0;
          await this.applyTier(this.currentTier);
          this.opts.onTierChange?.(this.currentTier, { bitrate, rtt, jitter, lossRate, tier: this.currentTier });
        }
      }
    } else {
      this.goodCycles = 0;
    }
  }
}
