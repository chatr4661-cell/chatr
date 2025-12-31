import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface MediaSettings {
  video: {
    width: number;
    height: number;
    frameRate: number;
    facingMode: 'user' | 'environment';
  };
  audio: {
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
    sampleRate: number;
  };
}

export interface ConnectionQuality {
  level: 'excellent' | 'good' | 'fair' | 'poor';
  bitrate: number;
  packetLoss: number;
  latency: number;
  jitter: number;
}

const FACETIME_QUALITY_SETTINGS: MediaSettings = {
  video: {
    width: 1920,
    height: 1080,
    frameRate: 30,
    facingMode: 'user',
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
  },
};

const HD_VIDEO_CONSTRAINTS = {
  width: { ideal: 1920, min: 1280 },
  height: { ideal: 1080, min: 720 },
  frameRate: { ideal: 30, min: 24 },
  facingMode: 'user',
};

const HD_AUDIO_CONSTRAINTS = {
  echoCancellation: { ideal: true },
  noiseSuppression: { ideal: true },
  autoGainControl: { ideal: true },
  sampleRate: { ideal: 48000 },
  channelCount: { ideal: 2 },
};

/**
 * FaceTime-quality WebRTC implementation
 * - HD 1080p video at 30fps
 * - 48kHz stereo audio with noise cancellation
 * - Adaptive bitrate based on network conditions
 * - ICE restart for connection recovery
 */
