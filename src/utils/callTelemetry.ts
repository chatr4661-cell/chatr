/**
 * Call Telemetry — lightweight, in-memory metrics for WebRTC calls.
 *
 * Tracks the things we actually need to debug Indian-carrier reliability:
 *  - call setup time (offer → connected)
 *  - ICE restart count
 *  - reconnect success / failure
 *  - selected candidate pair type (host / srflx / relay)
 *  - relay provider actually used (openrelay / metered / twilio …)
 *  - failure reason on call end
 *
 * Why in-memory + window export (no DB writes here):
 *  - Zero backend coupling / no extra schema changes required.
 *  - The diagnostics panel & QA can read `window.__chatrCallTelemetry`
 *    on a live device to inspect the last call instantly.
 *  - A future "callMetrics" Supabase table can subscribe to events without
 *    changing call code.
 */

import type { IceProvider } from "./iceServerProvider";

export type ConnectionType = "host" | "srflx" | "relay" | "prflx" | "unknown";
export type NetworkType = "wifi" | "4g" | "5g" | "3g" | "2g" | "slow-2g" | "ethernet" | "unknown";
export type FailureReason =
  | "no-answer"
  | "ice-failed"
  | "media-denied"
  | "signaling-error"
  | "network-lost"
  | "timeout"
  | "unknown";

export interface CallTelemetrySnapshot {
  callId: string;
  startedAt: number;
  connectedAt?: number;
  endedAt?: number;
  setupTimeMs?: number;
  iceRestarts: number;
  reconnectSuccesses: number;
  reconnectFailures: number;
  connectionType: ConnectionType;
  relayProvider: IceProvider;
  networkType: NetworkType;
  iceState?: RTCIceConnectionState;
  failureReason?: FailureReason;
  isVideo: boolean;
  /** True once a TURN-only fallback connection was forced. */
  forcedRelayOnly: boolean;
}

type Listener = (snap: CallTelemetrySnapshot) => void;

const calls = new Map<string, CallTelemetrySnapshot>();
const listeners = new Set<Listener>();

function emit(snap: CallTelemetrySnapshot) {
  listeners.forEach((l) => {
    try {
      l(snap);
    } catch {}
  });
}

export function detectNetworkType(): NetworkType {
  const c: any = (navigator as any).connection;
  const t = c?.type as string | undefined;
  const eff = c?.effectiveType as string | undefined;
  if (t === "wifi") return "wifi";
  if (t === "ethernet") return "ethernet";
  if (eff === "slow-2g") return "slow-2g";
  if (eff === "2g") return "2g";
  if (eff === "3g") return "3g";
  if (eff === "4g") {
    // Heuristic: very high downlink → assume 5g
    if ((c?.downlink ?? 0) >= 50) return "5g";
    return "4g";
  }
  return "unknown";
}

export function startCall(callId: string, isVideo: boolean) {
  const snap: CallTelemetrySnapshot = {
    callId,
    startedAt: Date.now(),
    iceRestarts: 0,
    reconnectSuccesses: 0,
    reconnectFailures: 0,
    connectionType: "unknown",
    relayProvider: "unknown",
    networkType: detectNetworkType(),
    isVideo,
    forcedRelayOnly: false,
  };
  calls.set(callId, snap);
  exposeOnWindow();
  emit(snap);
}

export function markConnected(callId: string) {
  const s = calls.get(callId);
  if (!s) return;
  s.connectedAt = Date.now();
  s.setupTimeMs = s.connectedAt - s.startedAt;
  emit(s);
}

export function markIceRestart(callId: string) {
  const s = calls.get(callId);
  if (!s) return;
  s.iceRestarts++;
  emit(s);
}

export function markReconnect(callId: string, success: boolean) {
  const s = calls.get(callId);
  if (!s) return;
  if (success) s.reconnectSuccesses++;
  else s.reconnectFailures++;
  emit(s);
}

export function markRelayOnlyFallback(callId: string) {
  const s = calls.get(callId);
  if (!s) return;
  s.forcedRelayOnly = true;
  emit(s);
}

export function setIceState(callId: string, state: RTCIceConnectionState) {
  const s = calls.get(callId);
  if (!s) return;
  s.iceState = state;
  emit(s);
}

export function setSelectedCandidatePair(
  callId: string,
  conn: ConnectionType,
  provider: IceProvider,
) {
  const s = calls.get(callId);
  if (!s) return;
  s.connectionType = conn;
  s.relayProvider = provider;
  emit(s);
}

export function endCall(callId: string, reason?: FailureReason) {
  const s = calls.get(callId);
  if (!s) return;
  s.endedAt = Date.now();
  if (reason) s.failureReason = reason;
  emit(s);
}

export function getSnapshot(callId: string): CallTelemetrySnapshot | undefined {
  return calls.get(callId);
}

export function getAllSnapshots(): CallTelemetrySnapshot[] {
  return Array.from(calls.values());
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Sample selected ICE candidate pair from a peer connection's `getStats()`
 * and update telemetry accordingly. Safe to call repeatedly.
 */
export async function sampleSelectedCandidate(
  callId: string,
  pc: RTCPeerConnection,
): Promise<void> {
  try {
    const stats = await pc.getStats();
    let pair: any = null;
    let local: any = null;
    let remote: any = null;
    stats.forEach((r: any) => {
      if ((r.type === "candidate-pair" && r.state === "succeeded" && r.nominated) ||
          (r.type === "candidate-pair" && r.selected)) {
        pair = r;
      }
    });
    if (!pair) return;
    stats.forEach((r: any) => {
      if (r.id === pair.localCandidateId) local = r;
      if (r.id === pair.remoteCandidateId) remote = r;
    });
    const candType: ConnectionType =
      (local?.candidateType as ConnectionType) ||
      (remote?.candidateType as ConnectionType) ||
      "unknown";

    // Relay provider inference uses the *server* address (relay candidates
    // expose `relayProtocol` + the relay's IP/url in `address`/`url`).
    let provider: IceProvider = "unknown";
    if (candType === "relay") {
      const url = (local?.url || local?.relayUrl || "").toLowerCase();
      if (url.includes("openrelay")) provider = "openrelay";
      else if (url.includes("metered")) provider = "metered";
      else if (url.includes("twilio")) provider = "twilio";
      else provider = "custom";
    }
    setSelectedCandidatePair(callId, candType, provider);
  } catch {
    // ignore — stats not always available
  }
}

function exposeOnWindow() {
  if (typeof window === "undefined") return;
  (window as any).__chatrCallTelemetry = {
    snapshots: getAllSnapshots,
    snapshot: getSnapshot,
  };
}
