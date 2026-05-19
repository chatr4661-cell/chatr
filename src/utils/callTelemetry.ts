/**
 * CHATR Call Telemetry — FaceTime-grade quality estimation.
 *
 * Computes a real-time MOS (Mean Opinion Score 1–5) estimate from WebRTC
 * stats using the E-model (ITU-T G.107) simplified for VoIP:
 *
 *   R = 93.2 − Id(latency) − Ie(loss)
 *   MOS = 1 + 0.035·R + 7e-6·R·(R−60)·(100−R)
 *
 * Plus tracks freeze count, audio concealment rate, decoder latency,
 * and emits a network-quality classification (excellent/good/fair/poor).
 *
 * Strictly additive — does not modify peer connections. Polls every 1s.
 */

export interface CallTelemetrySample {
  ts: number;
  rttMs: number;
  jitterMs: number;
  lossRate: number;          // 0..1
  audioBitrate: number;      // bps
  videoBitrate: number;      // bps
  freezeCount: number;
  totalFreezeMs: number;
  concealmentRate: number;   // 0..1 (audio PLC)
  decodeMs: number;          // mean per-frame decode time
  framesPerSecond: number;
  mos: number;               // 1..5
  classification: 'excellent' | 'good' | 'fair' | 'poor';
}

function rFactorToMos(r: number): number {
  if (r < 0) return 1;
  if (r > 100) return 4.5;
  return Math.max(1, Math.min(4.5,
    1 + 0.035 * r + 7e-6 * r * (r - 60) * (100 - r)
  ));
}

/**
 * E-model R-factor:
 *   Id = delay impairment (one-way ≈ rtt/2 + jitter)
 *   Ie = equipment/loss impairment for Opus FEC ≈ 30·loss
 */
function computeMos(rttMs: number, jitterMs: number, lossRate: number): number {
  const oneWay = rttMs / 2 + jitterMs;
  const Id = oneWay < 177.3
    ? 0.024 * oneWay
    : 0.024 * oneWay + 0.11 * (oneWay - 177.3);
  // Opus with FEC: ~30 R-points lost per 10% packet loss
  const Ie = 30 * (lossRate * 100) / 10;
  const R = 93.2 - Id - Ie;
  return Number(rFactorToMos(R).toFixed(2));
}

function classify(mos: number, rtt: number, loss: number): CallTelemetrySample['classification'] {
  if (mos >= 4.0 && rtt < 150 && loss < 0.02) return 'excellent';
  if (mos >= 3.6 && rtt < 250 && loss < 0.05) return 'good';
  if (mos >= 3.1 && rtt < 400 && loss < 0.10) return 'fair';
  return 'poor';
}

export class CallTelemetry {
  private pc: RTCPeerConnection;
  private timer: ReturnType<typeof setInterval> | null = null;
  private prev = {
    audioBytes: 0,
    videoBytes: 0,
    packetsLost: 0,
    packetsReceived: 0,
    concealedSamples: 0,
    totalSamplesReceived: 0,
    framesDecoded: 0,
    totalDecodeTime: 0,
    freezeCount: 0,
    totalFreezeMs: 0,
    ts: Date.now(),
  };
  private listeners = new Set<(s: CallTelemetrySample) => void>();
  private lastSample: CallTelemetrySample | null = null;

  constructor(pc: RTCPeerConnection) {
    this.pc = pc;
  }

