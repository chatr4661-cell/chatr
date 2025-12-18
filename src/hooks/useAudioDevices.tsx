import { useState, useEffect, useCallback, useRef } from 'react';

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  isDefault: boolean;
  type: 'microphone' | 'speaker' | 'earphone' | 'headset' | 'bluetooth' | 'unknown';
}

interface AudioDevicesState {
  microphones: AudioDevice[];
  speakers: AudioDevice[];
  selectedMicrophone: string | null;
  selectedSpeaker: string | null;
  isLoading: boolean;
  error: string | null;
}

const detectDeviceType = (label: string): AudioDevice['type'] => {
  const lowerLabel = label.toLowerCase();
  
  if (lowerLabel.includes('bluetooth') || lowerLabel.includes('airpods') || lowerLabel.includes('wireless')) {
    return 'bluetooth';
  }
  if (lowerLabel.includes('headset') || lowerLabel.includes('headphone') || lowerLabel.includes('earphone')) {
    return 'headset';
  }
  if (lowerLabel.includes('earbuds') || lowerLabel.includes('earpod')) {
    return 'earphone';
  }
  if (lowerLabel.includes('speaker') || lowerLabel.includes('output')) {
    return 'speaker';
  }
  if (lowerLabel.includes('microphone') || lowerLabel.includes('input') || lowerLabel.includes('mic')) {
    return 'microphone';
  }
  return 'unknown';
};

export const useAudioDevices = () => {
  const [state, setState] = useState<AudioDevicesState>({
    microphones: [],
    speakers: [],
    selectedMicrophone: null,
    selectedSpeaker: null,
    isLoading: true,
    error: null,
  });
  
  const audioContextRef = useRef<AudioContext | null>(null);

  const loadDevices = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Request permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => stream.getTracks().forEach(track => track.stop()))
        .catch(() => {}); // Ignore permission errors
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const microphones: AudioDevice[] = [];
      const speakers: AudioDevice[] = [];
      
      devices.forEach((device, index) => {
        const isDefault = device.deviceId === 'default' || index === 0;
        const type = detectDeviceType(device.label);
        
        if (device.kind === 'audioinput') {
          microphones.push({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${index + 1}`,
            kind: 'audioinput',
            isDefault,
            type: type === 'speaker' ? 'microphone' : type,
          });
        } else if (device.kind === 'audiooutput') {
          speakers.push({
            deviceId: device.deviceId,
            label: device.label || `Speaker ${index + 1}`,
            kind: 'audiooutput',
            isDefault,
            type: type === 'microphone' ? 'speaker' : type,
          });
        }
      });
      
      setState(prev => ({
        ...prev,
        microphones,
        speakers,
        selectedMicrophone: prev.selectedMicrophone || microphones[0]?.deviceId || null,
        selectedSpeaker: prev.selectedSpeaker || speakers[0]?.deviceId || null,
        isLoading: false,
      }));
      
    } catch (error) {
      console.error('Failed to load audio devices:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load devices',
      }));
    }
  }, []);

  // Listen for device changes (plugging/unplugging)
  useEffect(() => {
    loadDevices();
    
    const handleDeviceChange = () => {
      console.log('🔊 Audio devices changed');
      loadDevices();
    };
    
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [loadDevices]);

  const selectMicrophone = useCallback((deviceId: string) => {
    setState(prev => ({ ...prev, selectedMicrophone: deviceId }));
  }, []);

  const selectSpeaker = useCallback(async (deviceId: string) => {
    setState(prev => ({ ...prev, selectedSpeaker: deviceId }));
  }, []);

  // Apply selected speaker to an audio/video element
  const applySpeakerToElement = useCallback(async (element: HTMLAudioElement | HTMLVideoElement) => {
    if (state.selectedSpeaker && 'setSinkId' in element) {
      try {
        await (element as any).setSinkId(state.selectedSpeaker);
        console.log('✅ Speaker output set to:', state.selectedSpeaker);
      } catch (error) {
        console.warn('Failed to set speaker output:', error);
      }
    }
  }, [state.selectedSpeaker]);

  // Get HD audio constraints for selected microphone
  const getAudioConstraints = useCallback((): MediaTrackConstraints => {
    return {
      deviceId: state.selectedMicrophone ? { exact: state.selectedMicrophone } : undefined,
      
      // HD Audio Quality - Studio-grade
      echoCancellation: { ideal: true },
      noiseSuppression: { ideal: true },
      autoGainControl: { ideal: true },
      sampleRate: { ideal: 48000, min: 44100 },
      sampleSize: { ideal: 24, min: 16 },
      channelCount: { ideal: 2, min: 1 },
      
      // @ts-ignore - Chrome/Edge specific
      googEchoCancellation: true,
      googAutoGainControl: true,
      googNoiseSuppression: true,
      googHighpassFilter: true,
      googTypingNoiseDetection: true,
      googNoiseReduction: true,
      
      latency: { ideal: 0.01, max: 0.05 },
    };
  }, [state.selectedMicrophone]);

  // Test microphone with audio level visualization
  const testMicrophone = useCallback(async (onLevel: (level: number) => void) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: getAudioConstraints(),
      });
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let animationId: number;
      
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        onLevel(Math.round((average / 255) * 100));
        animationId = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
      
      // Return cleanup function
      return () => {
        cancelAnimationFrame(animationId);
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };
    } catch (error) {
      console.error('Microphone test failed:', error);
      return () => {};
    }
  }, [getAudioConstraints]);

  // Test speaker with a test tone
  const testSpeaker = useCallback(async () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 440; // A4 note
      gainNode.gain.value = 0.3;
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      
      // Fade out
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 600);
      
    } catch (error) {
      console.error('Speaker test failed:', error);
    }
  }, []);

  return {
    ...state,
    loadDevices,
    selectMicrophone,
    selectSpeaker,
    applySpeakerToElement,
    getAudioConstraints,
    testMicrophone,
    testSpeaker,
  };
};
