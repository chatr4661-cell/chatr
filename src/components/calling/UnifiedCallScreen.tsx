import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Mic, MicOff, PhoneOff, Volume2, Video, VideoOff, 
  SwitchCamera, Grid3X3, MoreHorizontal, WifiOff, ZoomIn, ZoomOut
} from 'lucide-react';
import { SimpleWebRTCCall, hasActiveCall, getExistingCall } from '@/utils/simpleWebRTC';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallKeepAlive } from '@/hooks/useCallKeepAlive';
import { Capacitor } from '@capacitor/core';
import { syncCallStateToNative } from '@/utils/androidBridge';
import CallMoreMenu from './CallMoreMenu';
import { startAggressiveVideoPlayback, attachVideoTrackRecoveryHandlers } from '@/utils/androidVideoPlayback';
import NetworkStatusBanner, { SignalStrengthIndicator, VideoDisabledNotice } from '@/components/calls/NetworkStatusBanner';
import useUltraLowBandwidth from '@/hooks/useUltraLowBandwidth';
import { MediaQuality } from '@/utils/gracefulDegradation';
import { stopAllRingtones } from '@/hooks/useNativeRingtone';
import NetworkDiagnosticsPanel from './NetworkDiagnosticsPanel';
import { useVideoZoom } from '@/hooks/useVideoZoom';

type AudioRoute = 'earpiece' | 'speaker' | 'bluetooth';

interface UnifiedCallScreenProps {
  callId: string;
  contactName: string;
  contactAvatar?: string;
  contactPhone?: string;
  isInitiator: boolean;
  partnerId: string;
  callType: 'voice' | 'video';
  preAcquiredStream?: MediaStream | null;
  onEnd: () => void;
  onSwitchToVideo?: () => void;
  videoEnabled?: boolean;
}