  start(intervalMs = 1000): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick().catch(() => {}), intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  onSample(fn: (s: CallTelemetrySample) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getLast(): CallTelemetrySample | null {
    return this.lastSample;
  }

  private async tick(): Promise<void> {
    const stats = await this.pc.getStats();
    const now = Date.now();
    const dt = Math.max(1, (now - this.prev.ts) / 1000);

    let audioBytes = 0, videoBytes = 0;
    let packetsLost = 0, packetsReceived = 0;
    let concealedSamples = 0, totalSamplesReceived = 0;
    let framesDecoded = 0, totalDecodeTime = 0;
    let freezeCount = 0, totalFreezeMs = 0;
    let rttMs = 0, jitterSec = 0;
    let fps = 0;

    stats.forEach((r: any) => {
      if (r.type === 'inbound-rtp' && r.kind === 'audio') {
        audioBytes += r.bytesReceived || 0;
        packetsLost += r.packetsLost || 0;
        packetsReceived += r.packetsReceived || 0;
        concealedSamples += r.concealedSamples || 0;
        totalSamplesReceived += r.totalSamplesReceived || 0;
        jitterSec = Math.max(jitterSec, r.jitter || 0);
      } else if (r.type === 'inbound-rtp' && r.kind === 'video') {
        videoBytes += r.bytesReceived || 0;
        framesDecoded += r.framesDecoded || 0;
        totalDecodeTime += r.totalDecodeTime || 0;
        freezeCount = Math.max(freezeCount, r.freezeCount || 0);
        totalFreezeMs = Math.max(totalFreezeMs, (r.totalFreezesDuration || 0) * 1000);
        fps = Math.max(fps, r.framesPerSecond || 0);
      } else if (r.type === 'candidate-pair' && r.state === 'succeeded' && r.nominated) {
        rttMs = (r.currentRoundTripTime || 0) * 1000;
      } else if (r.type === 'remote-inbound-rtp') {
        // Use remote RTT if available (more accurate for outbound)
        if (r.roundTripTime) rttMs = Math.max(rttMs, r.roundTripTime * 1000);
      }
    });

    const deltaAudio = Math.max(0, audioBytes - this.prev.audioBytes);
    const deltaVideo = Math.max(0, videoBytes - this.prev.videoBytes);
    const deltaLost = Math.max(0, packetsLost - this.prev.packetsLost);
    const deltaRecv = Math.max(0, packetsReceived - this.prev.packetsReceived);
    const deltaConcealed = Math.max(0, concealedSamples - this.prev.concealedSamples);
    const deltaTotalSamples = Math.max(0, totalSamplesReceived - this.prev.totalSamplesReceived);
    const deltaFrames = Math.max(0, framesDecoded - this.prev.framesDecoded);
    const deltaDecodeTime = Math.max(0, totalDecodeTime - this.prev.totalDecodeTime);

    const lossRate = deltaRecv + deltaLost > 0
      ? deltaLost / (deltaRecv + deltaLost)
      : 0;
    const concealmentRate = deltaTotalSamples > 0
      ? deltaConcealed / deltaTotalSamples
      : 0;
    const decodeMs = deltaFrames > 0
      ? (deltaDecodeTime / deltaFrames) * 1000
      : 0;
    const jitterMs = jitterSec * 1000;
    const audioBitrate = (deltaAudio * 8) / dt;
    const videoBitrate = (deltaVideo * 8) / dt;
    const mos = computeMos(rttMs, jitterMs, lossRate);

    const sample: CallTelemetrySample = {
      ts: now,
      rttMs: Math.round(rttMs),
      jitterMs: Math.round(jitterMs),
      lossRate: Number(lossRate.toFixed(4)),
      audioBitrate: Math.round(audioBitrate),
      videoBitrate: Math.round(videoBitrate),
      freezeCount,
      totalFreezeMs: Math.round(totalFreezeMs),
      concealmentRate: Number(concealmentRate.toFixed(4)),
      decodeMs: Number(decodeMs.toFixed(2)),
      framesPerSecond: Math.round(fps),
      mos,
      classification: classify(mos, rttMs, lossRate),
    };

    this.prev = {
      audioBytes, videoBytes, packetsLost, packetsReceived,
      concealedSamples, totalSamplesReceived, framesDecoded,
      totalDecodeTime, freezeCount, totalFreezeMs, ts: now,
    };
    this.lastSample = sample;
    this.listeners.forEach((fn) => {
      try { fn(sample); } catch { /* listener errors must not break polling */ }
    });
  }
}
