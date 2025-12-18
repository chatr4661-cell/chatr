import { useState, useCallback, useRef, useEffect } from 'react';

interface NoiseCancellationConfig {
  enabled: boolean;
  level: 'low' | 'medium' | 'high' | 'ultra';
  autoGain: boolean;
  echoCancellation: boolean;
  typingNoiseDetection: boolean;
  voiceIsolation: boolean;
}

// Noise gate thresholds for different levels
const NOISE_GATE_THRESHOLDS = {
  low: -60,
  medium: -50,
  high: -40,
  ultra: -30,
};

export const useNoiseCancellation = () => {
  const [config, setConfig] = useState<NoiseCancellationConfig>({
    enabled: true,
    level: 'high', // Default to high for HD audio
    autoGain: true,
    echoCancellation: true,
    typingNoiseDetection: true,
    voiceIsolation: true,
  });
  const [isSupported, setIsSupported] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [inputVolume, setInputVolume] = useState(0);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Check if browser supports audio processing
    setIsSupported('AudioContext' in window || 'webkitAudioContext' in window);
  }, []);

  const getMediaConstraints = useCallback((): MediaTrackConstraints => {
    // HD Audio constraints - Studio-grade quality
    const constraints: MediaTrackConstraints = {
      // Core processing
      echoCancellation: { ideal: config.echoCancellation },
      noiseSuppression: { ideal: config.enabled },
      autoGainControl: { ideal: config.autoGain },
      
      // HD Audio settings
      sampleRate: { ideal: 48000, min: 44100 },
      sampleSize: { ideal: 24, min: 16 },
      channelCount: { ideal: 2, min: 1 },
    };

    // @ts-ignore - experimental latency constraint
    constraints.latency = { ideal: 0.01, max: 0.05 };

    // Advanced Chrome/Edge specific constraints based on level
    if (config.enabled) {
      // @ts-ignore - experimental constraints
      constraints.googEchoCancellation = config.echoCancellation;
      // @ts-ignore
      constraints.googAutoGainControl = config.autoGain;
      // @ts-ignore
      constraints.googNoiseSuppression = true;
      // @ts-ignore
      constraints.googNoiseReduction = true;
      
      switch (config.level) {
        case 'ultra':
          // @ts-ignore
          constraints.googHighpassFilter = true;
          // @ts-ignore
          constraints.googTypingNoiseDetection = config.typingNoiseDetection;
          // @ts-ignore
          constraints.googExperimentalNoiseSuppression = true;
          // @ts-ignore
          constraints.googBeamforming = true;
          break;
        case 'high':
          // @ts-ignore
          constraints.googHighpassFilter = true;
          // @ts-ignore
          constraints.googTypingNoiseDetection = config.typingNoiseDetection;
          break;
        case 'medium':
          // @ts-ignore
          constraints.googHighpassFilter = true;
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
      audioContextRef.current = new AudioContextClass({ sampleRate: 48000 });
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const destination = audioContextRef.current.createMediaStreamDestination();
      
      // Create analyser for noise level visualization
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048; // Higher resolution for better analysis
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      // Create advanced audio processing chain
      let lastNode: AudioNode = source;
      
      // 1. High-pass filter - Remove rumble and low-frequency noise (< 80-150Hz)
      const highpass = audioContextRef.current.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = config.level === 'ultra' ? 150 : config.level === 'high' ? 120 : 80;
      highpass.Q.value = 0.7;
      lastNode.connect(highpass);
      lastNode = highpass;
      
      // 2. Low-pass filter - Remove high-frequency hiss (> 8-12kHz)
      const lowpass = audioContextRef.current.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = config.level === 'ultra' ? 8000 : config.level === 'high' ? 10000 : 12000;
      lowpass.Q.value = 0.7;
      lastNode.connect(lowpass);
      lastNode = lowpass;
      
      // 3. Notch filter - Remove 50/60Hz hum (power line interference)
      const notch50 = audioContextRef.current.createBiquadFilter();
      notch50.type = 'notch';
      notch50.frequency.value = 50;
      notch50.Q.value = 30;
      lastNode.connect(notch50);
      lastNode = notch50;
      
      const notch60 = audioContextRef.current.createBiquadFilter();
      notch60.type = 'notch';
      notch60.frequency.value = 60;
      notch60.Q.value = 30;
      lastNode.connect(notch60);
      lastNode = notch60;
      
      // 4. Voice presence EQ - Boost clarity (2-4kHz range)
      if (config.voiceIsolation) {
        const presenceBoost = audioContextRef.current.createBiquadFilter();
        presenceBoost.type = 'peaking';
        presenceBoost.frequency.value = 3000;
        presenceBoost.Q.value = 1;
        presenceBoost.gain.value = 3; // +3dB boost for voice clarity
        lastNode.connect(presenceBoost);
        lastNode = presenceBoost;
      }
      
      // 5. Compressor - Even out volume levels
      const compressor = audioContextRef.current.createDynamicsCompressor();
      compressor.threshold.value = NOISE_GATE_THRESHOLDS[config.level];
      compressor.knee.value = config.level === 'ultra' ? 20 : 40;
      compressor.ratio.value = config.level === 'ultra' ? 16 : 12;
      compressor.attack.value = 0.003; // 3ms attack
      compressor.release.value = 0.25; // 250ms release
      lastNode.connect(compressor);
      lastNode = compressor;
      
      // 6. Gain stage - Normalize output
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = config.autoGain ? 1.2 : 1.0; // Slight boost if auto-gain enabled
      lastNode.connect(gainNode);
      lastNode = gainNode;
      
      // Connect to analyser and destination
      lastNode.connect(analyserRef.current);
      analyserRef.current.connect(destination);

      // Monitor noise levels with animation frame
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      const updateNoiseLevel = () => {
        if (analyserRef.current && audioContextRef.current?.state === 'running') {
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate RMS for more accurate level
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          setNoiseLevel(Math.round(rms));
          
          // Calculate input volume percentage
          const maxVal = Math.max(...Array.from(dataArray));
          setInputVolume(Math.round((maxVal / 255) * 100));
        }
        animationFrameRef.current = requestAnimationFrame(updateNoiseLevel);
      };
      updateNoiseLevel();

      console.log('✅ HD Noise cancellation applied:', config.level);
      return destination.stream;
    } catch (error) {
      console.error('Noise cancellation error:', error);
      return stream;
    }
  }, [config, isSupported]);

  const setLevel = useCallback((level: 'low' | 'medium' | 'high' | 'ultra') => {
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

  const setTypingNoiseDetection = useCallback((enabled: boolean) => {
    setConfig(prev => ({ ...prev, typingNoiseDetection: enabled }));
  }, []);

  const setVoiceIsolation = useCallback((enabled: boolean) => {
    setConfig(prev => ({ ...prev, voiceIsolation: enabled }));
  }, []);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
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
    inputVolume,
    getMediaConstraints,
    applyToStream,
    setLevel,
    toggle,
    setAutoGain,
    setEchoCancellation,
    setTypingNoiseDetection,
    setVoiceIsolation,
    cleanup,
  };
};
