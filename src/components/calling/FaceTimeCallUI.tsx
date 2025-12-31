import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  RotateCcw,
  Volume2,
  Maximize2,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useFaceTimeQualityWebRTC, ConnectionQuality } from '@/hooks/useFaceTimeQualityWebRTC';
import { useCallSensors } from '@/hooks/useCallSensors';

interface FaceTimeCallUIProps {
  callId: string;
  isVideo: boolean;
  isIncoming: boolean;
  contactName: string;
  contactAvatar?: string;
  onEnd: () => void;
  onAnswer?: () => void;
  onDecline?: () => void;
}

const QualityIndicator: React.FC<{ quality: ConnectionQuality }> = ({ quality }) => {
  const getIcon = () => {
    switch (quality.level) {
      case 'excellent': return <SignalHigh className="w-4 h-4 text-green-500" />;
      case 'good': return <SignalMedium className="w-4 h-4 text-green-400" />;
      case 'fair': return <SignalMedium className="w-4 h-4 text-yellow-500" />;
      case 'poor': return <SignalLow className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
      {getIcon()}
      <span className="text-xs text-white font-medium">
        {quality.level === 'excellent' ? 'HD' : quality.level.toUpperCase()}
      </span>
      {quality.bitrate > 0 && (
        <span className="text-xs text-white/70">
          {Math.round(quality.bitrate)}kbps
        </span>
      )}
    </div>
  );
};

const CallTimer: React.FC<{ startTime: number }> = ({ startTime }) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <span className="text-white/90 text-sm font-medium">
      {formatDuration(duration)}
    </span>
  );
};

export const FaceTimeCallUI: React.FC<FaceTimeCallUIProps> = ({
  callId,
  isVideo,
  isIncoming,
  contactName,
  contactAvatar,
  onEnd,
  onAnswer,
  onDecline,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  const {
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
    cleanup,
  } = useFaceTimeQualityWebRTC(callId, isVideo);

  const { sensorState, triggerHaptic } = useCallSensors(connectionState === 'connected', {
    onShake: () => {
      toggleMute();
      triggerHaptic('mute');
    },
    onFaceDown: () => {
      toggleMute();
    },
  });

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(console.error);
    }
  }, [remoteStream]);

  // Start call when connected
  useEffect(() => {
    if (connectionState === 'connected' && !callStartTime) {
      setCallStartTime(Date.now());
      triggerHaptic('answer');
    }
  }, [connectionState, callStartTime, triggerHaptic]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls && connectionState === 'connected') {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, connectionState]);

  const handleAnswer = async () => {
    await joinCall();
    onAnswer?.();
    triggerHaptic('answer');
  };

  const handleDecline = () => {
    cleanup();
    onDecline?.();
    triggerHaptic('decline');
  };

  const handleEnd = () => {
    cleanup();
    onEnd();
    triggerHaptic('end');
  };

  const handleStartCall = async () => {
    await startCall();
    triggerHaptic('start');
  };

  // Auto-start for outgoing calls
  useEffect(() => {
    if (!isIncoming && callId) {
      handleStartCall();
    }
  }, [isIncoming, callId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting' || connectionState === 'new';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "fixed inset-0 z-50 bg-black flex flex-col",
        sensorState.orientation === 'landscape' && "flex-row"
      )}
      onClick={() => setShowControls(true)}
    >
      {/* Remote Video / Avatar Background */}
      <div className="absolute inset-0">
        {isVideo && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <Avatar className="w-32 h-32 border-4 border-white/20">
              <AvatarImage src={contactAvatar} alt={contactName} />
              <AvatarFallback className="text-4xl bg-primary text-primary-foreground">
                {contactName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      {/* Quality Indicator */}
      {isConnected && <QualityIndicator quality={connectionQuality} />}

      {/* Local Video PiP */}
      {isVideo && localStream && (
        <motion.div
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          className={cn(
            "absolute z-10 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20",
            sensorState.orientation === 'landscape' 
              ? "top-4 left-4 w-40 h-28" 
              : "top-20 right-4 w-28 h-40"
          )}
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={cn(
              "w-full h-full object-cover",
              currentCamera === 'user' && "scale-x-[-1]"
            )}
          />
          {!isVideoEnabled && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-white/50" />
            </div>
          )}
        </motion.div>
      )}

      {/* Call Info */}
      <AnimatePresence>
        {(showControls || isConnecting || isIncoming) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 p-6 pt-12 bg-gradient-to-b from-black/60 to-transparent"
          >
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-white mb-1">
                {contactName}
              </h2>
              <p className="text-white/70">
                {isIncoming && connectionState === 'new' && 'Incoming call...'}
                {!isIncoming && isConnecting && 'Calling...'}
                {connectionState === 'connecting' && 'Connecting...'}
                {isConnected && callStartTime && <CallTimer startTime={callStartTime} />}
                {connectionState === 'failed' && 'Call failed'}
              </p>
              {isVideo && (
                <span className="inline-flex items-center gap-1 mt-2 text-xs text-white/60 bg-white/10 rounded-full px-2 py-1">
                  <Video className="w-3 h-3" />
                  Chatr Plus Video
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <AnimatePresence>
        {(showControls || isIncoming) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 p-8 pb-12 bg-gradient-to-t from-black/80 to-transparent"
          >
            {/* Incoming Call Controls */}
            {isIncoming && connectionState === 'new' && (
              <div className="flex justify-center gap-16">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center"
                >
                  <Button
                    size="lg"
                    variant="destructive"
                    className="w-16 h-16 rounded-full"
                    onClick={handleDecline}
                  >
                    <PhoneOff className="w-7 h-7" />
                  </Button>
                  <span className="text-white text-sm mt-2">Decline</span>
                </motion.div>

                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center"
                >
                  <Button
                    size="lg"
                    className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600"
                    onClick={handleAnswer}
                  >
                    <Phone className="w-7 h-7" />
                  </Button>
                  <span className="text-white text-sm mt-2">Accept</span>
                </motion.div>
              </div>
            )}

            {/* Active Call Controls */}
            {(isConnected || (!isIncoming && isConnecting)) && (
              <div className="flex justify-center items-center gap-4">
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="lg"
                    className={cn(
                      "w-14 h-14 rounded-full",
                      isMuted ? "bg-white text-black" : "bg-white/20 text-white"
                    )}
                    onClick={toggleMute}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </Button>
                </motion.div>

                {isVideo && (
                  <>
                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="ghost"
                        size="lg"
                        className={cn(
                          "w-14 h-14 rounded-full",
                          !isVideoEnabled ? "bg-white text-black" : "bg-white/20 text-white"
                        )}
                        onClick={toggleVideo}
                      >
                        {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                      </Button>
                    </motion.div>

                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="ghost"
                        size="lg"
                        className="w-14 h-14 rounded-full bg-white/20 text-white"
                        onClick={switchCamera}
                      >
                        <RotateCcw className="w-6 h-6" />
                      </Button>
                    </motion.div>
                  </>
                )}

                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-14 h-14 rounded-full bg-white/20 text-white"
                    onClick={toggleFullscreen}
                  >
                    <Maximize2 className="w-6 h-6" />
                  </Button>
                </motion.div>

                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button
                    size="lg"
                    variant="destructive"
                    className="w-16 h-16 rounded-full"
                    onClick={handleEnd}
                  >
                    <PhoneOff className="w-7 h-7" />
                  </Button>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection Status Overlay */}
      {connectionState === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white text-lg">Connecting...</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};
