/**
 * ICE Transport Strategy
 * 
 * Determines the optimal RTCConfiguration for the current network.
 * 
 * Background:
 *   Indian mobile carriers (Jio, Airtel, Vi) use Carrier-Grade NAT (CGNAT)
 *   with symmetric NAT mappings. When BOTH peers are on cellular, srflx
 *   (STUN-derived) candidates cannot reach each other — TURN relay is the
 *   ONLY viable path. STUN/UDP/3478 is also widely blocked by carriers.
 *
 *   Therefore we:
 *   - Force iceTransportPolicy='relay' on cellular networks
 *   - Use turns:443?transport=tcp (TLS over TCP/443) which traverses every
 *     carrier firewall as it looks like normal HTTPS traffic
 */

export type NetworkClass = 'wifi' | 'cellular' | 'unknown';

export function detectNetworkClass(): NetworkClass {
  try {
    // @ts-ignore - non-standard NetworkInformation API
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn?.type === 'cellular') return 'cellular';
    if (conn?.type === 'wifi' || conn?.type === 'ethernet') return 'wifi';
    // Effective type heuristic for browsers without `type`
    if (conn?.effectiveType && ['slow-2g', '2g', '3g'].includes(conn.effectiveType)) {
      return 'cellular';
    }
  } catch {}
  return 'unknown';
}

/**
 * Production-grade ICE servers.
 * Priority order:
 *   1. STUN (skipped on cellular relay-only mode)
 *   2. TURN over TLS on 443/TCP — ALWAYS works (looks like HTTPS)
 *   3. TURN UDP — fast path when carrier allows
 *
 * NOTE: openrelay.metered.ca (the free public one) is intentionally NOT used.
 * It is rate-limited, oversubscribed, and a primary cause of the
 * "connected-but-no-media" symptom.
 */
const TURN_USERNAME = 'e8dd65c92ae9a3b9bfcbeb6e';
const TURN_CREDENTIAL = 'uWdWNmkhvyqTW1QP';

export function buildIceServers(forceRelay: boolean): RTCIceServer[] {
  const turnOnly: RTCIceServer[] = [
    // TURN over TLS on 443 — survives every carrier/firewall (looks like HTTPS)
    {
      urls: [
        'turns:a.relay.metered.ca:443?transport=tcp',
        'turn:a.relay.metered.ca:443?transport=tcp',
      ],
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    },
    // TURN UDP — fast when allowed
    {
      urls: ['turn:a.relay.metered.ca:80', 'turn:a.relay.metered.ca:443'],
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    },
  ];

  if (forceRelay) return turnOnly;

  // STUN + TURN for permissive networks
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    ...turnOnly,
  ];
}

export function buildRtcConfig(opts?: { forceRelay?: boolean }): RTCConfiguration {
  const network = detectNetworkClass();
  // Force relay on cellular OR when explicitly requested (recovery path)
  const forceRelay = opts?.forceRelay ?? network === 'cellular';

  console.log(`🧊 [ICE] Network=${network} forceRelay=${forceRelay}`);

  return {
    iceServers: buildIceServers(forceRelay),
    iceTransportPolicy: forceRelay ? 'relay' : 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: forceRelay ? 0 : 4,
  };
}

/**
 * RTP Watchdog: detects "connected but no media" within 5s
 * and invokes the recovery callback (typically ICE restart with relay-only).
 */
export function attachRtpWatchdog(
  pc: RTCPeerConnection,
  onStalled: () => void,
  timeoutMs = 5000,
): () => void {
  let cancelled = false;
  let lastInboundBytes = 0;

  const start = Date.now();
  const interval = setInterval(async () => {
    if (cancelled || pc.connectionState === 'closed') return;
    if (pc.connectionState !== 'connected') return;

    try {
      const stats = await pc.getStats();
      let inboundBytes = 0;
      stats.forEach((report: any) => {
        if (report.type === 'inbound-rtp' && !report.isRemote) {
          inboundBytes += report.bytesReceived || 0;
        }
      });

      if (inboundBytes > lastInboundBytes + 1024) {
        // Media is flowing — stop watching
        lastInboundBytes = inboundBytes;
        clearInterval(interval);
        return;
      }

      if (Date.now() - start > timeoutMs && inboundBytes === 0) {
        console.warn('🚨 [RTP Watchdog] connected but 0 inbound bytes — recovering');
        clearInterval(interval);
        onStalled();
      }
    } catch {}
  }, 1000);

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}
