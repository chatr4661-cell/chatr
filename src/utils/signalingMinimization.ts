/**
 * Signaling Minimization for Ultra-Low Bandwidth
 * 
 * Optimizes signaling to function under <1 kbps:
 * - Compress SDP payloads
 * - Minimize ICE candidate exchange
 * - Cache ICE candidates
 * - Reduce renegotiation frequency
 * - Shorten signaling JSON keys
 */

import { NetworkMode, getNetworkModeInfo } from './nativeNetworkBridge';

// Short key mappings for signaling messages
const KEY_MAP = {
  // Original -> Compressed
  'type': 't',
  'sdp': 's',
  'candidate': 'c',
  'sdpMid': 'm',
  'sdpMLineIndex': 'i',
  'usernameFragment': 'u',
  'callId': 'k',
  'senderId': 'f',
  'receiverId': 'r',
  'timestamp': 'ts',
  'offer': 'o',
  'answer': 'a',
  'ice-candidate': 'ic',
  'renegotiate': 'rn',
  'end': 'e'
};

const REVERSE_KEY_MAP = Object.fromEntries(
  Object.entries(KEY_MAP).map(([k, v]) => [v, k])
);

// ICE candidate cache
interface CachedCandidate {
  candidate: RTCIceCandidate;
  timestamp: number;
  priority: number;
}

let candidateCache: Map<string, CachedCandidate[]> = new Map();
let candidateBatchTimer: NodeJS.Timeout | null = null;
const BATCH_DELAY_MS = 500; // Batch candidates for 500ms
const MAX_CACHED_CANDIDATES = 10;

/**
 * Compress signaling message keys
 */
export function compressSignalingMessage(message: any): any {
  if (typeof message !== 'object' || message === null) {
    return message;
  }

  if (Array.isArray(message)) {
    return message.map(compressSignalingMessage);
  }

  const compressed: any = {};
  for (const [key, value] of Object.entries(message)) {
    const newKey = KEY_MAP[key as keyof typeof KEY_MAP] || key;
    compressed[newKey] = compressSignalingMessage(value);
  }
  return compressed;
}

/**
 * Decompress signaling message keys
 */
export function decompressSignalingMessage(message: any): any {
  if (typeof message !== 'object' || message === null) {
    return message;
  }

  if (Array.isArray(message)) {
    return message.map(decompressSignalingMessage);
  }

  const decompressed: any = {};
  for (const [key, value] of Object.entries(message)) {
    const newKey = REVERSE_KEY_MAP[key] || key;
    decompressed[newKey] = decompressSignalingMessage(value);
  }
  return decompressed;
}

/**
 * Compress SDP payload
 * Removes unnecessary lines and whitespace
 */
export function compressSDP(sdp: string): string {
  const modeInfo = getNetworkModeInfo();
  
  // Only compress in low bandwidth modes
  if (modeInfo.mode > NetworkMode.MODE_2_LOW) {
    return sdp;
  }

  const lines = sdp.split('\r\n');
  const essentialLines: string[] = [];
  
  // Lines we must keep
  const essentialPrefixes = [
    'v=', 'o=', 's=', 't=', 'c=', 'm=',
    'a=rtpmap:', 'a=fmtp:', 'a=ice-ufrag:', 'a=ice-pwd:',
    'a=fingerprint:', 'a=setup:', 'a=mid:', 'a=rtcp-mux',
    'a=sendrecv', 'a=recvonly', 'a=sendonly', 'a=inactive',
    'a=group:', 'a=msid-semantic:', 'a=ssrc:'
  ];
  
  // Lines we can skip in ultra-low mode
  const skipPrefixes = [
    'a=extmap:', 'a=rtcp-fb:', 'a=ssrc-group:', 
    'a=candidate:' // Candidates sent separately
  ];

  for (const line of lines) {
    if (line.trim() === '') continue;
    
    // Check if line should be skipped
    const shouldSkip = skipPrefixes.some(prefix => line.startsWith(prefix));
    if (shouldSkip && modeInfo.mode <= NetworkMode.MODE_1_ULTRA_LOW) {
      continue;
    }
    
    // Check if line is essential
    const isEssential = essentialPrefixes.some(prefix => line.startsWith(prefix));
    if (isEssential || !shouldSkip) {
      essentialLines.push(line);
    }
  }

  const compressed = essentialLines.join('\r\n');
  
  console.log('📦 [SignalingMin] SDP compressed:', {
    original: sdp.length,
    compressed: compressed.length,
    reduction: `${Math.round((1 - compressed.length / sdp.length) * 100)}%`
  });

  return compressed;
}

