import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video, MessageSquare } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { cn } from "@/lib/utils";
import { useRingtone } from "@/hooks/useRingtone";
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

  useRingtone({
    enabled: true,
    ringtoneUrl,
    volume: 0.8,
    fadeInDuration: 1000,
    fadeOutDuration: 500
  });

  useEffect(() => {
    // iOS-style haptic pattern
    if (Capacitor.isNativePlatform()) {
      const hapticPattern = async () => {
        await Haptics.impact({ style: ImpactStyle.Heavy });
        await new Promise(resolve => setTimeout(resolve, 200));
        await Haptics.impact({ style: ImpactStyle.Medium });
        await new Promise(resolve => setTimeout(resolve, 200));
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
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
    onAnswer();
  };

  const handleReject = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    onReject();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-primary/10 via-background to-secondary/10 backdrop-blur-2xl flex items-center justify-center p-6">
      {/* Background animated blur circles */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Card className="w-full max-w-md backdrop-blur-xl bg-card/60 border-border/50 shadow-2xl p-10 relative">
        <div className="flex flex-col items-center space-y-8">
          {/* Avatar with pulsing rings */}
          <div className="relative">
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-2xl opacity-30"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            
            {/* Multiple pulsing rings */}
            {[0, 0.3, 0.6].map((delay, i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border-4 border-primary/40"
                animate={{
                  scale: [1, 2],
                  opacity: [0.6, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay,
                  ease: "easeOut"
                }}
              />
            ))}
            
            <Avatar className="h-44 w-44 border-4 border-white/20 shadow-2xl relative z-10">
              <AvatarImage src={callerAvatar} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-6xl">
                {callerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Caller Info */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {callerName}
            </h1>
            <p className="text-lg text-muted-foreground capitalize flex items-center justify-center gap-2">
              {callType === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
              Incoming {callType} call
            </p>
            <p className="text-sm text-muted-foreground/70 animate-pulse">Ringing...</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-8 pt-6">
            {/* Reject Button */}
            <div className="flex flex-col items-center gap-3">
              <Button
                variant="destructive"
                size="lg"
                onClick={handleReject}
                className={cn(
                  "rounded-full h-20 w-20 shadow-2xl",
                  "bg-red-500 hover:bg-red-600",
                  "hover:scale-110 active:scale-95",
                  "transition-all duration-200"
                )}
              >
                <PhoneOff className="h-9 w-9" />
              </Button>
              <span className="text-sm font-medium text-muted-foreground">Decline</span>
            </div>

            {/* Accept Button */}
            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={handleAnswer}
                className={cn(
                  "rounded-full h-20 w-20 shadow-2xl",
                  "bg-green-500 hover:bg-green-600",
                  "hover:scale-110 active:scale-95",
                  "transition-all duration-200",
                  "animate-pulse"
                )}
              >
                {callType === 'video' ? (
                  <Video className="h-9 w-9" />
                ) : (
                  <Phone className="h-9 w-9" />
                )}
              </Button>
              <span className="text-sm font-medium text-green-500">Accept</span>
            </div>
          </div>

          {/* Quick Actions */}
          {onSendMessage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSendMessage}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Send message
            </Button>
          )}
        </div>
        </Card>
      </motion.div>
    </div>
  );
}