import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video, MessageSquare } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { cn } from "@/lib/utils";

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
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);

  useEffect(() => {
    // Initialize audio element
    const audio = new Audio(ringtoneUrl);
    audio.loop = true;
    audio.volume = 0.8;
    ringtoneRef.current = audio;

    // Try to play immediately (may fail due to autoplay policy)
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('✅ Ringtone playing');
          setAudioEnabled(true);
        })
        .catch((error) => {
          console.log('⚠️ Autoplay blocked, waiting for user interaction:', error);
          setAudioEnabled(false);
          
          // Try playing on first user interaction
          const enableAudioOnInteraction = () => {
            audio.play()
              .then(() => {
                console.log('✅ Ringtone enabled after user interaction');
                setAudioEnabled(true);
              })
              .catch(e => console.log('Failed to play ringtone:', e));
            
            // Remove listeners after first successful play
            document.removeEventListener('click', enableAudioOnInteraction);
            document.removeEventListener('touchstart', enableAudioOnInteraction);
          };
          
          document.addEventListener('click', enableAudioOnInteraction);
          document.addEventListener('touchstart', enableAudioOnInteraction);
        });
    }

    // Vibrate on mobile
    if (Capacitor.isNativePlatform()) {
      vibrationIntervalRef.current = setInterval(async () => {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      }, 1000);
    }

    return () => {
      // Cleanup
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
      }
    };
  }, [ringtoneUrl]);

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
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-primary/10 via-background to-secondary/10 backdrop-blur-2xl flex items-center justify-center p-6 animate-fade-in">
      {/* Background animated blur circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Card className="w-full max-w-md backdrop-blur-xl bg-card/60 border-border/50 shadow-2xl p-10 animate-scale-in relative">
        <div className="flex flex-col items-center space-y-8">
          {/* Avatar with pulsing rings */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-2xl opacity-30 animate-pulse" />
            
            {/* Multiple pulsing rings */}
            <div className="absolute inset-0 rounded-full border-4 border-primary/40 animate-ping" />
            <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" style={{ animationDelay: '0.3s' }} />
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" style={{ animationDelay: '0.6s' }} />
            
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
    </div>
  );
}