import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Mic, MicOff, PhoneOff, Volume2, Video, VideoOff, 
  SwitchCamera, Grid3X3, MoreHorizontal
} from 'lucide-react';
import { SimpleWebRTCCall } from '@/utils/simpleWebRTC';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallKeepAlive } from '@/hooks/useCallKeepAlive';
import { Capacitor } from '@capacitor/core';
import { syncCallStateToNative } from '@/utils/androidBridge';

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
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [localVideoActive, setLocalVideoActive] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [controlsVisible, setControlsVisible] = useState(true);

  const webrtcRef = useRef<SimpleWebRTCCall | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const userIdRef = useRef<string | null>(null);

  const isVideo = callType === 'video' || isVideoOn || videoEnabled;
  const isMobile = Capacitor.isNativePlatform() || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useCallKeepAlive(callId, callState === 'connected');

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

  // Initialize WebRTC
  useEffect(() => {
    const initCall = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Not authenticated');
          onEnd();
          return;
        }
        userIdRef.current = user.id;

        console.log('🎬 [UnifiedCall] Starting', isInitiator ? 'outgoing' : 'incoming', callType, 'call');
        
        const call = SimpleWebRTCCall.create(callId, partnerId, isVideo, isInitiator, user.id, preAcquiredStream);
        webrtcRef.current = call;

        call.on('localStream', (stream: MediaStream) => {
          console.log('📹 [UnifiedCall] Local stream received');
          if (localVideoRef.current && stream.getVideoTracks().length > 0) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.muted = true;
            localVideoRef.current.play().catch(e => console.log('Local video play:', e));
            setLocalVideoActive(true);
          }
        });

        call.on('remoteStream', (stream: MediaStream) => {
          console.log('🔊 [UnifiedCall] Remote stream received, tracks:', 
            stream.getTracks().map(t => `${t.kind}:${t.enabled}`).join(', '));
          
          // Always setup audio
          if (!remoteAudioRef.current) {
            remoteAudioRef.current = new Audio();
            remoteAudioRef.current.autoplay = true;
            remoteAudioRef.current.volume = 1.0;
          }
          remoteAudioRef.current.srcObject = stream;
          remoteAudioRef.current.play().catch(e => console.log('Audio play:', e));
          
          // Handle video tracks (could come mid-call)
          const videoTracks = stream.getVideoTracks();
          if (videoTracks.length > 0 && remoteVideoRef.current) {
            console.log('📺 [UnifiedCall] Setting remote video, track:', videoTracks[0].label);
            remoteVideoRef.current.srcObject = stream;
            remoteVideoRef.current.muted = false;
            remoteVideoRef.current.volume = 1.0;
            remoteVideoRef.current.play()
              .then(() => {
                console.log('✅ [UnifiedCall] Remote video playing');
                setRemoteVideoActive(true);
              })
              .catch(e => console.log('Remote video play:', e));
          }
          
          // Listen for track additions (FaceTime-style mid-call video)
          stream.onaddtrack = (event) => {
            console.log('➕ [UnifiedCall] Track added mid-call:', event.track.kind);
            if (event.track.kind === 'video' && remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = stream;
              remoteVideoRef.current.muted = false;
              remoteVideoRef.current.play().catch(e => console.log('Dynamic video play:', e));
              setRemoteVideoActive(true);
            }
          };
        });

        call.on('connected', () => {
          console.log('🎉 [UnifiedCall] Connected!');
          setCallState('connected');
          startDurationTimer();
          updateCallStatus('active');
          
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

        await call.start();
        if (isInitiator) await updateCallStatus('ringing');

      } catch (error) {
        console.error('❌ [UnifiedCall] Init error:', error);
        onEnd();
      }
    };

    initCall();
    return () => cleanup();
  }, []);

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

  // FaceTime-style: One tap → video appears for both parties
  const toggleVideo = async () => {
    if (!isVideoOn) {
      // Add video directly - no confirmation needed (FaceTime style)
      console.log('📹 [UnifiedCall] Adding video (FaceTime-style)...');
      setIsVideoOn(true);
      
      const videoStream = await webrtcRef.current?.addVideoToCall();
      if (videoStream && localVideoRef.current) {
        localVideoRef.current.srcObject = videoStream;
        localVideoRef.current.muted = true;
        await localVideoRef.current.play().catch(e => console.log('Local video play:', e));
        setLocalVideoActive(true);
        toast.success('Video enabled');
      } else {
        setIsVideoOn(false);
        toast.error('Could not enable video');
      }
    } else {
      // Turn off video
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
      className="fixed inset-0 z-[99999] bg-black flex flex-col overflow-hidden select-none touch-none"
      style={{ height: '100dvh', width: '100vw', isolation: 'isolate' }}
      onClick={() => resetControlsTimer()}
    >
      {/* Background - Remote Video or Avatar */}
      {/* Always render video element, show when video active */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={`absolute inset-0 w-full h-full object-contain bg-black ${
          remoteVideoActive ? 'block' : 'hidden'
        }`}
      />
      
      {/* Show avatar when no remote video */}
      {!remoteVideoActive && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center">
          {contactAvatar ? (
            <img src={contactAvatar} alt={contactName} className="w-28 h-28 rounded-full object-cover ring-4 ring-white/10 shadow-2xl" />
          ) : (
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center ring-4 ring-white/10">
              <span className="text-5xl font-bold text-white">{contactName.charAt(0).toUpperCase()}</span>
            </div>
          )}
        </div>
      )}

      {/* Local Video PIP - show when local video is active */}
      {localVideoActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-16 right-4 w-24 h-32 sm:w-28 sm:h-36 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl z-20"
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        </motion.div>
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
              {/* Quality indicator */}
              <div className={`px-3 py-1 rounded-full text-xs font-medium mb-2 ${
                networkQuality === 'excellent' || networkQuality === 'good' 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : networkQuality === 'fair' 
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-red-500/20 text-red-400'
              }`}>
                {networkQuality === 'excellent' || networkQuality === 'good' ? '● HD' : networkQuality === 'fair' ? '● SD' : '● Low'}
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
                {callState === 'reconnecting' && 'Reconnecting...'}
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
            {/* Row 1: Speaker, Video, Mute */}
            <div className="flex justify-center gap-6 mb-6">
              <button onClick={cycleAudioRoute} className="flex flex-col items-center gap-1">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  audioRoute === 'speaker' ? 'bg-white text-black' : 'bg-white/15 text-white'
                }`}>
                  <Volume2 className="w-6 h-6" />
                </div>
                <span className="text-[10px] text-white/60 capitalize">{audioRoute}</span>
              </button>

              <button onClick={toggleVideo} className="flex flex-col items-center gap-1">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isVideoOn ? 'bg-emerald-500 text-white' : 'bg-white/15 text-white'
                }`}>
                  {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </div>
                <span className="text-[10px] text-white/60">Video</span>
              </button>

              <button onClick={toggleMute} className="flex flex-col items-center gap-1">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isMuted ? 'bg-red-500 text-white' : 'bg-white/15 text-white'
                }`}>
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </div>
                <span className="text-[10px] text-white/60">{isMuted ? 'Muted' : 'Mute'}</span>
              </button>
            </div>

            {/* Row 2: More, End, Keypad/Flip */}
            <div className="flex justify-center gap-6">
              <button onClick={() => setShowKeypad(!showKeypad)} className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center">
                  <Grid3X3 className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] text-white/60">Keypad</span>
              </button>

              <button onClick={handleEndCall} className="flex flex-col items-center gap-1">
                <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                  <PhoneOff className="w-7 h-7 text-white" />
                </div>
                <span className="text-[10px] text-red-400">End</span>
              </button>

              {isVideo ? (
                <button onClick={switchCamera} className="flex flex-col items-center gap-1">
                  <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center">
                    <SwitchCamera className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] text-white/60">Flip</span>
                </button>
              ) : (
                <button className="flex flex-col items-center gap-1">
                  <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center">
                    <MoreHorizontal className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] text-white/60">More</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(callUI, document.body);
}
