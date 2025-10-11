import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

// Native ringtone plugin (will use Capacitor's local notifications)
interface UseNativeRingtoneOptions {
  enabled: boolean;
  ringtoneUrl?: string;
  volume?: number;
}

export function useNativeRingtone({
  enabled,
  ringtoneUrl = "/ringtone.mp3",
  volume = 0.8
}: UseNativeRingtoneOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startVibration = () => {
    if (!Capacitor.isNativePlatform()) return;

    const pattern = async () => {
      await Haptics.impact({ style: ImpactStyle.Heavy });
      await new Promise(resolve => setTimeout(resolve, 200));
      await Haptics.impact({ style: ImpactStyle.Medium });
      await new Promise(resolve => setTimeout(resolve, 200));
      await Haptics.impact({ style: ImpactStyle.Heavy });
    };

    pattern();
    vibrationIntervalRef.current = setInterval(pattern, 2000);
  };

  const stopVibration = () => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (enabled) {
      console.log('🔔 Starting native ringtone:', ringtoneUrl);
      
      // Create audio with maximum compatibility settings
      const audio = new Audio(ringtoneUrl);
      audio.loop = true;
      audio.volume = volume;
      audio.preload = 'auto';
      audioRef.current = audio;

      // Try to play immediately
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Ringtone playing');
            startVibration();
          })
          .catch((error) => {
            console.log('⚠️ Autoplay blocked, waiting for user interaction:', error.name);
            
            // On mobile, show a notification that can trigger the ringtone
            if (Capacitor.isNativePlatform()) {
              // Use vibration as fallback
              startVibration();
              
              // Try to play on ANY user interaction
              const tryPlay = () => {
                audio.play()
                  .then(() => {
                    console.log('✅ Ringtone playing after interaction');
                  })
                  .catch(e => console.log('Still blocked:', e));
              };

              // Listen for any interaction
              document.addEventListener('touchstart', tryPlay, { once: true, capture: true });
              document.addEventListener('click', tryPlay, { once: true, capture: true });
              window.addEventListener('focus', tryPlay, { once: true });
            } else {
              // Web fallback - show visual indication
              const enableOnInteraction = () => {
                audio.play()
                  .then(() => {
                    console.log('✅ Ringtone playing after interaction');
                    startVibration();
                  });
              };
              
              document.addEventListener('click', enableOnInteraction, { once: true });
              document.addEventListener('touchstart', enableOnInteraction, { once: true });
            }
          });
      }
    } else if (audioRef.current) {
      console.log('🔕 Stopping ringtone');
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      stopVibration();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      stopVibration();
    };
  }, [enabled, ringtoneUrl]);

  return { isPlaying: !!audioRef.current };
}
