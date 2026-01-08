import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
      console.log('🚀 [WebRTC] Starting...');
      
      // Step 1: Get media
      if (!this.localStream) {
        await this.acquireMedia();
      } else {
        this.emit('localStream', this.localStream);
      }

      // Step 2: Create peer connection
      await this.createPeerConnection();

      // Step 3: Subscribe to signals
      await this.subscribeToSignals();

      // Step 4: Fetch past signals
      // - Receiver fetches offer
      // - Initiator fetches answer (in case receiver replied faster)
      await this.fetchPastSignals();

      // Step 5: Create offer (initiator only, ONCE)
      // Add small delay to allow receiver to setup signaling subscription first
      if (this.isInitiator && !this.offerSent) {
        await this.delay(300); // Allow receiver to subscribe
        await this.createAndSendOffer();
      }

      // Step 6: Set connection timeout
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
        await this.delay(200);
      }

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      // HIGH QUALITY constraints like FaceTime/WhatsApp
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 2, // Stereo for quality
        } as MediaTrackConstraints,
        video: this.isVideo ? {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 60, min: 30 },
          facingMode: 'user',
          aspectRatio: { ideal: 16/9 }
        } : false
      };

      console.log('🎤 [WebRTC] Requesting media...');
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ [WebRTC] Media acquired');
      this.emit('localStream', this.localStream);
    } catch (error: any) {
      console.error('❌ [WebRTC] Media failed:', error);
      
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
    const iceServers: RTCIceServer[] = [
      // STUN servers for NAT traversal
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      
      // TURN servers for relay
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turns:openrelay.metered.ca:443'
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: [
          'turn:a.relay.metered.ca:80',
          'turn:a.relay.metered.ca:443',
        ],
        username: 'e8dd65c92ae9a3b9bfcbeb6e',
        credential: 'uWdWNmkhvyqTW1QP'
      }
    ];

    this.pc = new RTCPeerConnection({
      iceServers,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: 20,
    });

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

    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 [WebRTC] Sending ICE candidate');
        this.sendSignal({ type: 'ice-candidate', data: event.candidate, from: this.userId });
      }
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

    // ICE connection state
    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc!.iceConnectionState;
      console.log('❄️ [WebRTC] ICE state:', state);
      
      if (state === 'connected' || state === 'completed') {
        this.handleConnected();
      } else if (state === 'failed') {
        this.handleConnectionFailed();
      } else if (state === 'disconnected') {
        // Wait before restarting ICE - 'disconnected' is often transient
        console.log('⚠️ [WebRTC] ICE disconnected - waiting before restart...');
        this.emit('recoveryStatus', { message: 'Reconnecting...' });
        
        // Only restart if still disconnected after delay
        setTimeout(() => {
          if (this.pc?.iceConnectionState === 'disconnected' && this.callState !== 'ended') {
            console.log('🔄 [WebRTC] ICE still disconnected - restarting...');
            this.pc?.restartIce();
          }
        }, 3000);
      }
    };

    console.log('✅ [WebRTC] Peer connection created');
  }

  private handleConnected() {
    if (this.callState === 'connected') return;
    
    console.log('🎉 [WebRTC] CONNECTED!');
    this.callState = 'connected';
    this.clearConnectionTimeout();
    this.emit('connected');
    this.emit('networkQuality', 'good');
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
    try {
      const { error } = await supabase.from('webrtc_signals').insert({
        call_id: this.callId,
        signal_type: signal.type,
        signal_data: signal.data,
        from_user: this.userId,
        to_user: this.partnerId
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('❌ [WebRTC] Failed to send signal:', error);
    }
  }

  private startConnectionTimeout() {
    // 30 seconds to connect
    this.connectionTimeout = setTimeout(() => {
      if (this.callState === 'connecting') {
        console.warn('⏰ [WebRTC] Connection timeout');
        
        if (!this.hasReceivedAnswer && this.isInitiator) {
          // No answer received - partner may not have answered yet
          this.emit('recoveryStatus', { message: 'Waiting for answer...' });
        } else {
          // Have answer but still not connected - ICE issue
          this.emit('recoveryStatus', { message: 'Connecting...' });
          this.pc?.restartIce();
        }
      }
    }, 30000);
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
