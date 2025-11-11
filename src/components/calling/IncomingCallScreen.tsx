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
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center overflow-hidden">
      {/* Subtle blur overlay for depth */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      
      {/* Caller Info - Centered vertically */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center gap-8 z-20 px-4"
      >
        {/* Large circular avatar - FaceTime style */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
        >
          <Avatar className="h-44 w-44 ring-8 ring-white/10 shadow-2xl">
            <AvatarImage src={callerAvatar} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 text-white text-6xl font-semibold">
              {callerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </motion.div>
        
        {/* Caller name and call type */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-center space-y-3"
        >
          <h1 className="text-white text-5xl font-semibold tracking-tight">
            {callerName}
          </h1>
          <p className="text-white/80 text-2xl font-normal">
            {callType === 'video' ? 'Incoming video call' : 'Incoming voice call'}
          </p>
          
          {/* Location Display */}
          {(callerCity || callerCountry) && (
            <LocationPresenceBadge
              city={callerCity}
              country={callerCountry}
              locationSharingEnabled={callerLocationSharing}
              locationPrecision={callerLocationPrecision}
              showLastSeen={false}
              compact={true}
              className="justify-center text-white/50 text-base"
            />
          )}
        </motion.div>
      </motion.div>

      {/* Bottom action buttons - FaceTime style with text labels */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="absolute bottom-16 left-0 right-0 flex items-center justify-center gap-8 z-20 px-8"
      >
        {/* Decline Button - Red pill shape */}
        <motion.button
          onClick={handleReject}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 max-w-[200px] h-20 rounded-full bg-[#FF3B30] hover:bg-[#FF2D21] flex items-center justify-center shadow-2xl transition-all"
        >
          <span className="text-white text-3xl font-semibold">Decline</span>
        </motion.button>

        {/* Accept Button - Green pill shape with pulse */}
        <motion.button
          onClick={handleAnswer}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 max-w-[200px] h-20 rounded-full bg-[#34C759] hover:bg-[#2DB84C] flex items-center justify-center shadow-2xl transition-all animate-pulse"
        >
          <span className="text-white text-3xl font-semibold">Accept</span>
        </motion.button>
      </motion.div>
    </div>
  );
}