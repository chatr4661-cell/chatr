import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Video, VideoOff, Phone, Maximize2, 
  Minimize2, Volume2, VolumeX, Grid3x3, User 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface ActiveCallScreenProps {
  callId: string;
  callType: 'voice' | 'video';
  callerName: string;
  callerAvatar?: string;
  receiverName: string;
  receiverAvatar?: string;
  onEndCall: () => void;
}

export const ActiveCallScreen = ({
  callId,
  callType,
  callerName,
  callerAvatar,
  receiverName,
  receiverAvatar,
  onEndCall
}: ActiveCallScreenProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');

  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div className="bg-card border rounded-2xl shadow-2xl p-4 w-64">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={receiverAvatar} />
              <AvatarFallback>{receiverName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{receiverName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(callDuration)}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(false)}
              className="h-8"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onEndCall}
              className="h-8 rounded-full"
            >
              <Phone className="h-4 w-4 rotate-[135deg]" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    >
      {/* Video Container */}
      <div className="relative h-full w-full">
        {callType === 'video' && !isVideoOff ? (
          <>
            {/* Main Video */}
            <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
              <div className="text-center">
                <Avatar className="h-32 w-32 mx-auto mb-4 ring-4 ring-white/10">
                  <AvatarImage src={receiverAvatar} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-slate-700 to-slate-800">
                    {receiverName[0]}
                  </AvatarFallback>
                </Avatar>
                <p className="text-white text-2xl font-semibold">{receiverName}</p>
              </div>
            </div>

            {/* Picture-in-Picture - Your Video */}
            <motion.div
              drag
              dragMomentum={false}
              className="absolute top-6 right-6 w-32 h-44 bg-slate-800 rounded-2xl border-2 border-white/20 shadow-2xl overflow-hidden cursor-move"
            >
              <div className="h-full flex items-center justify-center">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={callerAvatar} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80">
                    {callerName[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
            </motion.div>
          </>
        ) : (
          /* Voice Call or Video Off */
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <motion.div
                animate={{ 
                  scale: [1, 1.05, 1],
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Avatar className="h-44 w-44 mx-auto mb-6 ring-8 ring-white/10 shadow-2xl">
                  <AvatarImage src={receiverAvatar} />
                  <AvatarFallback className="text-6xl bg-gradient-to-br from-slate-600 to-slate-700">
                    {receiverName[0]}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              <h1 className="text-white text-5xl font-semibold mb-3 tracking-tight">
                {receiverName}
              </h1>
              <p className="text-white/70 text-2xl font-normal">
                {formatDuration(callDuration)}
              </p>
            </div>
          </div>
        )}

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <Badge variant="secondary" className="bg-green-500/90 text-white border-0">
              <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
              {formatDuration(callDuration)}
            </Badge>
            
            <div className="flex items-center gap-2">
              {callType === 'video' && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setViewMode(viewMode === 'single' ? 'grid' : 'single')}
                  className="h-10 w-10 bg-white/10 hover:bg-white/20 text-white rounded-full"
                >
                  {viewMode === 'single' ? (
                    <Grid3x3 className="h-5 w-5" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsMinimized(true)}
                className="h-10 w-10 bg-white/10 hover:bg-white/20 text-white rounded-full"
              >
                <Minimize2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex items-center justify-center gap-6 max-w-2xl mx-auto">
            {/* Mute */}
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                size="icon"
                variant={isMuted ? "destructive" : "ghost"}
                onClick={() => setIsMuted(!isMuted)}
                className={`h-16 w-16 rounded-full ${
                  isMuted 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-white/10 hover:bg-white/20'
                } text-white`}
              >
                {isMuted ? (
                  <MicOff className="h-7 w-7" />
                ) : (
                  <Mic className="h-7 w-7" />
                )}
              </Button>
            </motion.div>

            {/* End Call */}
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                size="icon"
                onClick={onEndCall}
                className="h-20 w-20 rounded-full bg-[#FF3B30] hover:bg-[#FF2D21] text-white shadow-2xl"
              >
                <Phone className="h-8 w-8 rotate-[135deg]" />
              </Button>
            </motion.div>

            {/* Video Toggle (only for video calls) */}
            {callType === 'video' && (
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button
                  size="icon"
                  variant={isVideoOff ? "destructive" : "ghost"}
                  onClick={() => setIsVideoOff(!isVideoOff)}
                  className={`h-16 w-16 rounded-full ${
                    isVideoOff 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-white/10 hover:bg-white/20'
                  } text-white`}
                >
                  {isVideoOff ? (
                    <VideoOff className="h-7 w-7" />
                  ) : (
                    <Video className="h-7 w-7" />
                  )}
                </Button>
              </motion.div>
            )}

            {/* Speaker (only for voice calls) */}
            {callType === 'voice' && (
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  className={`h-16 w-16 rounded-full ${
                    isSpeakerOn 
                      ? 'bg-primary hover:bg-primary/80' 
                      : 'bg-white/10 hover:bg-white/20'
                  } text-white`}
                >
                  {isSpeakerOn ? (
                    <Volume2 className="h-7 w-7" />
                  ) : (
                    <VolumeX className="h-7 w-7" />
                  )}
                </Button>
              </motion.div>
            )}
          </div>

          {/* Control Labels */}
          <div className="flex items-center justify-center gap-6 max-w-2xl mx-auto mt-4">
            <p className="text-white/70 text-sm w-16 text-center">
              {isMuted ? 'Unmute' : 'Mute'}
            </p>
            <p className="text-white/70 text-sm w-20 text-center">End</p>
            {callType === 'video' ? (
              <p className="text-white/70 text-sm w-16 text-center">
                {isVideoOff ? 'Video' : 'Video'}
              </p>
            ) : (
              <p className="text-white/70 text-sm w-16 text-center">
                {isSpeakerOn ? 'Speaker' : 'Speaker'}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
