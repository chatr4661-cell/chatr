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
  private pendingIceCandidates: RTCIceCandidate[] = [];

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
      // CRITICAL: Release any existing media before requesting new
      if (this.localStream) {
        console.log('⚠️ [SimpleWebRTC] Releasing existing media stream before new request');
        this.localStream.getTracks().forEach(track => {
          track.stop();
          this.localStream?.removeTrack(track);
        });
        this.localStream = null;
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      const isMobile = this.isMobileDevice();
      
      // ULTRA-LOW LATENCY: Optimized for real-time performance
      // FaceTime-grade: 1080p @ 30fps with low-latency encoding
      const videoConstraints = this.isVideo ? (isMobile ? {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, min: 24, max: 30 },
        facingMode: 'user',
        // CRITICAL: Low-latency optimizations
        // @ts-ignore - experimental constraints
        latency: { ideal: 0, max: 0.1 }, // Target 0ms latency
        resizeMode: 'none' // No software resize for speed
      } : {
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 30, min: 24, max: 60 },
        facingMode: 'user',
        // @ts-ignore
        latency: { ideal: 0, max: 0.05 }
      }) : false;
      
      // STUDIO-GRADE HD AUDIO with Ultra-Low Latency
      const audioConstraints: MediaTrackConstraints = {
        // Core processing - aggressive noise cancellation
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        
        // HD Audio: 48kHz stereo for crystal-clear voice
        sampleRate: { ideal: 48000, min: 44100 },
        sampleSize: { ideal: 24, min: 16 },
        channelCount: { ideal: 2, min: 1 },
        
        // ULTRA-LOW LATENCY: Target 10ms audio buffer
        // @ts-ignore - experimental
        latency: { ideal: 0.01, max: 0.03 },
        
        // Chrome/Edge enhanced processing
        // @ts-ignore
        googEchoCancellation: true,
        googAutoGainControl: true,
        googNoiseSuppression: true,
        googHighpassFilter: true,
        googTypingNoiseDetection: true,
        googNoiseReduction: true,
        googAudioMirroring: false, // Prevent feedback
        
        // Advanced voice clarity
        // @ts-ignore
        voiceIsolation: true, // AI voice isolation (Chrome 116+)
        suppressLocalAudioPlayback: false
      };

      const constraints = {
        audio: audioConstraints,
        video: videoConstraints
      };

      console.log('🎤 [SimpleWebRTC] Requesting media with ultra-low latency config...');
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // CRITICAL: Optimize tracks for real-time delivery
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          // Enable low-latency mode where supported
          if (track.kind === 'video') {
            // @ts-ignore
            if (track.contentHint !== undefined) {
              // @ts-ignore
              track.contentHint = 'motion'; // Optimize for motion (video call)
            }
          }
          if (track.kind === 'audio') {
            // @ts-ignore
            if (track.contentHint !== undefined) {
              // @ts-ignore
              track.contentHint = 'speech'; // Optimize for speech
            }
          }
        });
      }
      
      console.log('✅ [SimpleWebRTC] Media stream obtained with optimized settings');
      this.emit('localStream', this.localStream);
    } catch (error: any) {
      console.error('❌ [SimpleWebRTC] Media access denied:', error);
      
      // Handle "Device in use" error with retry
      if (error.name === 'NotReadableError') {
        console.log('⏳ [SimpleWebRTC] Device in use, waiting and retrying...');
        await new Promise(resolve => setTimeout(resolve, 800));
        try {
          const retryConstraints = {
            audio: { echoCancellation: true, noiseSuppression: true },
            video: this.isVideo ? { width: 1280, height: 720, frameRate: 30 } : false
          };
          this.localStream = await navigator.mediaDevices.getUserMedia(retryConstraints);
          this.emit('localStream', this.localStream);
          return;
        } catch (retryError) {
          console.error('❌ [SimpleWebRTC] Retry failed:', retryError);
          throw new Error('Camera/microphone still in use. Please wait a moment and try again.');
        }
      }
      
      if (this.isVideo && error.name === 'OverconstrainedError') {
        console.log('⚠️ Trying fallback constraints...');
        const fallbackConstraints = {
          audio: true,
          video: { width: 640, height: 480, frameRate: 24 }
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
      // INDUSTRY-STANDARD: FaceTime/WhatsApp-grade STUN/TURN configuration
      let iceServers: RTCIceServer[] = [
        // Google STUN servers (highly reliable, globally distributed, sub-50ms latency)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        
        // Cloudflare STUN (fast, enterprise-grade)
        { urls: 'stun:stun.cloudflare.com:3478' },
        
        // Twilio STUN (enterprise reliability)
        { urls: 'stun:global.stun.twilio.com:3478' },
        
        // Mozilla STUN (good EU coverage)
        { urls: 'stun:stun.services.mozilla.com' },
        
        // OpenRelay TURN (free, reliable)
        {
          urls: [
            'turn:openrelay.metered.ca:80',
            'turn:openrelay.metered.ca:443',
            'turn:openrelay.metered.ca:443?transport=tcp',
            'turns:openrelay.metered.ca:443'
          ],
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        
        // Metered.ca TURN servers (free tier, reliable)
        {
          urls: [
            'turn:a.relay.metered.ca:80',
            'turn:a.relay.metered.ca:80?transport=tcp',
            'turn:a.relay.metered.ca:443',
            'turn:a.relay.metered.ca:443?transport=tcp'
          ],
          username: 'e8dd65c92ae9a3b9bfcbeb6e',
          credential: 'uWdWNmkhvyqTW1QP'
        },
        
        // Xirsys free TURN servers (backup)
        {
          urls: [
            'turn:fr-turn1.xirsys.com:80?transport=udp',
            'turn:fr-turn1.xirsys.com:3478?transport=tcp',
            'turn:fr-turn1.xirsys.com:443?transport=tcp'
          ],
          username: '6820e6b6-bcd2-11ef-8ba9-0242ac120004',
          credential: '6820e852-bcd2-11ef-8ba9-0242ac120004'
        }
      ];

      // Try to get fresh TURN credentials from edge function
      try {
        const { data: turnConfig } = await supabase.functions.invoke('get-turn-credentials');
        if (turnConfig?.iceServers?.length > 0) {
          iceServers = [...turnConfig.iceServers, ...iceServers];
          console.log('✅ [SimpleWebRTC] Using edge function TURN servers');
        }
      } catch (err) {
        console.warn('⚠️ [SimpleWebRTC] Edge function unavailable, using built-in servers');
      }

      console.log('🔧 [SimpleWebRTC] Creating peer connection with', iceServers.length, 'ICE server configs');
      
      const isMobile = this.isMobileDevice();
      // INDUSTRY-STANDARD: Optimized WebRTC configuration for fast connection
      const configuration: RTCConfiguration = {
        iceServers,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceCandidatePoolSize: isMobile ? 25 : 30, // Increased for faster ICE gathering
      };
      
      this.pc = new RTCPeerConnection(configuration);

      // Add local stream tracks with ULTRA-LOW LATENCY RTP parameters
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          console.log('➕ [SimpleWebRTC] Adding track:', track.kind);
          const sender = this.pc!.addTrack(track, this.localStream!);
          
          // Configure RTP sender for minimum latency
          if (sender && track.kind === 'video') {
            const params = sender.getParameters();
            if (params.encodings && params.encodings.length > 0) {
              params.encodings.forEach(encoding => {
                // ULTRA-LOW LATENCY: Maximum bitrate for quality, priority for speed
                encoding.maxBitrate = 5000000; // 5 Mbps for HD
                encoding.maxFramerate = 30;
                // @ts-ignore - Priority for real-time (WebRTC priority)
                encoding.priority = 'high';
                encoding.networkPriority = 'high';
              });
              sender.setParameters(params).catch(e => console.log('RTP params:', e));
            }
          }
          
          // Audio: prioritize for voice clarity
          if (sender && track.kind === 'audio') {
            const params = sender.getParameters();
            if (params.encodings && params.encodings.length > 0) {
              params.encodings.forEach(encoding => {
                encoding.maxBitrate = 128000; // 128 kbps for HD audio
                // @ts-ignore
                encoding.priority = 'high';
                encoding.networkPriority = 'high';
              });
              sender.setParameters(params).catch(e => console.log('Audio RTP:', e));
            }
          }
        });
      }

      // Handle incoming tracks with low-latency playback hint
      this.pc.ontrack = (event) => {
        console.log('📺 [SimpleWebRTC] Remote track received:', event.track.kind, 'readyState:', event.track.readyState);
        const [remoteStream] = event.streams;
        
        // Set content hint for decoder optimization
        event.track.contentHint = event.track.kind === 'video' ? 'motion' : 'speech';
        
        // CRITICAL: Monitor track state changes to detect frozen video
        event.track.onended = () => {
          console.warn('⚠️ [SimpleWebRTC] Remote track ended:', event.track.kind);
          this.emit('trackEnded', event.track.kind);
        };
        
        event.track.onmute = () => {
          console.warn('⚠️ [SimpleWebRTC] Remote track muted:', event.track.kind);
          this.emit('trackMuted', event.track.kind);
        };
        
        event.track.onunmute = () => {
          console.log('✅ [SimpleWebRTC] Remote track unmuted:', event.track.kind);
          this.emit('trackUnmuted', event.track.kind);
          // Re-emit stream to force video element refresh
          this.emit('remoteStream', remoteStream);
        };
        
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

      // CRITICAL: Enhanced ICE connection state monitoring for mobile
      this.pc.oniceconnectionstatechange = () => {
        const state = this.pc!.iceConnectionState;
        console.log('❄️ [SimpleWebRTC] ICE connection state:', state);

        if (state === 'connected' || state === 'completed') {
          this.callState = 'connected';
          this.emit('connected');
          this.clearConnectionTimeout();
          this.setupAdaptiveBitrate();
          console.log('🎉 [SimpleWebRTC] Call connected successfully!');
        } else if (state === 'failed') {
          // CRITICAL: Attempt ICE restart before failing completely
          console.error('❌ [SimpleWebRTC] ICE connection failed - attempting restart');
          if (this.isInitiator && this.pc) {
            console.log('🔄 [SimpleWebRTC] Restarting ICE...');
            this.pc.restartIce();
            
            // Give restart 15 seconds to work
            setTimeout(() => {
              if (this.pc?.iceConnectionState === 'failed') {
                console.error('❌ [SimpleWebRTC] ICE restart failed');
                this.callState = 'failed';
                this.emit('failed', new Error('Connection failed after restart'));
              }
            }, 15000);
          } else {
            this.callState = 'failed';
            this.emit('failed', new Error('Connection failed'));
          }
        } else if (state === 'disconnected') {
          // CRITICAL: Don't fail immediately on disconnect - mobile networks are unstable
          console.warn('⚠️ [SimpleWebRTC] ICE disconnected - waiting for reconnection...');
          
          // Give it 10 seconds to reconnect before failing
          setTimeout(() => {
            if (this.pc?.iceConnectionState === 'disconnected') {
              console.error('❌ [SimpleWebRTC] Still disconnected after 10s');
              this.callState = 'failed';
              this.emit('failed', new Error('Connection lost'));
            }
          }, 10000);
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
          
          // Process any queued ICE candidates now that we have remote description
          if (this.pendingIceCandidates.length > 0) {
            console.log(`📥 [SimpleWebRTC] Processing ${this.pendingIceCandidates.length} queued ICE candidates...`);
            for (const candidate of this.pendingIceCandidates) {
              try {
                await this.pc.addIceCandidate(candidate);
                console.log('✅ [SimpleWebRTC] Queued ICE candidate added');
              } catch (error) {
                console.error('❌ [SimpleWebRTC] Failed to add queued ICE candidate:', error);
              }
            }
            this.pendingIceCandidates = [];
          }
          break;

        case 'ice-candidate':
          console.log('📥 [SimpleWebRTC] Adding ICE candidate...');
          if (this.pc.remoteDescription) {
            await this.pc.addIceCandidate(new RTCIceCandidate(signal.data));
            console.log('✅ [SimpleWebRTC] ICE candidate added successfully');
          } else {
            console.log('⏳ [SimpleWebRTC] Queueing ICE candidate - waiting for remote description');
            this.pendingIceCandidates.push(new RTCIceCandidate(signal.data));
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
    // OPTIMIZED: Faster timeouts - 20s for mobile, 12s for desktop
    // This allows more time for TURN negotiation while still being responsive
    const timeout = this.isMobileDevice() ? 20000 : 12000;
    this.iceConnectionTimeout = setTimeout(() => {
      if (this.callState === 'connecting') {
        console.error('⏰ [SimpleWebRTC] Connection timeout after', timeout/1000, 'seconds');
        this.callState = 'failed';
        this.emit('failed', new Error('Connection timeout - please check your network settings'));
        this.cleanup();
      }
    }, timeout);
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
      low: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15 } },
      medium: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
      high: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }
    };
    
    try {
      await videoTrack.applyConstraints(constraints[quality]);
      this.currentQuality = quality;
      console.log(`📊 [SimpleWebRTC] Video quality adjusted to ${quality}`);
    } catch (error) {
      // CRITICAL: Don't crash on constraint errors - just log and continue
      console.warn('⚠️ [SimpleWebRTC] Failed to adjust quality (non-fatal):', error);
    }
  }

  private async cleanup() {
    console.log('🧹 [SimpleWebRTC] Cleaning up...');
    
    if (this.adaptiveIntervalId) {
      clearInterval(this.adaptiveIntervalId);
      this.adaptiveIntervalId = null;
    }
    
    this.clearConnectionTimeout();

    // CRITICAL: Clean up cached cameras
    this.cleanupCachedCameras();

    // CRITICAL: Stop and remove all tracks properly
    if (this.localStream) {
      console.log('🛑 [SimpleWebRTC] Stopping all local media tracks');
      this.localStream.getTracks().forEach(track => {
        track.stop();
        // Remove track from stream
        this.localStream?.removeTrack(track);
      });
      this.localStream = null;
    }

    // Close peer connection
    if (this.pc) {
      // Stop all senders' tracks
      this.pc.getSenders().forEach(sender => {
        if (sender.track) {
          sender.track.stop();
        }
      });
      this.pc.close();
      this.pc = null;
    }

    // Remove signal channel
    if (this.signalChannel) {
      await supabase.removeChannel(this.signalChannel);
      this.signalChannel = null;
    }

    // Wait for devices to be fully released
    await new Promise(resolve => setTimeout(resolve, 200));

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

  // Zoom state for cropping video
  private zoomLevel: number = 1;
  private zoomCanvas: HTMLCanvasElement | null = null;
  private zoomCtx: CanvasRenderingContext2D | null = null;
  private zoomVideoElement: HTMLVideoElement | null = null;
  private zoomAnimationId: number | null = null;
  private zoomedStream: MediaStream | null = null;

  /**
   * Apply zoom to local video and send zoomed/cropped video to remote user
   * @param level Zoom level (1.0 = no zoom, 2.0 = 2x zoom, etc.)
   */
  async applyZoom(level: number) {
    if (!this.localStream || !this.pc) {
      console.error('❌ [SimpleWebRTC] No local stream or peer connection');
      return;
    }

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) {
      console.error('❌ [SimpleWebRTC] No video track found');
      return;
    }

    this.zoomLevel = Math.max(1, Math.min(4, level)); // Clamp between 1x and 4x

    // If zoom is 1x, restore original track
    if (this.zoomLevel === 1) {
      await this.restoreOriginalTrack();
      return;
    }

    console.log(`🔍 [SimpleWebRTC] Applying ${this.zoomLevel}x zoom`);

    // Create canvas-based zoom if not already set up
    if (!this.zoomCanvas) {
      await this.setupZoomCanvas(videoTrack);
    }

    // The zoom rendering loop will handle the cropping
    console.log(`✅ [SimpleWebRTC] Zoom set to ${this.zoomLevel}x`);
  }

  private async setupZoomCanvas(originalTrack: MediaStreamTrack) {
    const settings = originalTrack.getSettings();
    const width = settings.width || 1280;
    const height = settings.height || 720;

    // Create canvas for zoom processing
    this.zoomCanvas = document.createElement('canvas');
    this.zoomCanvas.width = width;
    this.zoomCanvas.height = height;
    this.zoomCtx = this.zoomCanvas.getContext('2d');

    // Create video element to render source
    this.zoomVideoElement = document.createElement('video');
    this.zoomVideoElement.srcObject = new MediaStream([originalTrack.clone()]);
    this.zoomVideoElement.muted = true;
    this.zoomVideoElement.playsInline = true;
    await this.zoomVideoElement.play();

    // Create stream from canvas
    this.zoomedStream = this.zoomCanvas.captureStream(30);
    const zoomedTrack = this.zoomedStream.getVideoTracks()[0];

    // Replace the sender's track with zoomed track
    const sender = this.pc?.getSenders().find(s => s.track?.kind === 'video');
    if (sender) {
      await sender.replaceTrack(zoomedTrack);
      console.log('✅ [SimpleWebRTC] Replaced sender track with zoomed track');
    }

    // Start the zoom render loop
    this.startZoomRenderLoop();
  }

  private startZoomRenderLoop() {
    const render = () => {
      if (!this.zoomCanvas || !this.zoomCtx || !this.zoomVideoElement) {
        return;
      }

      const w = this.zoomCanvas.width;
      const h = this.zoomCanvas.height;

      // Calculate crop region based on zoom level (center crop)
      const cropW = w / this.zoomLevel;
      const cropH = h / this.zoomLevel;
      const cropX = (w - cropW) / 2;
      const cropY = (h - cropH) / 2;

      // Clear and draw zoomed/cropped video
      this.zoomCtx.clearRect(0, 0, w, h);
      this.zoomCtx.drawImage(
        this.zoomVideoElement,
        cropX, cropY, cropW, cropH, // Source crop region
        0, 0, w, h // Destination (full canvas)
      );

      this.zoomAnimationId = requestAnimationFrame(render);
    };

    render();
  }

  private async restoreOriginalTrack() {
    // Stop zoom processing
    if (this.zoomAnimationId) {
      cancelAnimationFrame(this.zoomAnimationId);
      this.zoomAnimationId = null;
    }

    if (this.zoomVideoElement) {
      this.zoomVideoElement.pause();
      this.zoomVideoElement.srcObject = null;
      this.zoomVideoElement = null;
    }

    if (this.zoomedStream) {
      this.zoomedStream.getTracks().forEach(t => t.stop());
      this.zoomedStream = null;
    }

    this.zoomCanvas = null;
    this.zoomCtx = null;

    // Restore original video track
    const originalTrack = this.localStream?.getVideoTracks()[0];
    if (originalTrack && this.pc) {
      const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(originalTrack);
        console.log('✅ [SimpleWebRTC] Restored original video track');
      }
    }
  }

  getZoomLevel(): number {
    return this.zoomLevel;
  }

  // Pre-cached camera streams for instant switching
  private cachedBackCamera: MediaStream | null = null;
  private cachedFrontCamera: MediaStream | null = null;
  private currentFacingMode: 'user' | 'environment' = 'user';
  private isSwitchingCamera: boolean = false;

  /**
   * Pre-cache alternate camera for instant switching
   */
  async preCacheAlternateCamera() {
    try {
      const alternateFacing = this.currentFacingMode === 'user' ? 'environment' : 'user';
      console.log(`📷 [SimpleWebRTC] Pre-caching ${alternateFacing} camera...`);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: alternateFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });
      
      if (alternateFacing === 'user') {
        this.cachedFrontCamera = stream;
      } else {
        this.cachedBackCamera = stream;
      }
      
      console.log(`✅ [SimpleWebRTC] ${alternateFacing} camera pre-cached`);
    } catch (error) {
      console.warn('⚠️ [SimpleWebRTC] Could not pre-cache camera:', error);
    }
  }

  async switchCamera() {
    if (!this.localStream || !this.pc) {
      console.error('❌ [SimpleWebRTC] No local stream available');
      return null;
    }
    
    // Prevent double-switching
    if (this.isSwitchingCamera) {
      console.log('⏳ [SimpleWebRTC] Camera switch already in progress');
      return this.currentFacingMode;
    }
    
    this.isSwitchingCamera = true;
    
    // Reset zoom when switching camera
    await this.restoreOriginalTrack();
    this.zoomLevel = 1;
    
    const oldVideoTrack = this.localStream.getVideoTracks()[0];
    if (!oldVideoTrack) {
      console.error('❌ [SimpleWebRTC] No video track found');
      this.isSwitchingCamera = false;
      return null;
    }
    
    const newFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
    
    try {
      console.log(`📷 [SimpleWebRTC] INSTANT switch from ${this.currentFacingMode} to ${newFacingMode}`);
      
      // Check if we have a pre-cached stream
      let newVideoTrack: MediaStreamTrack | null = null;
      const cachedStream = newFacingMode === 'user' ? this.cachedFrontCamera : this.cachedBackCamera;
      
      if (cachedStream && cachedStream.getVideoTracks()[0]?.readyState === 'live') {
        // USE CACHED - instant switch!
        console.log('⚡ [SimpleWebRTC] Using pre-cached camera - INSTANT switch');
        newVideoTrack = cachedStream.getVideoTracks()[0];
      } else {
        // No cache, need to request new stream
        console.log('📷 [SimpleWebRTC] Requesting new camera stream...');
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: newFacingMode },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: false
        });
        newVideoTrack = newStream.getVideoTracks()[0];
      }
      
      if (!newVideoTrack) {
        throw new Error('Failed to get new video track');
      }
      
      // CRITICAL: Replace track in sender FIRST (seamless for remote user)
      const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
        console.log('✅ [SimpleWebRTC] Sender track replaced');
      }
      
      // Update local stream
      this.localStream.removeTrack(oldVideoTrack);
      this.localStream.addTrack(newVideoTrack);
      
      // Stop old track AFTER replacing
      oldVideoTrack.stop();
      
      // Update state
      this.currentFacingMode = newFacingMode;
      
      // Clear used cache
      if (newFacingMode === 'user') {
        this.cachedFrontCamera = null;
      } else {
        this.cachedBackCamera = null;
      }
      
      // Emit updated stream
      this.emit('localStream', this.localStream);
      
      // Pre-cache the OTHER camera for next switch (async, non-blocking)
      setTimeout(() => this.preCacheAlternateCamera(), 500);
      
      console.log(`✅ [SimpleWebRTC] Camera switched to ${newFacingMode}`);
      this.isSwitchingCamera = false;
      return newFacingMode;
      
    } catch (error: any) {
      console.error('❌ [SimpleWebRTC] Failed to switch camera:', error);
      this.isSwitchingCamera = false;
      
      // Fallback: try without exact constraint
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: newFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        
        const fallbackTrack = fallbackStream.getVideoTracks()[0];
        const sender = this.pc?.getSenders().find(s => s.track?.kind === 'video');
        
        if (sender && fallbackTrack) {
          await sender.replaceTrack(fallbackTrack);
          this.localStream?.removeTrack(oldVideoTrack);
          this.localStream?.addTrack(fallbackTrack);
          oldVideoTrack.stop();
          this.currentFacingMode = newFacingMode;
          this.emit('localStream', this.localStream);
          console.log('✅ [SimpleWebRTC] Camera switched with fallback');
          return newFacingMode;
        }
      } catch (fallbackError) {
        console.error('❌ [SimpleWebRTC] Fallback switch failed:', fallbackError);
      }
      
      throw error;
    }
  }

  // Cleanup cached cameras on call end
  private cleanupCachedCameras() {
    if (this.cachedFrontCamera) {
      this.cachedFrontCamera.getTracks().forEach(t => t.stop());
      this.cachedFrontCamera = null;
    }
    if (this.cachedBackCamera) {
      this.cachedBackCamera.getTracks().forEach(t => t.stop());
      this.cachedBackCamera = null;
    }
  }

  // Screen sharing state
  private screenShareStream: MediaStream | null = null;
  private originalVideoTrack: MediaStreamTrack | null = null;

  /**
   * Start screen sharing - replaces camera video with screen
   */
  async startScreenShare(): Promise<boolean> {
    if (!this.pc || !this.localStream) {
      console.error('❌ [SimpleWebRTC] No peer connection available');
      return false;
    }

    try {
      console.log('🖥️ [SimpleWebRTC] Starting screen share...');
      
      // Save original video track
      this.originalVideoTrack = this.localStream.getVideoTracks()[0] || null;
      
      // Request screen share
      this.screenShareStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      });

      const screenTrack = this.screenShareStream.getVideoTracks()[0];
      if (!screenTrack) {
        throw new Error('No screen track available');
      }

      // Listen for user stopping screen share
      screenTrack.addEventListener('ended', () => {
        console.log('🖥️ [SimpleWebRTC] Screen share ended by user');
        this.stopScreenShare();
      });

      // Replace video track in sender
      const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(screenTrack);
        console.log('✅ [SimpleWebRTC] Screen share track replaced');
      }

      // Update local stream
      if (this.originalVideoTrack) {
        this.localStream.removeTrack(this.originalVideoTrack);
      }
      this.localStream.addTrack(screenTrack);
      
      this.emit('localStream', this.localStream);
      console.log('✅ [SimpleWebRTC] Screen sharing started');
      return true;
      
    } catch (error: any) {
      console.error('❌ [SimpleWebRTC] Screen share failed:', error);
      
      if (error.name === 'NotAllowedError') {
        console.log('User cancelled screen share');
      }
      
      return false;
    }
  }

  /**
   * Stop screen sharing and restore camera
   */
  async stopScreenShare(): Promise<boolean> {
    if (!this.pc || !this.localStream) {
      console.error('❌ [SimpleWebRTC] No peer connection available');
      return false;
    }

    try {
      console.log('🖥️ [SimpleWebRTC] Stopping screen share...');
      
      // Stop screen share tracks
      if (this.screenShareStream) {
        this.screenShareStream.getTracks().forEach(track => track.stop());
        this.screenShareStream = null;
      }

      // Restore original camera track
      if (this.originalVideoTrack && this.originalVideoTrack.readyState === 'live') {
        const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(this.originalVideoTrack);
        }
        
        // Update local stream
        const currentTrack = this.localStream.getVideoTracks()[0];
        if (currentTrack) {
          this.localStream.removeTrack(currentTrack);
        }
        this.localStream.addTrack(this.originalVideoTrack);
        
      } else {
        // Original track not available, request new camera
        console.log('📷 [SimpleWebRTC] Requesting new camera stream...');
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: this.currentFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: false
        });
        
        const newTrack = newStream.getVideoTracks()[0];
        const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender && newTrack) {
          await sender.replaceTrack(newTrack);
          
          const currentTrack = this.localStream.getVideoTracks()[0];
          if (currentTrack) {
            this.localStream.removeTrack(currentTrack);
          }
          this.localStream.addTrack(newTrack);
        }
      }

      this.originalVideoTrack = null;
      this.emit('localStream', this.localStream);
      console.log('✅ [SimpleWebRTC] Screen sharing stopped, camera restored');
      return true;
      
    } catch (error) {
      console.error('❌ [SimpleWebRTC] Failed to stop screen share:', error);
      return false;
    }
  }
}
