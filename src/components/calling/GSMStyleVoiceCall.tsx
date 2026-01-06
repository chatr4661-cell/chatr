import { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, PhoneOff, Volume2, Video, MoreHorizontal, 
  Plus, Users, Bluetooth, Headphones, Car, Grid3X3,
  ArrowLeftRight, Pause, Play
} from 'lucide-react';
import { SimpleWebRTCCall } from '@/utils/simpleWebRTC';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallKeepAlive } from '@/hooks/useCallKeepAlive';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Audio output types for routing
type AudioRoute = 'earpiece' | 'speaker' | 'bluetooth' | 'headphones' | 'car';

interface AudioDevice {
  id: string;
  label: string;
  type: AudioRoute;
}

interface ConferenceParticipant {
  id: string;
  name: string;
  isMuted: boolean;
  isOnHold: boolean;
}

interface GSMStyleVoiceCallProps {
  callId: string;
  contactName: string;
  contactAvatar?: string;
  isInitiator: boolean;
  partnerId: string;
  onEnd: () => void;
  onSwitchToVideo?: () => void;
  onAcceptVideoUpgrade?: () => void;
  onDeclineVideoUpgrade?: () => void;
  isIncoming?: boolean;
  incomingVideoRequest?: boolean;
  pendingVideoUpgrade?: boolean;
}

