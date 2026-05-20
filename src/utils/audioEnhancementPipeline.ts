/**
 * CHATR Phase 3 — Audio Stabilization Pipeline
 *
 * Strictly additive WebAudio pipeline for the local microphone track.
 * Wraps the raw mic MediaStreamTrack with:
 *
 *   mic -> HPF(80Hz)  -> DynamicsCompressor -> Limiter(-1dBFS) -> dest
 *           |               (gentle, vocal)     (brickwall safe)
 *           +-- optional AudioWorklet (RNNoise) hook
 *
 * Goals:
 *  - Remove low-frequency rumble (HVAC, handling noise, breath thumps)
 *  - Smooth loudness variance so VAD/DTX behaves consistently
 *  - Prevent clipping spikes that cause robotic artifacts after Opus encode
 *  - Provide a stable hook to swap in RNNoise WASM later without
 *    touching call setup code
 *
 * Does NOT:
 *  - Replace senders or renegotiate
 *  - Touch the remote stream
 *  - Disable browser AEC/NS/AGC (these stay on the source track)
 *  - Add any heavy dependency (RNNoise is opt-in & lazy)
 *
 * Usage:
 *   const enhanced = await enhanceMicTrack(rawTrack);
 *   // pass enhanced.track into your existing addTrack(...) call
 *   // call enhanced.dispose() when the call ends
 */

import { logDiag } from './rtcDiagnosticsHistory';

export interface EnhancedMicTrack {
  /** Processed track — drop-in replacement for the raw mic track. */
  track: MediaStreamTrack;
  /** Underlying AudioContext (kept open for the call's lifetime). */
  context: AudioContext;
  /** Tear down the WebAudio graph. Safe to call multiple times. */
  dispose: () => void;
  /** True if an RNNoise worklet was successfully attached. */
  rnnoiseActive: boolean;
}

export interface EnhanceOptions {
  /**
   * Path to an AudioWorklet module that exposes an `rnnoise-processor`
   * node. If omitted or the fetch fails, the pipeline runs without
   * RNNoise — everything else still applies.
   */
  rnnoiseWorkletUrl?: string;
  /** High-pass cutoff in Hz. Default 80. */
  hpfHz?: number;
  /** Compressor threshold dBFS. Default -24. */
  compressorThreshold?: number;
  /** Limiter ceiling dBFS. Default -1. */
  limiterCeiling?: number;
}

let cachedContext: AudioContext | null = null;

function getContext(): AudioContext {
  if (cachedContext && cachedContext.state !== 'closed') return cachedContext;
  const Ctor: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  cachedContext = new Ctor({ latencyHint: 'interactive', sampleRate: 48000 });
  return cachedContext;
}

/**
 * Build the enhancement graph and return a processed MediaStreamTrack
 * that can be sent over WebRTC in place of the raw mic track.
 */
export async function enhanceMicTrack(
  rawTrack: MediaStreamTrack,
  opts: EnhanceOptions = {}
): Promise<EnhancedMicTrack> {
  const {
    hpfHz = 80,
    compressorThreshold = -24,
    limiterCeiling = -1,
    rnnoiseWorkletUrl,
  } = opts;

  const ctx = getContext();
  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch { /* noop */ }
  }

  const srcStream = new MediaStream([rawTrack]);
  const source = ctx.createMediaStreamSource(srcStream);

  // High-pass: kill rumble below ~80Hz
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = hpfHz;
  hpf.Q.value = 0.707;

  // Optional RNNoise (AudioWorklet). Best-effort; never throws upward.
  let rnnoiseNode: AudioNode | null = null;
  let rnnoiseActive = false;
  if (rnnoiseWorkletUrl) {
    try {
      // @ts-ignore — addModule exists on AudioWorklet
      await ctx.audioWorklet.addModule(rnnoiseWorkletUrl);
      // @ts-ignore
      rnnoiseNode = new AudioWorkletNode(ctx, 'rnnoise-processor');
      rnnoiseActive = true;
      logDiag('AUDIO', 'rnnoise worklet attached');
    } catch (e) {
      logDiag('AUDIO', `rnnoise unavailable: ${(e as Error).message}`);
    }
  }

  // Gentle vocal compression — tame transients, keep DTX/VAD stable
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = compressorThreshold;
  comp.knee.value = 24;
  comp.ratio.value = 3;
  comp.attack.value = 0.005;
  comp.release.value = 0.12;

  // Brickwall limiter at -1 dBFS via a second compressor
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = limiterCeiling;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.05;

  const dest = ctx.createMediaStreamDestination();

  // Wire graph
  let head: AudioNode = source;
  head.connect(hpf); head = hpf;
  if (rnnoiseNode) { head.connect(rnnoiseNode); head = rnnoiseNode; }
  head.connect(comp); head = comp;
  head.connect(limiter); head = limiter;
  head.connect(dest);

  const processedTrack = dest.stream.getAudioTracks()[0];

  // Mirror enabled/mute state from raw track so existing mute UI keeps working
  processedTrack.enabled = rawTrack.enabled;
  const mirrorEnabled = () => { processedTrack.enabled = rawTrack.enabled; };
  rawTrack.addEventListener('mute', mirrorEnabled);
  rawTrack.addEventListener('unmute', mirrorEnabled);

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    try { source.disconnect(); } catch { }
    try { hpf.disconnect(); } catch { }
    try { rnnoiseNode?.disconnect(); } catch { }
    try { comp.disconnect(); } catch { }
    try { limiter.disconnect(); } catch { }
    try { dest.disconnect(); } catch { }
    try { processedTrack.stop(); } catch { }
    rawTrack.removeEventListener('mute', mirrorEnabled);
    rawTrack.removeEventListener('unmute', mirrorEnabled);
    logDiag('AUDIO', 'enhancement pipeline disposed');
  };

  logDiag(
    'AUDIO',
    `enhancement active hpf=${hpfHz}Hz comp=${compressorThreshold}dB limit=${limiterCeiling}dB rnnoise=${rnnoiseActive}`
  );

  return { track: processedTrack, context: ctx, dispose, rnnoiseActive };
}

/**
 * Convenience: enhance the first audio track on a stream and return a
 * new MediaStream with the processed track plus all original video tracks.
 * The original audio track is left running (callers may stop it).
 */
export async function enhanceStream(
  stream: MediaStream,
  opts?: EnhanceOptions
): Promise<{ stream: MediaStream; dispose: () => void; rnnoiseActive: boolean }> {
  const audio = stream.getAudioTracks()[0];
  if (!audio) {
    return { stream, dispose: () => { }, rnnoiseActive: false };
  }
  const enhanced = await enhanceMicTrack(audio, opts);
  const out = new MediaStream();
  out.addTrack(enhanced.track);
  stream.getVideoTracks().forEach((t) => out.addTrack(t));
  return {
    stream: out,
    dispose: enhanced.dispose,
    rnnoiseActive: enhanced.rnnoiseActive,
  };
}
