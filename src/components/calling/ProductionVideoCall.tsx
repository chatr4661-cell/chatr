import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, SwitchCamera, Repeat, Maximize2, Minimize2 } from 'lucide-react';
import { SimpleWebRTCCall } from '@/utils/simpleWebRTC';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallUI } from '@/hooks/useCallUI';
import { NetworkQualityIndicator } from './NetworkQualityIndicator';
import { Capacitor } from '@capacitor/core';

// Browser detection utilities
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isSafari = () => /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isFirefox = () => /firefox/i.test(navigator.userAgent);
const isChrome = () => /chrome/i.test(navigator.userAgent) && !/edge/i.test(navigator.userAgent);
const isMobile = () => Capacitor.isNativePlatform() || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

interface ProductionVideoCallProps {
  callId: string;
  contactName: string;
  isInitiator: boolean;
  partnerId: string;
  onEnd: () => void;
}

export default function ProductionVideoCall({
  callId,
  contactName,
  isInitiator,
  partnerId,
  onEnd,
}: ProductionVideoCallProps) {
  const [callState, setCallState] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [duration, setDuration] = useState(0);
  const [videoLayout, setVideoLayout] = useState<'remote-main' | 'local-main'>('remote-main');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const isMobileDevice = isMobile();

  const webrtcRef = useRef<SimpleWebRTCCall | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const userIdRef = useRef<string | null>(null);

  const { controlsVisible, showControls } = useCallUI({ 
    autoHideDelay: 10000, // Increased to 10 seconds for better UX
    enabled: true 
  });

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

        console.log('🎬 [ProductionVideoCall] Initializing video call...');
        const call = new SimpleWebRTCCall(callId, partnerId, true, isInitiator, user.id);
        webrtcRef.current = call;

        call.on('localStream', (stream: MediaStream) => {
          console.log('📹 [ProductionVideoCall] Local stream received');
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.muted = true;
            localVideoRef.current.play().catch(e => console.log('Local video play:', e));
          }
          
          // When local stream is ready, ensure any remote stream is unmuted
          setTimeout(() => {
            if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
              remoteVideoRef.current.muted = false;
              remoteVideoRef.current.volume = 1.0;
              console.log('🔊 Double-checking remote audio is unmuted');
            }
          }, 500);
        });

        call.on('remoteStream', (stream: MediaStream) => {
          console.log('📺 [ProductionVideoCall] Remote stream received');
          console.log('🌐 Browser:', { isIOS: isIOS(), isSafari: isSafari(), isFirefox: isFirefox(), isChrome: isChrome() });
          
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
            remoteVideoRef.current.playsInline = true;
            remoteVideoRef.current.autoplay = true;
            
            // CRITICAL: Ensure audio is unmuted and volume is max
            remoteVideoRef.current.muted = false;
            remoteVideoRef.current.volume = 1.0;
            
            // Safari/iOS specific: set webkit playsinline
            remoteVideoRef.current.setAttribute('webkit-playsinline', 'true');
            remoteVideoRef.current.setAttribute('playsinline', 'true');
            
            console.log('🔊 Remote video configured - muted=false, volume=1.0');
            
            // Universal play function with browser-specific handling
            const forcePlay = async (requireGesture = false) => {
              try {
                if (remoteVideoRef.current) {
                  // Re-verify settings before play
                  remoteVideoRef.current.muted = false;
                  remoteVideoRef.current.volume = 1.0;
                  
                  // iOS/Safari: Must wait for user gesture
                  if ((isIOS() || isSafari()) && !userInteracted && !requireGesture) {
                    console.log('⏳ iOS/Safari detected - waiting for user interaction');
                    return;
                  }
                  
                  await remoteVideoRef.current.play();
                  console.log('✅ Remote video/audio playing');
                  setUserInteracted(true);
                }
              } catch (err) {
                console.warn('⚠️ Play failed:', err);
                
                if (!requireGesture && (err.name === 'NotAllowedError' || err.name === 'NotSupportedError')) {
                  console.log('🖱️ Requiring user gesture for playback');
                  
                  const playOnInteraction = async (e: Event) => {
                    e.preventDefault();
                    try {
                      if (remoteVideoRef.current) {
                        remoteVideoRef.current.muted = false;
                        remoteVideoRef.current.volume = 1.0;
                        await remoteVideoRef.current.play();
                        console.log('✅ Remote playing after user interaction');
                        setUserInteracted(true);
                      }
                    } catch (e) {
                      console.error('Failed to play after interaction:', e);
                    }
                  };
                  
                  // Listen for ANY user interaction
                  const events = ['touchstart', 'touchend', 'click', 'mousedown', 'keydown'];
                  events.forEach(eventType => {
                    document.addEventListener(eventType, playOnInteraction, { once: true, capture: true });
                  });
                  
                  // Show persistent toast for iOS/Safari
                  if (isIOS() || isSafari()) {
                    toast.info('Tap anywhere to enable audio', {
                      duration: 10000,
                      action: {
                        label: 'Enable Audio',
                        onClick: () => {
                          playOnInteraction(new Event('click'));
                        }
                      }
                    });
                  }
                }
              }
            };
            
            // Multi-stage retry with increasing delays
            forcePlay();
            setTimeout(() => forcePlay(), 100);
            setTimeout(() => forcePlay(), 500);
            setTimeout(() => forcePlay(), 1500);
            setTimeout(() => forcePlay(true), 3000); // Final attempt with gesture requirement
          }
        });

        call.on('connected', () => {
          console.log('🎉 [ProductionVideoCall] Call connected!');
          setCallState('connected');
          toast.success('Call connected');
          startDurationTimer();
          updateCallStatus('active');
        });

        call.on('failed', (error: Error) => {
          console.error('❌ [ProductionVideoCall] Call failed:', error);
          setCallState('failed');
          
          let errorMessage = 'Call failed';
          let actionMessage = 'Please try again';
          
          if (error.message.includes('camera') || error.message.includes('microphone')) {
            errorMessage = 'Camera/Microphone access denied';
            actionMessage = 'Please allow camera and microphone access in your browser settings';
          } else if (error.message.includes('timeout')) {
            errorMessage = 'Connection timeout';
            actionMessage = 'Check your internet connection and try again';
          } else if (error.message.includes('ice') || error.message.includes('Connection failed')) {
            errorMessage = 'Could not establish connection';
            actionMessage = 'Your network may be blocking video calls. Try a different network.';
          }
          
          toast.error(errorMessage, {
            description: actionMessage,
            duration: 5000
          });
          
          setTimeout(() => handleEndCall(), 3000);
        });

        call.on('ended', () => {
          console.log('👋 [ProductionVideoCall] Call ended');
          handleEndCall();
        });

        await call.start();
        await updateCallStatus('ringing');

      } catch (error) {
        console.error('❌ [ProductionVideoCall] Init error:', error);
        toast.error('Failed to initialize call');
        onEnd();
      }
    };

    initCall();

    return () => {
      cleanup();
    };
  }, []);

  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
  };

  const updateCallStatus = async (status: string) => {
    try {
      await supabase
        .from('calls')
        .update({ 
          status,
          webrtc_state: status === 'active' ? 'connected' : 'signaling',
          ...(status === 'active' ? { started_at: new Date().toISOString() } : {})
        })
        .eq('id', callId);
    } catch (error) {
      console.error('Failed to update call status:', error);
    }
  };

  const handleEndCall = async () => {
    cleanup();
    
    try {
      await supabase
        .from('calls')
        .update({ 
          status: 'ended',
          webrtc_state: 'ended',
          ended_at: new Date().toISOString(),
          duration
        })
        .eq('id', callId);
    } catch (error) {
      console.error('Failed to update call end:', error);
    }

    onEnd();
  };

  const cleanup = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    if (webrtcRef.current) {
      webrtcRef.current.end();
      webrtcRef.current = null;
    }
  };

  const toggleAudio = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    webrtcRef.current?.toggleAudio(newState);
  };

  const toggleVideo = () => {
    const newState = !videoEnabled;
    setVideoEnabled(newState);
    webrtcRef.current?.toggleVideo(newState);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSwapVideos = () => {
    setVideoLayout(prev => prev === 'remote-main' ? 'local-main' : 'remote-main');
    toast.info(videoLayout === 'remote-main' ? 'Your video is now main' : 'Their video is now main');
  };

  const handleToggleFullScreen = async () => {
    if (!isFullScreen) {
      await document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  const handleSwitchCamera = async () => {
    if (!isMobile) return;
    try {
      const newMode = await webrtcRef.current?.switchCamera();
      toast.success(`Switched to ${newMode === 'user' ? 'front' : 'back'} camera`);
    } catch (error) {
      toast.error('Failed to switch camera');
    }
  };

  const mainVideoRef = videoLayout === 'remote-main' ? remoteVideoRef : localVideoRef;
  const pipVideoRef = videoLayout === 'remote-main' ? localVideoRef : remoteVideoRef;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black"
      onClick={showControls}
    >
      {/* Main video */}
      <video
        ref={mainVideoRef}
        autoPlay
        playsInline
        webkit-playsinline="true"
        muted={videoLayout === 'local-main'}
        className="w-full h-full object-cover"
        onDoubleClick={handleToggleFullScreen}
        onLoadedMetadata={(e) => {
          // Ensure audio is enabled when metadata loads
          const video = e.currentTarget;
          if (videoLayout === 'remote-main') {
            video.muted = false;
            video.volume = 1.0;
            console.log('🔊 Remote video metadata loaded, audio enabled');
            // Auto-play on metadata load for better compatibility
            video.play().catch(err => console.log('Auto-play on metadata:', err));
          }
        }}
        onCanPlay={(e) => {
          // Additional play attempt when video is ready
          const video = e.currentTarget;
          if (videoLayout === 'remote-main' && video.paused) {
            video.muted = false;
            video.volume = 1.0;
            video.play().catch(err => console.log('Auto-play on canplay:', err));
          }
        }}
        onClick={() => {
          // Ensure audio plays on any click
          if (mainVideoRef.current && videoLayout === 'remote-main') {
            mainVideoRef.current.muted = false;
            mainVideoRef.current.volume = 1.0;
            mainVideoRef.current.play().catch(err => console.log('Play on click:', err));
            setUserInteracted(true);
          }
        }}
      />

      {/* Picture-in-picture video */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => {
          e.stopPropagation();
          handleSwapVideos();
          // Also ensure audio plays
          if (pipVideoRef.current && videoLayout === 'local-main') {
            pipVideoRef.current.muted = false;
            pipVideoRef.current.volume = 1.0;
            pipVideoRef.current.play().catch(err => console.log('PIP play:', err));
          }
        }}
        className="absolute top-4 right-4 w-32 h-48 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-transform"
      >
        <video
          ref={pipVideoRef}
          autoPlay
          playsInline
          webkit-playsinline="true"
          muted={videoLayout === 'remote-main'}
          className={`w-full h-full object-cover ${videoLayout === 'remote-main' ? 'transform scale-x-[-1]' : ''}`}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
          <Repeat className="w-6 h-6 text-white" />
        </div>
      </motion.div>

      {/* Top info bar */}
      {!isFullScreen && (
        <div className="absolute top-4 left-4 flex items-center gap-3">
          <div className="text-white bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
            <h2 className="text-base font-semibold">{contactName}</h2>
            <p className="text-xs text-white/80">
              {callState === 'connecting' && 'Connecting...'}
              {callState === 'connected' && formatDuration(duration)}
              {callState === 'failed' && 'Connection failed'}
            </p>
          </div>
          <NetworkQualityIndicator peerConnection={webrtcRef.current?.['pc']} />
        </div>
      )}

      {/* Persistent End Call Button - Always visible */}
      {!isFullScreen && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
          <Button
            size="lg"
            variant="destructive"
            className="rounded-full w-16 h-16 shadow-2xl"
            onClick={handleEndCall}
          >
            <PhoneOff className="h-7 w-7" />
          </Button>
        </div>
      )}

      {/* Controls overlay - Additional controls */}
      <AnimatePresence>
        {controlsVisible && !isFullScreen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 left-0 right-0"
          >
            <div className="flex items-center justify-center gap-3">
              <Button
                size="lg"
                variant={audioEnabled ? "secondary" : "destructive"}
                className="rounded-full w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20"
                onClick={toggleAudio}
              >
                {audioEnabled ? <Mic className="h-6 w-6 text-white" /> : <MicOff className="h-6 w-6" />}
              </Button>

              <Button
                size="lg"
                variant={videoEnabled ? "secondary" : "destructive"}
                className="rounded-full w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20"
                onClick={toggleVideo}
              >
                {videoEnabled ? <Video className="h-6 w-6 text-white" /> : <VideoOff className="h-6 w-6" />}
              </Button>

              {isMobileDevice && (
                <Button
                  size="lg"
                  variant="secondary"
                  className="rounded-full w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20"
                  onClick={handleSwitchCamera}
                >
                  <SwitchCamera className="w-6 h-6 text-white" />
                </Button>
              )}

              <Button
                size="lg"
                variant="secondary"
                className="rounded-full w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20"
                onClick={handleSwapVideos}
              >
                <Repeat className="w-6 h-6 text-white" />
              </Button>

              <Button
                size="lg"
                variant="secondary"
                className="rounded-full w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20"
                onClick={handleToggleFullScreen}
              >
                {isFullScreen ? <Minimize2 className="w-6 h-6 text-white" /> : <Maximize2 className="w-6 h-6 text-white" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
