import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, VideoOff, Mic, MicOff, PhoneOff, SwitchCamera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendSignal, subscribeToCallSignals, getTurnConfig } from "@/utils/webrtcSignaling";
import { Badge } from "@/components/ui/badge";
import { Capacitor } from "@capacitor/core";

interface EnhancedVideoCallProps {
  conversationId: string;
  callId: string;
  contactName: string;
  contactAvatar?: string;
  isInitiator: boolean;
  userId: string;
  partnerId: string;
  onEnd: () => void;
}

export default function EnhancedVideoCall({ 
  callId, 
  contactName,
  isInitiator, 
  partnerId, 
  onEnd 
}: EnhancedVideoCallProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "ended">("connecting");
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "poor">("good");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  
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
          packetLoss = report.packetsLost / (report.packetsReceived + report.packetsLost) || 0;
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
        } else if (pc.connectionState === "failed") {
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
      toast({
        title: "Camera switch failed",
        description: "Unable to switch camera",
        variant: "destructive"
      });
    }
  };

  const endCall = async () => {
    await supabase
      .from('calls')
      .update({ 
        status: 'ended', 
        ended_at: new Date().toISOString(),
        duration: callDuration
      })
      .eq('id', callId);
    
    cleanup();
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

  const getQualityColor = () => {
    switch (connectionQuality) {
      case "excellent": return "bg-green-500";
      case "good": return "bg-yellow-500";
      case "poor": return "bg-red-500";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Quality & Duration Badge */}
      {callStatus === "connected" && (
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <Badge variant="secondary" className="backdrop-blur-sm">
            <div className={`w-2 h-2 rounded-full ${getQualityColor()} mr-2`} />
            {connectionQuality}
          </Badge>
          <Badge variant="secondary" className="backdrop-blur-sm font-mono">
            {formatDuration(callDuration)}
          </Badge>
        </div>
      )}

      {/* Contact Name */}
      <div className="absolute top-4 right-4 z-10">
        <Badge variant="secondary" className="backdrop-blur-sm text-lg px-4 py-2">
          {contactName}
        </Badge>
      </div>

      {/* Remote Video (Full Screen) */}
      <div className="flex-1 relative bg-gray-900">
        {callStatus === "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center">
              <Video className="h-12 w-12 mx-auto mb-4 text-white animate-pulse" />
              <p className="text-white text-sm">Connecting...</p>
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
      <div className="absolute top-20 right-4 w-32 h-40 rounded-lg overflow-hidden border-2 border-white/20 shadow-2xl">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform scale-x-[-1]"
        />
        {!videoEnabled && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <VideoOff className="h-8 w-8 text-white/50" />
          </div>
        )}
      </div>

      {/* Controls */}
      <Card className="absolute bottom-0 left-0 right-0 backdrop-blur-xl bg-black/80 border-t border-white/10 p-6">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={videoEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full h-14 w-14"
          >
            {videoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
          
          <Button
            variant={audioEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            className="rounded-full h-14 w-14"
          >
            {audioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={switchCamera}
            className="rounded-full h-14 w-14"
          >
            <SwitchCamera className="h-6 w-6" />
          </Button>
          
          <Button
            variant="destructive"
            size="lg"
            onClick={endCall}
            className="rounded-full h-14 w-14"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
