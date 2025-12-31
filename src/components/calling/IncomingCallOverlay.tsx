import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

interface IncomingCallOverlayProps {
  isVisible: boolean;
  callId: string;
  callerName: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
  onAnswer: () => void;
  onDecline: () => void;
}

export const IncomingCallOverlay: React.FC<IncomingCallOverlayProps> = ({
  isVisible,
  callId,
  callerName,
  callerAvatar,
  callType,
  onAnswer,
  onDecline,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Play ringtone and vibrate
  useEffect(() => {
    if (!isVisible) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
      }
      return;
    }

    // Create and play ringtone
    audioRef.current = new Audio('/sounds/ringtone.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.7;
    audioRef.current.play().catch(console.error);

    // Haptic vibration pattern
    if (Capacitor.isNativePlatform()) {
      const vibrate = async () => {
        try {
          await Haptics.notification({ type: NotificationType.Warning });
        } catch (e) {
          console.log('Haptics not available');
        }
      };
      
      vibrate();
      vibrationIntervalRef.current = setInterval(vibrate, 2000);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
      }
    };
  }, [isVisible]);

  const handleAnswer = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.notification({ type: NotificationType.Success });
      } catch (e) {}
    }
    onAnswer();
  };

  const handleDecline = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.notification({ type: NotificationType.Error });
      } catch (e) {}
    }
    onDecline();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900"
        >
          {/* Background blur effect */}
          <div className="absolute inset-0 backdrop-blur-3xl" />

          {/* Pulsing rings animation */}
          <div className="absolute inset-0 flex items-center justify-center">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-white/10"
                initial={{ width: 200, height: 200, opacity: 0.5 }}
                animate={{
                  width: [200, 400, 600],
                  height: [200, 400, 600],
                  opacity: [0.5, 0.2, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 1,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>

          {/* Main content */}
          <div className="relative z-10 h-full flex flex-col items-center justify-between py-16 px-8">
            {/* Top section - Call type indicator */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2"
            >
              {callType === 'video' ? (
                <Video className="w-4 h-4 text-white" />
              ) : (
                <Phone className="w-4 h-4 text-white" />
              )}
              <span className="text-white text-sm font-medium">
                Incoming {callType === 'video' ? 'Video' : 'Voice'} Call
              </span>
            </motion.div>

            {/* Center section - Caller info */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center gap-6"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Avatar className="w-32 h-32 border-4 border-white/20 shadow-2xl">
                  <AvatarImage src={callerAvatar} alt={callerName} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-primary/60 text-white">
                    {callerName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              <div className="text-center">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {callerName}
                </h1>
                <p className="text-white/60">
                  Chatr Plus {callType === 'video' ? 'Video' : 'Voice'}
                </p>
              </div>
            </motion.div>

            {/* Bottom section - Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-16"
            >
              {/* Decline button */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center gap-3"
              >
                <Button
                  size="lg"
                  variant="destructive"
                  className="w-20 h-20 rounded-full shadow-lg shadow-red-500/30"
                  onClick={handleDecline}
                >
                  <PhoneOff className="w-8 h-8" />
                </Button>
                <span className="text-white text-sm">Decline</span>
              </motion.div>

              {/* Answer button with slide gesture area */}
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center gap-3"
              >
                <motion.div
                  animate={{
                    boxShadow: [
                      '0 0 0 0 rgba(34, 197, 94, 0.4)',
                      '0 0 0 20px rgba(34, 197, 94, 0)',
                    ],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Button
                    size="lg"
                    className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30"
                    onClick={handleAnswer}
                  >
                    {callType === 'video' ? (
                      <Video className="w-8 h-8" />
                    ) : (
                      <Phone className="w-8 h-8" />
                    )}
                  </Button>
                </motion.div>
                <span className="text-white text-sm">Accept</span>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
