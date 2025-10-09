import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, VideoOff, Mic, MicOff, PhoneOff, SwitchCamera, Monitor, MonitorOff, UserPlus, Maximize2, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendSignal, subscribeToCallSignals, getTurnConfig } from "@/utils/webrtcSignaling";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";
import { getOptimalVideoConstraints, getOptimalAudioConstraints, setBandwidth, setPreferredCodec, QUALITY_PRESETS } from "@/utils/videoQualityManager";
import { useNetworkStats } from "@/hooks/useNetworkStats";
import { useCallUI } from "@/hooks/useCallUI";
import { DraggableVideoWindow } from "./DraggableVideoWindow";
import { CallStateTransition } from "./CallStateTransition";
import { motion, AnimatePresence } from "framer-motion";

interface ProductionVideoCallProps {
  callId: string;
  contactName: string;
  contactAvatar?: string;
  isInitiator: boolean;
  partnerId: string;
  onEnd: () => void;
  onAddParticipant?: () => void;
}

export default function ProductionVideoCall({ 
  callId, 
  contactName,
  isInitiator, 
  partnerId, 
  onEnd,
  onAddParticipant
}: ProductionVideoCallProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<"dialing" | "ringing" | "connecting" | "connected" | "reconnecting" | "ended">("dialing");
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "poor" | "reconnecting">("good");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isPiPMode, setIsPiPMode] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const { toast } = useToast();
  const callTimerRef = useRef<NodeJS.Timeout>();
  
  const { stats, currentQuality, connectionQuality: netConnectionQuality } = useNetworkStats({
    peerConnection: peerConnectionRef.current,
    enabled: callStatus === 'connected',
    autoAdjust: true
  });

  const { controlsVisible, showControls } = useCallUI({ 
    autoHideDelay: 3000,
    enabled: callStatus === 'connected'
  });

  useEffect(() => {
    initializeCall();
    const unsubscribe = subscribeToCallSignals(callId, handleSignal);
    
    return () => {
      cleanup();
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (callStatus === "connected") {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callStatus]);

  // Update connection quality from network stats
  useEffect(() => {
    if (netConnectionQuality) {
      setConnectionQuality(netConnectionQuality);
    }
  }, [netConnectionQuality]);


  const initializeCall = async () => {
    try {
      console.log('🎥 Initializing ultra-HD video call...');
      setCallStatus(isInitiator ? "dialing" : "ringing");
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: getOptimalVideoConstraints('ultra'),
        audio: getOptimalAudioConstraints()
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const iceServers = await getTurnConfig();
      const pc = new RTCPeerConnection({
        iceServers,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });
      
      peerConnectionRef.current = pc;

      // Set VP9 as preferred codec for better quality
      try {
        setPreferredCodec(pc, 'VP9');
      } catch (error) {
        console.log('VP9 not available, using default codec');
      }

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Set initial ultra quality bitrate
      setTimeout(async () => {
        await setBandwidth(pc, 'ultra');
      }, 1000);

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setTimeout(() => {
          setRemoteStream(remoteStream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          setTimeout(() => setCallStatus("connected"), 300);
        }, 200);
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await sendSignal({
            type: 'ice-candidate',
            callId,
            data: event.candidate,
            to: partnerId
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCallStatus("connected");
          console.log('✅ Call connected in ultra-HD!');
        } else if (pc.connectionState === "failed") {
          setCallStatus("reconnecting");
          setConnectionQuality("reconnecting");
          // Try ICE restart
          pc.restartIce();
          toast({
            title: "Connection lost",
            description: "Attempting to reconnect...",
            variant: "destructive"
          });
        } else if (pc.connectionState === "disconnected") {
          setCallStatus("reconnecting");
          setConnectionQuality("reconnecting");
        }
      };

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        await sendSignal({
          type: 'offer',
          callId,
          data: offer,
          to: partnerId
        });
      }

    } catch (error: any) {
      console.error("Error initializing call:", error);
      toast({
        title: "Error",
        description: "Failed to start video call",
        variant: "destructive"
      });
      onEnd();
    }
  };

  const handleSignal = async (signal: any) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      if (signal.signal_type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        await sendSignal({
          type: 'answer',
          callId,
          data: answer,
          to: partnerId
        });
      } else if (signal.signal_type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
      } else if (signal.signal_type === 'ice-candidate') {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data));
        }
      }
    } catch (error) {
      console.error("Error handling signal:", error);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setAudioEnabled(audioTrack.enabled);
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as MediaTrackConstraints,
        audio: false
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      
      const videoSender = peerConnectionRef.current
        ?.getSenders()
        .find(sender => sender.track?.kind === 'video');

      if (videoSender && screenTrack) {
        await videoSender.replaceTrack(screenTrack);
        setIsScreenSharing(true);

        screenTrack.onended = () => {
          stopScreenShare();
        };
      }

      toast({
        title: 'Screen sharing started',
        description: 'Your screen is now visible',
      });
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  };

  const stopScreenShare = async () => {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          ...getOptimalVideoConstraints('ultra'),
          facingMode
        }
      });
      const cameraTrack = cameraStream.getVideoTracks()[0];

      const videoSender = peerConnectionRef.current
        ?.getSenders()
        .find(sender => sender.track?.kind === 'video');

      if (videoSender && cameraTrack) {
        await videoSender.replaceTrack(cameraTrack);
        setIsScreenSharing(false);

        const oldVideoTrack = localStream?.getVideoTracks()[0];
        if (oldVideoTrack) {
          localStream?.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        localStream?.addTrack(cameraTrack);
      }
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  };

  const switchCamera = async () => {
    if (!localStream || !Capacitor.isNativePlatform()) return;
    
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          ...getOptimalVideoConstraints('ultra'),
          facingMode: { exact: newFacingMode }
        },
        audio: getOptimalAudioConstraints()
      });

      const videoTrack = newStream.getVideoTracks()[0];
      const sender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
      
      if (sender) {
        await sender.replaceTrack(videoTrack);
      }

      localStream.getVideoTracks()[0].stop();
      setLocalStream(newStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }
      setFacingMode(newFacingMode);
      
      toast({
        title: `Switched to ${newFacingMode === 'user' ? 'front' : 'back'} camera`,
      });
    } catch (error) {
      console.error("Error switching camera:", error);
    }
  };

  const togglePiP = () => {
    setIsPiPMode(!isPiPMode);
  };

  const endCall = async () => {
    // Clean up media streams and connections first
    cleanup();
    
    // Update call status in database
    await supabase
      .from('calls')
      .update({ 
        status: 'ended', 
        ended_at: new Date().toISOString(),
        duration: callDuration
      })
      .eq('id', callId);
    
    // Reset call state and return to previous screen
    onEnd();
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (callTimerRef.current) clearInterval(callTimerRef.current);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getQualityStyles = () => {
    switch (connectionQuality) {
      case "excellent": 
        return { bg: "bg-green-500/20", border: "border-green-500/30", dot: "bg-green-500", text: "text-green-500" };
      case "good": 
        return { bg: "bg-yellow-500/20", border: "border-yellow-500/30", dot: "bg-yellow-500", text: "text-yellow-500" };
      case "poor": 
        return { bg: "bg-red-500/20", border: "border-red-500/30", dot: "bg-red-500", text: "text-red-500" };
      case "reconnecting":
        return { bg: "bg-orange-500/20", border: "border-orange-500/30", dot: "bg-orange-500 animate-pulse", text: "text-orange-500" };
    }
  };

  const qualityStyles = getQualityStyles();

  return (
    <div 
      className={cn(
        "fixed z-50 bg-black flex flex-col",
        isPiPMode ? "bottom-4 right-4 w-96 h-72 rounded-2xl shadow-2xl border-2 border-white/20" : "inset-0"
      )}
      onClick={showControls}
    >
      {/* Call State Transition Overlay */}
      <CallStateTransition 
        state={callStatus === "dialing" || callStatus === "ringing" || callStatus === "connecting" ? callStatus : "connected"}
        contactName={contactName}
        callType="video"
      />

      {/* Quality & Duration Badge */}
      <AnimatePresence>
        {callStatus === "connected" && controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute top-4 left-4 z-10 flex flex-col gap-2"
          >
            <div className="flex gap-2">
              <Badge variant="secondary" className={cn("backdrop-blur-md", qualityStyles.bg, qualityStyles.border)}>
                <div className={cn("w-2 h-2 rounded-full mr-2", qualityStyles.dot)} />
                <span className={qualityStyles.text}>{connectionQuality}</span>
              </Badge>
              <Badge variant="secondary" className="backdrop-blur-md font-mono bg-black/40">
                {formatDuration(callDuration)}
              </Badge>
            </div>
            <Badge variant="secondary" className="backdrop-blur-md bg-black/50 border-green-500/30">
              <span className="text-green-400 text-xs font-medium">
                {QUALITY_PRESETS[currentQuality].label} @ {stats.fps}fps • {(stats.bandwidth / 1000).toFixed(1)}Mbps
              </span>
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact Name */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute top-4 right-4 z-10"
          >
            <Badge variant="secondary" className="backdrop-blur-md text-lg px-4 py-2 bg-black/40">
              {contactName}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remote Video (Full Screen) */}
      <div className="flex-1 relative bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <motion.video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: callStatus === 'connected' ? 1 : 0.3 }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Local Video (Draggable PiP) */}
      {!isPiPMode && (
        <DraggableVideoWindow
          videoRef={localVideoRef}
          stream={localStream}
          enabled={videoEnabled}
        />
      )}

      {/* Controls */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Card className="absolute bottom-0 left-0 right-0 backdrop-blur-xl bg-black/80 border-t border-white/10 p-6">
              <div className="flex items-center justify-center gap-3">
          <Button
            variant={videoEnabled ? "secondary" : "destructive"}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full h-14 w-14 shadow-lg hover:scale-110 transition-transform"
          >
            {videoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
          
          <Button
            variant={audioEnabled ? "secondary" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            className="rounded-full h-14 w-14 shadow-lg hover:scale-110 transition-transform"
          >
            {audioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            className="rounded-full h-14 w-14 shadow-lg hover:scale-110 transition-transform"
          >
            {isScreenSharing ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
          </Button>

          {Capacitor.isNativePlatform() && (
            <Button
              variant="secondary"
              size="lg"
              onClick={switchCamera}
              className="rounded-full h-14 w-14 shadow-lg hover:scale-110 transition-transform"
            >
              <SwitchCamera className="h-6 w-6" />
            </Button>
          )}

          <Button
            variant="secondary"
            size="lg"
            onClick={togglePiP}
            className="rounded-full h-14 w-14 shadow-lg hover:scale-110 transition-transform"
          >
            {isPiPMode ? <Maximize2 className="h-6 w-6" /> : <Minimize2 className="h-6 w-6" />}
          </Button>

          {onAddParticipant && (
            <Button
              variant="secondary"
              size="lg"
              onClick={onAddParticipant}
              className="rounded-full h-14 w-14 shadow-lg hover:scale-110 transition-transform"
            >
              <UserPlus className="h-6 w-6" />
            </Button>
          )}
          
          <Button
            variant="destructive"
            size="lg"
            onClick={endCall}
            className="rounded-full h-14 w-14 shadow-lg hover:scale-110 transition-transform bg-red-500 hover:bg-red-600"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}