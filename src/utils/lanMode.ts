/**
 * LAN/Hotspot Mode - Local Network Calling
 * 
 * Enables calls without internet when devices are on:
 * - Same Wi-Fi network
 * - Hotspot + client
 * - Wi-Fi Direct (optional)
 * 
 * Features:
 * - Local peer discovery via broadcast
 * - Direct WebRTC connection without external servers
 * - "Local Network Call" indicator for UI
 */

import { NetworkMode, getNetworkModeInfo, setNetworkMode } from './nativeNetworkBridge';

export interface LocalPeer {
  id: string;
  name: string;
  ip: string;
  port: number;
  lastSeen: number;
  isAvailable: boolean;
}

export interface LANModeState {
  enabled: boolean;
  isDiscovering: boolean;
  peers: LocalPeer[];
  localIP: string | null;
  signalingPort: number;
  isLocalCall: boolean;
}

// Constants
const DISCOVERY_PORT = 54321;
const SIGNALING_PORT = 54322;
const DISCOVERY_INTERVAL = 5000; // 5 seconds
const PEER_TIMEOUT = 15000; // 15 seconds

// State
let lanState: LANModeState = {
  enabled: false,
  isDiscovering: false,
  peers: [],
  localIP: null,
  signalingPort: SIGNALING_PORT,
  isLocalCall: false
};

let discoveryChannel: BroadcastChannel | null = null;
let discoveryInterval: NodeJS.Timeout | null = null;
let peerListeners: Array<(peers: LocalPeer[]) => void> = [];
let localCallListeners: Array<(isLocal: boolean) => void> = [];

/**
 * Initialize LAN mode
 */
export function initializeLANMode(): () => void {
  console.log('📡 [LANMode] Initializing...');
  
  // Try to get local IP
  detectLocalIP().then(ip => {
    lanState.localIP = ip;
    console.log('📡 [LANMode] Local IP detected:', ip);
  });
  
  // Setup broadcast channel for peer discovery (works across tabs/windows)
  try {
    discoveryChannel = new BroadcastChannel('chatr-lan-discovery');
    
    discoveryChannel.onmessage = (event) => {
      handleDiscoveryMessage(event.data);
    };
    
    console.log('📡 [LANMode] BroadcastChannel created');
  } catch (e) {
    console.warn('📡 [LANMode] BroadcastChannel not available:', e);
  }
  
  // Start discovery if on local network
  const modeInfo = getNetworkModeInfo();
  if (modeInfo.mode >= NetworkMode.MODE_3_NORMAL) {
    startDiscovery();
  }
  
  lanState.enabled = true;
  
  return () => {
    stopDiscovery();
    discoveryChannel?.close();
    lanState.enabled = false;
  };
}

/**
 * Start peer discovery
 */
export function startDiscovery(): void {
  if (lanState.isDiscovering) return;
  
  lanState.isDiscovering = true;
  console.log('📡 [LANMode] Starting peer discovery...');
  
  // Announce ourselves
  announcePresence();
  
  // Periodic announcements
  discoveryInterval = setInterval(() => {
    announcePresence();
    cleanupStalePeers();
  }, DISCOVERY_INTERVAL);
}

/**
 * Stop peer discovery
 */
export function stopDiscovery(): void {
  if (!lanState.isDiscovering) return;
  
  lanState.isDiscovering = false;
  
  if (discoveryInterval) {
    clearInterval(discoveryInterval);
    discoveryInterval = null;
  }
  
  console.log('📡 [LANMode] Discovery stopped');
}

/**
 * Detect local IP address using WebRTC
 */
async function detectLocalIP(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [] // No external servers needed
      });
      
      pc.createDataChannel('');
      
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        
        const candidate = event.candidate.candidate;
        
        // Extract local IP from candidate
        const ipMatch = candidate.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/);
        
        if (ipMatch && !ipMatch[1].startsWith('0.')) {
          const ip = ipMatch[1];
          
          // Check if it's a local IP
          if (isLocalIP(ip)) {
            pc.close();
            resolve(ip);
          }
        }
      };
      
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
      });
      
      // Timeout after 3 seconds
      setTimeout(() => {
        pc.close();
        resolve(null);
      }, 3000);
      
    } catch (e) {
      console.error('📡 [LANMode] Failed to detect local IP:', e);
      resolve(null);
    }
  });
}

/**
 * Check if IP is a local/private address
 */
function isLocalIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  
  // 10.x.x.x
  if (parts[0] === 10) return true;
  
  // 172.16.x.x - 172.31.x.x
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  
  // 192.168.x.x
  if (parts[0] === 192 && parts[1] === 168) return true;
  
  return false;
}

/**
 * Announce our presence on the network
 */
function announcePresence(): void {
  if (!discoveryChannel || !lanState.localIP) return;
  
  const announcement = {
    type: 'announce',
    id: getUserId(),
    name: getUserName(),
    ip: lanState.localIP,
    port: lanState.signalingPort,
    timestamp: Date.now()
  };
  
  try {
    discoveryChannel.postMessage(announcement);
  } catch (e) {
    console.error('📡 [LANMode] Failed to announce:', e);
  }
}

/**
 * Handle incoming discovery messages
 */
