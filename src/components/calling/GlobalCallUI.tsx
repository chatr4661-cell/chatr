import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, PhoneOff, Volume2, Video, VideoOff, Grid3X3 } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';
import { createWebRTCManager, type ConnectionState } from '@/utils/webrtcManager';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * GlobalCallUI - Renders call screens globally based on CallContext
 * Automatically shows incoming call UI and active call UI
 */
export function GlobalCallUI() {
  const { activeCall, incomingCall, answerCall, rejectCall, endCall } = useCall();

  // Show incoming call screen
  if (incomingCall) {
    return createPortal(
      <IncomingCallUI
        callerName={incomingCall.partnerName}
        callerAvatar={incomingCall.partnerAvatar}
        callType={incomingCall.callType}
        onAnswer={answerCall}
        onReject={rejectCall}
      />,
      document.body
    );
  }

  // Show active call screen
  if (activeCall) {
    return createPortal(
      <ActiveCallUI
        call={activeCall}
        onEnd={endCall}
      />,
      document.body
    );
  }

  return null;
}

// Incoming Call UI
function IncomingCallUI({
  callerName,
  callerAvatar,
  callType,
  onAnswer,
  onReject,
}: {
  callerName: string;
  callerAvatar?: string;
  callType: 'voice' | 'video';
  onAnswer: () => void;
  onReject: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[99999] bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center">
      {/* Caller info */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-12"
      >
        {callerAvatar ? (
          <img src={callerAvatar} alt={callerName} className="w-28 h-28 rounded-full object-cover ring-4 ring-white/20" />
        ) : (
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center ring-4 ring-white/20">
            <span className="text-4xl font-bold text-white">{callerName.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <h2 className="text-white text-2xl font-semibold mt-4">{callerName}</h2>
        <p className="text-white/60 mt-2 animate-pulse">
          Incoming {callType} call...
        </p>
      </motion.div>

      {/* Answer/Reject buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-16"
      >
        <button
          onClick={onReject}
          className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <PhoneOff className="w-7 h-7 text-white" />
        </button>
        <button
          onClick={onAnswer}
          className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          {callType === 'video' ? (
            <Video className="w-7 h-7 text-white" />
          ) : (
            <div className="w-7 h-7 text-white flex items-center justify-center">📞</div>
          )}
        </button>
      </motion.div>
    </div>
  );
}

// Active Call UI
function ActiveCallUI({
  call,
  onEnd,
}: {
  call: {
    id: string;
    partnerId: string;
    partnerName: string;
    partnerAvatar?: string;
    partnerPhone?: string;
    callType: 'voice' | 'video';
    isInitiator: boolean;
    preAcquiredStream?: MediaStream | null;
  };
  onEnd: () => void;
}) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(call.callType === 'video');
  const [duration, setDuration] = useState(0);
  const [showKeypad, setShowKeypad] = useState(false);
  const [localVideoActive, setLocalVideoActive] = useState(false);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);

  const webrtcRef = useRef<ReturnType<typeof createWebRTCManager> | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize WebRTC
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not logged in');
        onEnd();
        return;
      }

      const mgr = createWebRTCManager();
      webrtcRef.current = mgr;

      mgr.on('localStream', (stream) => {
        if (localVideoRef.current && stream.getVideoTracks().length > 0) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
          setLocalVideoActive(true);
        }
      });

      mgr.on('remoteStream', (stream) => {
        // Video
        if (remoteVideoRef.current && stream.getVideoTracks().length > 0) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.muted = true;
          remoteVideoRef.current.play().then(() => {
            setTimeout(() => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.muted = false;
              }
            }, 100);
          }).catch(() => {});
          setRemoteVideoActive(true);
        }

        // Audio
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
          remoteAudioRef.current.autoplay = true;
        }
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(() => {});
      });

      mgr.on('stateChange', (state) => {
        setConnectionState(state);
        if (state === 'connected') {
          durationRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        }
      });

      mgr.on('error', (err) => {
        console.error('WebRTC error:', err);
        toast.error('Call connection failed');
      });

      await mgr.start({
        callId: call.id,
        partnerId: call.partnerId,
        userId: user.id,
        isInitiator: call.isInitiator,
        isVideo: call.callType === 'video',
        preAcquiredStream: call.preAcquiredStream,
      });
    };

    init();

    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
      if (remoteAudioRef.current) {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
      }
      webrtcRef.current?.end();
    };
  }, []);

  // Listen for call ended by partner
  useEffect(() => {
    const channel = supabase
      .channel(`call-ui-${call.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'calls',
        filter: `id=eq.${call.id}`,
      }, (payload) => {
        const updated = payload.new as any;
        if (updated.status === 'ended' || updated.status === 'missed') {
          webrtcRef.current?.end();
          onEnd();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [call.id, onEnd]);

  const handleEnd = async () => {
    webrtcRef.current?.end();
    await supabase.from('calls').update({
      status: 'ended',
      ended_at: new Date().toISOString(),
      duration,
      webrtc_state: 'ended',
    }).eq('id', call.id);
    onEnd();
  };

  const toggleMute = () => {
    setIsMuted(m => {
      webrtcRef.current?.toggleAudio(m);
      return !m;
    });
  };

  const toggleSpeaker = () => setIsSpeaker(s => !s);

  const toggleVideo = () => {
    setIsVideoOn(v => {
      webrtcRef.current?.toggleVideo(!v);
      return !v;
    });
  };

  const handleDTMF = (digit: string) => {
    webrtcRef.current?.sendDTMF(digit);
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const isVideo = call.callType === 'video' || isVideoOn;
  const keypadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-black flex flex-col overflow-hidden select-none"
      style={{ height: '100dvh' }}
    >
      {/* Background */}
      {isVideo && remoteVideoActive ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-contain bg-black"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center">
          {call.partnerAvatar ? (
            <img src={call.partnerAvatar} alt={call.partnerName} className="w-28 h-28 rounded-full object-cover ring-4 ring-white/10" />
          ) : (
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center ring-4 ring-white/10">
              <span className="text-5xl font-bold text-white">{call.partnerName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          {isVideo && !remoteVideoActive && (
            <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
          )}
        </div>
      )}

      {/* Local video PIP */}
      {isVideo && localVideoActive && (
        <div className="absolute top-16 right-4 w-24 h-32 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl z-20">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-30 pt-safe" style={{ paddingTop: 'max(env(safe-area-inset-top, 16px), 16px)' }}>
        <div className="flex flex-col items-center py-4">
          <div className={`px-3 py-1 rounded-full text-xs font-medium mb-2 ${
            connectionState === 'connected' ? 'bg-emerald-500/20 text-emerald-400' 
              : connectionState === 'reconnecting' ? 'bg-amber-500/20 text-amber-400'
              : connectionState === 'failed' ? 'bg-red-500/20 text-red-400'
              : 'bg-blue-500/20 text-blue-400'
          }`}>
            {connectionState === 'connected' ? '● Connected' 
              : connectionState === 'reconnecting' ? '● Reconnecting...'
              : connectionState === 'failed' ? '● Failed'
              : '● Connecting...'}
          </div>
          <h1 className="text-white text-xl font-semibold">{call.partnerName}</h1>
          {call.partnerPhone && <p className="text-white/60 text-sm">{call.partnerPhone}</p>}
          <p className={`text-sm mt-1 ${connectionState === 'connected' ? 'text-emerald-400 font-mono' : 'text-white/70 animate-pulse'}`}>
            {connectionState === 'connected' ? formatDuration(duration) : 'Connecting...'}
          </p>
        </div>
      </div>

      {/* Keypad */}
      <AnimatePresence>
        {showKeypad && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-x-4 bottom-48 bg-black/90 backdrop-blur-xl rounded-3xl p-6 z-40"
          >
            <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
              {keypadDigits.map(d => (
                <button key={d} onClick={() => handleDTMF(d)}
                  className="w-16 h-16 rounded-full bg-white/10 text-white text-2xl font-semibold active:bg-white/20 mx-auto flex items-center justify-center">
                  {d}
                </button>
              ))}
            </div>
            <button onClick={() => setShowKeypad(false)} className="w-full mt-4 text-emerald-400 text-sm">Hide</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="absolute bottom-0 inset-x-0 z-30 pb-safe" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 20px)' }}>
        <div className="flex justify-center gap-6 mb-6">
          <button onClick={toggleSpeaker} className="flex flex-col items-center gap-1">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isSpeaker ? 'bg-white text-black' : 'bg-white/15 text-white'}`}>
              <Volume2 className="w-6 h-6" />
            </div>
            <span className="text-[10px] text-white/60">Speaker</span>
          </button>

          {isVideo && (
            <button onClick={toggleVideo} className="flex flex-col items-center gap-1">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isVideoOn ? 'bg-emerald-500' : 'bg-white/15'} text-white`}>
                {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </div>
              <span className="text-[10px] text-white/60">Video</span>
            </button>
          )}

          <button onClick={toggleMute} className="flex flex-col items-center gap-1">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isMuted ? 'bg-red-500' : 'bg-white/15'} text-white`}>
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </div>
            <span className="text-[10px] text-white/60">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          <button onClick={() => setShowKeypad(k => !k)} className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center text-white">
              <Grid3X3 className="w-6 h-6" />
            </div>
            <span className="text-[10px] text-white/60">Keypad</span>
          </button>
        </div>

        {/* End call */}
        <div className="flex justify-center">
          <button onClick={handleEnd} className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg active:scale-95">
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
