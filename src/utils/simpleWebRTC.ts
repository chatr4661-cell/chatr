import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { classifyNetwork, NetworkQuality, onNetworkChange } from "./networkClassification";
import { getCallPreset, getWebRTCConfig, getMediaConstraints, applyBitrateLimits, CallPreset } from "./indiaCallPresets";
import { createICEMonitor, ICEMonitorState } from "./iceConnectionMonitor";

type CallState = 'connecting' | 'connected' | 'failed' | 'ended';
type SignalType = 'offer' | 'answer' | 'ice-candidate';

interface Signal {
  type: SignalType;
  data: any;
  from: string;
}

// GLOBAL: Prevent duplicate WebRTC instances for same call
const activeCallInstances = new Map<string, SimpleWebRTCCall>();

// Get existing instance (TRUE singleton pattern)
export function getExistingCall(callId: string): SimpleWebRTCCall | undefined {
  return activeCallInstances.get(callId);
}

// Clear existing instance for a call
export function clearCallInstance(callId: string): void {
  const existing = activeCallInstances.get(callId);
  if (existing) {
    existing.end();
  }
  activeCallInstances.delete(callId);
}

/**
 * SimpleWebRTCCall - Robust, Fast WebRTC Implementation
 * 
 * Key improvements:
 * - TRUE SINGLETON per call ID (factory pattern)
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
    // STRICT SINGLETON: Return existing instance
    const existing = activeCallInstances.get(callId);
    if (existing) {
      console.log('⚠️ [WebRTC] Returning existing instance for call:', callId.slice(0, 8));
      return existing;
    }
    
    const instance = new SimpleWebRTCCall(callId, partnerId, isVideo, isInitiator, userId, initialLocalStream);
    activeCallInstances.set(callId, instance);
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
    if (initialLocalStream) {
      this.localStream = initialLocalStream;
      console.log('🎤 [WebRTC] Using pre-acquired media stream');
    }
    console.log('🎬 [WebRTC] Init:', { callId: callId.slice(0, 8), isVideo, isInitiator, userId: userId.slice(0, 8) });
    
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
    
    try {
      console.log('🚀 [WebRTC] Starting with India-first optimizations...');
      
      // Step 0: Subscribe to network changes
      this.networkChangeCleanup = onNetworkChange((quality) => {
        console.log(`📶 [WebRTC] Network changed: ${this.networkQuality} → ${quality}`);
        this.handleNetworkChange(quality);
      });
      
      // Step 1: Get media using preset constraints
      if (!this.localStream) {
        await this.acquireMedia();
      } else {
        this.emit('localStream', this.localStream);
      }

      // Step 2: Create peer connection
      await this.createPeerConnection();

      // Step 3: Subscribe to signals
      await this.subscribeToSignals();

      // Step 4: Fetch past signals (offer for receiver, answer for initiator)
      await this.fetchPastSignals();

      // Step 5: Create offer (initiator only, ONCE)
      // FASTER: Reduced delay since subscription is async anyway
      if (this.isInitiator && !this.offerSent) {
        await this.delay(150); // Minimal delay for receiver setup
        await this.createAndSendOffer();
      }

      // Step 6: Set connection timeout (15 seconds for fast feedback)
      this.startConnectionTimeout();

      console.log('✅ [WebRTC] Setup complete');
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
        await this.delay(100); // Shorter delay
      }

      // FAST: Use simple, reliable constraints for quick media acquisition
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: this.isVideo ? {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
        } : false
      };

      console.log('🎤 [WebRTC] Requesting media...');
      const startTime = Date.now();
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log(`✅ [WebRTC] Media acquired in ${Date.now() - startTime}ms`);
      this.emit('localStream', this.localStream);
    } catch (error: any) {
      console.error('❌ [WebRTC] Media failed:', error.name, error.message);
      
      // Try audio-only fallback for video calls
      if (this.isVideo && error.name !== 'NotAllowedError') {
        try {
          console.log('⚠️ [WebRTC] Trying audio-only fallback...');
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
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
    // OPTIMIZED: Use fast, reliable ICE config for quick connections
    const config: RTCConfiguration = {
      iceServers: [
        // STUN first (fastest - direct P2P)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        // TURN as fallback (for NAT traversal)
        {
          urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: ['turn:a.relay.metered.ca:80', 'turn:a.relay.metered.ca:443'],
          username: 'e8dd65c92ae9a3b9bfcbeb6e',
          credential: 'uWdWNmkhvyqTW1QP'
        }
      ],
      iceTransportPolicy: 'all', // STUN first, TURN fallback (fast!)
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: 5, // Pre-gather candidates for speed
    };

    console.log('🔧 [WebRTC] Creating peer connection with optimized config');
    this.pc = new RTCPeerConnection(config);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        console.log('➕ [WebRTC] Adding track:', track.kind);
        this.pc!.addTrack(track, this.localStream!);
      });
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
    
    console.log('🎉 [WebRTC] CONNECTED!');
    this.callState = 'connected';
    this.clearConnectionTimeout();
    this.emit('connected');
    this.emit('networkQuality', 'good');
    
    // India-first: Apply bitrate limits based on preset
    if (this.pc && this.callPreset) {
      applyBitrateLimits(this.pc, this.callPreset).then(() => {
        console.log(`🇮🇳 [WebRTC] Applied ${this.callPreset?.name} bitrate limits`);
      }).catch(e => {
        console.warn('⚠️ [WebRTC] Failed to apply bitrate limits:', e);
      });
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
      const { error, data } = await supabase.from('webrtc_signals').insert({
        call_id: this.callId,
        signal_type: signal.type,
        signal_data: signal.data,
        from_user: this.userId,
        to_user: this.partnerId
      }).select('id').single();
      
      if (error) {
        console.error(`❌ [WebRTC] Signal send failed (${signal.type}):`, error.message);
        throw error;
      }
      
      console.log(`📤 [WebRTC] Signal sent: ${signal.type} (${Date.now() - startTime}ms) id: ${data?.id?.slice(0, 8)}`);
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

  async addVideoToCall(): Promise<MediaStream | null> {
    if (!this.pc) {
      console.error('❌ [WebRTC] No peer connection for video');
      return null;
    }

    try {
      console.log('📹 [WebRTC] Adding video to call (FaceTime-style)...');
      
      // Request video with error handling
      let videoStream: MediaStream;
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280, min: 640 }, 
            height: { ideal: 720, min: 480 }, 
            frameRate: { ideal: 30, min: 15 },
            facingMode: 'user' 
          }
        });
      } catch (mediaError: any) {
        console.error('❌ [WebRTC] Camera access failed:', mediaError);
        // Fallback to basic constraints
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
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

      // Renegotiate to inform partner
      this.hasReceivedAnswer = false;
      this.offerSent = false;
      
      const offer = await this.pc.createOffer();
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

    const constraints = videoTrack.getConstraints();
    const currentFacing = (constraints.facingMode as string) || 'user';
    const newFacing = currentFacing === 'user' ? 'environment' : 'user';

    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: newFacing, width: { ideal: 1280 }, height: { ideal: 720 } }
    });

    const newVideoTrack = newStream.getVideoTracks()[0];
    await this.replaceTrack(newVideoTrack);

    // Stop old track
    videoTrack.stop();

    return newFacing;
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
