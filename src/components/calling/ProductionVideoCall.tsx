import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, SwitchCamera, Repeat, Maximize2, Minimize2, Volume2, VolumeX, ZoomIn, ZoomOut, MonitorUp, MonitorOff } from 'lucide-react';
import { SimpleWebRTCCall } from '@/utils/simpleWebRTC';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallUI } from '@/hooks/useCallUI';
import { NetworkQualityIndicator } from './NetworkQualityIndicator';
import { Capacitor } from '@capacitor/core';
import { useCallKeepAlive } from '@/hooks/useCallKeepAlive';
import { useVideoZoom } from '@/hooks/useVideoZoom';


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
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
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
  
  
  // CRITICAL: Keep call alive with heartbeat mechanism
  useCallKeepAlive(callId, callState === 'connected');

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
        
        console.log('🎬 [ProductionVideoCall] Call mode:', isInitiator ? 'outgoing' : 'incoming');
        
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
            
            // CRITICAL: Start muted to allow autoplay, then unmute after playback starts
            remoteVideoRef.current.muted = true;
            remoteVideoRef.current.volume = 1.0;
            
            // Safari/iOS specific: set webkit playsinline
            remoteVideoRef.current.setAttribute('webkit-playsinline', 'true');
            remoteVideoRef.current.setAttribute('playsinline', 'true');
            
            console.log('🔊 Remote video configured - muted=false, volume=1.0');
            
            // Universal play function with browser-specific handling
            const forcePlay = async (attempt: number = 1) => {
              try {
                if (remoteVideoRef.current) {
                  // Start with muted to allow autoplay
                  if (attempt === 1) {
                    remoteVideoRef.current.muted = true;
                  }
                  
                  await remoteVideoRef.current.play();
                  console.log(`✅ Remote video playing (attempt ${attempt})`);
                  
                  // Unmute after successful playback
                  setTimeout(() => {
                    if (remoteVideoRef.current) {
                      remoteVideoRef.current.muted = false;
                      remoteVideoRef.current.volume = 1.0;
                      console.log('🔊 Remote audio unmuted');
                      setUserInteracted(true);
                    }
                  }, 100);
                }
              } catch (err) {
                console.warn(`⚠️ Play failed (attempt ${attempt}):`, err);
                
                if (attempt <= 2 && (err.name === 'NotAllowedError' || err.name === 'NotSupportedError')) {
                  console.log('🖱️ Requiring user gesture for playback');
                  
                  const playOnInteraction = async () => {
                    try {
                      if (remoteVideoRef.current) {
                        remoteVideoRef.current.muted = true;
                        await remoteVideoRef.current.play();
                        // Unmute after play succeeds
                        setTimeout(() => {
                          if (remoteVideoRef.current) {
                            remoteVideoRef.current.muted = false;
                            remoteVideoRef.current.volume = 1.0;
                            console.log('✅ Remote playing + unmuted after user interaction');
                            setUserInteracted(true);
                          }
                        }, 100);
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
                  
                  // Show toast notification
                  toast.info('Tap screen to enable audio', {
                    duration: 8000,
                    action: {
                      label: 'Enable',
                      onClick: playOnInteraction
                    }
                  });
                }
              }
            };
            
            // Multi-stage retry with increasing delays
            forcePlay(1);
            setTimeout(() => forcePlay(2), 100);
            setTimeout(() => forcePlay(3), 500);
            setTimeout(() => forcePlay(4), 1500);
          }
        });

        call.on('connected', () => {
          console.log('🎉 [ProductionVideoCall] Call connected!');
          // CRITICAL: Always transition to connected, even from failed state
          setCallState('connected');
          startDurationTimer();
          updateCallStatus('active');
        });

        // CRITICAL: 'failed' event is for PERMISSION errors only
        call.on('failed', (error: Error) => {
          console.error('⚠️ [ProductionVideoCall] Connection issue:', error);
          
          // Camera/mic errors - show error state but DON'T auto-end
          if (error.message.includes('camera') || error.message.includes('microphone') || error.message.includes('Could not access')) {
            console.warn('⚠️ Camera/Microphone access issue');
            setCallState('failed');
            // DON'T auto-end - let user manually hang up
            return;
          }
          
          // Network errors - don't change state, recovery handles it
          console.warn('⚠️ Connection unstable - automatic recovery in progress...');
        });
        
        call.on('recoveryStatus', (status: any) => {
          console.log('🔄 [ProductionVideoCall] Recovery status:', status.message);
        });

        call.on('ended', () => {
          console.log('👋 [ProductionVideoCall] Call ended by remote');
          handleEndCall();
        });

        await call.start();
        if (isInitiator) {
          await updateCallStatus('ringing');
        }

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

  // CRITICAL: Monitor call status changes via realtime to stop ringback when answered
  useEffect(() => {
    if (!isInitiator) return; // Only initiator needs to listen for answer
    
    const channel = supabase
      .channel(`video-call-status-${callId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'calls',
        filter: `id=eq.${callId}`
      }, (payload: any) => {
        const newStatus = payload.new?.status;
        console.log('📞 [ProductionVideoCall] Call status changed:', newStatus);
        
        // Update local state when call is answered
        if (newStatus === 'active' || newStatus === 'connected') {
          console.log('📞 [ProductionVideoCall] Call answered');
          if (callState === 'connecting') {
            setCallState('connected');
            startDurationTimer();
          }
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId, isInitiator, callState]);

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

  const toggleSpeaker = async () => {
    const newState = !speakerEnabled;
    setSpeakerEnabled(newState);
    
    // Toggle audio output device
    if (remoteVideoRef.current) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(device => device.kind === 'audiooutput');
        
        if (audioDevices.length > 0) {
          const targetDevice = newState 
            ? audioDevices.find(d => d.label.toLowerCase().includes('speaker'))?.deviceId 
            : audioDevices.find(d => d.label.toLowerCase().includes('earpiece') || d.label.toLowerCase().includes('phone'))?.deviceId;
          
          if (targetDevice && 'setSinkId' in remoteVideoRef.current) {
            await (remoteVideoRef.current as any).setSinkId(targetDevice);
            toast.success(newState ? 'Speaker enabled' : 'Earpiece enabled');
          }
        }
      } catch (error) {
        console.error('Failed to switch audio output:', error);
        toast.error('Failed to switch audio output');
      }
    }
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
    try {
      const newMode = await webrtcRef.current?.switchCamera();
      toast.success(`Switched to ${newMode === 'user' ? 'front' : 'back'} camera`);
    } catch (error) {
      console.error('Camera switch error:', error);
      toast.error('Failed to switch camera');
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        } as DisplayMediaStreamOptions);
        
        const videoTrack = screenStream.getVideoTracks()[0];
        
        // Replace camera track with screen track
        if (webrtcRef.current) {
          await webrtcRef.current.replaceTrack(videoTrack);
        }
        
        // Show local preview of screen
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        toast.success('Screen sharing started');
        
        // Handle when user stops sharing via browser UI
        videoTrack.onended = () => {
          stopScreenShare();
        };
      } catch (error) {
        console.error('Screen share error:', error);
        if ((error as Error).name !== 'NotAllowedError') {
          toast.error('Failed to share screen');
        }
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = async () => {
    try {
      // Get camera stream back
      const cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      
      const videoTrack = cameraStream.getVideoTracks()[0];
      
      if (webrtcRef.current) {
        await webrtcRef.current.replaceTrack(videoTrack);
      }
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStream;
      }
      
      setIsScreenSharing(false);
      toast.info('Screen sharing stopped');
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  };

  const mainVideoRef = videoLayout === 'remote-main' ? remoteVideoRef : localVideoRef;
  const pipVideoRef = videoLayout === 'remote-main' ? localVideoRef : remoteVideoRef;

  // Video zoom hook for pinch-to-zoom functionality
  const { containerRef: zoomContainerRef, style: zoomStyle, scale: zoomScale, isZoomed, resetZoom, zoomIn, zoomOut } = useVideoZoom({
    minScale: 1,
    maxScale: 4,
    enabled: callState === 'connected'
  });

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-black select-none"
      style={{ 
        width: '100vw', 
        height: '100dvh',
        minHeight: '-webkit-fill-available',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        isolation: 'isolate',
      }}
      onClick={(e) => { e.stopPropagation(); showControls(); }}
    >
      {/* Main video with zoom support */}
      <div 
        ref={zoomContainerRef}
        className="w-full h-full overflow-hidden"
        style={zoomStyle}
      >
        <video
          ref={mainVideoRef}
          autoPlay
          playsInline
          muted={videoLayout === 'local-main'}
          className="w-full h-full object-cover"
          style={{ WebkitPlaysinline: 'true' } as any}
          onDoubleClick={() => {
            if (isZoomed) {
              resetZoom();
            } else {
              handleToggleFullScreen();
            }
          }}
          onLoadedMetadata={(e) => {
            const video = e.currentTarget;
            if (videoLayout === 'remote-main') {
              video.muted = true;
              video.play().then(() => {
                setTimeout(() => {
                  video.muted = false;
                  video.volume = 1.0;
                  console.log('🔊 Remote video metadata loaded, played and unmuted');
                }, 100);
              }).catch(err => console.log('Auto-play on metadata:', err));
            }
          }}
          onClick={() => {
            if (mainVideoRef.current && videoLayout === 'remote-main') {
              mainVideoRef.current.muted = false;
              mainVideoRef.current.volume = 1.0;
              mainVideoRef.current.play().catch(err => console.log('Play on click:', err));
              setUserInteracted(true);
            }
          }}
        />
      </div>

      {/* Zoom indicator with HD badge */}
      {isZoomed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full flex items-center gap-2"
        >
          <span className="text-white text-sm font-medium">{zoomScale.toFixed(1)}x</span>
          <span className="text-xs text-green-400">Sending to partner</span>
        </motion.div>
      )}

      {/* HD Quality Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute top-24 right-4 bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-full"
      >
        <span className="text-green-400 text-xs font-semibold">HD 1080p • NC</span>
      </motion.div>

      {/* Chatr Plus Picture-in-picture video */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => {
          e.stopPropagation();
          handleSwapVideos();
          if (pipVideoRef.current && videoLayout === 'local-main') {
            pipVideoRef.current.muted = false;
            pipVideoRef.current.volume = 1.0;
            pipVideoRef.current.play().catch(err => console.log('PIP play:', err));
          }
        }}
        className="absolute top-20 right-4 mt-12 w-28 h-40 rounded-3xl overflow-hidden border-2 border-white/30 shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-transform backdrop-blur-sm"
      >
        <video
          ref={pipVideoRef}
          autoPlay
          playsInline
          muted={videoLayout === 'remote-main'}
          className={`w-full h-full object-cover ${videoLayout === 'remote-main' ? 'transform scale-x-[-1]' : ''}`}
          style={{ WebkitPlaysinline: 'true' } as any}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
          <Repeat className="w-6 h-6 text-white" />
        </div>
      </motion.div>

      {/* ChatrPlus-style Top Bar with Glassmorphism */}
      {!isFullScreen && (
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3"
        >
          <div className="text-white bg-black/40 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-2xl">
            <h2 className="text-sm font-semibold text-center">{contactName}</h2>
            <p className="text-xs text-white/70 text-center">
              {callState === 'connecting' && 'Connecting...'}
              {callState === 'connected' && formatDuration(duration)}
              {callState === 'failed' && 'Camera/mic access required'}
            </p>
          </div>
        </motion.div>
      )}

      {/* ChatrPlus-style End Call Button - Bottom Center */}
      {!isFullScreen && (
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50"
        >
          <Button
            size="lg"
            variant="destructive"
            className="rounded-full w-16 h-16 shadow-2xl bg-red-500 hover:bg-red-600"
            onClick={handleEndCall}
          >
            <PhoneOff className="h-7 w-7" />
          </Button>
        </motion.div>
      )}

      {/* ChatrPlus-style Controls - Bottom Right */}
      <AnimatePresence>
        {controlsVisible && !isFullScreen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-8 right-8 flex flex-col gap-3"
          >
            {/* Zoom controls - applies zoom to outgoing video */}
            <Button
              size="lg"
              variant="secondary"
              className="rounded-full w-14 h-14 bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl"
              onClick={() => {
                zoomIn();
                // Apply zoom to outgoing video stream
                const newZoom = Math.min(4, zoomScale + 0.5);
                webrtcRef.current?.applyZoom(newZoom);
                if (newZoom > 1) {
                  toast.info(`Sending ${newZoom.toFixed(1)}x zoomed video`, { duration: 2000 });
                }
              }}
            >
              <ZoomIn className="h-5 w-5 text-white" />
            </Button>

            {isZoomed && (
              <Button
                size="lg"
                variant="secondary"
                className="rounded-full w-14 h-14 bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl"
                onClick={() => {
                  resetZoom();
                  webrtcRef.current?.applyZoom(1);
                  toast.info('Zoom reset', { duration: 2000 });
                }}
              >
                <ZoomOut className="h-5 w-5 text-white" />
              </Button>
            )}

            {/* Screen Share - Desktop only */}
            {!isMobileDevice && (
              <Button
                size="lg"
                variant={isScreenSharing ? "default" : "secondary"}
                className="rounded-full w-14 h-14 bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl"
                onClick={toggleScreenShare}
              >
                {isScreenSharing ? <MonitorOff className="h-5 w-5 text-white" /> : <MonitorUp className="h-5 w-5 text-white" />}
              </Button>
            )}

            <Button
              size="lg"
              variant="secondary"
              className="rounded-full w-14 h-14 bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl"
              onClick={handleSwitchCamera}
            >
              <SwitchCamera className="h-5 w-5 text-white" />
            </Button>

            <Button
              size="lg"
              variant={audioEnabled ? "secondary" : "destructive"}
              className="rounded-full w-14 h-14 bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl"
              onClick={toggleAudio}
            >
              {audioEnabled ? <Mic className="h-5 w-5 text-white" /> : <MicOff className="h-5 w-5" />}
            </Button>

            <Button
              size="lg"
              variant={videoEnabled ? "secondary" : "destructive"}
              className="rounded-full w-14 h-14 bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl"
              onClick={toggleVideo}
            >
              {videoEnabled ? <Video className="h-5 w-5 text-white" /> : <VideoOff className="h-5 w-5" />}
            </Button>

            <Button
              size="lg"
              variant={speakerEnabled ? "default" : "secondary"}
              className="rounded-full w-14 h-14 bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl"
              onClick={toggleSpeaker}
            >
              {speakerEnabled ? <Volume2 className="h-5 w-5 text-white" /> : <VolumeX className="h-5 w-5 text-white" />}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