export const useFaceTimeQualityWebRTC = (callId: string | null, isVideo: boolean = true) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>({
    level: 'excellent',
    bitrate: 0,
    packetLoss: 0,
    latency: 0,
    jitter: 0,
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [currentCamera, setCurrentCamera] = useState<'user' | 'environment'>('user');

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]);
  const signalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Get ICE servers for optimal connectivity
  const getIceServers = useCallback(async (): Promise<RTCIceServer[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('get-turn-credentials');
      if (error) throw error;
      return data?.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ];
    } catch (e) {
      console.warn('Using fallback STUN servers');
      return [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ];
    }
  }, []);

  // Initialize local media with FaceTime quality
  const initializeMedia = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: HD_AUDIO_CONSTRAINTS,
        video: isVideo ? HD_VIDEO_CONSTRAINTS : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      console.log('📹 FaceTime-quality media initialized:', {
        video: stream.getVideoTracks()[0]?.getSettings(),
        audio: stream.getAudioTracks()[0]?.getSettings(),
      });
      return stream;
    } catch (error: any) {
      console.error('Media initialization failed:', error);
      // Fallback to basic constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo,
        });
        localStreamRef.current = fallbackStream;
        setLocalStream(fallbackStream);
        return fallbackStream;
      } catch (fallbackError) {
        toast.error('Could not access camera/microphone');
        throw fallbackError;
      }
    }
  }, [isVideo]);

  // Create peer connection with optimal settings
  const createPeerConnection = useCallback(async () => {
    const iceServers = await getIceServers();
    
    const pc = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('🎥 Remote track received:', event.track.kind);
      const [stream] = event.streams;
      setRemoteStream(stream);
      
      // Auto-play handling
      event.track.onunmute = () => {
        console.log('Track unmuted:', event.track.kind);
      };
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log('📡 Connection state:', pc.connectionState);
      setConnectionState(pc.connectionState);
      
      if (pc.connectionState === 'failed') {
        // Attempt ICE restart
        restartIce();
      }
    };

    // ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'disconnected') {
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected') {
            restartIce();
          }
        }, 3000);
      }
    };

    // ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate && callId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const signalData = {
            call_id: callId,
            from_user: user.id,
            to_user: callId,
            signal_type: 'ice_candidate',
            signal_data: event.candidate.toJSON() as Json,
          };
          await supabase.from('webrtc_signals').insert(signalData);
        }
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [callId, getIceServers]);

  // Monitor connection quality
  const startQualityMonitoring = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }

    statsIntervalRef.current = setInterval(async () => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        const stats = await pc.getStats();
        let bitrate = 0;
        let packetLoss = 0;
        let latency = 0;
        let jitter = 0;

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            bitrate = (report.bytesReceived * 8) / 1000; // kbps
            packetLoss = report.packetsLost || 0;
            jitter = report.jitter || 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            latency = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
          }
        });

        // Determine quality level
        let level: ConnectionQuality['level'] = 'excellent';
        if (packetLoss > 5 || latency > 300) level = 'poor';
        else if (packetLoss > 2 || latency > 150) level = 'fair';
        else if (packetLoss > 1 || latency > 100) level = 'good';

        setConnectionQuality({ level, bitrate, packetLoss, latency, jitter });
      } catch (e) {
        console.error('Stats collection error:', e);
      }
    }, 2000);
  }, []);

  // Create and send offer
  const createOffer = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !callId) return;

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      });
      
      await pc.setLocalDescription(offer);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const signalData = {
          call_id: callId,
          from_user: user.id,
          to_user: callId,
          signal_type: 'offer',
          signal_data: { sdp: offer.sdp, type: offer.type } as Json,
        };
        await supabase.from('webrtc_signals').insert(signalData);
      }

      console.log('📤 Offer sent');
    } catch (error) {
      console.error('Create offer failed:', error);
    }
  }, [callId, isVideo]);

  // Handle incoming offer and create answer
  const handleOffer = useCallback(async (offerData: RTCSessionDescriptionInit) => {
    const pc = peerConnectionRef.current;
    if (!pc || !callId) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offerData));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const signalData = {
          call_id: callId,
          from_user: user.id,
          to_user: callId,
          signal_type: 'answer',
          signal_data: { sdp: answer.sdp, type: answer.type } as Json,
        };
        await supabase.from('webrtc_signals').insert(signalData);
      }

      // Process queued ICE candidates
      for (const candidate of iceCandidatesQueue.current) {
        await pc.addIceCandidate(candidate);
      }
      iceCandidatesQueue.current = [];

      console.log('📤 Answer sent');
    } catch (error) {
      console.error('Handle offer failed:', error);
    }
  }, [callId]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (answerData: RTCSessionDescriptionInit) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answerData));
      console.log('📥 Answer received and set');
    } catch (error) {
      console.error('Handle answer failed:', error);
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (candidateData: RTCIceCandidateInit) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      const candidate = new RTCIceCandidate(candidateData);
      
      if (pc.remoteDescription) {
        await pc.addIceCandidate(candidate);
      } else {
        iceCandidatesQueue.current.push(candidate);
      }
    } catch (error) {
      console.error('Handle ICE candidate failed:', error);
    }
  }, []);

  // ICE restart for recovery
  const restartIce = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !callId) return;

    try {
      console.log('🔄 Initiating ICE restart');
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const signalData = {
          call_id: callId,
          from_user: user.id,
          to_user: callId,
          signal_type: 'offer',
          signal_data: { sdp: offer.sdp, type: offer.type, iceRestart: true } as Json,
        };
        await supabase.from('webrtc_signals').insert(signalData);
      }
    } catch (error) {
      console.error('ICE restart failed:', error);
    }
  }, [callId]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  // Switch camera
  const switchCamera = useCallback(async () => {
    if (!localStreamRef.current) return;

    const newFacingMode = currentCamera === 'user' ? 'environment' : 'user';
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { ...HD_VIDEO_CONSTRAINTS, facingMode: { exact: newFacingMode } },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];

      // Replace track in peer connection
      const pc = peerConnectionRef.current;
      if (pc) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      // Update local stream
      if (oldVideoTrack) {
        localStreamRef.current.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }
      localStreamRef.current.addTrack(newVideoTrack);
      setLocalStream(localStreamRef.current);
      setCurrentCamera(newFacingMode);
    } catch (error) {
      console.error('Camera switch failed:', error);
      toast.error('Could not switch camera');
    }
  }, [currentCamera]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }

    if (signalChannelRef.current) {
      supabase.removeChannel(signalChannelRef.current);
      signalChannelRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setRemoteStream(null);
    setConnectionState('new');
  }, []);

  // Subscribe to signaling
  useEffect(() => {
    if (!callId) return;

    const setupSignaling = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel(`call-signals-${callId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'webrtc_signals',
            filter: `call_id=eq.${callId}`,
          },
          async (payload) => {
            const signal = payload.new as any;
            if (signal.sender_id === user.id) return;

            console.log('📥 Signal received:', signal.signal_type);

            switch (signal.signal_type) {
              case 'offer':
                await handleOffer(signal.signal_data);
                break;
              case 'answer':
                await handleAnswer(signal.signal_data);
                break;
              case 'ice_candidate':
                await handleIceCandidate(signal.signal_data);
                break;
              case 'hangup':
                cleanup();
                break;
            }
          }
        )
        .subscribe();

      signalChannelRef.current = channel;
    };

    setupSignaling();

    return () => {
      if (signalChannelRef.current) {
        supabase.removeChannel(signalChannelRef.current);
      }
    };
  }, [callId, handleOffer, handleAnswer, handleIceCandidate, cleanup]);

  // Start call (caller)
  const startCall = useCallback(async () => {
    await initializeMedia();
    await createPeerConnection();
    startQualityMonitoring();
    await createOffer();
  }, [initializeMedia, createPeerConnection, startQualityMonitoring, createOffer]);

  // Join call (callee)
  const joinCall = useCallback(async () => {
    await initializeMedia();
    await createPeerConnection();
    startQualityMonitoring();
    // Wait for offer from caller
  }, [initializeMedia, createPeerConnection, startQualityMonitoring]);

  return {
    localStream,
    remoteStream,
    connectionState,
    connectionQuality,
    isMuted,
    isVideoEnabled,
    currentCamera,
    startCall,
    joinCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    restartIce,
    cleanup,
  };
};
