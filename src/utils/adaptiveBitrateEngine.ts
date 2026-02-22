/**
 * Adaptive Bitrate Engine
 * 
 * Safely manages video quality scaling with hysteresis:
 * - Starts at 720p minimum
 * - Scales UP after 10s of stable good conditions
 * - Scales DOWN gradually on degradation (never instant drop to 360p)
 * - Uses RTCRtpSender.setParameters() with error recovery
 */

import { supabase } from '@/integrations/supabase/client';

export type VideoTier = '4k' | '1440p' | '1080p' | '720p' | '480p' | '360p' | '240p';

interface TierConfig {
  width: number;
  height: number;
  maxBitrate: number; // bps
  maxFps: number;
  minBandwidthKbps: number;
}

const TIER_CONFIGS: Record<VideoTier, TierConfig> = {
  '4k':    { width: 3840, height: 2160, maxBitrate: 25_000_000, maxFps: 60, minBandwidthKbps: 15000 },
  '1440p': { width: 2560, height: 1440, maxBitrate: 12_000_000, maxFps: 60, minBandwidthKbps: 8000 },
  '1080p': { width: 1920, height: 1080, maxBitrate: 8_000_000,  maxFps: 60, minBandwidthKbps: 4000 },
  '720p':  { width: 1280, height: 720,  maxBitrate: 2_500_000,  maxFps: 30, minBandwidthKbps: 2000 },
  '480p':  { width: 854,  height: 480,  maxBitrate: 1_000_000,  maxFps: 30, minBandwidthKbps: 800 },
  '360p':  { width: 640,  height: 360,  maxBitrate: 500_000,    maxFps: 24, minBandwidthKbps: 400 },
  '240p':  { width: 426,  height: 240,  maxBitrate: 200_000,    maxFps: 15, minBandwidthKbps: 100 },
};

const TIER_ORDER: VideoTier[] = ['240p', '360p', '480p', '720p', '1080p', '1440p', '4k'];

interface NetworkSnapshot {
  packetLoss: number;    // percentage
  rtt: number;           // ms
  jitter: number;        // ms
  bandwidth: number;     // kbps
  framesDropped: number;
  fps: number;
}

export interface AdaptiveBitrateState {
  currentTier: VideoTier;
  isStable: boolean;
  stableSeconds: number;
  lastDowngrade: number;
  lastUpgrade: number;
}

export class AdaptiveBitrateEngine {
  private pc: RTCPeerConnection;
  private state: AdaptiveBitrateState;
  private interval: NodeJS.Timeout | null = null;
  private maxTier: VideoTier;
  private prevBytesSent = 0;
  private prevTimestamp = 0;
  private onTierChange?: (tier: VideoTier, reason: string) => void;
  private callId?: string;
  private userId?: string;

  constructor(
    pc: RTCPeerConnection,
    options: {
      maxTier?: VideoTier;
      onTierChange?: (tier: VideoTier, reason: string) => void;
      callId?: string;
      userId?: string;
    } = {}
  ) {
    this.pc = pc;
    this.maxTier = options.maxTier || '1080p';
    this.onTierChange = options.onTierChange;
    this.callId = options.callId;
    this.userId = options.userId;
    this.state = {
      currentTier: '720p', // Always start at 720p minimum
      isStable: false,
      stableSeconds: 0,
      lastDowngrade: 0,
      lastUpgrade: 0,
    };
  }