export default function UnifiedCallScreen({
  callId,
  contactName,
  contactAvatar,
  contactPhone,
  isInitiator,
  partnerId,
  callType,
  preAcquiredStream = null,
  onEnd,
  onSwitchToVideo,
  videoEnabled = false,
}: UnifiedCallScreenProps) {
  const [callState, setCallState] = useState<'connecting' | 'connected' | 'reconnecting' | 'failed'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video' || videoEnabled);
  const [audioRoute, setAudioRoute] = useState<AudioRoute>('speaker'); // Default to speaker for hands-free
  const [duration, setDuration] = useState(0);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [localVideoActive, setLocalVideoActive] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [currentTier, setCurrentTier] = useState<string>('720p');
  
  // Video upgrade states (simplified - no request/accept flow, FaceTime-style auto)

  const webrtcRef = useRef<SimpleWebRTCCall | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null); // Must be a DOM element for mobile autoplay
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const userIdRef = useRef<string | null>(null);
  const videoPlaybackCleanupRef = useRef<(() => void) | null>(null);
  const trackRecoveryCleanupRef = useRef<(() => void) | null>(null);

  const isVideo = callType === 'video' || isVideoOn || videoEnabled;
  const isMobile = Capacitor.isNativePlatform() || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Pinch-to-zoom for video (max 2x) — sends zoomed video to partner
  const { containerRef: zoomContainerRef, style: zoomStyle, scale: zoomScale, isZoomed, resetZoom, zoomIn, zoomOut } = useVideoZoom({
    minScale: 1,
    maxScale: 2,
    enabled: callState === 'connected' && remoteVideoActive
  });
  const callStateRef = useRef(callState);

  useCallKeepAlive(callId, callState === 'connected');
  
  // CRITICAL: Stop any ringtones when call screen opens (safety measure)
  useEffect(() => {
    stopAllRingtones();
  }, []);

  // Keep a stable reference for realtime callbacks (prevents stale closures)
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Ultra-low bandwidth optimizations
  // Note: peerConnection is accessed lazily since webrtcRef.current may not be set yet
  const getPeerConnection = useCallback(() => {
    return webrtcRef.current?.getPeerConnection?.() || null;
  }, []);
  
  const {
    networkMode,
    modeName,
    videoAllowed,
    videoRequiresTap,
    currentQuality,
    qualityDescription,
    uiState,
    signalStrength,
    showWarning,
    isOffline,
    applyOptimization,
    triggerRecovery,
    canEnableVideo
  } = useUltraLowBandwidth({
    // Don't pass peerConnection directly - it's not available on first render
    callId,
    onQualityChange: (quality, reason) => {
      console.log(`📶 [UnifiedCall] Quality changed: ${MediaQuality[quality]} - ${reason}`);
      if (quality <= MediaQuality.AUDIO_LOW) {
        setNetworkQuality('poor');
      } else if (quality <= MediaQuality.AUDIO_HD) {
        setNetworkQuality('fair');
      } else {
        setNetworkQuality('good');
      }
    },
    onFallbackToText: () => {
      toast.warning('Network too weak for voice - switching to text');
    }
  });

  // Auto-hide controls for video calls
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (isVideo && callState === 'connected') {
      controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
    }
  }, [isVideo, callState]);

  useEffect(() => {
    resetControlsTimer();
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
  }, [resetControlsTimer]);

  // Listen for call ended in database (when partner ends call from app)
  useEffect(() => {
    const channel = supabase
      .channel(`call-status-${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${callId}`,
        },
        (payload) => {
          const updatedCall = payload.new as any;
          console.log('📡 [UnifiedCall] Call status update:', updatedCall.status);

          // If backend marks WebRTC as connected, force UI into connected state.
          // This fixes cases where we re-attach to an existing WebRTC instance and miss the 'connected' event.
          if (
            (updatedCall.webrtc_state === 'connected' || updatedCall.status === 'active') &&
            callStateRef.current !== 'connected'
          ) {
            console.log('✅ [UnifiedCall] Sync: backend says connected');
            setCallState('connected');
            startDurationTimer();
            syncCallStateToNative(callId, 'connected');
          }

          if (updatedCall.status === 'ended' || updatedCall.status === 'missed') {
            console.log('📵 [UnifiedCall] Call ended by partner');
            cleanup();
            onEnd();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId, onEnd]);

  // Initialize WebRTC - STRICT SINGLETON
  useEffect(() => {
    let isMounted = true;
    
    const initCall = async () => {
      try {
        // CRITICAL: Prevent duplicate initialization
        if (webrtcRef.current) {
          console.log('⚠️ [UnifiedCall] Already initialized, skipping');
          return;
        }
        
        // CRITICAL: Check if another instance is already handling this call
        if (hasActiveCall(callId)) {
          const existing = getExistingCall(callId);
          if (existing) {
            console.log('⚠️ [UnifiedCall] Reusing existing WebRTC instance');
            webrtcRef.current = existing;

            // Re-attach event handlers
            attachEventHandlers(existing);

            // Ensure the underlying WebRTC is actually started (safe: start() is idempotent)
            await existing.start();

            // If we missed the 'connected' event, sync from peer connection state
            const pc = existing.getPeerConnection?.();
            if (pc && (pc.connectionState === 'connected' || pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed')) {
              console.log('✅ [UnifiedCall] Sync: existing peer connection already connected');
              setCallState('connected');
              startDurationTimer();
            }

            return;
          }
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) {
          if (!user) toast.error('Not authenticated');
          if (isMounted) onEnd();
          return;
        }
        userIdRef.current = user.id;

        console.log('🎬 [UnifiedCall] Starting', isInitiator ? 'outgoing' : 'incoming', callType, 'call');
        
        const call = SimpleWebRTCCall.create(callId, partnerId, isVideo, isInitiator, user.id, preAcquiredStream);
        if (!isMounted) {
          call.end();
          return;
        }
        webrtcRef.current = call;

        attachEventHandlers(call);

        await call.start();
        if (isInitiator && isMounted) await updateCallStatus('ringing');

      } catch (error) {
        console.error('❌ [UnifiedCall] Init error:', error);
        if (isMounted) onEnd();
      }
    };
    
    const attachEventHandlers = (call: SimpleWebRTCCall) => {
      call.on('localStream', (stream: MediaStream) => {
        console.log('📹 [UnifiedCall] Local stream received/updated');
        setLocalStream(stream);
        if (localVideoRef.current) {
          const videoTracks = stream.getVideoTracks();
          if (videoTracks.length > 0) {
            // Always rebind srcObject so camera switch gets the fresh stream
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.muted = true;
            localVideoRef.current.play().catch(e => console.log('Local video play:', e));
            setLocalVideoActive(true);
            // Mirror front camera, don't mirror rear
            const facing = (videoTracks[0].getSettings().facingMode) || call.getCurrentFacingMode?.() || 'user';
            localVideoRef.current.style.transform = facing === 'environment'
              ? 'translateZ(0)'
              : 'scaleX(-1) translateZ(0)';
          }
        }
      });

      // Listen for explicit facing mode changes (for browsers that don't report facingMode in settings)
      call.on('facingModeChanged', (facing: string) => {
        if (localVideoRef.current) {
          localVideoRef.current.style.transform = facing === 'environment'
            ? 'translateZ(0)'
            : 'scaleX(-1) translateZ(0)';
        }
      });

      call.on('remoteStream', (stream: MediaStream) => {
        console.log('📺 [UnifiedCall] Remote stream received');
        const audioTracks = stream.getAudioTracks();
        const videoTracks = stream.getVideoTracks();
        console.log(`  → Audio tracks: ${audioTracks.length}, Video tracks: ${videoTracks.length}`);
        audioTracks.forEach(t => console.log(`    🔊 Audio: ${t.label}, enabled: ${t.enabled}, muted: ${t.muted}`));
        videoTracks.forEach(t => console.log(`    📹 Video: ${t.label}, enabled: ${t.enabled}, muted: ${t.muted}`));
        
        // CRITICAL: Always setup audio via the DOM <audio> element (must be in DOM for mobile autoplay)
        // On Android WebView, audio MUST go through a DOM element, not just the PeerConnection
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
          remoteAudioRef.current.volume = 1.0;
          
          // CRITICAL FIX: Use muted-then-unmuted strategy for Android WebView autoplay
          const tryAudioPlay = async () => {
            const audioEl = remoteAudioRef.current;
            if (!audioEl) return;
            
            try {
              // Strategy 1: Direct unmuted play
              await audioEl.play();
              console.log('🔊 [UnifiedCall] Audio playing (direct)');
            } catch (e1) {
              console.log('🔊 [UnifiedCall] Direct audio play blocked, trying muted...');
              try {
                // Strategy 2: Muted play then unmute
                audioEl.muted = true;
                await audioEl.play();
                // Small delay then unmute
                setTimeout(() => {
                  if (audioEl) {
                    audioEl.muted = false;
                    audioEl.volume = 1.0;
                    console.log('🔊 [UnifiedCall] Audio unmuted after muted play');
                  }
                }, 100);
              } catch (e2) {
                console.warn('🔊 [UnifiedCall] Audio play failed, will retry on interaction:', e2);
                // Strategy 3: Wait for user interaction
                const playOnInteraction = () => {
                  audioEl?.play().then(() => {
                    console.log('🔊 [UnifiedCall] Audio playing after interaction');
                  }).catch(() => {});
                  document.removeEventListener('touchstart', playOnInteraction);
                  document.removeEventListener('click', playOnInteraction);
                };
                document.addEventListener('touchstart', playOnInteraction, { once: true });
                document.addEventListener('click', playOnInteraction, { once: true });
              }
            }
          };
          
          tryAudioPlay();
        }
        
        // VIDEO PLAYBACK: Works for both desktop and mobile/WebView
        // Handles muted tracks, srcObject re-assignment, and retry loops
        if (remoteVideoRef.current && videoTracks.length > 0) {
          console.log('📺 [UnifiedCall] Starting aggressive video playback');
          
          // CRITICAL FIX: Immediately assign srcObject and show video
          remoteVideoRef.current.srcObject = stream;
          // CRITICAL: Start muted to bypass Android WebView autoplay policy, then unmute
          remoteVideoRef.current.muted = true;
          
          // OPTIMISTIC: Enable video visibility immediately when tracks exist
          const hasActiveTrack = videoTracks.some(t => t.enabled && t.readyState === 'live');
          if (hasActiveTrack) {
            console.log('📺 [UnifiedCall] OPTIMISTIC: Enabling remote video immediately');
            setRemoteVideoActive(true);
          }
          
          // Cleanup previous playback attempt
          if (videoPlaybackCleanupRef.current) {
            videoPlaybackCleanupRef.current();
          }
          
          // Try muted play first (avoids AbortError on Android WebView), then unmute
          remoteVideoRef.current.play().then(() => {
            // Successfully started muted, now unmute after small delay
            setTimeout(() => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.muted = false;
                console.log('📺 [UnifiedCall] Video unmuted after muted start');
              }
            }, 100);
          }).catch(() => {
            console.log('📺 [UnifiedCall] Initial muted play attempt failed, relying on retry loop...');
          });
          
          // Start aggressive playback with retry loop (still needed for edge cases)
          videoPlaybackCleanupRef.current = startAggressiveVideoPlayback(
            remoteVideoRef.current,
            stream,
            {
              maxRetries: 15,
              retryIntervalMs: 400,
              onPlaybackStarted: () => {
                console.log('✅ [UnifiedCall] Remote video PLAYING (aggressive)');
                setRemoteVideoActive(true);
              },
              onPlaybackFailed: () => {
                console.warn('⚠️ [UnifiedCall] Video playback failed after all retries');
                // Fallback: force-enable if video element has srcObject with video tracks
                if (remoteVideoRef.current?.srcObject) {
                  const currentStream = remoteVideoRef.current.srcObject as MediaStream;
                  if (currentStream.getVideoTracks().length > 0) {
                    console.log('🔄 [UnifiedCall] Fallback: enabling remote video state');
                    setRemoteVideoActive(true);
                  }
                }
              }
            }
          );
          
          // SAFETY: Fast fallback check after 1 second
          setTimeout(() => {
            setRemoteVideoActive(current => {
              if (!current && remoteVideoRef.current?.srcObject) {
                const currentStream = remoteVideoRef.current.srcObject as MediaStream;
                if (currentStream.getVideoTracks().length > 0) {
                  console.log('🔄 [UnifiedCall] 1s fallback: forcing remote video active');
                  remoteVideoRef.current.play().catch(() => {});
                  return true;
                }
              }
              return current;
            });
          }, 1000);
          
          // SAFETY: Additional fallback check after 3 seconds
          setTimeout(() => {
            setRemoteVideoActive(current => {
              if (!current && remoteVideoRef.current?.srcObject) {
                const currentStream = remoteVideoRef.current.srcObject as MediaStream;
                if (currentStream.getVideoTracks().length > 0) {
                  console.log('🔄 [UnifiedCall] 3s fallback: forcing remote video active');
                  remoteVideoRef.current.play().catch(() => {});
                  return true;
                }
              }
              return current;
            });
          }, 3000);
        } else if (remoteVideoRef.current) {
          // No video tracks yet, but assign stream for later
          console.log('📺 [UnifiedCall] Assigning stream (no video tracks yet)');
          remoteVideoRef.current.srcObject = stream;
        }
        
        // ANDROID WEBVIEW FIX: Attach comprehensive track recovery handlers
        // This handles onunmute, onended, onmute, and track additions
        if (trackRecoveryCleanupRef.current) {
          trackRecoveryCleanupRef.current();
        }
        
        trackRecoveryCleanupRef.current = attachVideoTrackRecoveryHandlers(
          stream,
          remoteVideoRef.current!,
          (active) => {
            console.log(`📺 [UnifiedCall] Video active state: ${active}`);
            setRemoteVideoActive(active);
            
            // If video became active, ensure we're playing
            if (active && remoteVideoRef.current) {
              remoteVideoRef.current.play().catch(() => {});
            }
          }
        );
        
        // BIDIRECTIONAL: Listen for tracks added AFTER initial stream
        // This handles FaceTime-style video upgrade AND delayed video from receiver
        stream.onaddtrack = (event) => {
          console.log('➕ [UnifiedCall] Track added:', event.track.kind, event.track.label);
          if (event.track.kind === 'video' && remoteVideoRef.current) {
            console.log('📺 [UnifiedCall] Video track added - starting aggressive playback');
            
            // Cleanup and restart aggressive playback
            if (videoPlaybackCleanupRef.current) {
              videoPlaybackCleanupRef.current();
            }
            
            videoPlaybackCleanupRef.current = startAggressiveVideoPlayback(
              remoteVideoRef.current,
              stream,
              {
                maxRetries: 15,
                retryIntervalMs: 400,
                onPlaybackStarted: () => setRemoteVideoActive(true),
                onPlaybackFailed: () => console.warn('Dynamic video playback failed')
              }
            );
          }
        };
      });

      call.on('connected', () => {
        console.log('🎉 [UnifiedCall] Connected!');
        setCallState('connected');
        startDurationTimer();
        // NOTE: Call status is now updated to 'active' inside SimpleWebRTCCall.handleConnected()
        // No need for duplicate updateCallStatus('active') here
        
        // CRITICAL: Notify native shell about connection
        syncCallStateToNative(callId, 'connected');
      });

      call.on('failed', (error: Error) => {
        console.error('⚠️ [UnifiedCall] Failed:', error);
        const name = error?.name;
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
          setCallState('failed');
        } else if (name === 'NotReadableError') {
          toast.error('Camera/Mic is busy. Close other apps.');
        } else {
          setCallState('reconnecting');
        }
      });

      call.on('recoveryStatus', () => {
        if (callStateRef.current !== 'connected') setCallState('reconnecting');
      });

      call.on('networkQuality', (quality: string) => {
        if (['excellent', 'good', 'fair', 'poor'].includes(quality)) {
          setNetworkQuality(quality as any);
        }
      });

      call.on('ended', () => {
        console.log('👋 [UnifiedCall] Ended by remote');
        handleEndCall();
      });

      // FaceTime-style: When partner's renegotiation with video arrives, auto-enable our camera
      call.on('renegotiationComplete', () => {
        console.log('📹 [UnifiedCall] Renegotiation complete - checking for video upgrade');
      });

      // ABR tier change tracking
      call.on('tierChange', ({ tier, reason }: { tier: string; reason: string }) => {
        console.log(`📊 [UnifiedCall] Tier: ${tier} (${reason})`);
        setCurrentTier(tier);
      });

      // Auto video enable: partner clicked video, we auto-enable too
      call.on('videoEnableRequested', async (fromUserId: string) => {
        console.log('📹 [UnifiedCall] Partner requested video enable - auto-enabling...');
        try {
          const videoStream = await webrtcRef.current?.addVideoToCall();
          if (videoStream && localVideoRef.current) {
            localVideoRef.current.srcObject = videoStream;
            localVideoRef.current.muted = true;
            await localVideoRef.current.play().catch(e => console.log('Local video play:', e));
            setLocalVideoActive(true);
            setIsVideoOn(true);
            toast.success('Video enabled');
          }
        } catch (e) {
          console.warn('📹 [UnifiedCall] Could not auto-enable video:', e);
        }
      });

      // CRITICAL: Handle remote video track arrival (for mid-call upgrades)
      // This ensures video plays even when stream reference doesn't change
      call.on('remoteVideoTrack', ({ track, stream }: { track: MediaStreamTrack; stream: MediaStream }) => {
        console.log('📺 [UnifiedCall] Remote VIDEO track received - forcing playback');
        
        if (!remoteVideoRef.current) return;
        
        // OPTIMISTIC: Enable video visibility IMMEDIATELY
        // Don't wait for playback detection - users should see video right away
        console.log('📺 [UnifiedCall] OPTIMISTIC: Enabling remote video immediately (remoteVideoTrack)');
        setRemoteVideoActive(true);
        setIsVideoOn(true);
        
        // Force rebind srcObject to trigger video element refresh
        remoteVideoRef.current.srcObject = null;
        remoteVideoRef.current.srcObject = stream;
        
        // Try immediate play
        remoteVideoRef.current.play().catch(() => {
          console.log('📺 [UnifiedCall] Initial remoteVideoTrack play failed, retrying...');
        });
        
        // Start aggressive playback for the new video track (backup)
        if (videoPlaybackCleanupRef.current) {
          videoPlaybackCleanupRef.current();
        }
        
        videoPlaybackCleanupRef.current = startAggressiveVideoPlayback(
          remoteVideoRef.current,
          stream,
          {
            maxRetries: 15,
            retryIntervalMs: 400,
            onPlaybackStarted: () => {
              console.log('✅ [UnifiedCall] Remote video PLAYING after upgrade');
              setRemoteVideoActive(true);
            },
            onPlaybackFailed: () => {
              console.warn('⚠️ [UnifiedCall] Video upgrade playback failed');
              // Force enable anyway if video track exists
              setRemoteVideoActive(true);
            }
          }
        );
      });
    };

    initCall();
    return () => {
      isMounted = false;
      cleanup();
    };
  }, [callId]); // Only depend on callId - prevents re-init on prop changes

  // Enable video mid-call
  useEffect(() => {
    if (!videoEnabled || !webrtcRef.current || localVideoActive) return;
    
    const addVideo = async () => {
      console.log('📹 [UnifiedCall] Adding video to call...');
      const videoStream = await webrtcRef.current?.addVideoToCall();
      if (videoStream && localVideoRef.current) {
        localVideoRef.current.srcObject = videoStream;
        localVideoRef.current.muted = true;
        localVideoRef.current.play().catch(e => console.log('Local video play:', e));
        setLocalVideoActive(true);
        setIsVideoOn(true);
      }
    };
    addVideo();
  }, [videoEnabled, localVideoActive]);

  const startDurationTimer = () => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    durationIntervalRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  };

  const updateCallStatus = async (status: string) => {
    try {
      await supabase.from('calls').update({ 
        status,
        webrtc_state: status === 'active' ? 'connected' : 'signaling',
        ...(status === 'active' ? { started_at: new Date().toISOString() } : {})
      }).eq('id', callId);
    } catch (e) { console.error('Status update failed:', e); }
  };

  const handleEndCall = async () => {
    cleanup();
    
    // Notify native shell
    syncCallStateToNative(callId, 'ended');
    
    try {
      await supabase.from('calls').update({ 
        status: 'ended', webrtc_state: 'ended', ended_at: new Date().toISOString(), duration 
      }).eq('id', callId);
    } catch (e) { console.error('End call update failed:', e); }
    onEnd();
  };

  const cleanup = () => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    
    // ANDROID WEBVIEW FIX: Cleanup video playback helpers
    if (videoPlaybackCleanupRef.current) {
      videoPlaybackCleanupRef.current();
      videoPlaybackCleanupRef.current = null;
    }
    if (trackRecoveryCleanupRef.current) {
      trackRecoveryCleanupRef.current();
      trackRecoveryCleanupRef.current = null;
    }
    
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      // Don't set srcObject=null here - React manages the DOM element lifecycle
    }
    if (webrtcRef.current) {
      webrtcRef.current.end();
      webrtcRef.current = null;
    }
  };

  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    webrtcRef.current?.toggleAudio(!newState);
  };

  // FaceTime-style instant video toggle - no request/accept flow
  const toggleVideo = async () => {
    const call = webrtcRef.current;
    if (!call) return;

    if (!isVideoOn) {
      // Check network policy first
      if (!canEnableVideo()) {
        toast.warning(uiState.message || 'Video not available on current network');
        return;
      }

      console.log('📹 [UnifiedCall] Enabling video (FaceTime-style)...');

      // Ensure the local PIP mounts so localVideoRef is available
      setIsVideoOn(true);
      setLocalVideoActive(true);

      // Wait a frame so the <video ref={localVideoRef}> is mounted
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      try {
        let videoStream: MediaStream | null = null;

        if (isInitiator) {
          // Initiator performs the renegotiation (prevents offer glare)
          videoStream = await call.addVideoToCall();
        } else {
          // Non-initiator: enable local camera WITHOUT renegotiation,
          // then ask initiator to renegotiate.
          videoStream = await call.enableLocalVideoAfterAccept();
          await call.sendVideoEnable();
        }

        if (videoStream && localVideoRef.current) {
          localVideoRef.current.srcObject = videoStream;
          localVideoRef.current.muted = true;
          await localVideoRef.current.play().catch((e) => console.log('Local video play:', e));
          toast.success('Video enabled');
          return;
        }

        // If we got here, we failed to attach preview
        setIsVideoOn(false);
        setLocalVideoActive(false);
        toast.error('Could not enable video');
      } catch (e) {
        console.error('📹 [UnifiedCall] Video enable failed:', e);
        setIsVideoOn(false);
        setLocalVideoActive(false);
        toast.error('Camera access failed');
      }
    } else {
      // Turn off video
      console.log('📹 [UnifiedCall] Disabling video...');
      setIsVideoOn(false);
      call.toggleVideo(false);
      setLocalVideoActive(false);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
     console.log('📹 [UnifiedCall] Video disabled');
    }
  };

  const switchCamera = async () => {
    if (!localVideoActive || !webrtcRef.current) {
      toast.error('Enable video first');
      return;
    }
    try {
      // switchCamera() in simpleWebRTC re-emits 'localStream' with the fresh stream.
      // The 'localStream' event handler above handles srcObject rebind + mirror transform.
      // No manual DOM manipulation needed here — avoids stale stream race condition.
      const newFacing = await webrtcRef.current.switchCamera();
      console.log(`📷 [UnifiedCall] Camera switched to: ${newFacing}`);
      toast.success(newFacing === 'environment' ? '🔭 Rear camera' : '🤳 Front camera');
    } catch (e) { 
      console.error('Switch camera error:', e);
      toast.error('Could not switch camera'); 
    }
  };

  const cycleAudioRoute = () => {
    const routes: AudioRoute[] = ['speaker', 'earpiece'];
    const idx = routes.indexOf(audioRoute);
    const newRoute = routes[(idx + 1) % routes.length];
    setAudioRoute(newRoute);
    
    // Apply audio output change to actual audio element
    if (remoteAudioRef.current) {
      // On web, we can't directly control earpiece vs speaker
      // But we can set speaker mode via Web Audio API or native bridge
      if (Capacitor.isNativePlatform()) {
        // On native, use Capacitor plugin or bridge to control audio route
        // For now, just show toast - actual implementation would use native audio routing
        console.log(`📱 Setting audio route: ${newRoute}`);
      }
    }
    
   console.log(`📱 [UnifiedCall] Audio route: ${newRoute === 'speaker' ? 'Speaker' : 'Earpiece'}`);
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const keypadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  
  const handleDTMF = (digit: string) => {
    webrtcRef.current?.sendDTMF(digit);
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440 + (parseInt(digit) || 0) * 50;
    gain.gain.value = 0.1;
    osc.start();
    setTimeout(() => osc.stop(), 100);
  };

  const callUI = (
    <div 
      className="fixed inset-0 z-[99999] bg-black flex flex-col overflow-hidden select-none"
      style={{ 
        height: '100dvh', 
        width: '100vw', 
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        isolation: 'isolate',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        willChange: 'transform, opacity',
        contain: 'layout style paint',
        transform: 'translateZ(0)', // Force GPU layer for smooth touch
        backfaceVisibility: 'hidden',
        perspective: 1000,
      }}
      onClick={() => resetControlsTimer()}
    >
      {/* CRITICAL: Hidden audio element in DOM for remote audio - needed for mobile/WebView autoplay policy */}
      {/* Audio elements NOT in DOM are blocked by browsers on mobile. This must stay rendered. */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: 'none', position: 'absolute', pointerEvents: 'none' }}
      />

      {/* Background - Full-screen HD Remote Video with pinch-to-zoom */}
      <div
        ref={zoomContainerRef}
        className="absolute inset-0 overflow-hidden"
        style={{ zIndex: 1, ...zoomStyle }}
      >
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full bg-black"
          style={{
            width: '100vw',
            height: '100dvh',
            minHeight: '-webkit-fill-available',
            objectFit: 'cover',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            perspective: 1000,
            opacity: remoteVideoActive ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      </div>
      
      {/* Show avatar when no remote video - with smooth transitions */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center"
        style={{ 
          transform: 'translateZ(0)',
          opacity: remoteVideoActive ? 0 : 1,
          transition: 'opacity 0.3s ease',
          zIndex: 0,
        }}
      >
        {contactAvatar ? (
          <img 
            src={contactAvatar} 
            alt={contactName} 
            className="w-28 h-28 rounded-full object-cover ring-4 ring-white/10 shadow-2xl transition-transform duration-200 active:scale-95" 
          />
        ) : (
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center ring-4 ring-white/10 transition-transform duration-200 active:scale-95">
            <span className="text-5xl font-bold text-white">{contactName.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Local Video PIP - keep mounted so ref exists; hide when inactive */}
      <motion.div
        initial={false}
        animate={localVideoActive ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        whileTap={localVideoActive ? { scale: 0.95 } : undefined}
        className={`absolute top-16 right-4 w-28 h-40 sm:w-32 sm:h-44 rounded-2xl overflow-hidden border-2 border-white/40 shadow-2xl z-20 ${
          localVideoActive ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        style={{
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      >
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{
            transform: 'scaleX(-1) translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        />
        {/* HD indicator removed for clean FaceTime look */}
      </motion.div>

      {/* Network Status Banner - Ultra-Low Bandwidth */}
      {showWarning && (
        <div className="absolute top-2 inset-x-4 z-50 flex justify-center">
          <NetworkStatusBanner compact />
        </div>
      )}

      {/* Network Diagnostics Panel - Triple-tap quality indicator to show */}
      <NetworkDiagnosticsPanel
        peerConnection={webrtcRef.current?.getPeerConnection?.() || null}
        isVisible={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
        currentTier={currentTier}
      />
      
      {/* Video Disabled Notice */}
      {isVideo && !videoAllowed && callState === 'connected' && (
        <div className="absolute top-16 inset-x-4 z-40 flex justify-center">
          <VideoDisabledNotice />
        </div>
      )}

      {/* Zoom indicator */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full"
          >
            <span className="text-white text-sm font-medium">{zoomScale.toFixed(1)}x</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoom controls */}
      <AnimatePresence>
        {remoteVideoActive && controlsVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-52 right-4 z-40 flex flex-col gap-2"
          >
            {zoomScale < 2 && (
              <button
                onClick={() => {
                  zoomIn();
                  const newZoom = Math.min(2, zoomScale + 0.5);
                  webrtcRef.current?.applyZoom(newZoom);
                }}
                className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
              >
                <ZoomIn className="w-5 h-5 text-white" />
              </button>
            )}
            {isZoomed && (
              <button
                onClick={() => {
                  resetZoom();
                  webrtcRef.current?.applyZoom(1);
                }}
                className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
              >
                <ZoomOut className="w-5 h-5 text-white" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 inset-x-0 z-30 pt-safe"
            style={{ paddingTop: 'max(env(safe-area-inset-top, 16px), 16px)' }}
          >
            <div className="flex flex-col items-center py-4">
              {/* Signal Strength + Quality indicator (long-press for diagnostics) */}
              <div className="flex items-center gap-2 mb-2">
                <SignalStrengthIndicator size="sm" />
                <button
                  onDoubleClick={() => setShowDiagnostics(prev => !prev)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    networkQuality === 'excellent' || networkQuality === 'good' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : networkQuality === 'fair' 
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                  }`}>
                  {currentTier !== '720p' ? currentTier.toUpperCase() : (qualityDescription || (networkQuality === 'excellent' || networkQuality === 'good' ? 'HD' : networkQuality === 'fair' ? 'SD' : 'Low'))}
                </button>
              </div>
              
              <h1 className="text-white text-xl font-semibold drop-shadow-lg">{contactName}</h1>
              {contactPhone && <p className="text-white/60 text-sm">{contactPhone}</p>}
              
              <p className={`text-sm mt-1 ${
                callState === 'connected' ? 'text-emerald-400 font-mono' 
                  : callState === 'reconnecting' ? 'text-amber-400 animate-pulse'
                  : callState === 'failed' ? 'text-red-400'
                  : 'text-white/70 animate-pulse'
              }`}>
                {callState === 'connected' && formatDuration(duration)}
                {callState === 'connecting' && 'Connecting...'}
                {callState === 'reconnecting' && (uiState.message || 'Reconnecting...')}
                {callState === 'failed' && 'Connection failed'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keypad Overlay */}
      <AnimatePresence>
        {showKeypad && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-x-4 bottom-48 bg-black/90 backdrop-blur-xl rounded-3xl p-6 z-40"
          >
            <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
              {keypadDigits.map(d => (
                <button key={d} onClick={() => handleDTMF(d)}
                  className="w-16 h-16 rounded-full bg-white/10 text-white text-2xl font-semibold active:bg-white/20 mx-auto flex items-center justify-center">
                  {d}
                </button>
              ))}
            </div>
            <button onClick={() => setShowKeypad(false)} className="w-full mt-4 text-emerald-400 text-sm">Hide Keypad</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="absolute bottom-0 inset-x-0 z-30 pb-safe"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)' }}
          >
            {/* Row 1: Speaker, Video, Mute - Butter-smooth touch */}
            <div className="flex justify-center gap-6 mb-6">
              <button 
                onClick={cycleAudioRoute} 
                className="flex flex-col items-center gap-1 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 ${
                  audioRoute === 'speaker' ? 'bg-white text-black' : 'bg-white/15 text-white active:bg-white/25'
                }`}>
                  <Volume2 className="w-6 h-6" />
                </div>
                <span className="text-[10px] text-white/60 capitalize">{audioRoute}</span>
              </button>

              <button 
                onClick={toggleVideo} 
                className="flex flex-col items-center gap-1 touch-manipulation"
                disabled={!videoAllowed && !isVideoOn}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 relative ${
                  isVideoOn && localVideoActive ? 'bg-emerald-500 text-white active:bg-emerald-600' 
                    : isVideoOn && !localVideoActive ? 'bg-amber-500/70 text-white animate-pulse'
                    : !videoAllowed ? 'bg-white/5 text-white/30'
                    : 'bg-white/15 text-white active:bg-white/25'
                }`}>
                  {!videoAllowed ? (
                    <WifiOff className="w-6 h-6" />
                  ) : isVideoOn ? (
                    <Video className="w-6 h-6" />
                  ) : (
                    <VideoOff className="w-6 h-6" />
                  )}
                </div>
                <span className={`text-[10px] ${!videoAllowed ? 'text-white/30' : 'text-white/60'}`}>
                  {!videoAllowed ? 'No Video' 
                    : isVideoOn && localVideoActive ? 'HD Video' 
                    : isVideoOn ? 'Starting...'
                    : 'Video'}
                </span>
              </button>

              <button 
                onClick={toggleMute} 
                className="flex flex-col items-center gap-1 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 ${
                  isMuted ? 'bg-red-500 text-white active:bg-red-600' : 'bg-white/15 text-white active:bg-white/25'
                }`}>
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </div>
                <span className="text-[10px] text-white/60">{isMuted ? 'Muted' : 'Mute'}</span>
              </button>
            </div>

            {/* Row 2: Flip, End, More - Always show Flip when local video active */}
            <div className="flex justify-center gap-6">
              {/* Flip camera - shown when local video is active OR video call */}
              <button 
                onClick={localVideoActive ? switchCamera : () => setShowKeypad(!showKeypad)} 
                className="flex flex-col items-center gap-1 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 ${
                  localVideoActive ? 'bg-white/15 active:bg-white/25' : 'bg-white/15 active:bg-white/25'
                }`}>
                  {localVideoActive ? (
                    <SwitchCamera className="w-6 h-6 text-white" />
                  ) : (
                    <Grid3X3 className="w-6 h-6 text-white" />
                  )}
                </div>
                <span className="text-[10px] text-white/60">{localVideoActive ? 'Flip' : 'Keypad'}</span>
              </button>

              <button 
                onClick={handleEndCall} 
                className="flex flex-col items-center gap-1 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg transition-all duration-150 active:scale-90 active:bg-red-600">
                  <PhoneOff className="w-7 h-7 text-white" />
                </div>
                <span className="text-[10px] text-red-400">End</span>
              </button>

              {/* More button */}
              <button 
                onClick={() => setShowMoreMenu(true)} 
                className="flex flex-col items-center gap-1 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center transition-all duration-150 active:scale-90 active:bg-white/25">
                  <MoreHorizontal className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] text-white/60">More</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* VoIP Features Menu */}
      <CallMoreMenu
        isOpen={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        callId={callId}
        localStream={localStream}
        contactName={contactName}
        callType={callType}
        isVideoOn={isVideoOn}
        isMuted={isMuted}
        duration={duration}
        partnerId={partnerId}
        onHoldChange={(held) => {
          if (webrtcRef.current) {
            webrtcRef.current.toggleAudio(!held);
          }
        }}
      />
    </div>
  );

  return createPortal(callUI, document.body);
}