/**
 * Decompress SDP (currently a no-op, for future expansion)
 */
export function decompressSDP(sdp: string): string {
  return sdp;
}

/**
 * Filter and prioritize ICE candidates
 * Returns only essential candidates for low-bandwidth scenarios
 */
export function filterICECandidates(
  candidates: RTCIceCandidate[]
): RTCIceCandidate[] {
  const modeInfo = getNetworkModeInfo();
  
  // In normal/high modes, keep all candidates
  if (modeInfo.mode >= NetworkMode.MODE_3_NORMAL) {
    return candidates;
  }
  
  // Prioritize candidates
  const prioritized = candidates
    .map(c => ({
      candidate: c,
      priority: getCandidatePriority(c)
    }))
    .sort((a, b) => b.priority - a.priority);

  // In ultra-low mode, keep only top 3 candidates
  const maxCandidates = modeInfo.mode === NetworkMode.MODE_1_ULTRA_LOW ? 3 : 5;
  
  const filtered = prioritized
    .slice(0, maxCandidates)
    .map(p => p.candidate);

  console.log('📦 [SignalingMin] ICE candidates filtered:', {
    original: candidates.length,
    filtered: filtered.length
  });

  return filtered;
}

/**
 * Calculate candidate priority for filtering
 */
function getCandidatePriority(candidate: RTCIceCandidate): number {
  const candidateStr = candidate.candidate || '';
  
  // Prefer relay (TURN) candidates for reliability in low bandwidth
  if (candidateStr.includes('typ relay')) return 100;
  
  // Then server-reflexive (STUN)
  if (candidateStr.includes('typ srflx')) return 80;
  
  // Then peer-reflexive
  if (candidateStr.includes('typ prflx')) return 60;
  
  // Host candidates (local IP)
  if (candidateStr.includes('typ host')) {
    // Prefer UDP over TCP
    if (candidateStr.includes('udp')) return 50;
    return 30;
  }
  
  return 10;
}

/**
 * Batch ICE candidates before sending
 */
export function batchCandidate(
  callId: string,
  candidate: RTCIceCandidate,
  onBatchReady: (callId: string, candidates: RTCIceCandidate[]) => void
): void {
  const modeInfo = getNetworkModeInfo();
  
  // In high bandwidth, send immediately
  if (modeInfo.mode >= NetworkMode.MODE_4_HIGH) {
    onBatchReady(callId, [candidate]);
    return;
  }

  // Add to cache
  const cached = candidateCache.get(callId) || [];
  cached.push({
    candidate,
    timestamp: Date.now(),
    priority: getCandidatePriority(candidate)
  });
  
  // Keep only top candidates
  cached.sort((a, b) => b.priority - a.priority);
  candidateCache.set(callId, cached.slice(0, MAX_CACHED_CANDIDATES));

  // Set or reset batch timer
  if (candidateBatchTimer) {
    clearTimeout(candidateBatchTimer);
  }

  const batchDelay = modeInfo.mode === NetworkMode.MODE_1_ULTRA_LOW ? 1000 : BATCH_DELAY_MS;

  candidateBatchTimer = setTimeout(() => {
    const candidates = candidateCache.get(callId) || [];
    if (candidates.length > 0) {
      const filtered = filterICECandidates(candidates.map(c => c.candidate));
      candidateCache.delete(callId);
      
      console.log('📦 [SignalingMin] Sending batched candidates:', filtered.length);
      onBatchReady(callId, filtered);
    }
  }, batchDelay);
}

/**
 * Clear candidate cache for a call
 */