export default function GSMStyleVoiceCall({
  callId,
  contactName,
  contactAvatar,
  isInitiator,
  partnerId,
  onEnd,
  onSwitchToVideo,
  onAcceptVideoUpgrade,
  onDeclineVideoUpgrade,
  isIncoming = false,
  incomingVideoRequest = false,
  pendingVideoUpgrade = false,
}: GSMStyleVoiceCallProps) {
  const [callState, setCallState] = useState<'connecting' | 'connected' | 'failed' | 'onhold'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [audioRoute, setAudioRoute] = useState<AudioRoute>('earpiece');
  const [availableDevices, setAvailableDevices] = useState<AudioDevice[]>([]);
  const [duration, setDuration] = useState(0);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [dtmfInput, setDtmfInput] = useState('');
  
  // Conference call state
  const [isConference, setIsConference] = useState(false);
  const [conferenceParticipants, setConferenceParticipants] = useState<ConferenceParticipant[]>([]);
  const [secondCall, setSecondCall] = useState<{ id: string; name: string; isActive: boolean } | null>(null);

  const webrtcRef = useRef<SimpleWebRTCCall | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const userIdRef = useRef<string | null>(null);
  
  // CRITICAL: Keep call alive with heartbeat mechanism
  useCallKeepAlive(callId, callState === 'connected');

  // Enumerate and monitor audio devices for Bluetooth/headphones/car
  useEffect(() => {
    const enumerateAudioDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
        
        const mappedDevices: AudioDevice[] = audioOutputs.map(device => {
          const label = device.label.toLowerCase();
          let type: AudioRoute = 'speaker';
          
          if (label.includes('bluetooth') || label.includes('airpods') || label.includes('galaxy buds')) {
            type = 'bluetooth';
          } else if (label.includes('headphone') || label.includes('headset') || label.includes('wired')) {
            type = 'headphones';
          } else if (label.includes('car') || label.includes('vehicle') || label.includes('carplay')) {
            type = 'car';
          } else if (label.includes('earpiece') || label.includes('phone')) {
            type = 'earpiece';
          }
          
          return { id: device.deviceId, label: device.label || `Audio ${device.deviceId.slice(0, 4)}`, type };
        });
        
        setAvailableDevices(mappedDevices);
        
        // Auto-connect to Bluetooth/headphones if available
        const bluetoothDevice = mappedDevices.find(d => d.type === 'bluetooth');
        const headphonesDevice = mappedDevices.find(d => d.type === 'headphones');
        const carDevice = mappedDevices.find(d => d.type === 'car');
        
        if (carDevice) {
          await switchAudioRoute(carDevice.id, 'car');
          toast.success('Connected to car audio');
        } else if (bluetoothDevice) {
          await switchAudioRoute(bluetoothDevice.id, 'bluetooth');
          toast.success('Connected to Bluetooth');
        } else if (headphonesDevice) {
          await switchAudioRoute(headphonesDevice.id, 'headphones');
          toast.success('Connected to headphones');
        }
      } catch (error) {
        console.error('Failed to enumerate audio devices:', error);
      }
    };

    enumerateAudioDevices();
    
    // Listen for device changes (Bluetooth connect/disconnect)
    navigator.mediaDevices.addEventListener('devicechange', enumerateAudioDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerateAudioDevices);
    };
  }, []);

  // CRITICAL: Monitor call status changes via realtime to stop ringback when answered
  useEffect(() => {
    if (!isInitiator) return; // Only initiator needs to listen for answer
    
    const channel = supabase
      .channel(`call-status-${callId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'calls',
        filter: `id=eq.${callId}`
      }, (payload: any) => {
        const newStatus = payload.new?.status;
        console.log('📞 [GSMStyleVoiceCall] Call status changed:', newStatus);
        
        // Update local state when call is answered
        if (newStatus === 'active' || newStatus === 'connected') {
          console.log('📞 [GSMStyleVoiceCall] Call answered');
          if (callState === 'connecting') {
            setCallState('connected');
            startDurationTimer();
          }
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId, isInitiator, callState]);
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

        console.log('🎬 [GSMStyleVoiceCall] Initializing voice call...');
        
        console.log('🎬 [GSMStyleVoiceCall] Call mode:', isInitiator ? 'outgoing' : 'incoming');
        
        const call = new SimpleWebRTCCall(callId, partnerId, false, isInitiator, user.id);
        webrtcRef.current = call;

        call.on('remoteStream', (stream: MediaStream) => {
          console.log('🔊 [GSMStyleVoiceCall] Remote stream received');
          
          if (!remoteAudioRef.current) {
            remoteAudioRef.current = new Audio();
            remoteAudioRef.current.autoplay = true;
            remoteAudioRef.current.volume = 1.0;
          }
          
          remoteAudioRef.current.srcObject = stream;
          
          // Force play with retries
          const forcePlay = async (attempt = 1) => {
            try {
              if (remoteAudioRef.current) {
                await remoteAudioRef.current.play();
                console.log(`✅ Audio playing (attempt ${attempt})`);
              }
            } catch (e) {
              if (attempt <= 3) {
                setTimeout(() => forcePlay(attempt + 1), 500);
              }
            }
          };
          
          forcePlay(1);
        });

        call.on('connected', () => {
          console.log('🎉 [GSMStyleVoiceCall] Call connected!');
          setCallState('connected');
          startDurationTimer();
          updateCallStatus('active');
        });

        // CRITICAL: 'failed' event is for warnings only - NEVER auto-end calls
        call.on('failed', (error: Error) => {
          console.error('⚠️ [GSMStyleVoiceCall] Connection issue:', error);
          // Only show warning UI, don't end the call
          // User must manually hang up
          if (error.message.includes('microphone') || error.message.includes('Could not access')) {
            console.warn('⚠️ Microphone access issue - user should grant permission');
            // Show error state but DON'T end call
            setCallState('failed');
          } else {
            // Network issues - just log, recovery is automatic
            console.warn('⚠️ Connection unstable - automatic recovery in progress...');
          }
        });
        
        call.on('recoveryStatus', (status: any) => {
          console.log('🔄 [GSMStyleVoiceCall] Recovery status:', status.message);
        });

        call.on('ended', () => {
          console.log('👋 [GSMStyleVoiceCall] Call ended by remote');
          handleEndCall();
        });

        await call.start();
        if (isInitiator) {
          await updateCallStatus('ringing');
        }

      } catch (error) {
        console.error('❌ [GSMStyleVoiceCall] Init error:', error);
        onEnd();
      }
    };

    initCall();
    return () => cleanup();
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

  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    webrtcRef.current?.toggleAudio(!newState);
  };

  const switchAudioRoute = async (deviceId: string, type: AudioRoute) => {
    if (remoteAudioRef.current && 'setSinkId' in remoteAudioRef.current) {
      try {
        await (remoteAudioRef.current as any).setSinkId(deviceId);
        setAudioRoute(type);
        return true;
      } catch (error) {
        console.error('Failed to switch audio route:', error);
        return false;
      }
    }
    return false;
  };

  const cycleSpeaker = async () => {
    // Cycle through: earpiece -> speaker -> bluetooth (if available) -> headphones (if available)
    const routeOrder: AudioRoute[] = ['earpiece', 'speaker'];
    
    const bluetoothDevice = availableDevices.find(d => d.type === 'bluetooth');
    const headphonesDevice = availableDevices.find(d => d.type === 'headphones');
    const carDevice = availableDevices.find(d => d.type === 'car');
    
    if (bluetoothDevice) routeOrder.push('bluetooth');
    if (headphonesDevice) routeOrder.push('headphones');
    if (carDevice) routeOrder.push('car');
    
    const currentIndex = routeOrder.indexOf(audioRoute);
    const nextIndex = (currentIndex + 1) % routeOrder.length;
    const nextRoute = routeOrder[nextIndex];
    
    let targetDevice: AudioDevice | undefined;
    
    switch (nextRoute) {
      case 'earpiece':
        targetDevice = availableDevices.find(d => d.type === 'earpiece') || availableDevices[0];
        break;
      case 'speaker':
        targetDevice = availableDevices.find(d => d.label.toLowerCase().includes('speaker')) || availableDevices[0];
        break;
      case 'bluetooth':
        targetDevice = bluetoothDevice;
        break;
      case 'headphones':
        targetDevice = headphonesDevice;
        break;
      case 'car':
        targetDevice = carDevice;
        break;
    }
    
    if (targetDevice) {
      const success = await switchAudioRoute(targetDevice.id, nextRoute);
      if (success) {
        toast.success(`Switched to ${nextRoute}`);
      }
    } else {
      setAudioRoute(nextRoute);
      toast.success(`Switched to ${nextRoute}`);
    }
  };

  const handleDTMF = (digit: string) => {
    setDtmfInput(prev => prev + digit);
    webrtcRef.current?.sendDTMF(digit);
    
    // Play DTMF tone locally
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.frequency.value = 440 + (parseInt(digit) || 0) * 50;
    gainNode.gain.value = 0.1;
    oscillator.start();
    setTimeout(() => oscillator.stop(), 100);
  };

  const holdCall = () => {
    setCallState('onhold');
    webrtcRef.current?.toggleAudio(false);
    toast.info('Call on hold');
  };

  const resumeCall = () => {
    setCallState('connected');
    webrtcRef.current?.toggleAudio(true);
    toast.success('Call resumed');
  };

  const handleUpgradeToVideo = () => {
    if (onSwitchToVideo) {
      console.log('📹 Upgrading to video call...');
      onSwitchToVideo();
    } else {
      console.warn('⚠️ onSwitchToVideo callback not provided');
    }
  };

  const addCall = () => {
    toast.info('Add call feature - select a contact to add');
    // This would open a contact picker in a full implementation
  };

  const mergeCallsToConference = () => {
    if (secondCall) {
      setIsConference(true);
      setConferenceParticipants([
        { id: partnerId, name: contactName, isMuted: false, isOnHold: false },
        { id: secondCall.id, name: secondCall.name, isMuted: false, isOnHold: false }
      ]);
      toast.success('Calls merged into conference');
    }
  };

  const swapCalls = () => {
    if (secondCall) {
      const wasActive = secondCall.isActive;
      setSecondCall({ ...secondCall, isActive: !wasActive });
      toast.info(`Swapped to ${wasActive ? contactName : secondCall.name}`);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAudioRouteIcon = () => {
    switch (audioRoute) {
      case 'bluetooth': return <Bluetooth className="h-6 w-6" />;
      case 'headphones': return <Headphones className="h-6 w-6" />;
      case 'car': return <Car className="h-6 w-6" />;
      case 'speaker': return <Volume2 className="h-6 w-6" />;
      default: return <Volume2 className="h-6 w-6" />;
    }
  };

  const keypadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-800/95 via-slate-900/98 to-black flex flex-col">
      {/* Top section - Avatar and Name only */}
      <div className="flex-1 flex flex-col items-center justify-center pt-16 pb-8">
        {/* Avatar */}
        {contactAvatar ? (
          <motion.img
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={contactAvatar}
            alt={contactName}
            className="w-28 h-28 rounded-full object-cover mb-6 ring-4 ring-white/10"
          />
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-28 h-28 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center mb-6 ring-4 ring-white/10"
          >
            <span className="text-4xl font-semibold text-white">
              {contactName.charAt(0).toUpperCase()}
            </span>
          </motion.div>
        )}
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-semibold text-white mb-2"
        >
          {contactName}
        </motion.h1>
        
        {/* Call status/duration */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-slate-400 text-lg"
        >
          {callState === 'connecting' ? 'Calling...' : 
           callState === 'onhold' ? 'On Hold' :
           callState === 'connected' ? formatDuration(duration) :
           isConference ? `${conferenceParticipants.length} participants` : ''}
        </motion.p>

        {/* Conference participants */}
        {isConference && (
          <div className="mt-4 flex flex-wrap gap-2 justify-center px-4">
            {conferenceParticipants.map(p => (
              <div key={p.id} className="bg-slate-700/50 rounded-full px-3 py-1 text-sm text-white flex items-center gap-2">
                <span>{p.name}</span>
                {p.isMuted && <MicOff className="h-3 w-3 text-red-400" />}
              </div>
            ))}
          </div>
        )}

        {/* Second call indicator */}
        {secondCall && !isConference && (
          <div className="mt-4 bg-slate-700/50 rounded-lg p-3 mx-8">
            <p className="text-sm text-slate-400">On hold:</p>
            <p className="text-white font-medium">{secondCall.name}</p>
          </div>
        )}

        {/* Video upgrade request prompt */}
        <AnimatePresence>
          {incomingVideoRequest && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute top-32 inset-x-4 bg-blue-600/95 backdrop-blur-lg rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Video className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg">Video Request</h3>
                  <p className="text-white/80 text-sm">{contactName} wants to switch to video</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={onDeclineVideoUpgrade}
                  className="flex-1 py-3 rounded-xl bg-white/20 text-white font-medium hover:bg-white/30 transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={onAcceptVideoUpgrade}
                  className="flex-1 py-3 rounded-xl bg-white text-blue-600 font-medium hover:bg-white/90 transition-colors"
                >
                  Accept Video
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending video upgrade indicator */}
        {pendingVideoUpgrade && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 bg-blue-500/20 rounded-lg px-4 py-2 mx-8"
          >
            <p className="text-blue-400 text-sm text-center animate-pulse">
              📹 Waiting for video acceptance...
            </p>
          </motion.div>
        )}
      </div>

      {/* Keypad overlay */}
      <AnimatePresence>
        {showKeypad && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute inset-x-0 bottom-40 bg-slate-800/95 backdrop-blur-xl rounded-t-3xl p-6"
          >
            <div className="text-center mb-4">
              <p className="text-white text-2xl font-mono tracking-widest">{dtmfInput || '—'}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
              {keypadDigits.map(digit => (
                <button
                  key={digit}
                  onClick={() => handleDTMF(digit)}
                  className="w-16 h-16 rounded-full bg-slate-700/70 text-white text-2xl font-semibold 
                           hover:bg-slate-600 active:scale-95 transition-all mx-auto
                           flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowKeypad(false)}
              className="w-full mt-4 py-2 text-blue-400 text-sm"
            >
              Hide Keypad
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom section - Controls */}
      <div className="pb-12 px-6">
        {/* Top row - Speaker, Video, Mute */}
        <div className="grid grid-cols-3 gap-8 mb-8 max-w-sm mx-auto">
          <button
            onClick={cycleSpeaker}
            className={`flex flex-col items-center gap-2 ${
              audioRoute !== 'earpiece' ? 'opacity-100' : 'opacity-60'
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              audioRoute !== 'earpiece' 
                ? 'bg-white text-slate-900' 
                : 'bg-slate-700/70 text-white'
            }`}>
              {getAudioRouteIcon()}
            </div>
            <span className="text-white text-xs capitalize">{audioRoute}</span>
          </button>

          <button
            onClick={handleUpgradeToVideo}
            className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100"
          >
            <div className="w-16 h-16 rounded-full bg-slate-700/70 flex items-center justify-center">
              <Video className="h-6 w-6 text-white" />
            </div>
            <span className="text-white text-xs">Video</span>
          </button>

          <button
            onClick={toggleMute}
            className="flex flex-col items-center gap-2"
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              isMuted 
                ? 'bg-white text-slate-900' 
                : 'bg-slate-700/70 text-white'
            }`}>
              {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </div>
            <span className="text-white text-xs">Mute</span>
          </button>
        </div>

        {/* Bottom row - More, End, Keypad */}
        <div className="grid grid-cols-3 gap-8 max-w-sm mx-auto">
          <Sheet open={showMoreOptions} onOpenChange={setShowMoreOptions}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100">
                <div className="w-16 h-16 rounded-full bg-slate-700/70 flex items-center justify-center">
                  <MoreHorizontal className="h-6 w-6 text-white" />
                </div>
                <span className="text-white text-xs">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-slate-900/95 backdrop-blur-xl border-slate-700">
              <SheetHeader>
                <SheetTitle className="text-white">Call Options</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-4 py-6">
                <button 
                  onClick={addCall}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-800 hover:bg-slate-700"
                >
                  <Plus className="h-6 w-6 text-green-400" />
                  <span className="text-white text-xs">Add Call</span>
                </button>
                
                {secondCall && (
                  <>
                    <button 
                      onClick={mergeCallsToConference}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-800 hover:bg-slate-700"
                    >
                      <Users className="h-6 w-6 text-blue-400" />
                      <span className="text-white text-xs">Merge</span>
                    </button>
                    
                    <button 
                      onClick={swapCalls}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-800 hover:bg-slate-700"
                    >
                      <ArrowLeftRight className="h-6 w-6 text-purple-400" />
                      <span className="text-white text-xs">Swap</span>
                    </button>
                  </>
                )}
                
                <button 
                  onClick={callState === 'onhold' ? resumeCall : holdCall}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-800 hover:bg-slate-700"
                >
                  {callState === 'onhold' 
                    ? <Play className="h-6 w-6 text-green-400" />
                    : <Pause className="h-6 w-6 text-yellow-400" />
                  }
                  <span className="text-white text-xs">
                    {callState === 'onhold' ? 'Resume' : 'Hold'}
                  </span>
                </button>

                {/* Audio routing options */}
                {availableDevices.filter(d => d.type === 'bluetooth' || d.type === 'car').map(device => (
                  <button 
                    key={device.id}
                    onClick={() => switchAudioRoute(device.id, device.type)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl ${
                      audioRoute === device.type ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                  >
                    {device.type === 'bluetooth' ? <Bluetooth className="h-6 w-6 text-blue-400" /> :
                     device.type === 'car' ? <Car className="h-6 w-6 text-green-400" /> :
                     <Headphones className="h-6 w-6 text-purple-400" />}
                    <span className="text-white text-xs truncate max-w-[80px]">{device.label}</span>
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          <button
            onClick={handleEndCall}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
              <PhoneOff className="h-7 w-7 text-white" />
            </div>
            <span className="text-white text-xs">End</span>
          </button>

          <button
            onClick={() => setShowKeypad(!showKeypad)}
            className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100"
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              showKeypad ? 'bg-white text-slate-900' : 'bg-slate-700/70 text-white'
            }`}>
              <Grid3X3 className="h-6 w-6" />
            </div>
            <span className="text-white text-xs">Keypad</span>
          </button>
        </div>
      </div>
    </div>
  );
}
