import { useState, useCallback, useRef, useEffect } from 'react';

interface NoiseCancellationConfig {
  enabled: boolean;
  level: 'low' | 'medium' | 'high';
  autoGain: boolean;
  echoCancellation: boolean;
}

export const useNoiseCancellation = () => {
  const [config, setConfig] = useState<NoiseCancellationConfig>({
    enabled: true,
    level: 'medium',
    autoGain: true,
    echoCancellation: true,
  });
  const [isSupported, setIsSupported] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [noiseLevel, setNoiseLevel] = useState(0);

  useEffect(() => {
    // Check if browser supports audio processing
    setIsSupported('AudioContext' in window || 'webkitAudioContext' in window);
  }, []);

  const getMediaConstraints = useCallback((): MediaTrackConstraints => {
    const constraints: MediaTrackConstraints = {
      echoCancellation: config.echoCancellation,
      noiseSuppression: config.enabled,
      autoGainControl: config.autoGain,
    };

    // Advanced constraints based on level
    if (config.enabled) {
      switch (config.level) {
        case 'high':
          // @ts-ignore - experimental constraint
          constraints.googNoiseSuppression = true;
          // @ts-ignore
          constraints.googHighpassFilter = true;
          break;
        case 'medium':
          // @ts-ignore
          constraints.googNoiseSuppression = true;
          break;
        case 'low':
        default:
          break;
      }
    }

    return constraints;
  }, [config]);

  const applyToStream = useCallback(async (stream: MediaStream): Promise<MediaStream> => {
    if (!config.enabled || !isSupported) return stream;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const destination = audioContextRef.current.createMediaStreamDestination();
      
      // Create analyser for noise level visualization
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      // Create filters based on noise cancellation level
      if (config.level === 'high' || config.level === 'medium') {
        // High-pass filter to remove low-frequency noise
        const highpass = audioContextRef.current.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = config.level === 'high' ? 100 : 80;
        
        // Low-pass filter to remove high-frequency noise
        const lowpass = audioContextRef.current.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = config.level === 'high' ? 8000 : 10000;
        
        // Compressor for dynamic range
        const compressor = audioContextRef.current.createDynamicsCompressor();
        compressor.threshold.value = -50;
        compressor.knee.value = 40;
        compressor.ratio.value = 12;
        compressor.attack.value = 0;
        compressor.release.value = 0.25;
        
        source.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(compressor);
        compressor.connect(analyserRef.current);
        analyserRef.current.connect(destination);
      } else {
        source.connect(analyserRef.current);
        analyserRef.current.connect(destination);
      }

      // Monitor noise levels
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      const updateNoiseLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setNoiseLevel(Math.round(average));
        }
        requestAnimationFrame(updateNoiseLevel);
      };
      updateNoiseLevel();

      return destination.stream;
    } catch (error) {
      console.error('Noise cancellation error:', error);
      return stream;
    }
  }, [config, isSupported]);

  const setLevel = useCallback((level: 'low' | 'medium' | 'high') => {
    setConfig(prev => ({ ...prev, level }));
  }, []);

  const toggle = useCallback(() => {
    setConfig(prev => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const setAutoGain = useCallback((enabled: boolean) => {
    setConfig(prev => ({ ...prev, autoGain: enabled }));
  }, []);

  const setEchoCancellation = useCallback((enabled: boolean) => {
    setConfig(prev => ({ ...prev, echoCancellation: enabled }));
  }, []);

  const cleanup = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    config,
    isSupported,
    noiseLevel,
    getMediaConstraints,
    applyToStream,
    setLevel,
    toggle,
    setAutoGain,
    setEchoCancellation,
    cleanup,
  };
};
