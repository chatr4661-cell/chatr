import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Mic, MicOff, PhoneOff, Volume2, Video, VideoOff, 
  SwitchCamera, Grid3X3, MoreHorizontal, WifiOff
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
  const [audioRoute, setAudioRoute] = useState<AudioRoute>('earpiece');
  const [duration, setDuration] = useState(0);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [localVideoActive, setLocalVideoActive] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const webrtcRef = useRef<SimpleWebRTCCall | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const userIdRef = useRef<string | null>(null);
  const videoPlaybackCleanupRef = useRef<(() => void) | null>(null);
  const trackRecoveryCleanupRef = useRef<(() => void) | null>(null);

  const isVideo = callType === 'video' || isVideoOn || videoEnabled;
  const isMobile = Capacitor.isNativePlatform() || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useCallKeepAlive(callId, callState === 'connected');
  
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
        console.log('📹 [UnifiedCall] Local stream received');
        setLocalStream(stream); // Store for recording and other features
        if (localVideoRef.current && stream.getVideoTracks().length > 0) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
          localVideoRef.current.play().catch(e => console.log('Local video play:', e));
          setLocalVideoActive(true);
        }
      });

      call.on('remoteStream', (stream: MediaStream) => {
        console.log('📺 [UnifiedCall] Remote stream received');
        const audioTracks = stream.getAudioTracks();
        const videoTracks = stream.getVideoTracks();
        console.log(`  → Audio tracks: ${audioTracks.length}, Video tracks: ${videoTracks.length}`);
        audioTracks.forEach(t => console.log(`    🔊 Audio: ${t.label}, enabled: ${t.enabled}, muted: ${t.muted}`));
        videoTracks.forEach(t => console.log(`    📹 Video: ${t.label}, enabled: ${t.enabled}, muted: ${t.muted}`));
        
        // CRITICAL: Always setup audio via Audio element
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
          remoteAudioRef.current.autoplay = true;
          remoteAudioRef.current.volume = 1.0;
        }
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(e => console.log('Audio autoplay:', e));
        
        // ANDROID WEBVIEW FIX: Use aggressive video playback helper
        // This handles muted tracks, srcObject re-assignment, and retry loops
        if (remoteVideoRef.current && videoTracks.length > 0) {
          console.log('📺 [UnifiedCall] Starting aggressive video playback for Android');
          
          // Cleanup previous playback attempt
          if (videoPlaybackCleanupRef.current) {
            videoPlaybackCleanupRef.current();
          }
          
          // Start aggressive playback with retry loop
          videoPlaybackCleanupRef.current = startAggressiveVideoPlayback(
            remoteVideoRef.current,
            stream,
            {
              maxRetries: 15, // More retries for Android WebView
              retryIntervalMs: 400,
              onPlaybackStarted: () => {
                console.log('✅ [UnifiedCall] Remote video PLAYING (aggressive)');
                setRemoteVideoActive(true);
              },
              onPlaybackFailed: () => {
                console.warn('⚠️ [UnifiedCall] Video playback failed after all retries');
                // Keep trying with track recovery handlers
              }
            }
          );
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
        if (callState !== 'connected') setCallState('reconnecting');
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
      remoteAudioRef.current.srcObject = null;
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

  // FaceTime-style: One tap → video appears for both parties instantly
  // ULTRA-LOW BANDWIDTH: Check if video is allowed first
  const toggleVideo = async () => {
    if (!isVideoOn) {
      // Check network policy first
      if (!canEnableVideo()) {
        toast.warning(uiState.message || 'Video not available on current network');
        return;
      }
      
      if (videoRequiresTap) {
        toast.info('Video enabled on moderate network');
      }
      
      // Add video directly - no confirmation needed (FaceTime style)
      console.log('📹 [UnifiedCall] Adding video (FaceTime-style)...');
      setIsVideoOn(true);
      
      try {
        const videoStream = await webrtcRef.current?.addVideoToCall();
        if (videoStream && localVideoRef.current) {
          localVideoRef.current.srcObject = videoStream;
          localVideoRef.current.muted = true;
          await localVideoRef.current.play().catch(e => console.log('Local video play:', e));
          setLocalVideoActive(true);
          
          // CRITICAL: Also update remoteVideoRef in case partner already has video enabled
          // The renegotiation will trigger remoteStream event with updated tracks
          toast.success('Video enabled - partner will see you');
        } else {
          setIsVideoOn(false);
          toast.error('Could not enable video');
        }
      } catch (e) {
        console.error('📹 [UnifiedCall] Video toggle failed:', e);
        setIsVideoOn(false);
        toast.error('Camera access failed');
      }
    } else {
      // Turn off video
      console.log('📹 [UnifiedCall] Disabling video...');
      setIsVideoOn(false);
      webrtcRef.current?.toggleVideo(false);
      setLocalVideoActive(false);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      toast.info('Video disabled');
    }
  };

  const switchCamera = async () => {
    try {
      await webrtcRef.current?.switchCamera();
      toast.success('Camera switched');
    } catch (e) { toast.error('Could not switch camera'); }
  };

  const cycleAudioRoute = () => {
    const routes: AudioRoute[] = ['earpiece', 'speaker'];
    const idx = routes.indexOf(audioRoute);
    setAudioRoute(routes[(idx + 1) % routes.length]);
    toast.info(`Audio: ${routes[(idx + 1) % routes.length]}`);
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
        isolation: 'isolate',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        willChange: 'transform',
        contain: 'layout style paint',
      }}
      onClick={() => resetControlsTimer()}
    >
      {/* Background - HD Remote Video or Avatar */}
      {/* Always render video element for bidirectional HD video */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={`absolute inset-0 w-full h-full object-cover bg-black ${
          remoteVideoActive ? 'block' : 'hidden'
        }`}
        style={{
          transform: 'translateZ(0)', // GPU acceleration for smooth video
          backfaceVisibility: 'hidden',
          perspective: 1000,
        }}
      />
      
      {/* Show avatar when no remote video - with smooth transitions */}
      {!remoteVideoActive && (
        <div 
          className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center"
          style={{ transform: 'translateZ(0)' }}
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
      )}

      {/* Local Video PIP - HD bidirectional with smooth drag feel */}
      {localVideoActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          whileTap={{ scale: 0.95 }}
          className="absolute top-16 right-4 w-28 h-40 sm:w-32 sm:h-44 rounded-2xl overflow-hidden border-2 border-white/40 shadow-2xl z-20"
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
          {/* HD indicator */}
          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-emerald-400 font-medium">
            HD
          </div>
        </motion.div>
      )}

      {/* Network Status Banner - Ultra-Low Bandwidth */}
      {showWarning && (
        <div className="absolute top-2 inset-x-4 z-50 flex justify-center">
          <NetworkStatusBanner compact />
        </div>
      )}
      
      {/* Video Disabled Notice */}
      {isVideo && !videoAllowed && callState === 'connected' && (
        <div className="absolute top-16 inset-x-4 z-40 flex justify-center">
          <VideoDisabledNotice />
        </div>
      )}

      {/* Top Bar - Name & Status */}
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
              {/* Signal Strength + Quality indicator */}
              <div className="flex items-center gap-2 mb-2">
                <SignalStrengthIndicator size="sm" />
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  networkQuality === 'excellent' || networkQuality === 'good' 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : networkQuality === 'fair' 
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-red-500/20 text-red-400'
                }`}>
                  {qualityDescription || (networkQuality === 'excellent' || networkQuality === 'good' ? 'HD' : networkQuality === 'fair' ? 'SD' : 'Low')}
                </div>
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
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 ${
                  isVideoOn ? 'bg-emerald-500 text-white active:bg-emerald-600' 
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
                  {!videoAllowed ? 'No Video' : isVideoOn ? 'HD Video' : 'Video'}
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

            {/* Row 2: Keypad/More, End, Flip/More - Butter-smooth touch */}
            <div className="flex justify-center gap-6">
              {/* Keypad for voice, Flip for video */}
              {!isVideo ? (
                <button 
                  onClick={() => setShowKeypad(!showKeypad)} 
                  className="flex flex-col items-center gap-1 touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center transition-all duration-150 active:scale-90 active:bg-white/25">
                    <Grid3X3 className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] text-white/60">Keypad</span>
                </button>
              ) : (
                <button 
                  onClick={switchCamera} 
                  className="flex flex-col items-center gap-1 touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center transition-all duration-150 active:scale-90 active:bg-white/25">
                    <SwitchCamera className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] text-white/60">Flip</span>
                </button>
              )}

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
