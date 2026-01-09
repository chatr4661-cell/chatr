import React, { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, MessageSquare, Bell } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useNativeRingtone } from "@/hooks/useNativeRingtone";
import { motion } from "framer-motion";

interface FaceTimeIncomingCallProps {
  callerName: string;
  callerAvatar?: string;
  callType: "voice" | "video";
  onAnswer: () => void;
  onReject: () => void;
  onSendMessage?: () => void;
  onRemindMe?: () => void;
  ringtoneUrl?: string;
}

export function FaceTimeIncomingCall({
  callerName,
  callerAvatar,
  callType,
  onAnswer,
  onReject,
  onSendMessage,
  onRemindMe,
  ringtoneUrl = "/ringtone.mp3",
}: FaceTimeIncomingCallProps) {
  const hapticIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [ringtoneEnabled, setRingtoneEnabled] = React.useState(true);

  useNativeRingtone({
    enabled: ringtoneEnabled,
    ringtoneUrl,
    volume: 1.0
  });

  useEffect(() => {
    // iOS-style haptic pattern
    if (Capacitor.isNativePlatform()) {
      const hapticPattern = async () => {
        await Haptics.impact({ style: ImpactStyle.Heavy });
        await new Promise(resolve => setTimeout(resolve, 150));
        await Haptics.impact({ style: ImpactStyle.Medium });
        await new Promise(resolve => setTimeout(resolve, 150));
        await Haptics.impact({ style: ImpactStyle.Heavy });
      };

      hapticPattern();
      hapticIntervalRef.current = setInterval(hapticPattern, 2000);
    }

    return () => {
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
      }
    };
  }, []);

  const handleAnswer = async () => {
    setRingtoneEnabled(false);
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
    setTimeout(() => onAnswer(), 100);
  };

  const handleReject = async () => {
    setRingtoneEnabled(false);
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    setTimeout(() => onReject(), 100);
  };

  const handleRemindMe = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    onRemindMe?.();
  };

  const handleMessage = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    onSendMessage?.();
  };

  return (
    <div className="full-bleed z-[100] overflow-hidden">
      {/* Full-screen caller photo background */}
      <div className="absolute inset-0">
        {callerAvatar ? (
          <img
            src={callerAvatar}
            alt={callerName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 flex items-center justify-center">
            <span className="text-white/30 text-[200px] font-light">
              {callerName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Gradient overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
      </div>

      {/* Top section - Caller info */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="absolute top-0 left-0 right-0 pt-[calc(var(--safe-area-top)+40px)] px-6 text-center"
      >
        <h1 className="text-white text-4xl md:text-5xl font-semibold tracking-tight drop-shadow-lg">
          {callerName}
        </h1>
        <p className="text-white/80 text-xl mt-2 flex items-center justify-center gap-2">
          <Phone className="w-5 h-5" />
          <span>{callType === 'video' ? 'Chatr Plus Video' : 'Chatr Plus Voice'}</span>
        </p>
        <p className="text-white/60 text-sm mt-1">HD 1080p • Noise Cancellation</p>
      </motion.div>

      {/* Middle section - Quick actions (Remind Me & Message) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="absolute left-0 right-0 bottom-[220px] flex justify-center gap-16"
      >
        {/* Remind Me Button */}
        <motion.button
          onClick={handleRemindMe}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center">
            <Bell className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-sm font-medium">Remind Me</span>
        </motion.button>

        {/* Message Button */}
        <motion.button
          onClick={handleMessage}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-sm font-medium">Message</span>
        </motion.button>
      </motion.div>

      {/* Bottom section - Accept/Decline buttons */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="absolute left-0 right-0 bottom-0 pb-[calc(var(--safe-area-bottom)+40px)] px-8"
      >
        <div className="flex items-center justify-center gap-16">
          {/* Decline Button */}
          <motion.button
            onClick={handleReject}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-20 h-20 rounded-full bg-[#FF3B30] flex items-center justify-center shadow-2xl shadow-red-500/30">
              <Phone className="w-9 h-9 text-white rotate-[135deg]" />
            </div>
            <span className="text-white text-base font-medium">Decline</span>
          </motion.button>

          {/* Accept Button */}
          <motion.button
            onClick={handleAnswer}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-3"
          >
            <motion.div 
              animate={{ 
                boxShadow: [
                  '0 0 0 0 rgba(52, 199, 89, 0.4)',
                  '0 0 0 15px rgba(52, 199, 89, 0)',
                  '0 0 0 0 rgba(52, 199, 89, 0)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 rounded-full bg-[#34C759] flex items-center justify-center shadow-2xl shadow-green-500/30"
            >
              <Phone className="w-9 h-9 text-white" />
            </motion.div>
            <span className="text-white text-base font-medium">Accept</span>
          </motion.button>
        </div>
      </motion.div>

      {/* iOS home indicator area (visual only) */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-36 h-1 bg-white/30 rounded-full" />
    </div>
  );
}
