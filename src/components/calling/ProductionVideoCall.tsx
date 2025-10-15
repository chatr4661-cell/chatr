import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { SimpleWebRTCCall } from '@/utils/simpleWebRTC';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface ProductionVideoCallProps {
  callId: string;
  contactName: string;
  isInitiator: boolean;
  partnerId: string;
  onEnd: () => void;
}

export default function ProductionVideoCall({
  callId,
  contactName,
  isInitiator,
  partnerId,
  onEnd,
}: ProductionVideoCallProps) {
  const [callState, setCallState] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [duration, setDuration] = useState(0);

  const webrtcRef = useRef<SimpleWebRTCCall | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const userIdRef = useRef<string | null>(null);

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

        console.log('🎬 [ProductionVideoCall] Initializing video call...');
        const call = new SimpleWebRTCCall(callId, partnerId, true, isInitiator, user.id);
        webrtcRef.current = call;

        call.on('localStream', (stream: MediaStream) => {
          console.log('📹 [ProductionVideoCall] Local stream received');
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.muted = true;
            localVideoRef.current.play().catch(e => console.log('Local video play:', e));
          }
        });

        call.on('remoteStream', (stream: MediaStream) => {
          console.log('📺 [ProductionVideoCall] Remote stream received');
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
            remoteVideoRef.current.playsInline = true;
            remoteVideoRef.current.muted = false;
            remoteVideoRef.current.autoplay = true;
            
            const playPromise = remoteVideoRef.current.play();
            
            if (playPromise !== undefined) {
              playPromise
                .then(() => console.log('✅ Remote video playing'))
                .catch(err => {
                  console.warn('⚠️ Autoplay blocked, waiting for user interaction:', err);
                  
                  toast.info('Tap anywhere to enable audio/video', {
                    duration: 5000,
                    action: {
                      label: 'Enable',
                      onClick: () => {
                        remoteVideoRef.current?.play();
                      }
                    }
                  });
                  
                  const playOnInteraction = () => {
                    remoteVideoRef.current?.play();
                    document.removeEventListener('touchstart', playOnInteraction);
                    document.removeEventListener('click', playOnInteraction);
                  };
                  
                  document.addEventListener('touchstart', playOnInteraction, { once: true });
                  document.addEventListener('click', playOnInteraction, { once: true });
                });
            }
          }
        });

        call.on('connected', () => {
          console.log('🎉 [ProductionVideoCall] Call connected!');
          setCallState('connected');
          toast.success('Call connected');
          startDurationTimer();
          updateCallStatus('active');
        });

        call.on('failed', (error: Error) => {
          console.error('❌ [ProductionVideoCall] Call failed:', error);
          setCallState('failed');
          
          let errorMessage = 'Call failed';
          let actionMessage = 'Please try again';
          
          if (error.message.includes('camera') || error.message.includes('microphone')) {
            errorMessage = 'Camera/Microphone access denied';
            actionMessage = 'Please allow camera and microphone access in your browser settings';
          } else if (error.message.includes('timeout')) {
            errorMessage = 'Connection timeout';
            actionMessage = 'Check your internet connection and try again';
          } else if (error.message.includes('ice') || error.message.includes('Connection failed')) {
            errorMessage = 'Could not establish connection';
            actionMessage = 'Your network may be blocking video calls. Try a different network.';
          }
          
          toast.error(errorMessage, {
            description: actionMessage,
            duration: 5000
          });
          
          setTimeout(() => handleEndCall(), 3000);
        });

        call.on('ended', () => {
          console.log('👋 [ProductionVideoCall] Call ended');
          handleEndCall();
        });

        await call.start();
        await updateCallStatus('ringing');

      } catch (error) {
        console.error('❌ [ProductionVideoCall] Init error:', error);
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

  const toggleVideo = () => {
    const newState = !videoEnabled;
    setVideoEnabled(newState);
    webrtcRef.current?.toggleVideo(newState);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute top-4 right-4 w-32 h-48 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg"
      >
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform scale-x-[-1]"
        />
      </motion.div>

      <div className="absolute top-4 left-4 text-white">
        <h2 className="text-xl font-semibold">{contactName}</h2>
        <p className="text-sm text-white/80">
          {callState === 'connecting' && 'Connecting...'}
          {callState === 'connected' && formatDuration(duration)}
          {callState === 'failed' && 'Connection failed'}
        </p>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
        <Button
          size="lg"
          variant={audioEnabled ? "default" : "destructive"}
          className="rounded-full w-14 h-14"
          onClick={toggleAudio}
        >
          {audioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </Button>

        <Button
          size="lg"
          variant={videoEnabled ? "default" : "destructive"}
          className="rounded-full w-14 h-14"
          onClick={toggleVideo}
        >
          {videoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
        </Button>

        <Button
          size="lg"
          variant="destructive"
          className="rounded-full w-16 h-16"
          onClick={handleEndCall}
        >
          <PhoneOff className="h-7 w-7" />
        </Button>
      </div>
    </div>
  );
}
