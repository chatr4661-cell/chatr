import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { classifyNetwork, NetworkQuality, onNetworkChange } from "./networkClassification";
import { getCallPreset, getWebRTCConfig, getMediaConstraints, applyBitrateLimits, CallPreset } from "./indiaCallPresets";
import { createICEMonitor, ICEMonitorState } from "./iceConnectionMonitor";

type CallState = 'connecting' | 'connected' | 'failed' | 'ended';
type SignalType = 'offer' | 'answer' | 'ice-candidate' | 'video-request' | 'video-accept' | 'video-reject' | 'video-enable';

interface Signal {
  type: SignalType;
  data: any;
  from: string;
}

// Video upgrade callback type
export type VideoUpgradeCallback = (fromUserId: string) => void;

// GLOBAL: Prevent duplicate WebRTC instances for same call
const activeCallInstances = new Map<string, SimpleWebRTCCall>();
// CRITICAL: Prevent race conditions during instance creation
const creationLocks = new Set<string>();

// Get existing instance (TRUE singleton pattern)
export function getExistingCall(callId: string): SimpleWebRTCCall | undefined {
  return activeCallInstances.get(callId);
}

// Check if instance exists or is being created
export function hasActiveCall(callId: string): boolean {
  return activeCallInstances.has(callId) || creationLocks.has(callId);
}

// Clear existing instance for a call
export function clearCallInstance(callId: string): void {
  const existing = activeCallInstances.get(callId);
  if (existing) {
    existing.end();
  }
  activeCallInstances.delete(callId);
  creationLocks.delete(callId);
}

/**
 * SimpleWebRTCCall - Robust, Fast WebRTC Implementation
 * 
 * Key improvements:
 * - TRUE SINGLETON per call ID (factory pattern with creation lock)
 * - Faster ICE gathering with aggressive candidate pool
 * - Single offer per connection attempt (no spam)
 * - Proper answer timeout handling
 * - Graceful media fallback
 * - Clear state management
 */
export class SimpleWebRTCCall {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private signalChannel: RealtimeChannel | null = null;
  private callState: CallState = 'connecting';
  private eventHandlers: Map<string, Function[]> = new Map();
  private pendingIceCandidates: RTCIceCandidate[] = [];
  private hasReceivedAnswer: boolean = false;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private offerSent: boolean = false;
  private answerSent: boolean = false;
  private processedSignalIds: Set<string> = new Set();
  private started: boolean = false;
  private instanceId: string; // For debugging
  
  // India-first: Network-aware configuration
  private networkQuality: NetworkQuality = 'HOSTILE'; // Default to worst-case
  private callPreset: CallPreset | null = null;
  private iceMonitor: (ICEMonitorState & { cleanup: () => void }) | null = null;
  private networkChangeCleanup: (() => void) | null = null;

  // Factory method - use this instead of constructor
  static create(
    callId: string,
    partnerId: string,
    isVideo: boolean,
    isInitiator: boolean,
    userId: string,
    initialLocalStream: MediaStream | null = null
  ): SimpleWebRTCCall {
    // STRICT SINGLETON CHECK 1: Return existing instance
    const existing = activeCallInstances.get(callId);
    if (existing) {
      console.log('⚠️ [WebRTC] Returning existing instance for call:', callId.slice(0, 8));
      return existing;
    }
    
    // STRICT SINGLETON CHECK 2: Block if creation in progress
    if (creationLocks.has(callId)) {
      console.log('🔒 [WebRTC] Creation in progress, waiting for existing instance:', callId.slice(0, 8));
      // Return existing if it appeared during the lock
      const waitingInstance = activeCallInstances.get(callId);
      if (waitingInstance) return waitingInstance;
      // This shouldn't happen, but create anyway with warning
      console.warn('⚠️ [WebRTC] Lock exists but no instance - creating anyway');
    }
    
    // Acquire creation lock BEFORE creating instance
    creationLocks.add(callId);
    console.log('🔐 [WebRTC] Acquired creation lock for:', callId.slice(0, 8));
    
    const instance = new SimpleWebRTCCall(callId, partnerId, isVideo, isInitiator, userId, initialLocalStream);
    activeCallInstances.set(callId, instance);
    
    // Release lock (instance is now in map)
    creationLocks.delete(callId);
    
    return instance;
  }

