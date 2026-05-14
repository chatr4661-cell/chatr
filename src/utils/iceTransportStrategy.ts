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
const PRODUCTION_TURN_ENDPOINT = 'https://chatr.chat/api/turn-credentials';
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

type IceCandidateDirection = 'gathered' | 'sent' | 'received' | 'queued' | 'applied' | 'received-past';

interface IceTelemetryContext {
  label?: string;
  callId?: string;
  userId?: string;
  peerId?: string;
}

interface IceCandidateSummary {
  raw: string;
  foundation: string;
  type: string;
  protocol: string;
  address: string;
  port: string | number;
  ipVersion: 'IPv4' | 'IPv6' | 'mDNS' | 'masked' | 'unknown';
  tcpType: string;
  url: string;
  relayTransport: 'UDP' | 'TCP' | 'TLS' | 'unknown';
}

function shortId(value?: string): string {
  return value ? value.slice(0, 8) : 'n/a';
}

function getCandidateLine(candidate: RTCIceCandidate | RTCIceCandidateInit | string | null | undefined): string {
  if (!candidate) return '';
  if (typeof candidate === 'string') return candidate;
  return (candidate as RTCIceCandidateInit).candidate || '';
}

function inferIpVersion(address: string): IceCandidateSummary['ipVersion'] {
  if (!address) return 'unknown';
  if (address.includes(':')) return 'IPv6';
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(address)) return 'IPv4';
  if (address.endsWith('.local')) return 'mDNS';
  return 'masked';
}

function inferRelayTransport(url: string, protocol: string, port: string | number, tcpType = ''): IceCandidateSummary['relayTransport'] {
  const normalizedUrl = url.toLowerCase();
  const normalizedProtocol = protocol.toLowerCase();
  const normalizedTcpType = tcpType.toLowerCase();

  if (normalizedUrl.startsWith('turns:') || normalizedUrl.includes(':5349') || Number(port) === 5349) return 'TLS';
  if (normalizedUrl.includes('transport=tcp') || normalizedProtocol === 'tcp' || normalizedTcpType) return 'TCP';
  if (normalizedUrl.includes('transport=udp') || normalizedProtocol === 'udp') return 'UDP';
  return 'unknown';
}

function summarizeCandidate(candidate: RTCIceCandidate | RTCIceCandidateInit | string | null | undefined): IceCandidateSummary {
  const raw = getCandidateLine(candidate);
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  const typIndex = parts.indexOf('typ');
  const tcpTypeIndex = parts.indexOf('tcptype');
  const anyCandidate = (candidate || {}) as any;
  const address = String(anyCandidate.address || anyCandidate.ip || parts[4] || '');
  const port = anyCandidate.port || parts[5] || '';
  const protocol = String(anyCandidate.protocol || parts[2] || 'unknown').toLowerCase();
  const tcpType = String(anyCandidate.tcpType || (tcpTypeIndex >= 0 ? parts[tcpTypeIndex + 1] : '') || 'n/a');
  const url = String(anyCandidate.url || 'n/a');

  return {
    raw,
    foundation: parts[0]?.replace('candidate:', '') || 'n/a',
    type: String(anyCandidate.type || (typIndex >= 0 ? parts[typIndex + 1] : '') || 'unknown'),
    protocol,
    address,
    port,
    ipVersion: inferIpVersion(address),
    tcpType,
    url,
    relayTransport: inferRelayTransport(url === 'n/a' ? '' : url, protocol, port, tcpType === 'n/a' ? '' : tcpType),
  };
}

export function logIceCandidateDiagnostics(
  candidate: RTCIceCandidate | RTCIceCandidateInit | string | null | undefined,
  direction: IceCandidateDirection,
  context: IceTelemetryContext = {},
): void {
  const info = summarizeCandidate(candidate);
  if (!info.raw) return;

  const prefix = context.label || 'WebRTC';
  console.log(
    `🧊 [ICE-CANDIDATE][8q4mnj] ${prefix} ${direction} ` +
      `call=${shortId(context.callId)} user=${shortId(context.userId)} peer=${shortId(context.peerId)} ` +
      `type=${info.type} protocol=${info.protocol} transport=${info.relayTransport} ip=${info.ipVersion} ` +
      `address=${info.address || '?'}:${info.port || '?'} tcpType=${info.tcpType} foundation=${info.foundation} url=${info.url}`,
  );

  if (info.type === 'relay') {
    console.log(
      `🧊 [ICE-RELAY][n3w8jq] ${prefix} ${direction} relay candidate present ` +
        `transport=${info.relayTransport} protocol=${info.protocol} ip=${info.ipVersion} ` +
        `address=${info.address || '?'}:${info.port || '?'} url=${info.url}`,
    );
  }

  if (info.type === 'relay' && (info.relayTransport === 'TLS' || info.url.toLowerCase().startsWith('turns:'))) {
    console.log(
      `🔐 [ICE-TLS][x4k0vp] ${prefix} ${direction} TURN/TLS relay candidate visible ` +
        `url=${info.url} candidate=${info.address || '?'}:${info.port || '?'}`,
    );
  } else if (info.type === 'relay' && info.protocol === 'tcp' && info.url === 'n/a') {
    console.log(
      `🔐 [ICE-TLS][x4k0vp] ${prefix} ${direction} relay/TCP candidate visible; ` +
        `remote signaling does not expose original TURN URL, verify sender-side gathered log for turns:5349`,
    );
  }
}

