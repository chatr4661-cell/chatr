import { useEffect, useRef, useCallback } from 'react';

/**
 * GSM-style ringback tone for outgoing calls
 * Plays the "ring ring" sound the caller hears while waiting for recipient to answer
 */
export const useRingbackTone = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);

  // Standard GSM ringback frequencies (varies by country, using common pattern)
  // UK/EU style: 400Hz + 450Hz mixed
  // US style: 440Hz + 480Hz mixed
  const RINGBACK_FREQ_1 = 440; // Hz
  const RINGBACK_FREQ_2 = 480; // Hz
  const RING_ON_DURATION = 2000; // 2 seconds on
  const RING_OFF_DURATION = 4000; // 4 seconds off

  const startRingback = useCallback(() => {
    if (isPlayingRef.current) return;
    
    try {
      console.log('🔔 [Ringback] Starting ringback tone');
      
      // Create audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioContext = audioContextRef.current;
      
      // Create gain node for volume control
      gainNodeRef.current = audioContext.createGain();
      gainNodeRef.current.gain.value = 0; // Start silent
      gainNodeRef.current.connect(audioContext.destination);
      
      isPlayingRef.current = true;
      
      // Create ring pattern (on/off cycle)
      const playRingCycle = () => {
        if (!isPlayingRef.current || !audioContextRef.current) return;
        
        const audioContext = audioContextRef.current;
        const gainNode = gainNodeRef.current!;
        
        // Create oscillators for dual-tone
        const osc1 = audioContext.createOscillator();
        const osc2 = audioContext.createOscillator();
        
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.value = RINGBACK_FREQ_1;
        osc2.frequency.value = RINGBACK_FREQ_2;
        
        // Mix the two frequencies
        const mixer = audioContext.createGain();
        mixer.gain.value = 0.15; // Low volume
        
        osc1.connect(mixer);
        osc2.connect(mixer);
        mixer.connect(gainNode);
        
        // Fade in
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        
        osc1.start();
        osc2.start();
        
        oscillatorRef.current = osc1; // Store reference for cleanup
        
        // Ring for RING_ON_DURATION, then stop
        setTimeout(() => {
          if (!isPlayingRef.current) return;
          
          // Fade out
          if (gainNode && audioContext.state === 'running') {
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
          }
          
          setTimeout(() => {
            try {
              osc1.stop();
              osc2.stop();
              osc1.disconnect();
              osc2.disconnect();
            } catch (e) {
              // Ignore - oscillator may already be stopped
            }
          }, 150);
        }, RING_ON_DURATION);
      };
      
      // Start first ring immediately
      playRingCycle();
      
      // Set up interval for repeated rings
      intervalRef.current = setInterval(() => {
        if (isPlayingRef.current) {
          playRingCycle();
        }
      }, RING_ON_DURATION + RING_OFF_DURATION);
      
    } catch (error) {
      console.error('❌ [Ringback] Failed to start:', error);
    }
  }, []);

  const stopRingback = useCallback(() => {
    console.log('🔔 [Ringback] Stopping ringback tone');
    
    isPlayingRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch (e) {
        // Ignore
      }
      oscillatorRef.current = null;
    }
    
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRingback();
    };
  }, [stopRingback]);

  return { startRingback, stopRingback };
};
