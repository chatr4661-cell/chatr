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
 * Safe Opus SDP parameter injection — FaceTime-grade defaults.
 *
 * Upgrades for premium voice quality (Phase 1 audio):
 *   - stereo=1 + sprop-stereo=1 (rich audio for music/multi-speaker)
 *   - useinbandfec=1 (in-band Forward Error Correction → packet loss concealment)
 *   - usedtx=1 (Discontinuous Transmission → silence suppression saves uplink)
 *   - maxaveragebitrate=48000 (48 kbps — premium voice, still 4G-safe)
 *   - maxplaybackrate=48000 + sprop-maxcapturerate=48000 (fullband audio)
 *   - minptime=10 + ptime=20 (low-latency packetization, FaceTime parity)
 *   - cbr=0 (let encoder breathe under congestion)
 *
 * NOTE: caller may pass `voiceOnly=true` to cap at 32 kbps for audio-only calls
 * where stereo provides no benefit; default 48 kbps targets video-call audio
 * which is where perceived quality matters most.
 */
export function applyOpusParameters(sdp: string, voiceOnly = false): string {
  if (!sdp) return sdp;
  const opusMatch = sdp.match(/a=rtpmap:(\d+) opus\/48000/i);
  if (!opusMatch) {
    console.warn('[OPUS] Opus codec not found');
    return sdp;
  }
  const pt = opusMatch[1];
  const fmtpRegex = new RegExp(`a=fmtp:${pt} (.*)\\r\\n`);
  const maxBr = voiceOnly ? 32000 : 48000;
  const desired = [
    'minptime=10',
    'ptime=20',
    'useinbandfec=1',
    'usedtx=1',
    'stereo=1',
    'sprop-stereo=1',
    `maxaveragebitrate=${maxBr}`,
    'maxplaybackrate=48000',
    'sprop-maxcapturerate=48000',
    'cbr=0',
  ];

  if (!fmtpRegex.test(sdp)) {
    return sdp.replace(
      new RegExp(`(a=rtpmap:${pt} opus/48000[^\\r\\n]*\\r\\n)`, 'i'),
      `$1a=fmtp:${pt} ${desired.join(';')}\r\n`,
    );
  }

  return sdp.replace(fmtpRegex, (_match, params: string) => {
    const existing = params.split(';').filter(Boolean);
    const existingKeys = new Set(existing.map((p) => p.split('=')[0]));
    // Premium params win: replace stereo/bitrate/playbackrate if already present
    const overrides = new Set([
      'stereo', 'sprop-stereo', 'maxaveragebitrate', 'maxplaybackrate',
      'sprop-maxcapturerate', 'useinbandfec', 'usedtx', 'ptime', 'cbr', 'minptime',
    ]);
    const kept = existing.filter((p) => !overrides.has(p.split('=')[0]));
    const updated = [...kept, ...desired].join(';');
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

  // Phase 2: jitter smoothing + mobility hysteresis
  private jitterSamples: number[] = [];          // seconds, last 5 samples
  private rttSamples: number[] = [];             // ms, last 5 samples
  private jitterSpikeCycles = 0;                 // # cycles avg jitter > 300ms
  private mobilityMode = false;
  private mobilityUntil = 0;                     // epoch ms; stay sticky until then

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

  /**
   * Phase 2: external mobility signal from NetworkMigrationManager.
   * Sticky for 15s. While active, upgrades require extra cycles (delayed escalation).
   */
  setMobilityMode(active: boolean, stickyMs = 15_000) {
    this.mobilityMode = active;
    this.mobilityUntil = active ? Date.now() + stickyMs : 0;
    logDiag('MOBILITY', `mobilityMode=${active}`);
  }

  private async configureAudioSender(maxBitrate = AUDIO_MAX_BITRATE, ptimeOverride?: number): Promise<void> {
    const audioSender = this.pc.getSenders().find((s) => s.track?.kind === 'audio');
    if (!audioSender) return;
    const params = audioSender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      console.warn(`[${this.opts.label}] audio encodings unavailable`);
      return;
    }
    params.encodings[0] = {
      ...params.encodings[0],
      maxBitrate,
      // @ts-ignore — supported in Chrome/Edge/Android WebView, ignored elsewhere
      ...(ptimeOverride ? { ptime: ptimeOverride } : {}),
    };
    try {
      await audioSender.setParameters(params);
    } catch (err) {
      console.error(`[${this.opts.label}] audio setParameters failed`, err);
    }
  }

  /**
   * Sub-2G survival: drop Opus to ~8 kbps mono with ptime=60ms.
   * Per RFC 6716, Opus can stay intelligible down to ~6 kbps SILK mode.
   * Larger ptime = fewer packets = less header overhead on GPRS/EDGE.
   */
  private async enableUltraLowAudio(): Promise<void> {
    await this.configureAudioSender(8_000, 60);
    logDiag('QUALITY', 'SURVIVAL: opus → 8kbps / ptime=60ms (sub-2G mode)');
  }

  private async restoreNormalAudio(): Promise<void> {
    await this.configureAudioSender(AUDIO_MAX_BITRATE, 20);
  }

  /**
   * Adaptive jitter buffer: scale receiver playoutDelayHint to smoothed RTT.
   * Low RTT (<150ms) → 50ms buffer (responsive). High RTT (>500ms) → up to 2s
   * (handles severe packet reordering on EDGE/2G without audible gaps).
   */
  private applyAdaptiveJitterBuffer(avgRttMs: number): void {
    if (!this.pc) return;
    let hintSec: number;
    if (avgRttMs < 150) hintSec = 0.05;
    else if (avgRttMs < 300) hintSec = 0.15;
    else if (avgRttMs < 600) hintSec = 0.4;
    else if (avgRttMs < 1000) hintSec = 1.0;
    else hintSec = 2.0;

    for (const receiver of this.pc.getReceivers()) {
      if (!receiver.track) continue;
      // playoutDelayHint is a hint, browsers may clamp. Supported in Chromium 109+.
      // @ts-ignore — newer WebRTC API, no DOM types yet in all envs
      if ('playoutDelayHint' in receiver) {
        try {
          // @ts-ignore
          (receiver as any).playoutDelayHint = hintSec;
        } catch { /* swallow */ }
      }
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
      // Phase 2: soft floors — protects against full encoder starvation (6kbps / 2fps cases)
      // @ts-ignore - minBitrate widely supported (Chrome/Edge/Android); ignored elsewhere
      minBitrate: VIDEO_MIN_BITRATE,
      // @ts-ignore - scaleResolutionDownBy is widely supported
      scaleResolutionDownBy: profile.scaleResolutionDownBy,
    };
    try {
      await videoSender.setParameters(params);
      logDiag('QUALITY', `video profile -> ${profile.name}`, {
        maxBitrate: profile.maxBitrate,
        maxFramerate: profile.maxFramerate,
        minBitrate: VIDEO_MIN_BITRATE,
      });
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

    // Phase 2: rolling jitter/rtt smoothing (5-sample window)
    this.jitterSamples.push(jitter);
    if (this.jitterSamples.length > 5) this.jitterSamples.shift();
    this.rttSamples.push(rtt);
    if (this.rttSamples.length > 5) this.rttSamples.shift();
    const avgJitterMs =
      (this.jitterSamples.reduce((a, b) => a + b, 0) / this.jitterSamples.length) * 1000;

    // Jitter spike: > 300ms sustained for >=2 cycles (~6s) → force WEAK demotion
    if (avgJitterMs > 300) {
      this.jitterSpikeCycles++;
    } else {
      this.jitterSpikeCycles = 0;
    }

    // Mobility mode auto-expiry
    if (this.mobilityMode && Date.now() > this.mobilityUntil) {
      this.mobilityMode = false;
      logDiag('MOBILITY', 'mobilityMode auto-cleared');
    }

    let nextTier = determineNetworkTier({ bitrate, rtt, lossRate });
    if (this.jitterSpikeCycles >= 2 && TIER_ORDER[nextTier] > TIER_ORDER.WEAK) {
      nextTier = 'WEAK';
      logDiag('QUALITY', 'jitter spike → forced WEAK', { avgJitterMs });
    }

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
        // Delayed upgrade (hysteresis). Mobility mode = stricter (5 cycles).
        this.goodCycles++;
        const required = this.mobilityMode ? 5 : 3;
        if (this.goodCycles >= required) {
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
