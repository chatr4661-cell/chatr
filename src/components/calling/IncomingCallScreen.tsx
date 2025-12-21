import React, { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, MessageSquare, Bell } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useNativeRingtone } from "@/hooks/useNativeRingtone";
import { motion } from "framer-motion";
import { LocationPresenceBadge } from "@/components/LocationPresenceBadge";

interface IncomingCallScreenProps {
  callerName: string;
  callerAvatar?: string;
  callType: "voice" | "video";
  onAnswer: () => void;
  onReject: () => void;
  onSendMessage?: () => void;
  ringtoneUrl?: string;
  callerCity?: string;
  callerCountry?: string;
  callerLocationSharing?: boolean;
  callerLocationPrecision?: 'exact' | 'city' | 'off';
}

export function IncomingCallScreen({
  callerName,
  callerAvatar,
  callType,
  onAnswer,
  onReject,
  onSendMessage,
  ringtoneUrl = "/ringtone.mp3",
  callerCity,
  callerCountry,
  callerLocationSharing,
  callerLocationPrecision
}: IncomingCallScreenProps) {
  const hapticIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [ringtoneEnabled, setRingtoneEnabled] = React.useState(true);

  useNativeRingtone({
    enabled: ringtoneEnabled,
    ringtoneUrl,
    volume: 1.0
  });

  useEffect(() => {
    console.log('🔔 Ringtone active for incoming call');

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
    console.log('🔕 Stopping ringtone - call answered');
    setRingtoneEnabled(false);
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
    setTimeout(() => onAnswer(), 100);
  };

  const handleReject = async () => {
    console.log('🔕 Stopping ringtone - call rejected');
    setRingtoneEnabled(false);
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    setTimeout(() => onReject(), 100);
  };

  const handleMessage = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    onSendMessage?.();
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden" style={{ 
      width: '100vw', 
      height: '100dvh',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>
      {/* Full-screen caller photo background - FaceTime style */}
      <div className="absolute inset-0">
        {callerAvatar ? (
          <img
            src={callerAvatar}
            alt={callerName}
            className="w-full h-full object-cover scale-110"
            style={{ filter: 'blur(2px)' }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 flex items-center justify-center">
            <span className="text-white/20 text-[250px] font-light select-none">
              {callerName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Gradient overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80" />
      </div>

      {/* Top section - Caller info with safe area */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="absolute top-0 left-0 right-0 text-center z-10"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 20px) + 40px)' }}
      >
        <h1 className="text-white text-4xl md:text-5xl font-semibold tracking-tight drop-shadow-2xl">
          {callerName}
        </h1>
        <p className="text-white/80 text-xl mt-2 flex items-center justify-center gap-2">
          <Phone className="w-5 h-5" />
          <span>{callType === 'video' ? 'Chatr Plus Video' : 'Chatr Plus Voice'}</span>
        </p>
        <p className="text-white/60 text-sm mt-1">HD 1080p • Noise Cancellation</p>
        
        {/* Location Display */}
        {(callerCity || callerCountry) && (
          <div className="mt-3">
            <LocationPresenceBadge
              city={callerCity}
              country={callerCountry}
              locationSharingEnabled={callerLocationSharing}
              locationPrecision={callerLocationPrecision}
              showLastSeen={false}
              compact={true}
              className="justify-center text-white/60 text-base"
            />
          </div>
        )}
      </motion.div>

      {/* Center - Large avatar for video calls */}
      {callerAvatar && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        >
          <Avatar className="h-40 w-40 ring-4 ring-white/20 shadow-2xl">
            <AvatarImage src={callerAvatar} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 text-white text-6xl font-semibold">
              {callerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </motion.div>
      )}

      {/* Middle section - Quick actions (Remind Me & Message) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="absolute left-0 right-0 flex justify-center gap-20 z-10"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 20px) + 180px)' }}
      >
        {/* Remind Me Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/10">
            <Bell className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-sm font-medium drop-shadow">Remind Me</span>
        </motion.button>

        {/* Message Button */}
        <motion.button
          onClick={handleMessage}
          whileTap={{ scale: 0.9 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/10">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-sm font-medium drop-shadow">Message</span>
        </motion.button>
      </motion.div>

      {/* Bottom section - Accept/Decline buttons with safe area */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="absolute left-0 right-0 bottom-0 px-8 z-10"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 40px)' }}
      >
        <div className="flex items-center justify-center gap-24">
          {/* Decline Button */}
          <motion.button
            onClick={handleReject}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-20 h-20 rounded-full bg-[#FF3B30] flex items-center justify-center shadow-2xl shadow-red-500/40">
              <Phone className="w-9 h-9 text-white rotate-[135deg]" />
            </div>
            <span className="text-white text-base font-medium drop-shadow">Decline</span>
          </motion.button>

          {/* Accept Button with pulse animation */}
          <motion.button
            onClick={handleAnswer}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-3"
          >
            <motion.div 
              animate={{ 
                boxShadow: [
                  '0 0 0 0 rgba(52, 199, 89, 0.5)',
                  '0 0 0 20px rgba(52, 199, 89, 0)',
                  '0 0 0 0 rgba(52, 199, 89, 0)'
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-20 h-20 rounded-full bg-[#34C759] flex items-center justify-center shadow-2xl shadow-green-500/40"
            >
              <Phone className="w-9 h-9 text-white" />
            </motion.div>
            <span className="text-white text-base font-medium drop-shadow">Accept</span>
          </motion.button>
        </div>
      </motion.div>

      {/* iOS home indicator bar */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 w-36 h-1.5 bg-white/40 rounded-full z-20"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 8px) + 8px)' }}
      />
    </div>
  );
}