export function clearCandidateCache(callId: string): void {
  candidateCache.delete(callId);
  
  if (candidateBatchTimer) {
    clearTimeout(candidateBatchTimer);
    candidateBatchTimer = null;
  }
}

/**
 * Create minimized signaling payload
 */
export function createMinimalSignal(
  type: 'offer' | 'answer' | 'ice-candidate' | 'end',
  data: any,
  callId: string
): string {
  const modeInfo = getNetworkModeInfo();
  
  let payload: any = {
    type,
    callId,
    timestamp: Date.now()
  };

  switch (type) {
    case 'offer':
    case 'answer':
      payload.sdp = modeInfo.mode <= NetworkMode.MODE_2_LOW 
        ? compressSDP(data.sdp)
        : data.sdp;
      break;
      
    case 'ice-candidate':
      if (Array.isArray(data)) {
        // Batched candidates
        payload.candidates = data.map((c: RTCIceCandidate) => ({
          candidate: c.candidate,
          sdpMid: c.sdpMid,
          sdpMLineIndex: c.sdpMLineIndex
        }));
      } else {
        payload.candidate = data.candidate;
        payload.sdpMid = data.sdpMid;
        payload.sdpMLineIndex = data.sdpMLineIndex;
      }
      break;
      
    case 'end':
      payload.reason = data.reason || 'normal';
      break;
  }

  // Compress keys in low bandwidth modes
  if (modeInfo.mode <= NetworkMode.MODE_2_LOW) {
    payload = compressSignalingMessage(payload);
  }

  const result = JSON.stringify(payload);
  
  console.log('📦 [SignalingMin] Created signal:', {
    type,
    size: result.length,
    compressed: modeInfo.mode <= NetworkMode.MODE_2_LOW
  });

  return result;
}

/**
 * Parse minimized signaling payload
 */
export function parseMinimalSignal(data: string): any {
  try {
    let parsed = JSON.parse(data);
    
    // Check if it's compressed (has short keys)
    if (parsed.t !== undefined || parsed.s !== undefined) {
      parsed = decompressSignalingMessage(parsed);
    }
    
    // Decompress SDP if present
    if (parsed.sdp) {
      parsed.sdp = decompressSDP(parsed.sdp);
    }
    
    return parsed;
  } catch (e) {
    console.error('📦 [SignalingMin] Failed to parse signal:', e);
    return null;
  }
}

/**
 * Check if renegotiation should be allowed
 * Prevents frequent renegotiations in low bandwidth
 */
let lastRenegotiationTime = 0;
const RENEGOTIATION_COOLDOWN: Record<NetworkMode, number> = {
  [NetworkMode.MODE_0_OFFLINE]: Infinity, // No renegotiation
  [NetworkMode.MODE_1_ULTRA_LOW]: 30000, // 30 seconds
  [NetworkMode.MODE_2_LOW]: 15000, // 15 seconds
  [NetworkMode.MODE_3_NORMAL]: 5000, // 5 seconds
  [NetworkMode.MODE_4_HIGH]: 1000 // 1 second
};

export function shouldAllowRenegotiation(): boolean {
  const modeInfo = getNetworkModeInfo();
  const cooldown = RENEGOTIATION_COOLDOWN[modeInfo.mode];
  const now = Date.now();
  
  if (now - lastRenegotiationTime < cooldown) {
    console.log('📦 [SignalingMin] Renegotiation blocked - cooldown active');
    return false;
  }
  
  lastRenegotiationTime = now;
  return true;
}

/**
 * Get estimated signaling message size for current network mode
 */
export function getMaxSignalingSize(): number {
  const modeInfo = getNetworkModeInfo();
  
  switch (modeInfo.mode) {
    case NetworkMode.MODE_0_OFFLINE:
      return 0;
    case NetworkMode.MODE_1_ULTRA_LOW:
      return 2000; // ~2KB max
    case NetworkMode.MODE_2_LOW:
      return 5000; // ~5KB
    case NetworkMode.MODE_3_NORMAL:
      return 15000; // ~15KB
    case NetworkMode.MODE_4_HIGH:
    default:
      return 50000; // ~50KB
  }
}
