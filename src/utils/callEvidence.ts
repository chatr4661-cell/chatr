/**
 * CHATR Call Evidence Logger — TELEMETRY / PROOF ONLY.
 *
 * Captures a single read-only evidence row per call into `call_telemetry`.
 * It NEVER touches media, SDP, ICE behaviour, TURN config or call lifecycle.
 * It only READS PeerConnection.getStats() and persists what it observes.
 *
 * SAFETY CONTRACT:
 *  - Disabled by default (feature flag below).
 *  - Every operation is wrapped so a telemetry failure can never break a call.
 *  - All writes are async / fire-and-forget.
 *  - No exceptions ever propagate to the caller.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Feature flag — DISABLED BY DEFAULT.
 * Enable via either:
 *   - build env:   VITE_ENABLE_CALL_EVIDENCE_LOGGING=true
 *   - runtime:     localStorage.setItem('ENABLE_CALL_EVIDENCE_LOGGING','true')
 */
export function isEvidenceLoggingEnabled(): boolean {
  try {
    const env = (import.meta as any)?.env?.VITE_ENABLE_CALL_EVIDENCE_LOGGING;
    if (String(env).toLowerCase() === "true") return true;
  } catch { /* ignore */ }
  try {
    if (typeof localStorage !== "undefined" &&
        localStorage.getItem("ENABLE_CALL_EVIDENCE_LOGGING") === "true") {
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

interface EvidenceOpts {
  callId: string;
  userId?: string | null;
  contactId?: string | null;
  iceServers?: RTCIceServer[];
}

interface EvidenceRecord {
  call_id: string;
  user_id: string | null;
  contact_id: string | null;
  turn_fetch_success: boolean | null;
  turn_server_count: number | null;
  turn_urls: string[] | null;
  local_candidate_type: string | null;
  remote_candidate_type: string | null;
  selected_candidate_pair: Record<string, unknown> | null;
  ice_connected_timestamp: string | null;
  ice_completed_timestamp: string | null;
  audio_packets_sent: number | null;
  audio_packets_received: number | null;
  audio_bytes_sent: number | null;
  audio_bytes_received: number | null;
  video_packets_sent: number | null;
  video_packets_received: number | null;
  video_bytes_sent: number | null;
  video_bytes_received: number | null;
  audio_active_timestamp: string | null;
  end_reason: string | null;
}

function flattenTurnUrls(servers: RTCIceServer[] = []): string[] {
  const out: string[] = [];
  for (const s of servers) {
    const urls = Array.isArray(s.urls) ? s.urls : s.urls ? [s.urls] : [];
    for (const u of urls) {
      if (typeof u === "string" && /^turns?:/i.test(u)) out.push(u);
    }
  }
  return out;
}

export class CallEvidenceLogger {
  private pc: RTCPeerConnection;
  private enabled: boolean;
  private timer: ReturnType<typeof setInterval> | null = null;
  private finalized = false;
  private rec: EvidenceRecord;

  constructor(pc: RTCPeerConnection, opts: EvidenceOpts) {
    this.pc = pc;
    this.enabled = isEvidenceLoggingEnabled();
    const turnUrls = flattenTurnUrls(opts.iceServers);
    this.rec = {
      call_id: opts.callId,
      user_id: opts.userId ?? null,
      contact_id: opts.contactId ?? null,
      // TURN config is built locally (zero-cost static stack). "fetch success"
      // means a usable TURN relay set was present when the PC was created.
      turn_fetch_success: turnUrls.length > 0,
      turn_server_count: turnUrls.length,
      turn_urls: turnUrls.length ? turnUrls : null,
      local_candidate_type: null,
      remote_candidate_type: null,
      selected_candidate_pair: null,
      ice_connected_timestamp: null,
      ice_completed_timestamp: null,
      audio_packets_sent: null,
      audio_packets_received: null,
      audio_bytes_sent: null,
      audio_bytes_received: null,
      video_packets_sent: null,
      video_packets_received: null,
      video_bytes_sent: null,
      video_bytes_received: null,
      audio_active_timestamp: null,
      end_reason: null,
    };
  }

  /** Begin passive polling. Safe no-op when disabled. */
  start(intervalMs = 1000): void {
    if (!this.enabled || this.timer) return;
    try {
      this.timer = setInterval(() => { this.tick().catch(() => {}); }, intervalMs);
    } catch { /* swallow */ }
  }

  private nowIso(): string {
    return new Date().toISOString();
  }

  private async tick(): Promise<void> {
    if (!this.pc || this.pc.connectionState === "closed") return;

    // ICE state proof (first occurrence only) — read-only.
    try {
      const ice = this.pc.iceConnectionState;
      if ((ice === "connected" || ice === "completed") && !this.rec.ice_connected_timestamp) {
        this.rec.ice_connected_timestamp = this.nowIso();
      }
      if (ice === "completed" && !this.rec.ice_completed_timestamp) {
        this.rec.ice_completed_timestamp = this.nowIso();
      }
    } catch { /* ignore */ }

    let stats: RTCStatsReport;
    try {
      stats = await this.pc.getStats();
    } catch {
      return;
    }

    const candidates = new Map<string, any>();
    const pairs: any[] = [];
    let selectedPairId: string | null = null;
    let nominatedPair: any = null;

    let aSent = 0, aRecv = 0, aBytesSent = 0, aBytesRecv = 0;
    let vSent = 0, vRecv = 0, vBytesSent = 0, vBytesRecv = 0;
    let sawAudio = false, sawVideo = false;

    stats.forEach((r: any) => {
      if (r.type === "local-candidate" || r.type === "remote-candidate") {
        candidates.set(r.id, r);
      } else if (r.type === "candidate-pair") {
        pairs.push(r);
        if ((r.nominated || r.selected) && r.state === "succeeded") {
          if (!nominatedPair || (r.bytesSent ?? 0) > (nominatedPair.bytesSent ?? 0)) {
            nominatedPair = r;
          }
        }
      } else if (r.type === "transport" && r.selectedCandidatePairId) {
        selectedPairId = r.selectedCandidatePairId;
      } else if (r.type === "inbound-rtp" && !r.isRemote) {
        if (r.kind === "audio") {
          sawAudio = true;
          aRecv += r.packetsReceived || 0;
          aBytesRecv += r.bytesReceived || 0;
        } else if (r.kind === "video") {
          sawVideo = true;
          vRecv += r.packetsReceived || 0;
          vBytesRecv += r.bytesReceived || 0;
        }
      } else if (r.type === "outbound-rtp" && !r.isRemote) {
        if (r.kind === "audio") {
          aSent += r.packetsSent || 0;
          aBytesSent += r.bytesSent || 0;
        } else if (r.kind === "video") {
          vSent += r.packetsSent || 0;
          vBytesSent += r.bytesSent || 0;
        }
      }
    });

    if (sawAudio) {
      this.rec.audio_packets_sent = aSent;
      this.rec.audio_packets_received = aRecv;
      this.rec.audio_bytes_sent = aBytesSent;
      this.rec.audio_bytes_received = aBytesRecv;
      // AUDIO_ACTIVE — first observation of inbound audio packets.
      if (aRecv > 0 && !this.rec.audio_active_timestamp) {
        this.rec.audio_active_timestamp = this.nowIso();
      }
    }
    if (sawVideo) {
      this.rec.video_packets_sent = vSent;
      this.rec.video_packets_received = vRecv;
      this.rec.video_bytes_sent = vBytesSent;
      this.rec.video_bytes_received = vBytesRecv;
    }

    // Selected candidate pair proof (capture once, keep latest if not set).
    let pair = nominatedPair;
    if (!pair && selectedPairId) {
      pair = pairs.find((p) => p.id === selectedPairId) || null;
    }
    if (pair) {
      const local = candidates.get(pair.localCandidateId);
      const remote = candidates.get(pair.remoteCandidateId);
      if (local?.candidateType && !this.rec.local_candidate_type) {
        this.rec.local_candidate_type = local.candidateType;
      }
      if (remote?.candidateType && !this.rec.remote_candidate_type) {
        this.rec.remote_candidate_type = remote.candidateType;
      }
      if (!this.rec.selected_candidate_pair) {
        this.rec.selected_candidate_pair = {
          state: pair.state ?? null,
          nominated: Boolean(pair.nominated),
          local_type: local?.candidateType ?? null,
          remote_type: remote?.candidateType ?? null,
          local_protocol: local?.protocol ?? null,
          remote_protocol: remote?.protocol ?? null,
          local_relay_protocol: local?.relayProtocol ?? null,
          rtt_ms: pair.currentRoundTripTime != null
            ? Math.round(pair.currentRoundTripTime * 1000) : null,
        };
        // A nominated relay/relay (or any) pair implies ICE connected.
        if (!this.rec.ice_connected_timestamp) {
          this.rec.ice_connected_timestamp = this.nowIso();
        }
      }
    }
  }

  /** Persist the single evidence row. Idempotent, fire-and-forget, never throws. */
  async finalize(endReason: string): Promise<void> {
    if (!this.enabled) return;
    if (this.finalized) return;
    this.finalized = true;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    try {
      await this.tick().catch(() => {}); // final read
    } catch { /* ignore */ }
    this.rec.end_reason = endReason;
    try {
      const { error } = await supabase.from("call_telemetry").insert(this.rec as any);
      if (error) {
        console.warn("[evidence] write failed:", error.message);
      } else {
        console.log("[evidence] persisted call proof:", this.rec.call_id);
      }
    } catch (e) {
      console.warn("[evidence] write exception (swallowed)", e);
    }
  }
}