function handleDiscoveryMessage(data: any): void {
  if (!data || data.id === getUserId()) return; // Ignore our own messages
  
  switch (data.type) {
    case 'announce':
      addOrUpdatePeer({
        id: data.id,
        name: data.name || 'Unknown',
        ip: data.ip,
        port: data.port,
        lastSeen: Date.now(),
        isAvailable: true
      });
      break;
      
    case 'leave':
      removePeer(data.id);
      break;
      
    case 'offer':
    case 'answer':
    case 'ice-candidate':
      // Forward to call handler
      handleLocalSignal(data);
      break;
  }
}

/**
 * Add or update a discovered peer
 */
function addOrUpdatePeer(peer: LocalPeer): void {
  const existingIndex = lanState.peers.findIndex(p => p.id === peer.id);
  
  if (existingIndex >= 0) {
    lanState.peers[existingIndex] = peer;
  } else {
    lanState.peers.push(peer);
    console.log('📡 [LANMode] New peer discovered:', peer.name, peer.ip);
  }
  
  notifyPeerListeners();
}

/**
 * Remove a peer
 */
function removePeer(peerId: string): void {
  lanState.peers = lanState.peers.filter(p => p.id !== peerId);
  notifyPeerListeners();
}

/**
 * Clean up stale peers
 */
function cleanupStalePeers(): void {
  const now = Date.now();
  const staleThreshold = now - PEER_TIMEOUT;
  
  const before = lanState.peers.length;
  lanState.peers = lanState.peers.filter(p => p.lastSeen > staleThreshold);
  
  if (lanState.peers.length !== before) {
    console.log('📡 [LANMode] Cleaned up stale peers:', before - lanState.peers.length);
    notifyPeerListeners();
  }
}

/**
 * Notify peer listeners
 */
function notifyPeerListeners(): void {
  peerListeners.forEach(listener => {
    try {
      listener([...lanState.peers]);
    } catch (e) {
      console.error('[LANMode] Peer listener error:', e);
    }
  });
}

/**
 * Subscribe to peer changes
 */
export function onPeersChanged(callback: (peers: LocalPeer[]) => void): () => void {
  peerListeners.push(callback);
  return () => {
    peerListeners = peerListeners.filter(l => l !== callback);
  };
}

/**
 * Subscribe to local call state
 */
export function onLocalCallStateChanged(callback: (isLocal: boolean) => void): () => void {
  localCallListeners.push(callback);
  return () => {
    localCallListeners = localCallListeners.filter(l => l !== callback);
  };
}

/**
 * Get discovered peers
 */
export function getDiscoveredPeers(): LocalPeer[] {
  return [...lanState.peers];
}

/**
 * Check if a peer is on local network
 */
export function isPeerLocal(peerId: string): boolean {
  return lanState.peers.some(p => p.id === peerId);
}

/**
 * Get ICE configuration for local calls
 * No external servers needed!
 */
export function getLocalICEConfig(): RTCConfiguration {
  return {
    iceServers: [], // No STUN/TURN needed for local network
    iceCandidatePoolSize: 5
  };
}

/**
 * Check if we're in a local call
 */
export function isLocalNetworkCall(): boolean {
  return lanState.isLocalCall;
}

/**
 * Set local call state
 */
export function setLocalCallState(isLocal: boolean): void {
  if (lanState.isLocalCall !== isLocal) {
    lanState.isLocalCall = isLocal;
    console.log('📡 [LANMode] Local call state:', isLocal);
    
    localCallListeners.forEach(listener => {
      try {
        listener(isLocal);
      } catch (e) {
        console.error('[LANMode] Local call listener error:', e);
      }
    });
  }
}

/**
 * Send signal via local network (broadcast)
 */
export function sendLocalSignal(signal: any): void {
  if (!discoveryChannel) {
    console.warn('📡 [LANMode] No discovery channel available');
    return;
  }
  
  try {
    discoveryChannel.postMessage(signal);
    console.log('📡 [LANMode] Sent local signal:', signal.type);
  } catch (e) {
    console.error('📡 [LANMode] Failed to send signal:', e);
  }
}

// Signal handler (to be set by call manager)
let signalHandler: ((signal: any) => void) | null = null;

export function setLocalSignalHandler(handler: (signal: any) => void): void {
  signalHandler = handler;
}

function handleLocalSignal(signal: any): void {
  if (signalHandler) {
    signalHandler(signal);
  }
}

/**
 * Get LAN mode status for UI
 */
export function getLANModeStatus(): {
  enabled: boolean;
  peerCount: number;
  isLocalCall: boolean;
  localIP: string | null;
} {
  return {
    enabled: lanState.enabled,
    peerCount: lanState.peers.length,
    isLocalCall: lanState.isLocalCall,
    localIP: lanState.localIP
  };
}

/**
 * Get current user ID (from storage or generate)
 */
function getUserId(): string {
  let id = localStorage.getItem('chatr-lan-id');
  if (!id) {
    id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chatr-lan-id', id);
  }
  return id;
}

/**
 * Get current user name
 */
function getUserName(): string {
  // Try to get from profile or storage
  return localStorage.getItem('chatr-user-name') || 'Chatr User';
}

/**
 * Announce we're leaving the network
 */
export function announceLeave(): void {
  if (!discoveryChannel) return;
  
  try {
    discoveryChannel.postMessage({
      type: 'leave',
      id: getUserId()
    });
  } catch (e) {
    console.error('📡 [LANMode] Failed to announce leave:', e);
  }
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', announceLeave);
}