  /**
   * Start monitoring - polls stats every 2s
   */
  start(): void {
    if (this.interval) return;
    
    // Apply initial 720p bitrate
    this.applyTier('720p', 'initial');
    
    this.interval = setInterval(() => this.evaluate(), 2000);
    console.log(`📊 [ABR] Started - min:720p, max:${this.maxTier}`);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getState(): AdaptiveBitrateState {
    return { ...this.state };
  }

  /**
   * Collect network stats and decide tier
   */
  private async evaluate(): Promise<void> {
    if (!this.pc || this.pc.connectionState !== 'connected') return;

    try {
      const snapshot = await this.collectStats();
      if (!snapshot) return;

      const now = Date.now();
      const currentIdx = TIER_ORDER.indexOf(this.state.currentTier);
      const maxIdx = TIER_ORDER.indexOf(this.maxTier);

      // DOWNGRADE CHECK: React quickly to degradation
      if (this.shouldDowngrade(snapshot)) {
        this.state.isStable = false;
        this.state.stableSeconds = 0;

        if (currentIdx > 0 && now - this.state.lastDowngrade > 5000) {
          // Step down ONE tier (never skip tiers)
          const newTier = TIER_ORDER[currentIdx - 1];
          // Never drop below 360p unless severe
          if (newTier !== '240p' || (snapshot.packetLoss > 20 || snapshot.rtt > 600)) {
            this.state.lastDowngrade = now;
            await this.applyTier(newTier, `degraded: loss=${snapshot.packetLoss.toFixed(1)}% rtt=${snapshot.rtt.toFixed(0)}ms`);
          }
        }
        return;
      }

      // UPGRADE CHECK: Require 10s of stable good conditions
      if (this.shouldUpgrade(snapshot)) {
        this.state.stableSeconds += 2; // 2s interval
        this.state.isStable = true;

        if (
          this.state.stableSeconds >= 10 &&
          currentIdx < maxIdx &&
          now - this.state.lastUpgrade > 15000 // Minimum 15s between upgrades
        ) {
          const nextTier = TIER_ORDER[currentIdx + 1];
          const config = TIER_CONFIGS[nextTier];
          
          // Only upgrade if bandwidth supports it
          if (snapshot.bandwidth >= config.minBandwidthKbps) {
            this.state.stableSeconds = 0;
            this.state.lastUpgrade = now;
            await this.applyTier(nextTier, `stable: bw=${snapshot.bandwidth.toFixed(0)}kbps`);
          }
        }
      } else {
        // Conditions are okay but not great enough for upgrade
        this.state.stableSeconds = 0;
        this.state.isStable = false;
      }

      // Log metrics periodically
      if (this.callId && this.userId && Math.random() < 0.1) {
        this.logMetrics(snapshot);
      }
    } catch (e) {
      // Silently handle stats errors
    }
  }

  private shouldDowngrade(s: NetworkSnapshot): boolean {
    return s.packetLoss > 5 || s.rtt > 150 || s.framesDropped > 10 || s.fps < 10;
  }

  private shouldUpgrade(s: NetworkSnapshot): boolean {
    return s.packetLoss < 2 && s.rtt < 80 && s.jitter < 30 && s.fps >= 24;
  }

  private async collectStats(): Promise<NetworkSnapshot | null> {
    const stats = await this.pc.getStats();
    let packetLoss = 0;
    let rtt = 0;
    let jitter = 0;
    let bandwidth = 0;
    let framesDropped = 0;
    let fps = 0;
    let bytesSent = 0;
    let timestamp = 0;

    stats.forEach(report => {
      if (report.type === 'outbound-rtp' && report.kind === 'video') {
        const lost = report.packetsLost || 0;
        const sent = report.packetsSent || 0;
        packetLoss = sent > 0 ? (lost / sent) * 100 : 0;
        framesDropped = report.framesDropped || 0;
        fps = report.framesPerSecond || 0;
        bytesSent = report.bytesSent || 0;
        timestamp = report.timestamp || Date.now();
      }
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        rtt = (report.currentRoundTripTime || 0) * 1000;
        bandwidth = (report.availableOutgoingBitrate || 0) / 1000; // bps to kbps
      }
      if (report.type === 'remote-inbound-rtp') {
        jitter = (report.jitter || 0) * 1000;
      }
    });

    // Calculate bandwidth from bytes if availableOutgoingBitrate not available
    if (bandwidth === 0 && this.prevBytesSent > 0 && this.prevTimestamp > 0) {
      const timeDelta = (timestamp - this.prevTimestamp) / 1000;
      if (timeDelta > 0) {
        bandwidth = ((bytesSent - this.prevBytesSent) * 8) / timeDelta / 1000;
      }
    }
    this.prevBytesSent = bytesSent;
    this.prevTimestamp = timestamp;

    return { packetLoss, rtt, jitter, bandwidth, framesDropped, fps };
  }

  /**
   * Apply a tier's bitrate/fps limits via setParameters
   */
  private async applyTier(tier: VideoTier, reason: string): Promise<void> {
    const config = TIER_CONFIGS[tier];
    const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
    if (!sender) return;

    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }

      params.encodings[0].maxBitrate = config.maxBitrate;
      params.encodings[0].maxFramerate = config.maxFps;

      // Scale resolution down relative to native camera resolution
      const track = sender.track;
      if (track) {
        const settings = track.getSettings();
        const nativeWidth = settings.width || 1920;
        const scaleFactor = Math.max(1, Math.round(nativeWidth / config.width));
        // @ts-ignore - scaleResolutionDownBy is standard but TS may not know it
        params.encodings[0].scaleResolutionDownBy = scaleFactor;
      }

      await sender.setParameters(params);
      
      const old = this.state.currentTier;
      this.state.currentTier = tier;
      
      if (old !== tier) {
        console.log(`📊 [ABR] ${old} → ${tier} (${reason})`);
        this.onTierChange?.(tier, reason);
      }
    } catch (e) {
      console.warn(`⚠️ [ABR] Failed to apply ${tier}:`, e);
      // Don't crash the call - just log and continue
    }
  }

  /**
   * Log network metrics to database (sampled)
   */
  private async logMetrics(s: NetworkSnapshot): Promise<void> {
    try {
      const config = TIER_CONFIGS[this.state.currentTier];
      await (supabase.from('network_metrics') as any).insert({
        call_id: this.callId,
        user_id: this.userId,
        bandwidth_kbps: s.bandwidth,
        packet_loss_percent: s.packetLoss,
        rtt_ms: s.rtt,
        jitter_ms: s.jitter,
        fps: s.fps,
        resolution_width: config.width,
        resolution_height: config.height,
        bitrate_kbps: config.maxBitrate / 1000,
        frames_dropped: s.framesDropped,
        quality_level: this.state.currentTier,
      });
    } catch {
      // Silent - analytics shouldn't break calls
    }
  }
}
