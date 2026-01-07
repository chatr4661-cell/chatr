import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Mic, MicOff, PhoneOff, Volume2, Video, MoreHorizontal, 
  Plus, Users, Bluetooth, Headphones, Car, Grid3X3,
  ArrowLeftRight, Pause, Play, Minimize2, Signal, SignalLow, SignalMedium, SignalHigh
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
  contactPhone?: string;
  isInitiator: boolean;
  partnerId: string;
  preAcquiredStream?: MediaStream | null;
  onEnd: () => void;
  onMinimize?: () => void;
  onSwitchToVideo?: () => void;
  onAcceptVideoUpgrade?: () => void;
  onDeclineVideoUpgrade?: () => void;
  isIncoming?: boolean;
  incomingVideoRequest?: boolean;
  pendingVideoUpgrade?: boolean;
  videoEnabled?: boolean;
}

export default function GSMStyleVoiceCall({
  callId,
  contactName,
  contactAvatar,
  contactPhone,
  isInitiator,
  partnerId,
  preAcquiredStream = null,
  onEnd,
  onMinimize,
  onSwitchToVideo,
  onAcceptVideoUpgrade,
  onDeclineVideoUpgrade,
  isIncoming = false,
  incomingVideoRequest = false,
  pendingVideoUpgrade = false,
  videoEnabled = false,
}: GSMStyleVoiceCallProps) {
  const [callState, setCallState] = useState<'connecting' | 'connected' | 'failed' | 'onhold' | 'reconnecting'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [audioRoute, setAudioRoute] = useState<AudioRoute>('earpiece');
  const [availableDevices, setAvailableDevices] = useState<AudioDevice[]>([]);
  const [duration, setDuration] = useState(0);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [dtmfInput, setDtmfInput] = useState('');
  const [localVideoActive, setLocalVideoActive] = useState(false);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [mediaAccessIssue, setMediaAccessIssue] = useState<'permission' | 'blocked' | null>(null);
  
  // Conference call state
  const [isConference, setIsConference] = useState(false);
  const [conferenceParticipants, setConferenceParticipants] = useState<ConferenceParticipant[]>([]);
  const [secondCall, setSecondCall] = useState<{ id: string; name: string; isActive: boolean } | null>(null);

  const webrtcRef = useRef<SimpleWebRTCCall | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
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
         
         const call = new SimpleWebRTCCall(callId, partnerId, false, isInitiator, user.id, preAcquiredStream);
         webrtcRef.current = call;

        call.on('remoteStream', (stream: MediaStream) => {
          console.log('🔊 [GSMStyleVoiceCall] Remote stream received');
          
          // Handle audio
          if (!remoteAudioRef.current) {
            remoteAudioRef.current = new Audio();
            remoteAudioRef.current.autoplay = true;
            remoteAudioRef.current.volume = 1.0;
          }
          
          remoteAudioRef.current.srcObject = stream;
          
          // Force play audio with retries
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
          
          // Handle video if present
          const videoTracks = stream.getVideoTracks();
          if (videoTracks.length > 0 && remoteVideoRef.current) {
            console.log('📹 [GSMStyleVoiceCall] Remote video track detected');
            remoteVideoRef.current.srcObject = stream;
            remoteVideoRef.current.play().catch(e => console.log('Remote video play:', e));
            setRemoteVideoActive(true);
          }
        });

        call.on('connected', () => {
          console.log('🎉 [GSMStyleVoiceCall] Call connected!');
          // CRITICAL: Always transition to connected, even from failed state
          setCallState('connected');
          startDurationTimer();
          updateCallStatus('active');
        });

        // CRITICAL: 'failed' event is for PERMISSION errors only - not network/device issues
        call.on('failed', (error: Error) => {
          console.error('⚠️ [GSMStyleVoiceCall] Call setup failed:', error);

          const name = (error as any)?.name as string | undefined;
          const isPermissionClassError =
            name === 'NotAllowedError' ||
            name === 'PermissionDeniedError' ||
            name === 'SecurityError';

          // IMPORTANT: On Android WebView, NotAllowedError can also mean "WebView blocked" even when OS permission is granted.
          // So we diagnose using navigator.permissions when available to avoid showing a misleading message.
          if (isPermissionClassError) {
            setCallState('failed');
            setMediaAccessIssue('blocked');

            (async () => {
              try {
                const navAny = navigator as any;
                const permissions = navAny?.permissions;
                if (!permissions?.query) return;

                const res = await permissions.query({ name: 'microphone' });
                console.log('🎤 [GSMStyleVoiceCall] mic permission state:', res?.state, 'err:', error);

                if (res?.state === 'denied') {
                  setMediaAccessIssue('permission');
                }
              } catch (e) {
                console.log('🎤 [GSMStyleVoiceCall] mic permission diagnose failed:', e);
              }
            })();

            // CRITICAL: Do NOT call onEnd() here - just show the error state
            // The user can retry or end manually
            return;
          }

          // Device busy (NotReadableError) - show reconnecting, don't end the call
          if (name === 'NotReadableError') {
            console.log('⏳ [GSMStyleVoiceCall] Device busy - showing reconnecting state');
            setCallState('reconnecting');
            return;
          }

          // Anything else (constraints, transient) should show reconnecting.
          setCallState('reconnecting');
        });
        
        call.on('recoveryStatus', (status: any) => {
          console.log('🔄 [GSMStyleVoiceCall] Recovery status:', status.message);
          // Show reconnecting for any recovery attempt
          setCallState((prev) => prev === 'connected' ? prev : 'reconnecting');
        });
        
        call.on('networkQuality', (quality: string) => {
          console.log('📶 [GSMStyleVoiceCall] Network quality:', quality);
          if (quality === 'excellent' || quality === 'good' || quality === 'fair' || quality === 'poor') {
            setNetworkQuality(quality);
          }
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

  // Handle video upgrade - add video to existing call
  useEffect(() => {
    if (!videoEnabled || !webrtcRef.current || localVideoActive) return;
    
    const addVideo = async () => {
      console.log('📹 [GSMStyleVoiceCall] Adding video to call...');
      const videoStream = await webrtcRef.current?.addVideoToCall();
      
      if (videoStream && localVideoRef.current) {
        localVideoRef.current.srcObject = videoStream;
        localVideoRef.current.muted = true;
        localVideoRef.current.play().catch(e => console.log('Local video play:', e));
        setLocalVideoActive(true);
      }
    };
    
    addVideo();
  }, [videoEnabled, localVideoActive]);

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

  const getSignalIcon = () => {
    switch (networkQuality) {
      case 'excellent': return <SignalHigh className="h-4 w-4 text-green-400" />;
      case 'good': return <SignalMedium className="h-4 w-4 text-green-400" />;
      case 'fair': return <SignalLow className="h-4 w-4 text-yellow-400" />;
      case 'poor': return <Signal className="h-4 w-4 text-red-400" />;
    }
  };

  const keypadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  const callUI = (
    <div 
      className="fixed inset-0 z-[99999] bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23] flex flex-col overflow-hidden overscroll-none touch-none select-none"
      style={{ 
        height: '100%',
        width: '100%',
        maxHeight: '100dvh',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        isolation: 'isolate',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Subtle gradient orbs for depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-500/6 rounded-full blur-[100px]" />
      </div>

      {/* Top bar with signal quality */}
      <div 
        className="relative z-10 flex items-center justify-between px-5"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)' }}
      >
        {onMinimize ? (
          <button onClick={onMinimize} className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm active:scale-95 transition-transform">
            <Minimize2 className="h-5 w-5 text-white/90" />
          </button>
        ) : <div className="w-10" />}
        
        <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
          {getSignalIcon()}
          <span className="text-[11px] text-white/60 capitalize font-medium">{networkQuality}</span>
        </div>
        
        <div className="w-10" />
      </div>
      {/* Video display when enabled */}
      {(videoEnabled || localVideoActive) && (
        <div className="absolute inset-0 z-0">
          {/* Remote video (full screen) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Local video (picture-in-picture) */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute top-[calc(env(safe-area-inset-top,0px)+80px)] right-3 w-28 h-40 sm:w-32 sm:h-44 rounded-xl object-cover border-2 border-white/20 shadow-lg"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>
      )}

      {/* Main content - Avatar and info */}
      <div className={`relative z-10 flex-1 flex flex-col items-center justify-center px-6 min-h-0 ${(videoEnabled || localVideoActive) ? 'hidden' : ''}`}>
        {/* Avatar with elegant pulsing animation */}
        <div className="relative mb-4 sm:mb-6">
          {callState === 'connecting' && (
            <>
              <motion.div
                className="absolute inset-[-12px] sm:inset-[-16px] rounded-full border-2 border-emerald-400/40"
                animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.div
                className="absolute inset-[-12px] sm:inset-[-16px] rounded-full border-2 border-emerald-400/30"
                animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
              />
            </>
          )}
          
          {contactAvatar ? (
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 20 }}
              src={contactAvatar}
              alt={contactName}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover ring-[3px] ring-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            />
          ) : (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 20 }}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-emerald-500/80 to-teal-600/60 flex items-center justify-center ring-[3px] ring-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            >
              <span className="text-4xl sm:text-5xl font-semibold text-white">
                {contactName.charAt(0).toUpperCase()}
              </span>
            </motion.div>
          )}
        </div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[26px] font-semibold text-white tracking-tight text-center"
        >
          {contactName}
        </motion.h1>
        
        {/* Phone number */}
        {contactPhone && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/50 text-[15px] mt-1 font-medium"
          >
            {contactPhone}
          </motion.p>
        )}
        
        {/* Call status/duration - prominent display */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3"
        >
          {callState === 'connecting' && (
            <div className="flex items-center gap-2">
              <motion.span
                className="text-emerald-400 text-lg font-medium"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Calling...
              </motion.span>
            </div>
          )}
          {callState === 'reconnecting' && (
            <div className="flex items-center gap-2">
              <motion.span
                className="text-amber-400 text-lg font-medium"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                Reconnecting...
              </motion.span>
            </div>
          )}
          {callState === 'onhold' && (
            <span className="text-orange-400 text-lg font-semibold">On Hold</span>
          )}
          {callState === 'connected' && (
            <span className="text-emerald-400 text-2xl font-mono font-bold tracking-[0.15em]">
              {formatDuration(duration)}
            </span>
          )}
          {callState === 'failed' && (
            <div className="flex flex-col items-center gap-1">
              {mediaAccessIssue === 'permission' ? (
                <>
                  <span className="text-red-400 text-lg font-medium">Permission Required</span>
                  <span className="text-white/50 text-sm">Allow microphone access to continue</span>
                </>
              ) : (
                <>
                  <span className="text-red-400 text-lg font-medium">Microphone unavailable</span>
                  <span className="text-white/50 text-sm">Close other apps or restart and try again</span>
                </>
              )}
            </div>
          )}
          {isConference && (
            <span className="text-white/70 text-lg">{conferenceParticipants.length} participants</span>
          )}
        </motion.div>

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
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-x-0 bottom-[200px] mx-4 bg-black/80 backdrop-blur-xl rounded-3xl p-5"
          >
            <div className="text-center mb-4">
              <p className="text-white text-2xl font-mono tracking-[0.2em]">{dtmfInput || '—'}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
              {keypadDigits.map(digit => (
                <button
                  key={digit}
                  onClick={() => handleDTMF(digit)}
                  className="w-[60px] h-[60px] rounded-full bg-white/15 text-white text-2xl font-semibold 
                           active:bg-white/25 active:scale-95 transition-all mx-auto
                           flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowKeypad(false)}
              className="w-full mt-4 py-2 text-emerald-400 text-sm font-medium"
            >
              Hide Keypad
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom section - Controls */}
      <div 
        className="relative z-10 px-4 sm:px-6 flex-shrink-0 pb-safe"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)' }}
      >
        {/* Top row - Speaker, Video, Mute */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-5 max-w-[280px] sm:max-w-[320px] mx-auto">
          <button
            onClick={cycleSpeaker}
            className="flex flex-col items-center gap-1.5 sm:gap-2"
          >
            <motion.div 
              whileTap={{ scale: 0.9 }}
              className={`w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-full flex items-center justify-center transition-all ${
                audioRoute !== 'earpiece' 
                  ? 'bg-white/95 text-gray-900' 
                  : 'bg-white/15 text-white'
              }`}
            >
              {getAudioRouteIcon()}
            </motion.div>
            <span className={`text-[10px] sm:text-[11px] capitalize ${audioRoute !== 'earpiece' ? 'text-white font-medium' : 'text-white/60'}`}>
              {audioRoute}
            </span>
          </button>

          <button
            onClick={handleUpgradeToVideo}
            className="flex flex-col items-center gap-1.5 sm:gap-2"
          >
            <motion.div 
              whileTap={{ scale: 0.9 }}
              className={`w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-full flex items-center justify-center transition-all ${
                (videoEnabled || localVideoActive)
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/15 text-white'
              }`}
            >
              <Video className="h-5 w-5 sm:h-6 sm:w-6" />
            </motion.div>
            <span className={`text-[10px] sm:text-[11px] ${(videoEnabled || localVideoActive) ? 'text-emerald-400 font-medium' : 'text-white/60'}`}>
              Video
            </span>
          </button>

          <button
            onClick={toggleMute}
            className="flex flex-col items-center gap-1.5 sm:gap-2"
          >
            <motion.div 
              whileTap={{ scale: 0.9 }}
              className={`w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-full flex items-center justify-center transition-all ${
                isMuted 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white/15 text-white'
              }`}
            >
              {isMuted ? <MicOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Mic className="h-5 w-5 sm:h-6 sm:w-6" />}
            </motion.div>
            <span className={`text-[10px] sm:text-[11px] ${isMuted ? 'text-red-400 font-medium' : 'text-white/60'}`}>
              {isMuted ? 'Muted' : 'Mute'}
            </span>
          </button>
        </div>

        {/* Bottom row - More, End, Keypad */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-[280px] sm:max-w-[320px] mx-auto">
          <Sheet open={showMoreOptions} onOpenChange={setShowMoreOptions}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-1.5 sm:gap-2">
                <motion.div 
                  whileTap={{ scale: 0.9 }}
                  className="w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-full bg-white/15 flex items-center justify-center"
                >
                  <MoreHorizontal className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </motion.div>
                <span className="text-white/60 text-[10px] sm:text-[11px]">More</span>
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
            className="flex flex-col items-center gap-1.5 sm:gap-2"
          >
            <motion.div 
              whileTap={{ scale: 0.9 }}
              className="w-[56px] h-[56px] sm:w-[68px] sm:h-[68px] rounded-full bg-red-500 flex items-center justify-center shadow-[0_4px_20px_rgba(239,68,68,0.5)]"
            >
              <PhoneOff className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </motion.div>
            <span className="text-red-400 text-[10px] sm:text-[11px] font-medium">End</span>
          </button>

          <button
            onClick={() => setShowKeypad(!showKeypad)}
            className="flex flex-col items-center gap-1.5 sm:gap-2"
          >
            <motion.div 
              whileTap={{ scale: 0.9 }}
              className={`w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-full flex items-center justify-center transition-all ${
                showKeypad 
                  ? 'bg-white/95 text-gray-900' 
                  : 'bg-white/15 text-white'
              }`}
            >
              <Grid3X3 className="h-5 w-5 sm:h-6 sm:w-6" />
            </motion.div>
            <span className={`text-[10px] sm:text-[11px] ${showKeypad ? 'text-white font-medium' : 'text-white/60'}`}>Keypad</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Render via portal to ensure it's above everything
  return createPortal(callUI, document.body);
}
