import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * WebRTC Manager - Singleton for managing WebRTC connections
 * 
 * FIXES:
 * 1. Single offer per call (no duplicates)
 * 2. Proper signal ordering (offer → answer → ICE)
 * 3. Race condition prevention
 * 4. Network resilience
 */

type ConnectionState = 'new' | 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'closed';

interface WebRTCManagerEvents {
  localStream: (stream: MediaStream) => void;
  remoteStream: (stream: MediaStream) => void;
  stateChange: (state: ConnectionState) => void;
  error: (error: Error) => void;
}

class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private signalChannel: RealtimeChannel | null = null;
  private state: ConnectionState = 'new';
  private handlers: Partial<WebRTCManagerEvents> = {};
  
  // Signaling state
  private offerSent = false;
  private answerSent = false;
  private pendingCandidates: RTCIceCandidate[] = [];
  private processedSignals = new Set<string>();
  
  // Call details
  private callId: string = '';
  private partnerId: string = '';
  private userId: string = '';
  private isInitiator = false;

  // ICE Servers with reliable TURN for India
  private readonly iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    {
      urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turns:openrelay.metered.ca:443'],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: ['turn:a.relay.metered.ca:80', 'turn:a.relay.metered.ca:443'],
      username: 'e8dd65c92ae9a3b9bfcbeb6e',
      credential: 'uWdWNmkhvyqTW1QP',
    },
  ];

  on<K extends keyof WebRTCManagerEvents>(event: K, handler: WebRTCManagerEvents[K]) {
    this.handlers[event] = handler;
  }

  private emit<K extends keyof WebRTCManagerEvents>(event: K, ...args: Parameters<WebRTCManagerEvents[K]>) {
    const handler = this.handlers[event];
    if (handler) {
      (handler as (...args: any[]) => void)(...args);
    }
  }

  private setState(state: ConnectionState) {
    if (this.state !== state) {
      this.state = state;
      this.emit('stateChange', state);
    }
  }

  async start(params: {
    callId: string;
    partnerId: string;
    userId: string;
    isInitiator: boolean;
    isVideo: boolean;
    preAcquiredStream?: MediaStream | null;
  }) {
    console.log('🚀 [WebRTCManager] Starting:', { callId: params.callId.slice(0, 8), isInitiator: params.isInitiator });
    
    this.callId = params.callId;
    this.partnerId = params.partnerId;
    this.userId = params.userId;
    this.isInitiator = params.isInitiator;
    this.offerSent = false;
    this.answerSent = false;
    this.pendingCandidates = [];
    this.processedSignals.clear();
    
    this.setState('connecting');

    try {
      // 1. Get media
      if (params.preAcquiredStream) {
        this.localStream = params.preAcquiredStream;
        console.log('🎤 [WebRTCManager] Using pre-acquired stream');
      } else {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: params.isVideo,
        });
        console.log('🎤 [WebRTCManager] Acquired new stream');
      }
      this.emit('localStream', this.localStream);

      // 2. Create peer connection
      this.createPeerConnection();

      // 3. Subscribe to signals
      await this.subscribeToSignals();

      // 4. Fetch existing signals (receiver gets offer)
      await this.fetchExistingSignals();

      // 5. Create offer (initiator only, ONCE)
      if (this.isInitiator && !this.offerSent) {
        await this.createOffer();
      }

      console.log('✅ [WebRTCManager] Setup complete');
    } catch (err) {
      console.error('❌ [WebRTCManager] Start failed:', err);
      this.setState('failed');
      this.emit('error', err as Error);
    }
  }

  private createPeerConnection() {
    this.pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      iceCandidatePoolSize: 10,
    });

    // Add tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.pc!.addTrack(track, this.localStream!);
      });
    }

    // Remote tracks
    this.pc.ontrack = (e) => {
      console.log('📺 [WebRTCManager] Remote track:', e.track.kind);
      this.emit('remoteStream', e.streams[0]);
    };

    // ICE candidates
    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.sendSignal('ice-candidate', e.candidate);
      }
    };

    // Connection state
    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      console.log('🔌 [WebRTCManager] Connection:', state);
      
      switch (state) {
        case 'connected':
          this.setState('connected');
          break;
        case 'disconnected':
          this.setState('reconnecting');
          // Wait 3s before restart
          setTimeout(() => {
            if (this.pc?.connectionState === 'disconnected') {
              this.pc?.restartIce();
            }
          }, 3000);
          break;
        case 'failed':
          this.attemptRecovery();
          break;
        case 'closed':
          this.setState('closed');
          break;
      }
    };

    // ICE connection state
    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc?.iceConnectionState;
      console.log('❄️ [WebRTCManager] ICE:', state);
      
      if (state === 'connected' || state === 'completed') {
        this.setState('connected');
      }
    };
  }

  private async subscribeToSignals() {
    this.signalChannel = supabase
      .channel(`webrtc-mgr-${this.callId}-${this.userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'webrtc_signals',
        filter: `call_id=eq.${this.callId}`,
      }, (payload) => {
        const signal = payload.new as any;
        if (signal.to_user === this.userId) {
          this.handleSignal(signal);
        }
      })
      .subscribe();
  }

  private async fetchExistingSignals() {
    const { data } = await supabase
      .from('webrtc_signals')
      .select('*')
      .eq('call_id', this.callId)
      .eq('to_user', this.userId)
      .order('created_at', { ascending: true });

    if (data?.length) {
      console.log(`📥 [WebRTCManager] Found ${data.length} existing signals`);
      
      // Process offer first
      const offer = data.find(s => s.signal_type === 'offer');
      if (offer) await this.handleSignal(offer);
      
      // Then ICE candidates
      for (const sig of data.filter(s => s.signal_type === 'ice-candidate')) {
        await this.handleSignal(sig);
      }
      
      // Then answer (if any)
      const answer = data.find(s => s.signal_type === 'answer');
      if (answer) await this.handleSignal(answer);
    }
  }

  private async handleSignal(signal: any) {
    if (!this.pc) return;
    
    // Deduplicate
    if (this.processedSignals.has(signal.id)) return;
    this.processedSignals.add(signal.id);
    
    const { signal_type: type, signal_data: data } = signal;
    console.log(`📥 [WebRTCManager] Signal: ${type}`);

    try {
      switch (type) {
        case 'offer':
          if (this.isInitiator) {
            console.log('⏭️ [WebRTCManager] Ignoring offer (I am initiator)');
            return;
          }
          await this.pc.setRemoteDescription(new RTCSessionDescription(data));
          await this.flushPendingCandidates();
          
          if (!this.answerSent) {
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            await this.sendSignal('answer', answer);
            this.answerSent = true;
          }
          break;

        case 'answer':
          if (!this.isInitiator) {
            console.log('⏭️ [WebRTCManager] Ignoring answer (I am not initiator)');
            return;
          }
          if (this.pc.signalingState === 'have-local-offer') {
            await this.pc.setRemoteDescription(new RTCSessionDescription(data));
            await this.flushPendingCandidates();
          }
          break;

        case 'ice-candidate':
          if (this.pc.remoteDescription) {
            await this.pc.addIceCandidate(new RTCIceCandidate(data));
          } else {
            this.pendingCandidates.push(new RTCIceCandidate(data));
          }
          break;
      }
    } catch (err) {
      console.error(`❌ [WebRTCManager] Signal error (${type}):`, err);
    }
  }

  private async flushPendingCandidates() {
    if (this.pendingCandidates.length === 0) return;
    console.log(`📥 [WebRTCManager] Flushing ${this.pendingCandidates.length} candidates`);
    
    for (const candidate of this.pendingCandidates) {
      try {
        await this.pc?.addIceCandidate(candidate);
      } catch (e) {
        console.warn('⚠️ Candidate add failed:', e);
      }
    }
    this.pendingCandidates = [];
  }

  private async createOffer() {
    if (!this.pc || this.offerSent) return;
    
    try {
      console.log('📤 [WebRTCManager] Creating offer...');
      this.offerSent = true;
      
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await this.sendSignal('offer', offer);
      
      console.log('✅ [WebRTCManager] Offer sent');
    } catch (err) {
      console.error('❌ [WebRTCManager] Offer failed:', err);
      this.offerSent = false;
      throw err;
    }
  }

  private async sendSignal(type: string, data: any) {
    try {
      await supabase.from('webrtc_signals').insert({
        call_id: this.callId,
        signal_type: type,
        signal_data: data,
        from_user: this.userId,
        to_user: this.partnerId,
      });
    } catch (err) {
      console.error('❌ [WebRTCManager] Signal send failed:', err);
    }
  }

  private async attemptRecovery() {
    if (this.state === 'closed') return;
    
    console.log('🔄 [WebRTCManager] Attempting recovery...');
    this.setState('reconnecting');
    
    try {
      if (this.pc && this.isInitiator) {
        const offer = await this.pc.createOffer({ iceRestart: true });
        await this.pc.setLocalDescription(offer);
        await this.sendSignal('offer', offer);
      }
    } catch (err) {
      console.error('❌ [WebRTCManager] Recovery failed:', err);
      this.setState('failed');
    }
  }

  toggleAudio(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach(t => { t.enabled = enabled; });
  }

  toggleVideo(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach(t => { t.enabled = enabled; });
  }

  async addVideo(): Promise<MediaStream | null> {
    if (!this.pc) return null;
    
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      
      const track = videoStream.getVideoTracks()[0];
      this.pc.addTrack(track, videoStream);
      this.localStream?.addTrack(track);
      
      // Renegotiate
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await this.sendSignal('offer', offer);
      
      return videoStream;
    } catch (err) {
      console.error('❌ [WebRTCManager] Add video failed:', err);
      return null;
    }
  }

  sendDTMF(digit: string) {
    const sender = this.pc?.getSenders().find(s => s.track?.kind === 'audio');
    if (sender?.dtmf) {
      sender.dtmf.insertDTMF(digit, 100, 70);
    }
  }

  getStats() {
    return this.pc?.getStats() ?? null;
  }

  async end() {
    console.log('👋 [WebRTCManager] Ending...');
    this.setState('closed');
    
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
    
    if (this.pc) {
      this.pc.onconnectionstatechange = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.ontrack = null;
      this.pc.onicecandidate = null;
      this.pc.close();
      this.pc = null;
    }
    
    if (this.signalChannel) {
      await supabase.removeChannel(this.signalChannel);
      this.signalChannel = null;
    }
  }
}

// Export singleton factory
export function createWebRTCManager() {
  return new WebRTCManager();
}

export type { WebRTCManager, ConnectionState };
