import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type CallState = 'connecting' | 'connected' | 'failed' | 'ended';
type SignalType = 'offer' | 'answer' | 'ice-candidate';

interface Signal {
  type: SignalType;
  data: any;
  from: string;
}

export class SimpleWebRTCCall {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private signalChannel: RealtimeChannel | null = null;
  private callState: CallState = 'connecting';
  private eventHandlers: Map<string, Function[]> = new Map();
  private iceConnectionTimeout: NodeJS.Timeout | null = null;

  constructor(
    private callId: string,
    private partnerId: string,
    private isVideo: boolean,
    private isInitiator: boolean,
    private userId: string
  ) {
    console.log('🎬 [SimpleWebRTC] Initializing call:', { callId, isVideo, isInitiator });
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
    try {
      console.log('🚀 [SimpleWebRTC] Starting call setup...');
      
      // Step 1: Get media
      await this.getMedia();
      
      // Step 2: Create peer connection
      await this.createPeerConnection();
      
      // Step 3: Subscribe to signals FIRST (before creating offer)
      await this.subscribeToSignals();
      
      // Step 4: If not initiator, fetch past signals (OFFER and ICE candidates sent before answering)
      if (!this.isInitiator) {
        await this.fetchPastSignals();
      }
      
      // Step 5: If initiator, create and send offer
      if (this.isInitiator) {
        await this.createOffer();
      }
      
      // Step 6: Set ICE connection timeout
      this.setConnectionTimeout();
      
      console.log('✅ [SimpleWebRTC] Call setup complete');
    } catch (error) {
      console.error('❌ [SimpleWebRTC] Setup failed:', error);
      this.callState = 'failed';
      this.emit('failed', error);
      await this.cleanup();
    }
  }

  private isMobileDevice(): boolean {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }

  private isIOS(): boolean {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  private async getMedia() {
    try {
      const isMobile = this.isMobileDevice();
      
      const videoConstraints = this.isVideo ? (isMobile ? {
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 15, max: 30 },
        facingMode: 'user'
      } : {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
        facingMode: 'user'
      }) : false;
      
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: isMobile ? 16000 : 48000,
          channelCount: 1
        },
        video: videoConstraints
      };

