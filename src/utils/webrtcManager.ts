import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { buildRtcConfig, logIceCandidateDiagnostics, logRtcConfiguration, startStatsObserver } from "./iceTransportStrategy";
import { MediaAdaptationEngine, applyOpusParameters } from "./mediaAdaptationEngine";
import { NetworkMigrationManager } from "./networkMigrationManager";
import { logDiag } from "./rtcDiagnosticsHistory";

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

  // ICE config is built dynamically per-call (Cloudflare TURN + Google STUN).
  // See src/utils/iceTransportStrategy.ts for rationale.
  private statsObserverStop: (() => void) | null = null;

  // Phase 2: ICE restart cooldown + migration manager
  private static readonly ICE_RESTART_COOLDOWN_MS = 15_000;
  private static readonly DISCONNECT_TOLERANCE_MS = 4_000;
  private lastIceRestartAt = 0;
  private migrationInProgress = false;
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private migrationMgr: NetworkMigrationManager | null = null;
  private iceRestartCount = 0;

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

      // 2. Create peer connection (async — fetches Cloudflare TURN creds)
      await this.createPeerConnection();
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

  private async createPeerConnection() {
    const config = await buildRtcConfig();
    console.log('🧊 [WebRTCManager] RTCConfiguration:', {
      iceServers: config.iceServers?.length,
      policy: config.iceTransportPolicy,
      pool: config.iceCandidatePoolSize,
    });
    logRtcConfiguration(config, {
      label: 'WebRTCManager',
      callId: this.callId,
      userId: this.userId,
      peerId: this.partnerId,
    });
    this.pc = new RTCPeerConnection(config);

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
        logIceCandidateDiagnostics(e.candidate, 'gathered', {
          label: 'WebRTCManager',
          callId: this.callId,
          userId: this.userId,
          peerId: this.partnerId,
        });
        this.sendSignal('ice-candidate', e.candidate);
      }
    };

    // ICE gathering — observability only
    this.pc.onicegatheringstatechange = () => {
      console.log('🧊 [WebRTCManager] ICE gathering:', this.pc?.iceGatheringState);
    };

    // Connection state — minimal intervention; trust ICE.
    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      console.log('🔌 [WebRTCManager] Connection:', state);

      switch (state) {
        case 'connected':
          this.setState('connected');
          // Cancel any pending disconnect-tolerance timer
          if (this.disconnectTimer) {
            clearTimeout(this.disconnectTimer);
            this.disconnectTimer = null;
          }
          // Start passive stats observer (telemetry only — does NOT control routing)
          this.statsObserverStop?.();
          this.statsObserverStop = startStatsObserver(this.pc!, 3000, {
            label: 'WebRTCManager',
            callId: this.callId,
            userId: this.userId,
            peerId: this.partnerId,
          });
          // Start media adaptation (audio cap + tiered video + survival mode)
          this.startMediaAdaptation();
          // Phase 2: start passive network migration manager
          this.startMigrationManager();
          break;
        case 'disconnected':
          // Phase 2: extended tolerance (4s) before any recovery action.
          // ICE itself often heals these transients on mobile networks.
          this.setState('reconnecting');
          if (!this.disconnectTimer) {
            this.disconnectTimer = setTimeout(() => {
              this.disconnectTimer = null;
              const s = this.pc?.connectionState;
              if (s === 'disconnected' || s === 'failed') {
                logDiag('RECOVERY', `disconnect-tolerance expired (${s})`);
                this.attemptRecovery('disconnect-tolerance');
              }
            }, WebRTCManager.DISCONNECT_TOLERANCE_MS);
          }
          break;
        case 'failed':
          // Only here do we ask ICE to restart (single attempt, no rebuild).
          this.attemptRecovery('connection-failed');
          break;
        case 'closed':
          this.setState('closed');
          break;
      }
    };

    // ICE connection state — observe; promote to 'connected' when ICE confirms it.
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
        logIceCandidateDiagnostics(sig.signal_data as any, 'received-past', {
          label: 'WebRTCManager',
          callId: this.callId,
          userId: this.userId,
          peerId: sig.from_user,
        });
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
    if (type === 'ice-candidate') {
      logIceCandidateDiagnostics(data as any, 'received', {
        label: 'WebRTCManager',
        callId: this.callId,
        userId: this.userId,
        peerId: signal.from_user,
      });
    }

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
            if (answer.sdp) answer.sdp = applyOpusParameters(answer.sdp);
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
            logIceCandidateDiagnostics(data as any, 'applied', {
              label: 'WebRTCManager',
              callId: this.callId,
              userId: this.userId,
              peerId: signal.from_user,
            });
            await this.pc.addIceCandidate(new RTCIceCandidate(data));
          } else {
            logIceCandidateDiagnostics(data as any, 'queued', {
              label: 'WebRTCManager',
              callId: this.callId,
              userId: this.userId,
              peerId: signal.from_user,
            });
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
        logIceCandidateDiagnostics(candidate, 'applied', {
          label: 'WebRTCManager',
          callId: this.callId,
          userId: this.userId,
          peerId: this.partnerId,
        });
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
      if (offer.sdp) offer.sdp = applyOpusParameters(offer.sdp);
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
      if (type === 'ice-candidate') {
        logIceCandidateDiagnostics(data, 'sent', {
          label: 'WebRTCManager',
          callId: this.callId,
          userId: this.userId,
          peerId: this.partnerId,
        });
      }
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

  private async attemptRecovery(reason: string = 'unspecified') {
    if (this.state === 'closed') return;

    // Phase 2: ICE restart cooldown — max 1 per 15s; no concurrent attempts.
    const now = Date.now();
    if (this.migrationInProgress) {
      logDiag('RECOVERY', `skipped (migration in progress) reason=${reason}`);
      return;
    }
    if (now - this.lastIceRestartAt < WebRTCManager.ICE_RESTART_COOLDOWN_MS) {
      logDiag('RECOVERY', `skipped (cooldown) reason=${reason}`, {
        sinceLastMs: now - this.lastIceRestartAt,
      });
      return;
    }

    this.migrationInProgress = true;
    this.lastIceRestartAt = now;
    this.iceRestartCount++;
    logDiag('RECOVERY', `ICE restart #${this.iceRestartCount} reason=${reason}`);
    this.setState('reconnecting');

    try {
      if (this.pc && this.isInitiator) {
        const offer = await this.pc.createOffer({ iceRestart: true });
        if (offer.sdp) offer.sdp = applyOpusParameters(offer.sdp);
        await this.pc.setLocalDescription(offer);
        await this.sendSignal('offer', offer);
      } else if (this.pc) {
        // Non-initiator: passive — wait for fresh offer from peer.
        // (Original behavior preserved.)
      }
    } catch (err) {
      console.error('❌ [WebRTCManager] Recovery failed:', err);
      this.setState('failed');
    } finally {
      // Release migration lock after a short grace window so simultaneous
      // events don't pile up but legitimate later attempts can proceed.
      setTimeout(() => { this.migrationInProgress = false; }, 5000);
    }
  }

  private startMigrationManager() {
    if (!this.pc || this.migrationMgr) return;
    this.migrationMgr = new NetworkMigrationManager(this.pc, {
      debounceMs: 4000,
      onTransition: (r) => logDiag('NETWORK', `transition: ${r}`),
      onStableMigration: (reason) => {
        // Inform adaptation engine to favor stability over upgrades.
        this.adaptationEngine?.setMobilityMode(true, 15_000);
        // Only attempt recovery if ICE actually looks broken — cooldown gates this.
        const s = this.pc?.iceConnectionState;
        if (s === 'disconnected' || s === 'failed') {
          this.attemptRecovery(`migration:${reason}`);
        } else {
          logDiag('MOBILITY', `migration ack (no recovery needed) reason=${reason}`);
        }
      },
    });
    this.migrationMgr.start();
  }

  // Forced relay-only recovery removed by design.
  // Trust ICE: relay candidates are gathered up-front (pool=10) and ICE
  // will nominate them naturally if direct paths fail.

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

  private adaptationEngine: MediaAdaptationEngine | null = null;
  private startMediaAdaptation() {
    if (!this.pc || this.adaptationEngine) return;
    this.adaptationEngine = new MediaAdaptationEngine(this.pc, {
      label: 'WebRTCManager:Adapt',
      onStagnantMedia: () => this.attemptRecovery(),
    });
    this.adaptationEngine.start().catch((e) => console.warn('adaptation start failed', e));
  }

  async end() {
    console.log('👋 [WebRTCManager] Ending...');
    this.setState('closed');
    this.statsObserverStop?.();
    this.statsObserverStop = null;
    this.adaptationEngine?.stop();
    this.adaptationEngine = null;
    
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