  private constructor(
    private callId: string,
    private partnerId: string,
    private isVideo: boolean,
    private isInitiator: boolean,
    private userId: string,
    initialLocalStream: MediaStream | null = null
  ) {
    // Generate unique instance ID for debugging duplicate detection
    this.instanceId = `${callId.slice(0, 8)}-${Date.now().toString(36)}`;
    
    if (initialLocalStream) {
      this.localStream = initialLocalStream;
      console.log('🎤 [WebRTC] Using pre-acquired media stream');
    }
    console.log(`🎬 [WebRTC] Init [${this.instanceId}]:`, { isVideo, isInitiator, userId: userId.slice(0, 8) });
    
    // India-first: Classify network immediately
    this.networkQuality = classifyNetwork();
    this.callPreset = getCallPreset(this.networkQuality, isVideo);
    console.log(`🇮🇳 [WebRTC] India-first preset: ${this.callPreset.name} (network: ${this.networkQuality})`);
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  private emit(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  }

  async start() {
    // Prevent double-start
    if (this.started || this.pc) {
      console.log('⚠️ [WebRTC] Already started, skipping');
      return;
    }
    this.started = true;
    const startTime = Date.now();
    
    try {
      console.log('🚀 [WebRTC] FAST START - targeting <2s connection...');
      
      // PARALLEL: Create peer connection and subscribe to signals simultaneously
      // This saves ~200-300ms by not waiting sequentially
      const [_, __] = await Promise.all([
        this.createPeerConnection(),
        this.subscribeToSignals()
      ]);

      // Get media (may already be provided)
      if (!this.localStream) {
        await this.acquireMedia();
      } else {
        this.emit('localStream', this.localStream);
      }

      // Add tracks to peer connection
      if (this.localStream && this.pc) {
        this.localStream.getTracks().forEach(track => {
          console.log('➕ [WebRTC] Adding track:', track.kind);
          this.pc!.addTrack(track, this.localStream!);
        });
      }

      // Fetch past signals (for late joiners)
      await this.fetchPastSignals();

      // Create offer IMMEDIATELY (no delay - receiver subscription is already active)
      if (this.isInitiator && !this.offerSent) {
        await this.createAndSendOffer();
      }

      // Set connection timeout
      this.startConnectionTimeout();

      console.log(`✅ [WebRTC] Setup complete in ${Date.now() - startTime}ms`);
    } catch (error: any) {
      console.error('❌ [WebRTC] Setup failed:', error);
      this.callState = 'failed';
      this.emit('failed', error);
    }
  }

  private async acquireMedia() {
    try {
      // Release existing streams first
      if (this.localStream) {
        this.localStream.getTracks().forEach(t => t.stop());
        this.localStream = null;
        await this.delay(100);
      }

      // ULTRA HD VIDEO & CRYSTAL CLEAR AUDIO - Maximum Quality for FaceTime-level calls
      const constraints: MediaStreamConstraints = {
        audio: {
          // Studio-quality audio settings
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,         // CD-quality sample rate
          sampleSize: 16,            // 16-bit audio
          channelCount: 1,           // Mono for calls (less bandwidth, clear voice)
        },
        video: this.isVideo ? {
          // 4K Ultra HD Video - Best quality first
          width: { ideal: 3840, min: 1280 },
          height: { ideal: 2160, min: 720 },
          frameRate: { ideal: 60, min: 30 },
          facingMode: 'user',
          aspectRatio: { ideal: 16/9 },
        } : false
      };

      console.log('🎬 [WebRTC] Requesting ULTRA HD media (4K@60fps)...');
      const startTime = Date.now();
      
      try {
        // Try 4K first
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          console.log(`✅ [WebRTC] Video acquired: ${settings.width}x${settings.height}@${settings.frameRate}fps in ${Date.now() - startTime}ms`);
        }
      } catch (uhd4kError) {
        // Fallback to 1080p@60fps
        console.log('⚠️ [WebRTC] 4K failed, trying 1080p@60fps...');
        try {
          const fhd60Constraints: MediaStreamConstraints = {
            audio: constraints.audio,
            video: this.isVideo ? {
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
              frameRate: { ideal: 60, min: 30 },
              facingMode: 'user',
              aspectRatio: { ideal: 16/9 },
            } : false
          };
          this.localStream = await navigator.mediaDevices.getUserMedia(fhd60Constraints);
          console.log(`✅ [WebRTC] 1080p@60fps acquired in ${Date.now() - startTime}ms`);
        } catch (fhd60Error) {
          // Fallback to 1080p@30fps
          console.log('⚠️ [WebRTC] 1080p@60fps failed, trying 1080p@30fps...');
          try {
            const fhd30Constraints: MediaStreamConstraints = {
              audio: constraints.audio,
              video: this.isVideo ? {
                width: { ideal: 1920, min: 1280 },
                height: { ideal: 1080, min: 720 },
                frameRate: { ideal: 30 },
                facingMode: 'user',
              } : false
            };
            this.localStream = await navigator.mediaDevices.getUserMedia(fhd30Constraints);
            console.log(`✅ [WebRTC] 1080p@30fps acquired in ${Date.now() - startTime}ms`);
          } catch (fhd30Error) {
            // Final fallback to 720p
            console.log('⚠️ [WebRTC] 1080p failed, trying 720p...');
            const hdConstraints: MediaStreamConstraints = {
              audio: constraints.audio,
              video: this.isVideo ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
                facingMode: 'user',
              } : false
            };
            this.localStream = await navigator.mediaDevices.getUserMedia(hdConstraints);
            console.log(`✅ [WebRTC] 720p acquired in ${Date.now() - startTime}ms`);
          }
        }
      }
      
      this.emit('localStream', this.localStream);
    } catch (error: any) {
      console.error('❌ [WebRTC] Media failed:', error.name, error.message);
      
      // Try audio-only fallback for video calls
      if (this.isVideo && error.name !== 'NotAllowedError') {
        try {
          console.log('⚠️ [WebRTC] Trying audio-only fallback...');
          this.localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false 
          });
          this.emit('localStream', this.localStream);
          return;
        } catch (fallbackError) {
          console.error('❌ [WebRTC] Audio fallback failed:', fallbackError);
        }
      }
      
      throw error;
    }
  }

  private async createPeerConnection() {
    // Detect Android WebView
    const isAndroid = typeof navigator !== 'undefined' && 
      /Android/i.test(navigator.userAgent);
    
    // ULTRA-FAST: Minimal ICE config for <2s connections
    const config: RTCConfiguration = {
      iceServers: [
        // STUN only - fastest for direct P2P (works 80%+ of the time)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Single TURN for NAT traversal fallback
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: 2, // Minimal pre-gathering
    };

    console.log(`🔧 [WebRTC] Creating FAST peer connection (Android: ${isAndroid})`);
    this.pc = new RTCPeerConnection(config);
    
    // ANDROID FIX: Force VP8 codec for better Android WebView compatibility
    if (isAndroid && this.isVideo) {
      this.forceVP8Codec();
    }

    // Handle remote tracks - CRITICAL for bidirectional video
    this.pc.ontrack = (event) => {
      const track = event.track;
      const [remoteStream] = event.streams;
      console.log(`📺 [WebRTC] Remote track received: ${track.kind}, id: ${track.id.slice(0,8)}, stream tracks: ${remoteStream.getTracks().length}`);
      
      // Emit stream for EVERY track to ensure UI updates for both audio AND video
      this.emit('remoteStream', remoteStream);
      
      // Log track details for debugging bidirectional video
      if (track.kind === 'video') {
        console.log(`📹 [WebRTC] VIDEO track settings:`, track.getSettings());
      }
    };

    // Handle ICE candidates - CRITICAL for connection establishment
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidateType = event.candidate.type || 'unknown';
        console.log(`🧊 [WebRTC] ICE candidate: ${candidateType} (${event.candidate.protocol || 'udp'})`);
        this.sendSignal({ type: 'ice-candidate', data: event.candidate.toJSON(), from: this.userId });
      } else {
        console.log('✅ [WebRTC] ICE gathering complete');
      }
    };

    // Track ICE gathering state for debugging
    this.pc.onicegatheringstatechange = () => {
      console.log(`🧊 [WebRTC] ICE gathering state: ${this.pc?.iceGatheringState}`);
    };

    // Connection state changes
    this.pc.onconnectionstatechange = () => {
      const state = this.pc!.connectionState;
      console.log('🔌 [WebRTC] Connection state:', state);
      
      if (state === 'connected') {
        this.handleConnected();
      } else if (state === 'failed') {
        this.handleConnectionFailed();
      } else if (state === 'closed') {
        if (this.callState === 'connected') {
          this.emit('ended');
        }
      }
    };

    // India-first: Use ICE monitor with extended tolerance
    const toleranceMs = this.callPreset?.iceDisconnectToleranceMs || 8000;
    const maxAttempts = this.callPreset?.maxReconnectAttempts || 3;
    
    this.iceMonitor = createICEMonitor(this.pc, {
      disconnectToleranceMs: toleranceMs,
      maxReconnectAttempts: maxAttempts,
      onRecoveryStart: () => {
        this.emit('recoveryStatus', { message: 'Reconnecting...' });
      },
      onRecoverySuccess: () => {
        console.log('✅ [WebRTC] Recovery successful');
        this.emit('recoveryStatus', { message: null });
      },
      onRecoveryFailed: () => {
        console.log('❌ [WebRTC] Recovery failed after max attempts');
        this.handleConnectionFailed();
      },
      onQualityChange: (quality) => {
        this.emit('networkQuality', quality);
      }
    });

    // ICE connection state (backup handler)
    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc!.iceConnectionState;
      console.log('❄️ [WebRTC] ICE state:', state);
      
      if (state === 'connected' || state === 'completed') {
        this.handleConnected();
      } else if (state === 'failed') {
        this.handleConnectionFailed();
      }
      // Note: 'disconnected' is now handled by ICE monitor with tolerance
    };

    console.log(`✅ [WebRTC] Peer connection created with ${toleranceMs}ms disconnect tolerance`);
  }

  private handleConnected() {
    if (this.callState === 'connected') return;
    
    console.log(`🎉 [WebRTC] CONNECTED! [${this.instanceId}]`);
    this.callState = 'connected';
    this.clearConnectionTimeout();
    this.emit('connected');
    this.emit('networkQuality', 'good');
    
    // CRITICAL: Update call status to 'active' in database
    // This ensures UI and native shells know the call is truly connected
    this.updateCallToActive();
    
    // ULTRA HD: Apply maximum bitrate for video calls
    if (this.pc && this.isVideo) {
      this.applyMaximumVideoBitrate();
    }
    
    // India-first: Apply bitrate limits based on preset (only for hostile networks)
    if (this.pc && this.callPreset && this.networkQuality === 'HOSTILE') {
      applyBitrateLimits(this.pc, this.callPreset).then(() => {
        console.log(`🇮🇳 [WebRTC] Applied ${this.callPreset?.name} bitrate limits`);
      }).catch(e => {
        console.warn('⚠️ [WebRTC] Failed to apply bitrate limits:', e);
      });
    }
  }
  
  /**
   * Apply maximum video bitrate for crystal-clear quality
   * Target: 8-15 Mbps for 1080p@60fps or 4K
   */
  private async applyMaximumVideoBitrate() {
    if (!this.pc) return;
    
    try {
      const videoSender = this.pc.getSenders().find(s => s.track?.kind === 'video');
      if (!videoSender) return;
      
      const params = videoSender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      
      // Set maximum bitrate: 15 Mbps for ultra quality
      params.encodings[0].maxBitrate = 15_000_000; // 15 Mbps
      params.encodings[0].maxFramerate = 60;
      // @ts-ignore - Priority hint for browsers that support it
      params.encodings[0].priority = 'high';
      // @ts-ignore - Network priority
      params.encodings[0].networkPriority = 'high';
      
      await videoSender.setParameters(params);
      console.log('🎬 [WebRTC] Applied ULTRA HD bitrate: 15 Mbps @ 60fps');
    } catch (e) {
      console.warn('⚠️ [WebRTC] Could not apply max bitrate:', e);
    }
  }
  
  private async updateCallToActive() {
    try {
      const { error } = await supabase
        .from('calls')
        .update({ 
          status: 'active', 
          webrtc_state: 'connected',
          started_at: new Date().toISOString()
        })
        .eq('id', this.callId);
      
      if (error) {
        console.warn('⚠️ [WebRTC] Failed to update call to active:', error);
      } else {
        console.log('✅ [WebRTC] Call status updated to active');
      }
    } catch (e) {
      console.warn('⚠️ [WebRTC] Error updating call status:', e);
    }
  }

  private handleConnectionFailed() {
    if (this.callState === 'ended') return;
    
    console.warn('⚠️ [WebRTC] Connection failed - attempting recovery...');
    
    // Try ICE restart if we have remote description
    if (this.pc?.remoteDescription && this.isInitiator) {
      this.attemptIceRestart();
    } else {
      this.emit('recoveryStatus', { message: 'Reconnecting...' });
    }
  }

  private async attemptIceRestart() {
    if (!this.pc || this.callState === 'ended') return;
    
    try {
      console.log('🔄 [WebRTC] ICE restart...');
      const offer = await this.pc.createOffer({ iceRestart: true });
      await this.pc.setLocalDescription(offer);
      await this.sendSignal({ type: 'offer', data: offer, from: this.userId });
    } catch (e) {
      console.error('❌ [WebRTC] ICE restart failed:', e);
    }
  }

  /**
   * India-first: Handle network quality changes during call
   */
  private handleNetworkChange(newQuality: NetworkQuality) {
    const oldQuality = this.networkQuality;
    this.networkQuality = newQuality;
    
    // Only adapt if quality degraded
    if (newQuality === 'HOSTILE' && oldQuality !== 'HOSTILE') {
      console.log('📶 [WebRTC] Network degraded to HOSTILE - reducing quality');
      this.emit('networkQuality', 'poor');
      
      // Apply bitrate limits if connected
      if (this.pc && this.callState === 'connected' && this.callPreset) {
        const survivalPreset = getCallPreset('HOSTILE', false);
        applyBitrateLimits(this.pc, survivalPreset).catch(e => 
          console.warn('⚠️ [WebRTC] Failed to apply bitrate limits:', e)
        );
      }
    } else if (newQuality === 'GOOD' && oldQuality !== 'GOOD') {
      console.log('📶 [WebRTC] Network improved to GOOD');
      this.emit('networkQuality', 'excellent');
    }
  }

  /**
   * Force VP8 codec for Android WebView compatibility
   * VP9 can cause frozen video on some Android devices
   */
  private forceVP8Codec() {
    if (!this.pc) return;
    
    const transceivers = this.pc.getTransceivers();
    transceivers.forEach(transceiver => {
      if (transceiver.sender.track?.kind === 'video' || transceiver.receiver.track?.kind === 'video') {
        const codecs = RTCRtpReceiver.getCapabilities?.('video')?.codecs || [];
        
        // Prioritize VP8 over VP9 for Android compatibility
        const vp8Codecs = codecs.filter(c => c.mimeType.toLowerCase().includes('vp8'));
        const h264Codecs = codecs.filter(c => c.mimeType.toLowerCase().includes('h264'));
        const otherCodecs = codecs.filter(c => 
          !c.mimeType.toLowerCase().includes('vp8') && 
          !c.mimeType.toLowerCase().includes('h264') &&
          !c.mimeType.toLowerCase().includes('vp9')
        );
        const vp9Codecs = codecs.filter(c => c.mimeType.toLowerCase().includes('vp9'));
        
        // Order: VP8 (most compatible) -> H264 -> VP9 (can cause issues)
        const orderedCodecs = [...vp8Codecs, ...h264Codecs, ...otherCodecs, ...vp9Codecs];
        
        if (orderedCodecs.length > 0 && transceiver.setCodecPreferences) {
          try {
            transceiver.setCodecPreferences(orderedCodecs);
            console.log('🎬 [WebRTC] Forced VP8 codec priority for Android');
          } catch (e) {
            console.warn('⚠️ [WebRTC] Could not set codec preferences:', e);
          }
        }
      }
    });
  }

  private async fetchPastSignals() {
    console.log('📥 [WebRTC] Fetching past signals...');
    
    try {
      const { data: signals } = await supabase
        .from('webrtc_signals')
        .select('*')
        .eq('call_id', this.callId)
        .eq('to_user', this.userId)
        .order('created_at', { ascending: false }); // Get NEWEST first

      if (signals?.length) {
        console.log(`📥 [WebRTC] Found ${signals.length} past signals`);
        
        // Mark all as processed to prevent duplicates
        signals.forEach(s => this.processedSignalIds.add(s.id));
        
        if (!this.isInitiator) {
          // RECEIVER: Process ONLY the LATEST offer
          const latestOffer = signals.find(s => s.signal_type === 'offer');
          if (latestOffer) {
            console.log(`📥 [WebRTC] Processing LATEST offer from ${latestOffer.from_user.slice(0, 8)}`);
            await this.handleSignal({ type: 'offer', data: latestOffer.signal_data, from: latestOffer.from_user });
          }
        } else {
          // INITIATOR: Check if receiver already sent an answer
          const latestAnswer = signals.find(s => s.signal_type === 'answer');
          if (latestAnswer) {
            console.log(`📥 [WebRTC] Found answer from ${latestAnswer.from_user.slice(0, 8)}`);
            await this.handleSignal({ type: 'answer', data: latestAnswer.signal_data, from: latestAnswer.from_user });
          }
        }
        
        // Process ICE candidates for both roles (in ascending order for proper sequencing)
        const candidates = signals
          .filter(s => s.signal_type === 'ice-candidate')
          .reverse(); // Reverse to process oldest first
          
        for (const c of candidates) {
          await this.handleSignal({ type: 'ice-candidate', data: c.signal_data, from: c.from_user });
        }
      }
    } catch (error) {
      console.error('❌ [WebRTC] Failed to fetch past signals:', error);
    }
  }

  private async subscribeToSignals() {
    console.log('📡 [WebRTC] Subscribing to signals...');
    
    this.signalChannel = supabase
      .channel(`webrtc-${this.callId}-${this.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `call_id=eq.${this.callId}`
        },
        (payload) => {
          const signal = payload.new as any;
          if (signal.to_user === this.userId) {
            // DEDUPE: Skip already processed signals
            if (this.processedSignalIds.has(signal.id)) {
              console.log('⏭️ [WebRTC] Skipping duplicate signal:', signal.id.slice(0, 8));
              return;
            }
            this.processedSignalIds.add(signal.id);
            
            console.log('📥 [WebRTC] Signal received:', signal.signal_type);
            this.handleSignal({
              type: signal.signal_type,
              data: signal.signal_data,
              from: signal.from_user
            });
          }
        }
      )
      .subscribe();
  }

  private async handleSignal(signal: Signal) {
    if (!this.pc) {
      console.error('❌ [WebRTC] No peer connection');
      return;
    }

    try {
      switch (signal.type) {
        case 'offer':
          // For initial offers: initiators ignore (they send offers)
          // For renegotiation: ALLOW if call is already connected (e.g., adding video)
          const isRenegotiation = this.callState === 'connected';
          
          if (this.isInitiator && !isRenegotiation) {
            console.log('⏭️ [WebRTC] Ignoring initial offer (I am initiator)');
            return;
          }
          
          console.log(`📥 [WebRTC] Processing ${isRenegotiation ? 'RENEGOTIATION' : 'INITIAL'} OFFER...`);
          await this.pc.setRemoteDescription(new RTCSessionDescription(signal.data));

          // FaceTime-style auto video upgrade:
          // If partner renegotiates specifically for video upgrade, auto-enable OUR camera too
          const upgradeReason = (signal.data as any)?.__chatr?.reason;
          if (isRenegotiation && upgradeReason === 'video-upgrade') {
            try {
              const hasLocalVideo = (this.localStream?.getVideoTracks()?.length || 0) > 0;
              if (!hasLocalVideo) {
                console.log('📹 [WebRTC] Auto-enabling local video for bidirectional upgrade...');
                // No renegotiation here; we are responding with an answer.
                await this.enableLocalVideoAfterAccept();
              }
            } catch (e) {
              console.warn('⚠️ [WebRTC] Could not auto-enable local video:', e);
            }
          }
          
          // Always send answer for offers (including renegotiation)
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          await this.sendSignal({ type: 'answer', data: answer, from: this.userId });
          console.log('✅ [WebRTC] ANSWER sent');
          this.answerSent = true;
          
          // Process queued ICE candidates
          await this.flushPendingCandidates();
          
          // Emit event so UI knows video was added
          if (isRenegotiation) {
            this.emit('renegotiationComplete');
          }
          break;

        case 'answer':
          // Process answers for this side
          // During renegotiation, both sides can receive answers
          if (!this.offerSent && !this.hasReceivedAnswer) {
            console.log('⏭️ [WebRTC] Ignoring unsolicited answer');
            return;
          }
          
          console.log('📥 [WebRTC] Processing ANSWER...');
          this.hasReceivedAnswer = true;
          await this.pc.setRemoteDescription(new RTCSessionDescription(signal.data));
          console.log('✅ [WebRTC] ANSWER processed');
          
          // Process queued ICE candidates
          await this.flushPendingCandidates();
          break;

        case 'ice-candidate':
          if (this.pc.remoteDescription) {
            await this.pc.addIceCandidate(new RTCIceCandidate(signal.data));
          } else {
            this.pendingIceCandidates.push(new RTCIceCandidate(signal.data));
          }
          break;
          
        case 'video-request':
          console.log('📹 [WebRTC] Video upgrade request received');
          this.emit('videoUpgradeRequest', signal.from);
          break;
          
        case 'video-accept':
          console.log('📹 [WebRTC] Video upgrade accepted by partner');
          this.emit('videoUpgradeAccepted', signal.from);
          break;
          
        case 'video-reject':
          console.log('📹 [WebRTC] Video upgrade rejected by partner');
          this.emit('videoUpgradeRejected', signal.from);
          break;

        case 'video-enable':
          console.log('📹 [WebRTC] Video enable requested by partner');
          this.emit('videoEnableRequested', signal.from);
          break;
      }
    } catch (error) {
      console.error(`❌ [WebRTC] Signal error (${signal.type}):`, error);
    }
  }

  private async flushPendingCandidates() {
    if (this.pendingIceCandidates.length === 0) return;
    
    console.log(`📥 [WebRTC] Flushing ${this.pendingIceCandidates.length} queued candidates`);
    for (const candidate of this.pendingIceCandidates) {
      try {
        await this.pc?.addIceCandidate(candidate);
      } catch (e) {
        console.warn('⚠️ [WebRTC] Failed to add queued candidate:', e);
      }
    }
    this.pendingIceCandidates = [];
  }

  private async createAndSendOffer() {
    if (!this.pc || this.offerSent) return;

    try {
      console.log('📤 [WebRTC] Creating offer...');
      this.offerSent = true;
      
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await this.sendSignal({ type: 'offer', data: offer, from: this.userId });
      console.log('✅ [WebRTC] Offer sent');
    } catch (error) {
      console.error('❌ [WebRTC] Failed to create offer:', error);
      this.offerSent = false;
      throw error;
    }
  }

  private async sendSignal(signal: Signal) {
    const startTime = Date.now();
    try {
      // FAST: Don't wait for select - fire and forget for speed
      const { error } = await supabase.from('webrtc_signals').insert({
        call_id: this.callId,
        signal_type: signal.type,
        signal_data: signal.data,
        from_user: this.userId,
        to_user: this.partnerId
      });
      
      if (error) {
        console.error(`❌ [WebRTC] Signal send failed (${signal.type}):`, error.message);
        throw error;
      }
      
      console.log(`📤 [WebRTC] Signal sent: ${signal.type} (${Date.now() - startTime}ms)`);
    } catch (error: any) {
      console.error(`❌ [WebRTC] Failed to send ${signal.type}:`, error?.message || error);
    }
  }

  private startConnectionTimeout() {
    // 15 seconds for initial connection (fast failure feedback)
    this.connectionTimeout = setTimeout(() => {
      if (this.callState === 'connecting') {
        console.warn('⏰ [WebRTC] Connection timeout after 15s');
        
        if (!this.hasReceivedAnswer && this.isInitiator) {
          // No answer received - partner may not have answered yet
          console.log('⏳ [WebRTC] No answer yet, waiting...');
          this.emit('recoveryStatus', { message: 'Waiting for answer...' });
          // Extend timeout for another 15s
          this.connectionTimeout = setTimeout(() => {
            if (this.callState === 'connecting') {
              console.error('❌ [WebRTC] Connection failed - no answer');
              this.callState = 'failed';
              this.emit('failed', new Error('No answer received'));
            }
          }, 15000);
        } else {
          // Have answer but still not connected - ICE issue
          console.log('🔄 [WebRTC] ICE stalled, restarting...');
          this.emit('recoveryStatus', { message: 'Reconnecting...' });
          this.pc?.restartIce();
          // Give 10 more seconds after restart
          this.connectionTimeout = setTimeout(() => {
            if (this.callState === 'connecting') {
              console.error('❌ [WebRTC] Connection failed after ICE restart');
              this.callState = 'failed';
              this.emit('failed', new Error('ICE connection failed'));
            }
          }, 10000);
        }
      }
    }, 15000);
  }

  private clearConnectionTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  toggleAudio(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach(track => {
      track.enabled = enabled;
    });
  }

  toggleVideo(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach(track => {
      track.enabled = enabled;
    });
  }

  // ============== VIDEO UPGRADE (FACE TIME AUTO) ==============
  
  /**
   * Ask partner to auto-enable video (no consent modal)
   * Used when the non-initiator clicks video; initiator will renegotiate.
   */
  async sendVideoEnable(): Promise<void> {
    console.log('📹 [WebRTC] Sending video enable signal...');
    await this.sendSignal({
      type: 'video-enable',
      data: { timestamp: Date.now() },
      from: this.userId,
    });
  }

  // ==============================================================
  /**
   * Accept video upgrade request and enable local video
   * The ACCEPTOR is the one who triggers renegotiation to prevent glare
   */
  async acceptVideoUpgrade(): Promise<MediaStream | null> {
    console.log('📹 [WebRTC] Accepting video upgrade - I will trigger renegotiation...');
    
    // First enable our own video and trigger renegotiation
    const stream = await this.addVideoToCall();
    
    // THEN notify partner we accepted (they will just add local video without renegotiating)
    await this.sendSignal({ 
      type: 'video-accept', 
      data: { timestamp: Date.now() }, 
      from: this.userId 
    });
    
    return stream;
  }

  /**
   * Enable local video for the requester AFTER partner accepted
   * Does NOT trigger renegotiation - just adds local video track
   * The acceptor's renegotiation will handle adding our track to their view
   */
  async enableLocalVideoAfterAccept(): Promise<MediaStream | null> {
    if (!this.pc) {
      console.error('❌ [WebRTC] No peer connection for video');
      return null;
    }

    try {
      console.log('📹 [WebRTC] Enabling local video (no renegotiation - acceptor handles it)...');
      
      // Request video
      let videoStream: MediaStream;
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280, max: 1920 }, 
            height: { ideal: 720, max: 1080 }, 
            frameRate: { ideal: 30 },
            facingMode: 'user',
          }
        });
        console.log('✅ [WebRTC] Video acquired for requester');
      } catch (e: any) {
        console.log('⚠️ [WebRTC] HD failed, using basic video...');
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      const videoTrack = videoStream.getVideoTracks()[0];
      if (!videoTrack) {
        console.error('❌ [WebRTC] No video track obtained');
        return null;
      }
      
      console.log('📹 [WebRTC] Got video track:', videoTrack.label);
      
      // Check if we already have a video sender from the current peer connection
      const existingVideoSender = this.pc.getSenders().find(s => s.track?.kind === 'video');
      
      if (existingVideoSender) {
        // Just replace the track - no renegotiation from this helper
        await existingVideoSender.replaceTrack(videoTrack);
        console.log('📹 [WebRTC] Replaced video sender track (no renegotiation)');
      } else {
        // Add track; the current/next offer-answer will carry it
        console.log('📹 [WebRTC] No existing sender - adding video track (no renegotiation)');
        const stream = this.localStream || new MediaStream([videoTrack]);
        this.pc.addTrack(videoTrack, stream);
      }
      
      // Update local stream for UI
      if (this.localStream) {
        const oldVideoTrack = this.localStream.getVideoTracks()[0];
        if (oldVideoTrack && oldVideoTrack !== videoTrack) {
          this.localStream.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        if (!this.localStream.getVideoTracks().includes(videoTrack)) {
          this.localStream.addTrack(videoTrack);
        }
      } else {
        this.localStream = videoStream;
      }
      
      this.emit('localStream', this.localStream);
      return this.localStream;
    } catch (error) {
      console.error('❌ [WebRTC] Failed to enable local video:', error);
      return null;
    }
  }

  /**
   * Reject video upgrade request
   */
  async rejectVideoUpgrade(): Promise<void> {
    console.log('📹 [WebRTC] Rejecting video upgrade...');
    await this.sendSignal({ 
      type: 'video-reject', 
      data: { timestamp: Date.now() }, 
      from: this.userId 
    });
  }
  
  // ==============================================================

  async addVideoToCall(): Promise<MediaStream | null> {
    if (!this.pc) {
      console.error('❌ [WebRTC] No peer connection for video');
      return null;
    }

    try {
      console.log('📹 [WebRTC] Adding HD video to call (FaceTime-style)...');
      
      // Request HD video with progressive fallback
      let videoStream: MediaStream;
      try {
        // Try 1080p HD first
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1920, min: 1280, max: 1920 }, 
            height: { ideal: 1080, min: 720, max: 1080 }, 
            frameRate: { ideal: 30, min: 24, max: 60 },
            facingMode: 'user',
            aspectRatio: { ideal: 16/9 },
          }
        });
        console.log('✅ [WebRTC] 1080p HD video acquired');
      } catch (hdError: any) {
        console.log('⚠️ [WebRTC] 1080p failed, trying 720p...');
        try {
          // Fallback to 720p
          videoStream = await navigator.mediaDevices.getUserMedia({
            video: { 
              width: { ideal: 1280, max: 1280 }, 
              height: { ideal: 720, max: 720 }, 
              frameRate: { ideal: 30 },
              facingMode: 'user' 
            }
          });
          console.log('✅ [WebRTC] 720p video acquired');
        } catch (sdError: any) {
          console.log('⚠️ [WebRTC] 720p failed, using basic video...');
          videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      const videoTrack = videoStream.getVideoTracks()[0];
      if (!videoTrack) {
        console.error('❌ [WebRTC] No video track obtained');
        return null;
      }
      
      console.log('📹 [WebRTC] Got video track:', videoTrack.label);
      
      // Check if we already have a video sender
      const existingVideoSender = this.pc.getSenders().find(s => s.track?.kind === 'video');
      
      if (existingVideoSender) {
        await existingVideoSender.replaceTrack(videoTrack);
        console.log('📹 [WebRTC] Replaced existing video track');
      } else {
        // Add new video track to connection
        const stream = this.localStream || new MediaStream([videoTrack]);
        this.pc.addTrack(videoTrack, stream);
        console.log('📹 [WebRTC] Added new video track to peer connection');
      }
      
      // Update local stream for UI
      if (this.localStream) {
        const oldVideoTrack = this.localStream.getVideoTracks()[0];
        if (oldVideoTrack) {
          this.localStream.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        this.localStream.addTrack(videoTrack);
      } else {
        this.localStream = videoStream;
      }
      
      this.emit('localStream', this.localStream);

      // Renegotiate to inform partner (tagged so receiver can auto-enable their camera too)
      this.hasReceivedAnswer = false;
      this.offerSent = false;
      
      const offer = await this.pc.createOffer();
      (offer as any).__chatr = { reason: 'video-upgrade' };
      await this.pc.setLocalDescription(offer);
      await this.sendSignal({ type: 'offer', data: offer, from: this.userId });
      console.log('📤 [WebRTC] Sent renegotiation offer with video');

      return this.localStream;
    } catch (error) {
      console.error('❌ [WebRTC] Failed to add video:', error);
      return null;
    }
  }

  sendDTMF(digit: string) {
    const sender = this.pc?.getSenders().find(s => s.track?.kind === 'audio');
    if (sender?.dtmf) {
      sender.dtmf.insertDTMF(digit, 100, 70);
    }
  }

  async switchCamera(): Promise<'user' | 'environment'> {
    const videoTrack = this.localStream?.getVideoTracks()[0];
    if (!videoTrack) throw new Error('No video track');

    // Get current facing mode - check settings first, then constraints
    const settings = videoTrack.getSettings?.();
    const constraints = videoTrack.getConstraints?.();
    const currentFacing = settings?.facingMode || (constraints?.facingMode as string) || 'user';
    const newFacing = currentFacing === 'user' ? 'environment' : 'user';
    
    console.log(`📷 [WebRTC] Switching camera: ${currentFacing} → ${newFacing}`);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { exact: newFacing }, 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        }
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Replace track in peer connection
      await this.replaceTrack(newVideoTrack);

      // Stop old track AFTER successful replacement
      videoTrack.stop();
      
      // Emit localStream again so UI updates the video element
      if (this.localStream) {
        this.emit('localStream', this.localStream);
      }

      console.log(`✅ [WebRTC] Camera switched to ${newFacing}`);
      return newFacing;
    } catch (e: any) {
      console.error('❌ [WebRTC] Switch camera failed:', e);
      // If exact fails, try without exact
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacing, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        const fallbackTrack = fallbackStream.getVideoTracks()[0];
        await this.replaceTrack(fallbackTrack);
        videoTrack.stop();
        if (this.localStream) {
          this.emit('localStream', this.localStream);
        }
        return newFacing;
      } catch (fallbackErr) {
        throw fallbackErr;
      }
    }
  }

  async replaceTrack(newTrack: MediaStreamTrack): Promise<void> {
    const sender = this.pc?.getSenders().find(s => s.track?.kind === newTrack.kind);
    if (sender) {
      await sender.replaceTrack(newTrack);
      
      // Update local stream
      if (this.localStream) {
        const oldTrack = this.localStream.getTracks().find(t => t.kind === newTrack.kind);
        if (oldTrack) {
          this.localStream.removeTrack(oldTrack);
        }
        this.localStream.addTrack(newTrack);
      }
    }
  }

  applyZoom(scale: number) {
    const videoTrack = this.localStream?.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const capabilities = videoTrack.getCapabilities?.() as any;
      if (capabilities?.zoom) {
        const constraints = { advanced: [{ zoom: scale } as any] };
        videoTrack.applyConstraints(constraints);
      }
    } catch (e) {
      console.warn('Zoom not supported on this device');
    }
  }

  /**
   * Get peer connection for external access (e.g., ultra-low bandwidth hooks)
   */
  getPeerConnection(): RTCPeerConnection | null {
    return this.pc;
  }

  async end() {
    console.log('👋 [WebRTC] Ending call...');
    this.callState = 'ended';
    this.clearConnectionTimeout();
    
    // Remove from active instances
    activeCallInstances.delete(this.callId);
    
    await this.cleanup();
    this.emit('ended');
  }

  private async cleanup() {
    // Stop local tracks
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;

    // Cleanup ICE monitor
    if (this.iceMonitor) {
      this.iceMonitor.cleanup();
      this.iceMonitor = null;
    }
    
    // Cleanup network change listener
    if (this.networkChangeCleanup) {
      this.networkChangeCleanup();
      this.networkChangeCleanup = null;
    }

    // Close peer connection
    if (this.pc) {
      this.pc.onconnectionstatechange = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.ontrack = null;
      this.pc.onicecandidate = null;
      this.pc.close();
      this.pc = null;
    }

    // Unsubscribe from signals
    if (this.signalChannel) {
      await supabase.removeChannel(this.signalChannel);
      this.signalChannel = null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