      console.log('🎤 [SimpleWebRTC] Requesting media access...');
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ [SimpleWebRTC] Media stream obtained');
      this.emit('localStream', this.localStream);
    } catch (error) {
      console.error('❌ [SimpleWebRTC] Media access denied:', error);
      
      if (this.isVideo && error.name === 'OverconstrainedError') {
        console.log('⚠️ Trying fallback constraints...');
        const fallbackConstraints = {
          audio: true,
          video: { width: 320, height: 240 }
        };
        this.localStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        this.emit('localStream', this.localStream);
        return;
      }
      
      throw new Error('Could not access camera/microphone');
    }
  }

  private async createPeerConnection() {
    try {
      // Get TURN servers
      const { data: turnConfig } = await supabase.functions.invoke('get-turn-credentials');
      const iceServers = turnConfig?.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ];

      console.log('🔧 [SimpleWebRTC] Creating peer connection with ICE servers:', iceServers);
      
      const configuration: RTCConfiguration = {
        iceServers,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceCandidatePoolSize: this.isMobileDevice() ? 5 : 10
      };
      
      this.pc = new RTCPeerConnection(configuration);

      // Add local stream tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          console.log('➕ [SimpleWebRTC] Adding track:', track.kind);
          this.pc!.addTrack(track, this.localStream!);
        });
      }

      // Handle incoming tracks
      this.pc.ontrack = (event) => {
        console.log('📺 [SimpleWebRTC] Remote track received:', event.track.kind);
        const [remoteStream] = event.streams;
        this.emit('remoteStream', remoteStream);
      };

      // Handle ICE candidates
      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 [SimpleWebRTC] Sending ICE candidate');
          this.sendSignal({
            type: 'ice-candidate',
            data: event.candidate,
            from: this.userId
          });
        }
      };

      // Monitor ICE connection state
      this.pc.oniceconnectionstatechange = () => {
        const state = this.pc!.iceConnectionState;
        console.log('❄️ [SimpleWebRTC] ICE connection state:', state);

        if (state === 'connected' || state === 'completed') {
          this.callState = 'connected';
          this.emit('connected');
          this.clearConnectionTimeout();
          this.setupAdaptiveBitrate();
          console.log('🎉 [SimpleWebRTC] Call connected successfully!');
        } else if (state === 'failed' || state === 'disconnected') {
          console.error('❌ [SimpleWebRTC] ICE connection failed');
          this.callState = 'failed';
          this.emit('failed', new Error('Connection failed'));
        }
      };

      console.log('✅ [SimpleWebRTC] Peer connection created');
    } catch (error) {
      console.error('❌ [SimpleWebRTC] Failed to create peer connection:', error);
      throw error;
    }
  }

  private async fetchPastSignals() {
    if (this.isInitiator) {
      console.log('⏭️ [SimpleWebRTC] Initiator - skipping past signals fetch');
      return;
    }

    console.log('📥 [SimpleWebRTC] Fetching past signals for receiver...');
    
    try {
      const { data: signals, error } = await supabase
        .from('webrtc_signals')
        .select('*')
        .eq('call_id', this.callId)
        .eq('to_user', this.userId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (signals && signals.length > 0) {
        console.log(`📥 [SimpleWebRTC] Found ${signals.length} past signals`);
        
        // Process OFFER first
        const offer = signals.find(s => s.signal_type === 'offer');
        if (offer) {
          console.log('📥 [SimpleWebRTC] Processing past OFFER...');
          await this.handleSignal({
            type: 'offer',
            data: offer.signal_data,
            from: offer.from_user
          });
        }

        // Then process ICE candidates
        const candidates = signals.filter(s => s.signal_type === 'ice-candidate');
        console.log(`📥 [SimpleWebRTC] Processing ${candidates.length} past ICE candidates...`);
        for (const candidate of candidates) {
          await this.handleSignal({
            type: 'ice-candidate',
            data: candidate.signal_data,
            from: candidate.from_user
          });
        }
      } else {
        console.log('📭 [SimpleWebRTC] No past signals found');
      }
    } catch (error) {
      console.error('❌ [SimpleWebRTC] Failed to fetch past signals:', error);
    }
  }

  private async subscribeToSignals() {
    console.log('📡 [SimpleWebRTC] Subscribing to signals...');
    
    this.signalChannel = supabase
      .channel(`call-signals-${this.callId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `call_id=eq.${this.callId}`
        },
        (payload) => {
          const signal = payload.new;
          if (signal.to_user === this.userId) {
            console.log('📥 [SimpleWebRTC] Real-time signal received:', signal.signal_type);
            this.handleSignal({
              type: signal.signal_type as SignalType,
              data: signal.signal_data,
              from: signal.from_user
            });
          }
        }
      )
      .subscribe();

    console.log('✅ [SimpleWebRTC] Subscribed to signals');
  }

  private async handleSignal(signal: Signal) {
    if (!this.pc) {
      console.error('❌ [SimpleWebRTC] No peer connection available');
      return;
    }

    console.log(`🔄 [SimpleWebRTC] Processing ${signal.type} from ${signal.from}`);

    try {
      switch (signal.type) {
        case 'offer':
          console.log('📥 [SimpleWebRTC] Processing OFFER...');
          await this.pc.setRemoteDescription(new RTCSessionDescription(signal.data));
          console.log('✅ [SimpleWebRTC] Remote description (OFFER) set');
          
          const answer = await this.pc.createAnswer();
          console.log('📤 [SimpleWebRTC] ANSWER created');
          
          await this.pc.setLocalDescription(answer);
          console.log('✅ [SimpleWebRTC] Local description (ANSWER) set');
          
          await this.sendSignal({
            type: 'answer',
            data: answer,
            from: this.userId
          });
          console.log('✅ [SimpleWebRTC] ANSWER sent to database');
          break;

        case 'answer':
          console.log('📥 [SimpleWebRTC] Processing ANSWER...');
          await this.pc.setRemoteDescription(new RTCSessionDescription(signal.data));
          console.log('✅ [SimpleWebRTC] Remote description (ANSWER) set');
          break;

        case 'ice-candidate':
          console.log('📥 [SimpleWebRTC] Adding ICE candidate...');
          if (this.pc.remoteDescription) {
            await this.pc.addIceCandidate(new RTCIceCandidate(signal.data));
            console.log('✅ [SimpleWebRTC] ICE candidate added successfully');
          } else {
            console.warn('⚠️ [SimpleWebRTC] Skipping ICE candidate - no remote description yet');
          }
          break;
      }
    } catch (error) {
      console.error(`❌ [SimpleWebRTC] Error processing ${signal.type}:`, error);
    }
  }

  private async createOffer() {
    if (!this.pc) return;

    try {
      console.log('📤 [SimpleWebRTC] Creating offer...');
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await this.sendSignal({
        type: 'offer',
        data: offer,
        from: this.userId
      });
      console.log('✅ [SimpleWebRTC] Offer sent');
    } catch (error) {
      console.error('❌ [SimpleWebRTC] Failed to create offer:', error);
      throw error;
    }
  }

  private async sendSignal(signal: Signal) {
    try {
      await supabase.from('webrtc_signals').insert({
        call_id: this.callId,
        signal_type: signal.type,
        signal_data: signal.data,
        from_user: this.userId,
        to_user: this.partnerId
      });
    } catch (error) {
      console.error('❌ [SimpleWebRTC] Failed to send signal:', error);
    }
  }

  private setConnectionTimeout() {
    // Give 15 seconds for ICE connection to establish
    this.iceConnectionTimeout = setTimeout(() => {
      if (this.callState === 'connecting') {
        console.error('⏰ [SimpleWebRTC] Connection timeout');
        this.callState = 'failed';
        this.emit('failed', new Error('Connection timeout'));
        this.cleanup();
      }
    }, 15000);
  }

  private clearConnectionTimeout() {
    if (this.iceConnectionTimeout) {
      clearTimeout(this.iceConnectionTimeout);
      this.iceConnectionTimeout = null;
    }
  }

  async end() {
    console.log('👋 [SimpleWebRTC] Ending call...');
    this.callState = 'ended';
    await this.cleanup();
    this.emit('ended');
  }

  private adaptiveIntervalId: number | null = null;
  private currentQuality: 'low' | 'medium' | 'high' = 'high';

  private setupAdaptiveBitrate() {
    if (!this.pc || !this.isVideo) return;

    this.adaptiveIntervalId = window.setInterval(async () => {
      if (!this.pc) return;
      
      const stats = await this.pc.getStats();
      let packetsLost = 0;
      let packetsReceived = 0;
      
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          packetsLost = report.packetsLost || 0;
          packetsReceived = report.packetsReceived || 0;
        }
      });
      
      const totalPackets = packetsLost + packetsReceived;
      const packetLossRate = totalPackets > 0 ? packetsLost / totalPackets : 0;
      
      if (packetLossRate > 0.05) {
        this.adjustVideoQuality('low');
      } else if (packetLossRate > 0.02) {
        this.adjustVideoQuality('medium');
      } else {
        this.adjustVideoQuality('high');
      }
    }, 2000);
  }

  private async adjustVideoQuality(quality: 'low' | 'medium' | 'high') {
    if (!this.localStream || this.currentQuality === quality) return;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;
    
    const constraints = {
      low: { width: 320, height: 240, frameRate: 15 },
      medium: { width: 640, height: 480, frameRate: 24 },
      high: { width: 1280, height: 720, frameRate: 30 }
    };
    
    try {
      await videoTrack.applyConstraints(constraints[quality]);
      this.currentQuality = quality;
      console.log(`📊 [SimpleWebRTC] Video quality adjusted to ${quality}`);
    } catch (error) {
      console.error('Failed to adjust quality:', error);
    }
  }

  private async cleanup() {
    console.log('🧹 [SimpleWebRTC] Cleaning up...');
    
    if (this.adaptiveIntervalId) {
      clearInterval(this.adaptiveIntervalId);
      this.adaptiveIntervalId = null;
    }
    
    this.clearConnectionTimeout();

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    if (this.signalChannel) {
      await supabase.removeChannel(this.signalChannel);
      this.signalChannel = null;
    }

    console.log('✅ [SimpleWebRTC] Cleanup complete');
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
      console.log(`🎤 [SimpleWebRTC] Audio ${enabled ? 'enabled' : 'muted'}`);
    }
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
      console.log(`📹 [SimpleWebRTC] Video ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  getState(): CallState {
    return this.callState;
  }
}
