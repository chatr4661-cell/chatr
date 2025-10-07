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
  const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "reconnecting" | "ended">("connecting");
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
  const statsIntervalRef = useRef<NodeJS.Timeout>();

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

      statsIntervalRef.current = setInterval(() => {
        monitorConnectionQuality();
      }, 2000);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    };
  }, [callStatus]);

  const monitorConnectionQuality = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      const stats = await pc.getStats();
      let packetLoss = 0;
      let jitter = 0;

      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          const packetsLost = report.packetsLost || 0;
          const packetsReceived = report.packetsReceived || 0;
          packetLoss = packetsLost / (packetsReceived + packetsLost) || 0;
          jitter = report.jitter || 0;
        }
      });

      if (packetLoss > 0.05 || jitter > 0.03) {
        setConnectionQuality("poor");
      } else if (packetLoss > 0.02 || jitter > 0.015) {
        setConnectionQuality("good");
      } else {
        setConnectionQuality("excellent");
      }
    } catch (error) {
      console.error("Error monitoring quality:", error);
    }
  };

  const initializeCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const iceServers = await getTurnConfig();
      const pc = new RTCPeerConnection({
        iceServers,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle'
      });
      
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setCallStatus("connected");
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
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setCallStatus("reconnecting");
          setConnectionQuality("reconnecting");
          toast({
            title: "Connection lost",
            description: "Attempting to reconnect...",
            variant: "destructive"
          });
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
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
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
          facingMode: { exact: newFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
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
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
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
    <div className={cn(
      "fixed z-50 bg-black flex flex-col animate-fade-in",
      isPiPMode ? "bottom-4 right-4 w-96 h-72 rounded-2xl shadow-2xl border-2 border-white/20" : "inset-0"
    )}>
      {/* Quality & Duration Badge */}
      {callStatus === "connected" && (
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <Badge variant="secondary" className={cn("backdrop-blur-md", qualityStyles.bg, qualityStyles.border)}>
            <div className={cn("w-2 h-2 rounded-full mr-2", qualityStyles.dot)} />
            <span className={qualityStyles.text}>{connectionQuality}</span>
          </Badge>
          <Badge variant="secondary" className="backdrop-blur-md font-mono bg-black/40">
            {formatDuration(callDuration)}
          </Badge>
        </div>
      )}

      {/* Contact Name */}
      <div className="absolute top-4 right-4 z-10">
        <Badge variant="secondary" className="backdrop-blur-md text-lg px-4 py-2 bg-black/40">
          {contactName}
        </Badge>
      </div>

      {/* Remote Video (Full Screen) */}
      <div className="flex-1 relative bg-gray-900">
        {callStatus === "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center">
              <Video className="h-16 w-16 mx-auto mb-4 text-white animate-pulse" />
              <p className="text-white text-lg">Connecting...</p>
            </div>
          </div>
        )}
        {callStatus === "reconnecting" && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
            <div className="text-center">
              <Video className="h-16 w-16 mx-auto mb-4 text-orange-500 animate-pulse" />
              <p className="text-orange-500 text-lg font-semibold">Reconnecting...</p>
            </div>
          </div>
        )}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      </div>

      {/* Local Video (Draggable PiP) */}
      <div className={cn(
        "absolute rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl transition-all",
        isPiPMode ? "top-4 left-4 w-24 h-32" : "bottom-28 right-4 w-32 h-40"
      )}>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform scale-x-[-1]"
        />
        {!videoEnabled && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <VideoOff className="h-8 w-8 text-white/70" />
          </div>
        )}
      </div>

      {/* Controls */}
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
    </div>
  );
}