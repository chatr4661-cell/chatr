import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, Speaker } from 'lucide-react';
import { SimpleWebRTCCall } from '@/utils/simpleWebRTC';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useCallKeepAlive } from '@/hooks/useCallKeepAlive';

// Browser detection
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isSafari = () => /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

interface ProductionVoiceCallProps {
  callId: string;
  contactName: string;
  isInitiator: boolean;
  partnerId: string;
  onEnd: () => void;
}

export default function ProductionVoiceCall({
  callId,
  contactName,
  isInitiator,
  partnerId,
  onEnd,
}: ProductionVoiceCallProps) {
  const [callState, setCallState] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [duration, setDuration] = useState(0);

  const webrtcRef = useRef<SimpleWebRTCCall | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const userIdRef = useRef<string | null>(null);
  
  // CRITICAL: Keep call alive with heartbeat mechanism
  useCallKeepAlive(callId, callState === 'connected');

  useEffect(() => {
    const initCall = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Not authenticated');
          onEnd();
          return;
        }
        userIdRef.current = user.id;

        console.log('🎬 [ProductionVoiceCall] Initializing voice call...');
        const call = new SimpleWebRTCCall(callId, partnerId, false, isInitiator, user.id);
        webrtcRef.current = call;

        call.on('remoteStream', (stream: MediaStream) => {
          console.log('🔊 [ProductionVoiceCall] Remote stream received');
          console.log('🌐 Browser:', { isIOS: isIOS(), isSafari: isSafari() });
          
          if (!remoteAudioRef.current) {
            remoteAudioRef.current = new Audio();
            remoteAudioRef.current.autoplay = true;
            remoteAudioRef.current.volume = 1.0;
          }
          
          remoteAudioRef.current.srcObject = stream;
          
          // Multi-stage audio playback with browser compatibility
          const forcePlay = async (attempt = 1) => {
            try {
              if (remoteAudioRef.current) {
                remoteAudioRef.current.volume = 1.0;
                await remoteAudioRef.current.play();
                console.log(`✅ Remote audio playing (attempt ${attempt})`);
              }
            } catch (e) {
              console.warn(`⚠️ Audio play error (attempt ${attempt}):`, e);
              
              if (attempt <= 2 && (e.name === 'NotAllowedError' || e.name === 'NotSupportedError')) {
                const playOnInteraction = async () => {
                  try {
                    if (remoteAudioRef.current) {
                      remoteAudioRef.current.volume = 1.0;
                      await remoteAudioRef.current.play();
                      console.log('✅ Audio playing after user interaction');
                    }
                  } catch (err) {
                    console.error('Failed after interaction:', err);
                  }
                };
                
                // Listen for multiple interaction types
                const events = ['click', 'touchstart', 'touchend', 'mousedown', 'keydown'];
                events.forEach(eventType => {
                  document.addEventListener(eventType, playOnInteraction, { once: true, capture: true });
                });
                
                // Show toast notification
                toast.info('Tap screen to enable audio', {
                  duration: 8000,
                  action: {
                    label: 'Enable',
                    onClick: playOnInteraction
                  }
                });
              }
            }
          };
          
          // Retry with increasing delays
          forcePlay(1);
          setTimeout(() => forcePlay(2), 100);
          setTimeout(() => forcePlay(3), 500);
          setTimeout(() => forcePlay(4), 1500);
        });

        call.on('connected', () => {
          console.log('🎉 [ProductionVoiceCall] Call connected!');
          setCallState('connected');
          toast.success('Call connected');
          startDurationTimer();
          updateCallStatus('active');
        });

        call.on('failed', (error: Error) => {
          console.error('⚠️ [ProductionVoiceCall] Connection issue:', error);
          
          // CRITICAL: Do NOT auto-end - let user decide to hang up
          if (error.message.includes('microphone') || error.message.includes('Could not access')) {
            toast.error('Microphone access denied', {
              description: 'Please allow microphone access and try again',
              duration: 10000
            });
            setCallState('failed');
            return;
          }
          
          // Show warning but keep call alive for recovery
          toast.warning('Connection unstable - attempting recovery...', {
            duration: 5000,
          });
        });

        call.on('ended', () => {
          console.log('👋 [ProductionVoiceCall] Call ended');
          handleEndCall();
        });

        await call.start();
        if (isInitiator) {
          await updateCallStatus('ringing');
        }

      } catch (error) {
        console.error('❌ [ProductionVoiceCall] Init error:', error);
        toast.error('Failed to initialize call');
        onEnd();
      }
    };

    initCall();

    return () => {
      cleanup();
    };
  }, []);

  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
  };

  const updateCallStatus = async (status: string) => {
    try {
      await supabase
        .from('calls')
        .update({ 
          status,
          webrtc_state: status === 'active' ? 'connected' : 'signaling',
          ...(status === 'active' ? { started_at: new Date().toISOString() } : {})
        })
        .eq('id', callId);
    } catch (error) {
      console.error('Failed to update call status:', error);
    }
  };

  const handleEndCall = async () => {
    cleanup();
    
    try {
      await supabase
        .from('calls')
        .update({ 
          status: 'ended',
          webrtc_state: 'ended',
          ended_at: new Date().toISOString(),
          duration
        })
        .eq('id', callId);
    } catch (error) {
      console.error('Failed to update call end:', error);
    }

    onEnd();
  };

  const cleanup = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }
    if (webrtcRef.current) {
      webrtcRef.current.end();
      webrtcRef.current = null;
    }
  };

  const toggleAudio = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    webrtcRef.current?.toggleAudio(newState);
  };

  const toggleSpeaker = async () => {
    const newState = !speakerEnabled;
    setSpeakerEnabled(newState);
    
    if (remoteAudioRef.current) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(device => device.kind === 'audiooutput');
        
        if (audioDevices.length > 0 && 'setSinkId' in remoteAudioRef.current) {
          const targetDevice = newState 
            ? audioDevices.find(d => d.label.toLowerCase().includes('speaker'))?.deviceId 
            : audioDevices.find(d => d.label.toLowerCase().includes('earpiece') || d.label.toLowerCase().includes('phone'))?.deviceId;
          
          if (targetDevice) {
            await (remoteAudioRef.current as any).setSinkId(targetDevice);
            toast.success(newState ? 'Speaker enabled' : 'Earpiece enabled');
          } else {
            // Fallback: just adjust volume
            remoteAudioRef.current.volume = newState ? 1.0 : 0.7;
          }
        } else {
          // Fallback for browsers that don't support setSinkId
          remoteAudioRef.current.volume = newState ? 1.0 : 0.7;
        }
      } catch (error) {
        console.error('Failed to switch audio output:', error);
        toast.error('Audio routing not supported on this device');
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-primary/20 to-background flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-8 p-8"
      >
        <motion.div 
          animate={{ scale: callState === 'connecting' ? [1, 1.05, 1] : 1 }}
          transition={{ repeat: callState === 'connecting' ? Infinity : 0, duration: 2 }}
          className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center shadow-2xl"
        >
          <span className="text-5xl">{contactName[0]?.toUpperCase()}</span>
        </motion.div>

        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">{contactName}</h2>
          <p className="text-muted-foreground">
            {callState === 'connecting' && 'Connecting...'}
            {callState === 'connected' && formatDuration(duration)}
            {callState === 'failed' && 'Connection failed'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            size="lg"
            variant={audioEnabled ? "default" : "destructive"}
            className="rounded-full w-14 h-14 shadow-lg"
            onClick={toggleAudio}
          >
            {audioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>

          <Button
            size="lg"
            variant={speakerEnabled ? "default" : "secondary"}
            className="rounded-full w-14 h-14 shadow-lg"
            onClick={toggleSpeaker}
          >
            {speakerEnabled ? <Speaker className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
          </Button>

          <Button
            size="lg"
            variant="destructive"
            className="rounded-full w-16 h-16 shadow-2xl bg-red-500 hover:bg-red-600"
            onClick={handleEndCall}
          >
            <PhoneOff className="h-7 w-7" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
