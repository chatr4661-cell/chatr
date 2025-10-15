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
      
      // Step 4: If initiator, create and send offer
      if (this.isInitiator) {
        await this.createOffer();
      }
      
      // Step 5: Set ICE connection timeout
      this.setConnectionTimeout();
      
      console.log('✅ [SimpleWebRTC] Call setup complete');
    } catch (error) {
      console.error('❌ [SimpleWebRTC] Setup failed:', error);
      this.callState = 'failed';
      this.emit('failed', error);
      await this.cleanup();
    }
  }

  private async getMedia() {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: this.isVideo ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };

      console.log('🎤 [SimpleWebRTC] Requesting media access...');
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ [SimpleWebRTC] Media stream obtained');
      this.emit('localStream', this.localStream);
    } catch (error) {
      console.error('❌ [SimpleWebRTC] Media access denied:', error);
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
      
      this.pc = new RTCPeerConnection({ iceServers });

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
            console.log('📥 [SimpleWebRTC] Signal received:', signal.signal_type);
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

    try {
      switch (signal.type) {
        case 'offer':
          console.log('📥 [SimpleWebRTC] Processing offer...');
          await this.pc.setRemoteDescription(new RTCSessionDescription(signal.data));
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          await this.sendSignal({
            type: 'answer',
            data: answer,
            from: this.userId
          });
          console.log('✅ [SimpleWebRTC] Answer sent');
          break;

        case 'answer':
          console.log('📥 [SimpleWebRTC] Processing answer...');
          await this.pc.setRemoteDescription(new RTCSessionDescription(signal.data));
          console.log('✅ [SimpleWebRTC] Answer processed');
          break;

        case 'ice-candidate':
          console.log('📥 [SimpleWebRTC] Adding ICE candidate...');
          if (this.pc.remoteDescription) {
            await this.pc.addIceCandidate(new RTCIceCandidate(signal.data));
            console.log('✅ [SimpleWebRTC] ICE candidate added');
          } else {
            console.warn('⚠️ [SimpleWebRTC] Skipping ICE candidate - no remote description yet');
          }
          break;
      }
    } catch (error) {
      console.error('❌ [SimpleWebRTC] Error handling signal:', error);
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

  private async cleanup() {
    console.log('🧹 [SimpleWebRTC] Cleaning up...');
    
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
