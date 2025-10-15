import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video, MessageSquare } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { cn } from "@/lib/utils";
import { useNativeRingtone } from "@/hooks/useNativeRingtone";
import { motion } from "framer-motion";

interface IncomingCallScreenProps {
  callerName: string;
  callerAvatar?: string;
  callType: "voice" | "video";
  onAnswer: () => void;
  onReject: () => void;
  onSendMessage?: () => void;
  ringtoneUrl?: string;
}

export function IncomingCallScreen({
  callerName,
  callerAvatar,
  callType,
  onAnswer,
  onReject,
  onSendMessage,
  ringtoneUrl = "/ringtone.mp3"
}: IncomingCallScreenProps) {
  const hapticIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [ringtoneEnabled, setRingtoneEnabled] = React.useState(true);

  useNativeRingtone({
    enabled: ringtoneEnabled,
    ringtoneUrl,
    volume: 1.0
  });

  useEffect(() => {
    // Start ringtone immediately on mount
    const ringtoneTiming = setTimeout(() => {
      console.log('🔔 Ringtone active for incoming call');
    }, 100);

    // iOS-style haptic pattern - starts immediately
    if (Capacitor.isNativePlatform()) {
      const hapticPattern = async () => {
        await Haptics.impact({ style: ImpactStyle.Heavy });
        await new Promise(resolve => setTimeout(resolve, 150));
        await Haptics.impact({ style: ImpactStyle.Medium });
        await new Promise(resolve => setTimeout(resolve, 150));
        await Haptics.impact({ style: ImpactStyle.Heavy });
      };

      // Trigger immediately and repeat every 2 seconds
      hapticPattern();
      hapticIntervalRef.current = setInterval(hapticPattern, 2000);
    }

    return () => {
      clearTimeout(ringtoneTiming);
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
      }
    };
  }, []);

  const handleAnswer = async () => {
    console.log('🔕 Stopping ringtone - call answered');
    setRingtoneEnabled(false); // Stop ringtone BEFORE calling onAnswer
    
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
    
    // Small delay to ensure ringtone stops before transition
    setTimeout(() => {
      onAnswer();
    }, 100);
  };

  const handleReject = async () => {
    console.log('🔕 Stopping ringtone - call rejected');
    setRingtoneEnabled(false); // Stop ringtone BEFORE calling onReject
    
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    
    setTimeout(() => {
      onReject();
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Ringing Status - FaceTime style */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-8 left-8 z-20"
      >
        <div className="bg-white/10 backdrop-blur-md rounded-full px-5 py-2">
          <span className="text-white/90 text-sm font-medium">Ringing</span>
        </div>
      </motion.div>

      {/* Local video preview - top right rounded rectangle (FaceTime style) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, x: 100 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ delay: 0.2, type: "spring", damping: 20 }}
        className="absolute top-8 right-8 w-40 h-52 rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl z-20"
      >
        <div className="relative w-full h-full bg-gray-900">
          <Avatar className="absolute inset-0 w-full h-full rounded-none">
            <AvatarImage src={callerAvatar} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-800 text-white text-5xl rounded-none">
              {callerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </motion.div>

      {/* Main fullscreen video area - dark background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />

      {/* Bottom Controls - FaceTime style */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-12 z-20"
      >
        {/* Decline Button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center gap-3"
        >
          <button
            onClick={handleReject}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-2xl transition-all"
          >
            <PhoneOff className="h-7 w-7 text-white" />
          </button>
        </motion.div>

        {/* Accept Button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center gap-3"
        >
          <button
            onClick={handleAnswer}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-2xl transition-all animate-pulse"
          >
            {callType === 'video' ? (
              <Video className="h-7 w-7 text-white" />
            ) : (
              <Phone className="h-7 w-7 text-white" />
            )}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}