import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface UseRingtoneOptions {
  enabled: boolean;
  ringtoneUrl?: string;
  volume?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

export function useRingtone({
  enabled,
  ringtoneUrl = "/ringtone.mp3",
  volume = 0.8,
  fadeInDuration = 1000,
  fadeOutDuration = 500
}: UseRingtoneOptions) {
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const fadeIn = (audio: HTMLAudioElement, targetVolume: number, duration: number) => {
    audio.volume = 0;
    const steps = 20;
    const stepTime = duration / steps;
    const volumeIncrement = targetVolume / steps;
    let currentStep = 0;

    fadeIntervalRef.current = setInterval(() => {
      if (currentStep >= steps) {
        audio.volume = targetVolume;
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        return;
      }
      audio.volume = Math.min(audio.volume + volumeIncrement, targetVolume);
      currentStep++;
    }, stepTime);
  };

  const fadeOut = (audio: HTMLAudioElement, duration: number, onComplete?: () => void) => {
    const startVolume = audio.volume;
    const steps = 20;
    const stepTime = duration / steps;
    const volumeDecrement = startVolume / steps;
    let currentStep = 0;

    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    fadeIntervalRef.current = setInterval(() => {
      if (currentStep >= steps) {
        audio.volume = 0;
        audio.pause();
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        onComplete?.();
        return;
      }
      audio.volume = Math.max(audio.volume - volumeDecrement, 0);
      currentStep++;
    }, stepTime);
  };

  const startVibration = () => {
    if (!Capacitor.isNativePlatform()) return;

    // iOS-style vibration pattern: long-short-long
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
    if (enabled && !isPlaying) {
      const audio = new Audio(ringtoneUrl);
      audio.loop = true;
      ringtoneRef.current = audio;

      audio.play().then(() => {
        fadeIn(audio, volume, fadeInDuration);
        setIsPlaying(true);
        startVibration();
      }).catch((error) => {
        console.log('⚠️ Ringtone autoplay blocked:', error);
        
        // Enable on first user interaction
        const enableOnInteraction = () => {
          audio.play().then(() => {
            fadeIn(audio, volume, fadeInDuration);
            setIsPlaying(true);
            startVibration();
          });
          document.removeEventListener('click', enableOnInteraction);
          document.removeEventListener('touchstart', enableOnInteraction);
        };
        
        document.addEventListener('click', enableOnInteraction);
        document.addEventListener('touchstart', enableOnInteraction);
      });
    } else if (!enabled && ringtoneRef.current) {
      // Immediately stop ringtone when disabled
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current = null;
      setIsPlaying(false);
      stopVibration();
    }

    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
        ringtoneRef.current = null;
      }
      stopVibration();
      setIsPlaying(false);
    };
  }, [enabled]);

  return { isPlaying };
}
