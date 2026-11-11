import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, Share2, Copy, Check, 
  ShieldCheck, Sparkles, MessageSquare, Maximize2, Minimize2, 
  RotateCcw, Gift, Users, ExternalLink, ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const InstantCallRoom: React.FC = () => {
  const { roomId = 'instant-meet' } = useParams<{ roomId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Guest & Call State
  const [guestName, setGuestName] = useState(searchParams.get('name') || 'Guest');
  const [hasJoined, setHasJoined] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [copied, setCopied] = useState(false);

  // Audio/Video Controls
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Stream Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);

  // Signup lead capture on call end
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  const roomLink = `https://chatr.chat/call/${roomId}`;

  // Call timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (hasJoined && !callEnded) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [hasJoined, callEnded]);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(roomLink);
    setCopied(true);
    toast.success('Call link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(`Join my encrypted HD video call on CHATR (No download or login required):\n${roomLink}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Acquire Media & Start Call
  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode }
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setHasJoined(true);
      initializeSignaling(stream);
    } catch (err) {
      console.error('Media stream error:', err);
      toast.error('Camera or Microphone access denied. Joining with audio-only fallback.');
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = audioStream;
        setIsVideoMuted(true);
        setHasJoined(true);
        initializeSignaling(audioStream);
      } catch (audioErr) {
        toast.error('Unable to access microphone. Please allow permissions in your browser.');
      }
    }
  };

  const initializeSignaling = async (stream: MediaStream) => {
    // 1. Fetch Cloudflare TURN
    let iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ];
    try {
      const turnRes = await fetch('/api/turn-credentials', { method: 'POST' });
      if (turnRes.ok) {
        const turnData = await turnRes.json();
        if (turnData.iceServers) {
          iceServers = turnData.iceServers;
        }
      }
    } catch (e) {
      console.warn('Using standard STUN servers fallback');
    }

    const pc = new RTCPeerConnection({ iceServers });
    peerConnectionRef.current = pc;

    // Add local tracks
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // Handle remote tracks
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // 2. Realtime Broadcast Signaling Channel (Zero-Auth / Zero-DB)
    const channelName = `call_room_${roomId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });
    channelRef.current = channel;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: event.candidate }
        });
      }
    };

    channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      channel.send({
        type: 'broadcast',
        event: 'answer',
        payload: { sdp: answer }
      });
    });

    channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    });

    channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (err) {
        console.warn('Error adding remote candidate:', err);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Send initial call offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channel.send({
          type: 'broadcast',
          event: 'offer',
          payload: { sdp: offer }
        });
      }
    });
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  const flipCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => t.stop());
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextMode },
          audio: !isAudioMuted
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
        localStreamRef.current = newStream;

        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender && newVideoTrack) sender.replaceTrack(newVideoTrack);
        }
      } catch (err) {
        console.warn('Failed to switch camera:', err);
      }
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    setCallEnded(true);
  };

  const handleClaimAccount = () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setIsSigningUp(true);
    // Forward to /auth with ref=instant_call and prefilled phone
    navigate(`/auth?phone=${encodeURIComponent(phoneNumber)}&ref=instant_call&room=${roomId}`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans z-50">
      
      {/* Top Navigation & Status */}
      <header className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>End-to-End Encrypted</span>
          </div>
          {hasJoined && !callEnded && (
            <div className="bg-slate-800/80 px-3 py-1 rounded-full text-xs font-mono font-medium text-slate-300 border border-slate-700">
              {formatDuration(callDuration)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyRoomLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-medium transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Share Link'}</span>
          </button>
          <button
            onClick={shareOnWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        </div>
      </header>

      {/* Main Video Viewports */}
      <main className="relative flex-1 w-full h-full flex items-center justify-center bg-slate-900">
        
        {/* Remote Video (Full Screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Placeholder if waiting for other person */}
        {hasJoined && !callEnded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-500/40 animate-ping absolute inset-0" />
              <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center relative shadow-2xl">
                <Users className="w-10 h-10 text-emerald-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-2">Waiting for guest to join...</h2>
            <p className="text-sm text-slate-400 max-w-sm mb-4">
              Share this instant room link with anyone on WhatsApp, SMS, or Telegram. Zero app download required.
            </p>
            <button
              onClick={shareOnWhatsApp}
              className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm shadow-lg shadow-emerald-900/30 transition"
            >
              <Share2 className="w-4 h-4" />
              <span>Invite via WhatsApp</span>
            </button>
          </div>
        )}

        {/* Local Video Thumbnail / PiP */}
        {hasJoined && !callEnded && (
          <div className="absolute bottom-28 right-4 w-32 h-44 sm:w-44 sm:h-60 rounded-2xl overflow-hidden border-2 border-slate-700/80 shadow-2xl bg-black z-20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            {isVideoMuted && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center">
                <VideoOff className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-[10px] text-slate-400">Camera Off</span>
              </div>
            )}
          </div>
        )}

        {/* Pre-Join Screen (If not joined yet) */}
        {!hasJoined && !callEnded && (
          <div className="absolute inset-0 z-30 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400 shadow-xl">
              <Video className="w-10 h-10" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Instant Encrypted Video Call
            </h1>
            <p className="text-sm text-slate-400 max-w-md mb-8">
              Room: <span className="text-emerald-400 font-mono font-semibold">{roomId}</span>
              <br />
              Zero installation, crystal-clear WebRTC peer connection.
            </p>

            <div className="w-full max-w-xs space-y-3 mb-6">
              <input
                type="text"
                placeholder="Enter your name (optional)"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm focus:outline-none focus:border-emerald-500 text-center text-white"
              />
              <button
                onClick={startCall}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition"
              >
                <Video className="w-4 h-4" />
                <span>Join Call Now</span>
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> WebRTC P2P</span>
              <span>•</span>
              <span>No signup needed</span>
              <span>•</span>
              <span>Free 100%</span>
            </div>
          </div>
        )}

        {/* Post-Call Conversion Screen (Viral Lead Capture) */}
        {callEnded && (
          <div className="absolute inset-0 z-40 bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 text-emerald-400 shadow-xl">
              <Sparkles className="w-10 h-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">
              Call Completed!
            </h2>
            <p className="text-xs text-slate-400 font-mono mb-6">
              Duration: {formatDuration(callDuration)} • Room: {roomId}
            </p>

            {/* Viral Reward Card */}
            <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-900/90 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl mb-6 text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Claim Your 100 Free Welcome Coins</h3>
                  <p className="text-xs text-slate-400">Unlock your permanent @username & unlimited encrypted video calls.</p>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:outline-none focus:border-emerald-500 text-white"
                />
                <button
                  onClick={handleClaimAccount}
                  disabled={isSigningUp}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition"
                >
                  <span>Claim Coins & Create Free Profile</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setCallEnded(false);
                  setHasJoined(false);
                  setCallDuration(0);
                }}
                className="text-xs text-slate-400 hover:text-white underline underline-offset-4 transition"
              >
                Start another guest call
              </button>
              <span className="text-slate-700">•</span>
              <button
                onClick={() => navigate('/')}
                className="text-xs text-slate-400 hover:text-white transition"
              >
                Go to CHATR Home
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Frosted Floating Controls */}
      {hasJoined && !callEnded && (
        <footer className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/90 border border-slate-800/80 px-6 py-3.5 rounded-full shadow-2xl backdrop-blur-xl z-30">
          <button
            onClick={toggleAudio}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-md ${
              isAudioMuted ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-md ${
              isVideoMuted ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
          >
            {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          <button
            onClick={flipCamera}
            className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition shadow-md"
            title="Flip Camera"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={endCall}
            className="w-14 h-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition shadow-lg shadow-rose-900/40 ml-2"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </footer>
      )}

    </div>
  );
};

export default InstantCallRoom;
