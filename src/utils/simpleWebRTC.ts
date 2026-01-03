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
      
      // Step 0: Pre-call network quality check (silent, copilot-style)
      const networkQuality = await this.analyzeNetworkQuality();
      console.log(`📶 [SimpleWebRTC] Network quality: ${networkQuality}`);
      this.emit('networkQuality', networkQuality);
      
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
        // Wait for devices to be fully released
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const isMobile = this.isMobileDevice();
      
      // FaceTime-grade quality: 1080p @ 60fps (desktop) or 720p @ 30fps (mobile)
      const videoConstraints = this.isVideo ? (isMobile ? {
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
        frameRate: { ideal: 30, max: 30 },
        facingMode: 'user'
      } : {
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 60, max: 60 },
        facingMode: 'user'
      }) : false;
      
      // HD Audio Quality - Studio-grade audio to match 1080p video
      const audioConstraints: MediaTrackConstraints = {
        // Core audio processing
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true },
        
        // HD Audio settings - 48kHz stereo for crystal clear voice
        sampleRate: { ideal: 48000, min: 44100 },
        sampleSize: { ideal: 24, min: 16 }, // 24-bit audio depth
        channelCount: { ideal: 2, min: 1 }, // Stereo for spatial audio
        
        // Advanced noise cancellation (Chrome/Edge specific)
        // @ts-ignore - experimental constraints
        googEchoCancellation: true,
        googAutoGainControl: true,
        googNoiseSuppression: true,
        googHighpassFilter: true,
        googTypingNoiseDetection: true,
        googNoiseReduction: true,
        
        // Latency optimization for real-time calls
        latency: { ideal: 0.01, max: 0.05 }, // 10-50ms latency
      };

      const constraints = {
        audio: audioConstraints,
        video: videoConstraints
      };

      console.log('🎤 [SimpleWebRTC] Requesting media access...');
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ [SimpleWebRTC] Media stream obtained');
      this.emit('localStream', this.localStream);
    } catch (error: any) {
      console.error('❌ [SimpleWebRTC] Media access denied:', error);
      
      // Handle "Device in use" error with retry
      if (error.name === 'NotReadableError') {
        console.log('⏳ [SimpleWebRTC] Device in use, waiting and retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          const retryConstraints = {
            audio: true,
            video: this.isVideo ? { width: 640, height: 480 } : false
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
      // ULTRA-FAST: Optimized WebRTC configuration for instant connection
      const configuration: RTCConfiguration = {
        iceServers,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        // CRITICAL: Large candidate pool for instant ICE gathering
        iceCandidatePoolSize: isMobile ? 30 : 40,
      };
      
      this.pc = new RTCPeerConnection(configuration);
      
      // ULTRA-FAST: Trigger immediate ICE gathering
      console.log('🚀 [SimpleWebRTC] Pre-gathering ICE candidates...');

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
          // CRITICAL: Never give up - keep attempting ICE restart
          console.warn('⚠️ [SimpleWebRTC] ICE connection failed - attempting continuous recovery');
          this.attemptContinuousRecovery();
        } else if (state === 'disconnected') {
          // IMPORTANT: 'disconnected' can happen briefly even in healthy calls (esp. mobile/WiFi↔LTE)
          // We must NOT auto-end the call unless the user hangs up.
          console.warn('⚠️ [SimpleWebRTC] ICE disconnected - attempting recovery (not ending call)');

          // Attempt ICE restart for faster recovery
          if (this.pc) {
            console.log('🔄 [SimpleWebRTC] Attempting ICE restart on disconnect...');
            this.pc.restartIce();
          }

          // NEVER auto-fail active calls - only fail during initial connection phase
          if (this.callState === 'connecting') {
            // Extended timeout for initial connection - 45 seconds
            setTimeout(() => {
              if (this.callState === 'connecting' && this.pc?.iceConnectionState === 'disconnected') {
                console.warn('⚠️ [SimpleWebRTC] Still connecting after 45s - continuing to try...');
                // Still don't fail - emit warning but keep trying
                this.emit('failed', new Error('Connection taking longer than expected'));
              }
            }, 45000);
          }
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
          
          // Set preferred codecs for answer too
          this.setPreferredCodecs();
          
          const answer = await this.pc.createAnswer();
          console.log('📤 [SimpleWebRTC] ANSWER created');
          
          // Enhance SDP for FaceTime-grade quality on answer too
          const enhancedAnswerSdp = this.enhanceSDP(answer.sdp || '');
          const enhancedAnswer = new RTCSessionDescription({
            type: 'answer',
            sdp: enhancedAnswerSdp
          });
          
          await this.pc.setLocalDescription(enhancedAnswer);
          console.log('✅ [SimpleWebRTC] Local description (ANSWER) set with enhanced SDP');
          
          await this.sendSignal({
            type: 'answer',
            data: enhancedAnswer,
            from: this.userId
          });
          console.log('✅ [SimpleWebRTC] Enhanced ANSWER sent to database');
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
      
      // Set preferred codecs before creating offer for best quality
      this.setPreferredCodecs();
      
      const offer = await this.pc.createOffer();
      
      // Enhance SDP for FaceTime-grade quality
      const enhancedSdp = this.enhanceSDP(offer.sdp || '');
      const enhancedOffer = new RTCSessionDescription({
        type: 'offer',
        sdp: enhancedSdp
      });
      
      await this.pc.setLocalDescription(enhancedOffer);
      await this.sendSignal({
        type: 'offer',
        data: enhancedOffer,
        from: this.userId
      });
      console.log('✅ [SimpleWebRTC] Enhanced offer sent');
    } catch (error) {
      console.error('❌ [SimpleWebRTC] Failed to create offer:', error);
      throw error;
    }
  }

  /**
   * Set preferred video/audio codecs for maximum quality
   */
  private setPreferredCodecs() {
    if (!this.pc) return;

    const transceivers = this.pc.getTransceivers();
    
    transceivers.forEach((transceiver) => {
      if (transceiver.sender?.track?.kind === 'video') {
        const capabilities = RTCRtpSender.getCapabilities('video');
        if (!capabilities) return;

        // Prefer VP9 for best quality, then H264 for hardware acceleration, then VP8
        const preferredOrder = ['VP9', 'H264', 'VP8'];
        const sortedCodecs = [...capabilities.codecs].sort((a, b) => {
          const aIndex = preferredOrder.findIndex(p => a.mimeType.includes(p));
          const bIndex = preferredOrder.findIndex(p => b.mimeType.includes(p));
          return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });

        try {
          transceiver.setCodecPreferences(sortedCodecs);
          console.log('✅ [SimpleWebRTC] Video codec preference set (VP9 > H264 > VP8)');
        } catch (e) {
          console.warn('⚠️ [SimpleWebRTC] Could not set codec preference:', e);
        }
      }

      if (transceiver.sender?.track?.kind === 'audio') {
        const capabilities = RTCRtpSender.getCapabilities('audio');
        if (!capabilities) return;

        // Prefer Opus for best audio quality
        const sortedCodecs = [...capabilities.codecs].sort((a, b) => {
          if (a.mimeType.includes('opus')) return -1;
          if (b.mimeType.includes('opus')) return 1;
          return 0;
        });

        try {
          transceiver.setCodecPreferences(sortedCodecs);
          console.log('✅ [SimpleWebRTC] Audio codec preference set (Opus preferred)');
        } catch (e) {
          console.warn('⚠️ [SimpleWebRTC] Could not set audio codec preference:', e);
        }
      }
    });
  }

  /**
   * Enhance SDP for FaceTime-grade video/audio quality
   * Sets higher bitrates and quality parameters
   */
  private enhanceSDP(sdp: string): string {
    let enhanced = sdp;

    // VIDEO: Set very high bitrate for 1080p60 quality (8 Mbps max, 4 Mbps target)
    // This matches FaceTime's quality tier
    enhanced = enhanced.replace(
      /a=mid:video\r\n/g,
      'a=mid:video\r\nb=AS:8000\r\n'
    );
    
    // Also set bitrate on video m-line if mid:video not found
    if (!enhanced.includes('b=AS:8000')) {
      enhanced = enhanced.replace(
        /(m=video.*\r\n)/g,
        '$1b=AS:8000\r\n'
      );
    }

    // AUDIO: High quality stereo Opus at 128kbps (matches FaceTime HD audio)
    enhanced = enhanced.replace(
      /a=mid:audio\r\n/g,
      'a=mid:audio\r\nb=AS:128\r\n'
    );

    // Set Opus parameters for maximum quality:
    // - maxaveragebitrate: 128000 (128 kbps)
    // - stereo: 1 (enable stereo)
    // - sprop-stereo: 1 (sender prefers stereo)
    // - maxplaybackrate: 48000 (48kHz)
    // - useinbandfec: 1 (forward error correction)
    // - usedtx: 0 (disable discontinuous transmission for constant quality)
    enhanced = enhanced.replace(
      /a=fmtp:111 /g,
      'a=fmtp:111 maxaveragebitrate=128000;stereo=1;sprop-stereo=1;maxplaybackrate=48000;useinbandfec=1;usedtx=0;'
    );

    // Also handle fmtp:109 for opus
    enhanced = enhanced.replace(
      /a=fmtp:109 /g,
      'a=fmtp:109 maxaveragebitrate=128000;stereo=1;sprop-stereo=1;maxplaybackrate=48000;useinbandfec=1;usedtx=0;'
    );

    console.log('✅ [SimpleWebRTC] SDP enhanced for FaceTime-grade quality');
    return enhanced;
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

  private recoveryAttempts: number = 0;
  private maxRecoveryAttempts: number = 10; // Much higher limit
  private recoveryIntervalId: number | null = null;

  private setConnectionTimeout() {
    // RELIABLE: Extended timeouts - 45s for mobile, 35s for desktop
    const timeout = this.isMobileDevice() ? 45000 : 35000;
    console.log(`⏱️ [SimpleWebRTC] Connection timeout set: ${timeout}ms`);
    
    this.iceConnectionTimeout = setTimeout(() => {
      if (this.callState === 'connecting') {
        console.warn('⏰ [SimpleWebRTC] Initial connection timeout - starting continuous recovery');
        
        // CRITICAL: Start continuous recovery instead of failing
        this.attemptContinuousRecovery();
      }
    }, timeout);
  }

  /**
   * Continuous recovery - keeps trying until user hangs up
   * Never shows "call failed" if recovery is possible
   */
  private attemptContinuousRecovery() {
    if (this.recoveryIntervalId) return; // Already recovering
    
    this.recoveryAttempts = 0;
    console.log('🔄 [SimpleWebRTC] Starting continuous recovery mode...');
    
    const attemptRecovery = () => {
      if (!this.pc || this.callState === 'ended') {
        this.stopRecovery();
        return;
      }
      
      const iceState = this.pc.iceConnectionState;
      
      // Success - stop recovery
      if (iceState === 'connected' || iceState === 'completed') {
        console.log('✅ [SimpleWebRTC] Connection recovered!');
        this.callState = 'connected';
        this.emit('connected');
        this.stopRecovery();
        return;
      }
      
      this.recoveryAttempts++;
      console.log(`🔄 [SimpleWebRTC] Recovery attempt ${this.recoveryAttempts}...`);
      
      // Attempt ICE restart
      try {
        this.pc.restartIce();
      } catch (e) {
        console.warn('⚠️ [SimpleWebRTC] ICE restart error:', e);
      }
      
      // Emit warning (not failure) after several attempts
      if (this.recoveryAttempts === 3) {
        this.emit('failed', new Error('Connection unstable - recovering...'));
      }
      
      // After many attempts, still don't give up but warn more strongly
      if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
        console.warn('⚠️ [SimpleWebRTC] Many recovery attempts - still trying...');
        // Reset counter but keep trying
        this.recoveryAttempts = 0;
      }
    };
    
    // Try immediately, then every 5 seconds
    attemptRecovery();
    this.recoveryIntervalId = window.setInterval(attemptRecovery, 5000);
  }

  private stopRecovery() {
    if (this.recoveryIntervalId) {
      clearInterval(this.recoveryIntervalId);
      this.recoveryIntervalId = null;
    }
    this.recoveryAttempts = 0;
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
  private currentQuality: 'ultra' | 'high' | 'medium' | 'low' = 'ultra';
  private lastQualityChangeTime: number = 0;
  private readonly QUALITY_CHANGE_COOLDOWN = 15000; // 15 seconds cooldown between quality changes

  private setupAdaptiveBitrate() {
    if (!this.pc || !this.isVideo) return;

    // CRITICAL: Set initial high bitrate on sender for FaceTime-grade quality
    this.setEncoderParameters();

    this.adaptiveIntervalId = window.setInterval(async () => {
      if (!this.pc) return;
      
      const stats = await this.pc.getStats();
      let packetsLost = 0;
      let packetsReceived = 0;
      let rtt = 0;
      
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          packetsLost = report.packetsLost || 0;
          packetsReceived = report.packetsReceived || 0;
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          rtt = (report.currentRoundTripTime || 0) * 1000;
        }
      });
      
      const totalPackets = packetsLost + packetsReceived;
      const packetLossRate = totalPackets > 0 ? packetsLost / totalPackets : 0;
      
      // CONSERVATIVE: Only reduce quality on severe network issues
      // FaceTime maintains quality unless absolutely necessary
      if (packetLossRate > 0.10 || rtt > 500) {
        this.adjustVideoQuality('low');
      } else if (packetLossRate > 0.05 || rtt > 300) {
        this.adjustVideoQuality('medium');
      } else if (packetLossRate > 0.02 || rtt > 150) {
        this.adjustVideoQuality('high');
      } else {
        this.adjustVideoQuality('ultra');
      }
    }, 5000); // Check every 5 seconds (less aggressive than 2s)
  }

  /**
   * Set encoder parameters for maximum quality output
   */
  private async setEncoderParameters() {
    if (!this.pc) return;

    const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
    if (!sender) return;

    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }

      // FaceTime-grade encoding: 8 Mbps max, 60fps priority
      params.encodings[0] = {
        ...params.encodings[0],
        maxBitrate: 8000000, // 8 Mbps
        maxFramerate: 60,
        priority: 'high',
        networkPriority: 'high',
      };

      await sender.setParameters(params);
      console.log('✅ [SimpleWebRTC] Encoder parameters set for FaceTime-grade quality');
    } catch (error) {
      console.warn('⚠️ [SimpleWebRTC] Could not set encoder parameters:', error);
    }
  }

  private async adjustVideoQuality(quality: 'ultra' | 'high' | 'medium' | 'low') {
    if (!this.localStream || this.currentQuality === quality) return;
    
    // COOLDOWN: Don't change quality too frequently (prevents jarring experience)
    const now = Date.now();
    if (now - this.lastQualityChangeTime < this.QUALITY_CHANGE_COOLDOWN) {
      return;
    }
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;
    
    // FaceTime-grade quality presets
    const constraints = {
      ultra: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } },
      high: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
      medium: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      low: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } }
    };
    
    try {
      await videoTrack.applyConstraints(constraints[quality]);
      this.currentQuality = quality;
      this.lastQualityChangeTime = now;
      console.log(`📊 [SimpleWebRTC] Video quality adjusted to ${quality}`);
      
      // Update encoder bitrate to match quality level
      await this.updateEncoderBitrate(quality);
    } catch (error) {
      // CRITICAL: Don't crash on constraint errors - just log and continue
      console.warn('⚠️ [SimpleWebRTC] Failed to adjust quality (non-fatal):', error);
    }
  }

  private async updateEncoderBitrate(quality: 'ultra' | 'high' | 'medium' | 'low') {
    if (!this.pc) return;

    const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
    if (!sender) return;

    const bitrates = {
      ultra: 8000000,  // 8 Mbps
      high: 5000000,   // 5 Mbps
      medium: 2500000, // 2.5 Mbps
      low: 1000000     // 1 Mbps
    };

    try {
      const params = sender.getParameters();
      if (params.encodings && params.encodings[0]) {
        params.encodings[0].maxBitrate = bitrates[quality];
        await sender.setParameters(params);
        console.log(`✅ [SimpleWebRTC] Encoder bitrate set to ${bitrates[quality] / 1000000} Mbps`);
      }
    } catch (error) {
      console.warn('⚠️ [SimpleWebRTC] Could not update encoder bitrate:', error);
    }
  }

  private async cleanup() {
    console.log('🧹 [SimpleWebRTC] Cleaning up...');
    
    // Stop recovery attempts
    this.stopRecovery();
    
    if (this.adaptiveIntervalId) {
      clearInterval(this.adaptiveIntervalId);
      this.adaptiveIntervalId = null;
    }
    
    this.clearConnectionTimeout();

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
    await new Promise(resolve => setTimeout(resolve, 300));

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

  /**
   * Pre-call network quality analysis (Copilot-style silent check)
   * Returns quality level to help decide call route
   */
  private async analyzeNetworkQuality(): Promise<'excellent' | 'good' | 'fair' | 'poor'> {
    try {
      // Measure latency via fetch
      const startTime = performance.now();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      try {
        await fetch('https://www.google.com/favicon.ico', {
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch {
        clearTimeout(timeoutId);
      }
      
      const latency = performance.now() - startTime;
      
      // Check connection type if available
      const connection = (navigator as any).connection;
      const effectiveType = connection?.effectiveType;
      const downlink = connection?.downlink || 10; // Mbps
      
      console.log(`📶 [SimpleWebRTC] Network: latency=${latency.toFixed(0)}ms, type=${effectiveType}, downlink=${downlink}Mbps`);
      
      // Determine quality based on latency and connection info
      if (!navigator.onLine) {
        return 'poor';
      } else if (latency < 50 && downlink > 10) {
        return 'excellent';
      } else if (latency < 150 && downlink > 5) {
        return 'good';
      } else if (latency < 300 && downlink > 1) {
        return 'fair';
      } else {
        return 'poor';
      }
    } catch (error) {
      console.warn('⚠️ [SimpleWebRTC] Network analysis failed:', error);
      return 'good'; // Assume good on failure
    }
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

  /**
   * Replace the video track with a new track (e.g., for screen sharing)
   */
  async replaceTrack(newTrack: MediaStreamTrack): Promise<void> {
    if (!this.pc) {
      console.error('❌ [SimpleWebRTC] No peer connection available');
      return;
    }

    const sender = this.pc.getSenders().find(s => s.track?.kind === newTrack.kind);
    if (sender) {
      await sender.replaceTrack(newTrack);
      console.log(`✅ [SimpleWebRTC] Replaced ${newTrack.kind} track`);
    }
  }

  async switchCamera() {
    if (!this.localStream) {
      console.error('❌ [SimpleWebRTC] No local stream available');
      return null;
    }
    
    // Reset zoom when switching camera
    await this.restoreOriginalTrack();
    this.zoomLevel = 1;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) {
      console.error('❌ [SimpleWebRTC] No video track found');
      return null;
    }
    
    const currentFacingMode = videoTrack.getSettings().facingMode;
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    
    try {
      console.log(`📷 [SimpleWebRTC] Switching camera from ${currentFacingMode} to ${newFacingMode}`);
      
      videoTrack.stop();
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      const sender = this.pc?.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }
      
      this.localStream.removeTrack(videoTrack);
      this.localStream.addTrack(newVideoTrack);
      
      this.emit('localStream', this.localStream);
      
      console.log(`✅ [SimpleWebRTC] Camera switched to ${newFacingMode}`);
      return newFacingMode;
    } catch (error) {
      console.error('❌ [SimpleWebRTC] Failed to switch camera:', error);
      throw error;
    }
  }
}
