/**
 * Adaptive ICE Configuration — CHATR locked architecture
 *
 * Philosophy: trust ICE. Provide good candidates (host, srflx, IPv6, relay)
 * from the start, set iceTransportPolicy='all', and let ICE nominate the
 * best path naturally. No forced relay, no manual escalation, no aggressive
 * intervention. TURN exists as fallback infrastructure — gathered early,
 * never injected later.
 *
 * ICE servers:
 *   - Google STUN (IPv4 + IPv6 srflx, including IPv6 direct on Jio/Airtel LTE)
 *   - Cloudflare TURN UDP/TCP/TLS (fetched from /api/turn-credentials)
 *   - Metered TURN (static fallback if Cloudflare endpoint unavailable)
 */

const TURN_ENDPOINT = '/api/turn-credentials';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h — Cloudflare creds are 24h TTL

const GOOGLE_STUN: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

// Static Metered fallback (only if /api/turn-credentials is unreachable).
const METERED_FALLBACK: RTCIceServer[] = [
  {
    urls: [
      'turns:a.relay.metered.ca:443?transport=tcp',
      'turn:a.relay.metered.ca:443?transport=tcp',
      'turn:a.relay.metered.ca:80',
    ],
    username: 'e8dd65c92ae9a3b9bfcbeb6e',
    credential: 'uWdWNmkhvyqTW1QP',
  },
];

let cache: { servers: RTCIceServer[]; ts: number } | null = null;
let inflight: Promise<RTCIceServer[]> | null = null;

async function fetchCloudflareTurn(): Promise<RTCIceServer[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.servers;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(TURN_ENDPOINT, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`turn-credentials ${res.status}`);
      const data = await res.json();
      // Cloudflare returns { iceServers: [...] } or a flat array.
      const servers: RTCIceServer[] = Array.isArray(data?.iceServers)
        ? data.iceServers
        : Array.isArray(data)
        ? data
        : [];
      if (!servers.length) throw new Error('empty iceServers');
      cache = { servers, ts: Date.now() };
      console.log('🧊 [ICE] Cloudflare TURN credentials loaded:', servers.length, 'entries');
      return servers;
    } catch (err) {
      console.warn('⚠️ [ICE] Cloudflare TURN fetch failed, using fallback:', err);
      return METERED_FALLBACK;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Pre-warm TURN credentials at app boot so the first call has them ready.
 */
export function warmIceCredentials(): void {
  fetchCloudflareTurn().catch(() => {});
}

/**
 * Build the production RTCConfiguration.
 *
 * - iceTransportPolicy: 'all' — let ICE pick host / srflx / relay naturally
 * - bundlePolicy: 'max-bundle' — single transport
 * - iceCandidatePoolSize: 10 — early gathering, faster setup, TURN ready up-front
 *
 * NOTE: now async. TURN must be present from the start, not injected later.
 */
export async function buildRtcConfig(_opts?: { forceRelay?: boolean }): Promise<RTCConfiguration> {
  const turn = await fetchCloudflareTurn();
  return {
    iceServers: [...GOOGLE_STUN, ...turn],
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: 10,
  };
}

/**
 * Synchronous variant — only for code paths that cannot await.
 * Uses cached creds if available, otherwise the static fallback.
 */
export function buildRtcConfigSync(): RTCConfiguration {
  const turn = cache?.servers ?? METERED_FALLBACK;
  return {
    iceServers: [...GOOGLE_STUN, ...turn],
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: 10,
  };
}

export type NetworkClass = 'wifi' | 'cellular' | 'unknown';
export function detectNetworkClass(): NetworkClass {
  try {
    const conn =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;
    if (conn?.type === 'cellular') return 'cellular';
    if (conn?.type === 'wifi' || conn?.type === 'ethernet') return 'wifi';
  } catch {}
  return 'unknown';
}

/**
 * Passive observability poller — logs the selected candidate pair, transport,
 * RTT, packet loss, and bitrate every `intervalMs`. Does NOT modify routing.
 *
 * Telemetry observes; ICE controls.
 */
export function startStatsObserver(
  pc: RTCPeerConnection,
  intervalMs = 3000,
): () => void {
  let stopped = false;
  let lastBytesRecv = 0;
  let lastBytesSent = 0;
  let lastTs = Date.now();

  const tick = async () => {
    if (stopped || !pc || pc.connectionState === 'closed') return;
    if (pc.connectionState !== 'connected' && pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') {
      return;
    }
    try {
      const stats = await pc.getStats();
      let pair: any = null;
      const candidates = new Map<string, any>();
      let inboundBytes = 0;
      let outboundBytes = 0;
      let packetsLost = 0;
      let packetsRecv = 0;

      stats.forEach((r: any) => {
        if (r.type === 'local-candidate' || r.type === 'remote-candidate') {
          candidates.set(r.id, r);
        }
        if (r.type === 'candidate-pair' && (r.nominated || r.selected) && r.state === 'succeeded') {
          if (!pair || (r.bytesSent ?? 0) > (pair.bytesSent ?? 0)) pair = r;
        }
        if (r.type === 'transport' && r.selectedCandidatePairId) {
          // fallback path
        }
        if (r.type === 'inbound-rtp' && !r.isRemote) {
          inboundBytes += r.bytesReceived || 0;
          packetsLost += r.packetsLost || 0;
          packetsRecv += r.packetsReceived || 0;
        }
        if (r.type === 'outbound-rtp' && !r.isRemote) {
          outboundBytes += r.bytesSent || 0;
        }
      });

      const now = Date.now();
      const dt = (now - lastTs) / 1000;
      const kbpsIn = dt > 0 ? Math.round(((inboundBytes - lastBytesRecv) * 8) / 1000 / dt) : 0;
      const kbpsOut = dt > 0 ? Math.round(((outboundBytes - lastBytesSent) * 8) / 1000 / dt) : 0;
      lastBytesRecv = inboundBytes;
      lastBytesSent = outboundBytes;
      lastTs = now;

      if (pair) {
        const local = candidates.get(pair.localCandidateId);
        const remote = candidates.get(pair.remoteCandidateId);
        const lossPct = packetsRecv > 0 ? ((packetsLost / (packetsLost + packetsRecv)) * 100).toFixed(1) : '0';
        console.log(
          `📊 [ICE] path=${local?.candidateType}/${remote?.candidateType} ` +
            `proto=${local?.protocol ?? '?'} ` +
            `local=${local?.address ?? '?'}:${local?.port ?? '?'} ` +
            `remote=${remote?.address ?? '?'}:${remote?.port ?? '?'} ` +
            `rtt=${pair.currentRoundTripTime ? Math.round(pair.currentRoundTripTime * 1000) + 'ms' : '?'} ` +
            `loss=${lossPct}% in=${kbpsIn}kbps out=${kbpsOut}kbps`,
        );
      }
    } catch {}
  };

  const id = setInterval(tick, intervalMs);
  return () => {
    stopped = true;
    clearInterval(id);
  };
}

/**
 * @deprecated kept for backward compat; observability replaces forced recovery.
 * Returns a no-op stop function.
 */
export function attachRtpWatchdog(_pc: RTCPeerConnection, _onStalled: () => void): () => void {
  return () => {};
}