function flattenIceServerUrls(servers: RTCIceServer[]): string[] {
  return servers.flatMap((server) => {
    const urls = server.urls;
    if (!urls) return [];
    return Array.isArray(urls) ? urls : [urls];
  });
}

function describeIceUrl(url: string): string {
  const scheme = url.startsWith('turns:') ? 'turns' : url.startsWith('turn:') ? 'turn' : url.startsWith('stun:') ? 'stun' : 'unknown';
  const withoutScheme = url.replace(/^(turns|turn|stun):/, '');
  const [hostPort, query = ''] = withoutScheme.split('?');
  return `${scheme}:${hostPort}${query ? `?${query}` : ''}`;
}

export function logRtcConfiguration(config: RTCConfiguration, context: IceTelemetryContext = {}): void {
  const urls = flattenIceServerUrls(config.iceServers || []);
  const described = urls.map(describeIceUrl);
  const hasTls = urls.some((url) => url.toLowerCase().startsWith('turns:') || url.includes(':5349'));
  const relayUrls = described.filter((url) => url.startsWith('turn'));

  console.log('🧊 [ICE-CONFIG] RTCConfiguration', {
    label: context.label || 'WebRTC',
    call: shortId(context.callId),
    policy: config.iceTransportPolicy,
    bundlePolicy: config.bundlePolicy,
    pool: config.iceCandidatePoolSize,
    urlCount: urls.length,
    relayUrls,
  });

  if (hasTls) {
    console.log(
      `🔐 [ICE-TLS][x4k0vp] ${context.label || 'WebRTC'} TURN/TLS server configured: ` +
        described.filter((url) => url.startsWith('turns') || url.includes(':5349')).join(', '),
    );
  } else {
    console.warn(`⚠️ [ICE-TLS][x4k0vp] ${context.label || 'WebRTC'} TURN/TLS server NOT present in RTCConfiguration`);
  }
}

async function fetchCloudflareTurn(): Promise<RTCIceServer[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.servers;
  if (inflight) return inflight;

  inflight = (async () => {
    const endpoints = [TURN_ENDPOINT, PRODUCTION_TURN_ENDPOINT];
    let lastError: unknown = null;

    for (const endpoint of endpoints) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(endpoint, { signal: ctrl.signal });
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
        console.log('🧊 [ICE] Cloudflare TURN credentials loaded:', servers.length, 'entries', `source=${endpoint}`);
        return servers;
      } catch (err) {
        lastError = err;
        console.warn(`⚠️ [ICE] TURN credential fetch failed at ${endpoint}:`, err);
      }
    }

    try {
      throw lastError || new Error('turn credential endpoints unavailable');
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
  context: IceTelemetryContext = {},
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
      let selectedPairId: string | null = null;
      const candidates = new Map<string, any>();
      const candidatePairs: any[] = [];
      let inboundBytes = 0;
      let outboundBytes = 0;
      let packetsLost = 0;
      let packetsRecv = 0;

      stats.forEach((r: any) => {
        if (r.type === 'local-candidate' || r.type === 'remote-candidate') {
          candidates.set(r.id, r);
        }
        if (r.type === 'candidate-pair') {
          candidatePairs.push(r);
        }
        if (r.type === 'candidate-pair' && (r.nominated || r.selected) && r.state === 'succeeded') {
          if (!pair || (r.bytesSent ?? 0) > (pair.bytesSent ?? 0)) pair = r;
        }
        if (r.type === 'transport' && r.selectedCandidatePairId) {
          selectedPairId = r.selectedCandidatePairId;
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

      if (!pair && selectedPairId) {
        pair = candidatePairs.find((candidatePair) => candidatePair.id === selectedPairId) || null;
      }

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
          `📊 [ICE-SELECTED][7r2mwx] ${context.label || 'WebRTC'} ` +
            `call=${shortId(context.callId)} path=${local?.candidateType}/${remote?.candidateType} ` +
            `localProto=${local?.protocol ?? '?'} remoteProto=${remote?.protocol ?? '?'} ` +
            `localRelayProto=${local?.relayProtocol ?? '?'} remoteRelayProto=${remote?.relayProtocol ?? '?'} ` +
            `localIp=${inferIpVersion(local?.address || local?.ip || '')} remoteIp=${inferIpVersion(remote?.address || remote?.ip || '')} ` +
            `local=${local?.address ?? '?'}:${local?.port ?? '?'} ` +
            `remote=${remote?.address ?? '?'}:${remote?.port ?? '?'} ` +
            `nominated=${Boolean(pair.nominated)} state=${pair.state ?? '?'} selectedId=${selectedPairId || pair.id} ` +
            `rtt=${pair.currentRoundTripTime ? Math.round(pair.currentRoundTripTime * 1000) + 'ms' : '?'} ` +
            `loss=${lossPct}% in=${kbpsIn}kbps out=${kbpsOut}kbps`,
        );
      } else {
        const succeeded = candidatePairs.filter((candidatePair) => candidatePair.state === 'succeeded').length;
        const inProgress = candidatePairs.filter((candidatePair) => candidatePair.state === 'in-progress').length;
        const failed = candidatePairs.filter((candidatePair) => candidatePair.state === 'failed').length;
        console.log(
          `📊 [ICE-SELECTED][7r2mwx] ${context.label || 'WebRTC'} call=${shortId(context.callId)} ` +
            `no selected pair yet; pairs succeeded=${succeeded} inProgress=${inProgress} failed=${failed}`,
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
