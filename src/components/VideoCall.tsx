import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, VideoOff, Mic, MicOff, PhoneOff, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendSignal, subscribeToCallSignals } from "@/utils/webrtcSignaling";

interface VideoCallProps {
  conversationId: string;
  callId: string;
  isInitiator: boolean;
  userId: string;
  partnerId: string;
  onEnd: () => void;
}

export default function VideoCall({ conversationId, callId, isInitiator, userId, partnerId, onEnd }: VideoCallProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "ended">("connecting");
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeCall();
    
    // Subscribe to signaling messages
    const unsubscribe = subscribeToCallSignals(callId, handleSignal);
    
    return () => {
      cleanup();
      unsubscribe();
    };
  }, []);

  const initializeCall = async () => {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const configuration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      };
      
      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;

      // Add local stream tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle incoming stream
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setCallStatus("connected");
      };

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('📡 Sending ICE candidate');
          await sendSignal({
            type: 'ice-candidate',
            callId,
            data: event.candidate,
            to: partnerId
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("Connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          setCallStatus("connected");
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          toast({
            title: "Connection lost",
            description: "The call connection was lost",
            variant: "destructive"
          });
        }
      };

      // If initiator, create offer
      if (isInitiator) {
        console.log('📹 Creating offer as initiator');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        console.log('📤 Sending offer:', offer);
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
      console.log('📥 Received signal:', signal.signal_type);
      
      if (signal.signal_type === 'offer') {
        console.log('📥 Processing offer');
        await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        console.log('📤 Sending answer');
        await sendSignal({
          type: 'answer',
          callId,
          data: answer,
          to: partnerId
        });
      } else if (signal.signal_type === 'answer') {
        console.log('📥 Processing answer');
        await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
      } else if (signal.signal_type === 'ice-candidate') {
        // Only add ICE candidate if remote description is already set
        if (pc.remoteDescription) {
          console.log('📥 Adding ICE candidate');
          await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data));
        } else {
          console.log('⚠️ Skipping ICE candidate (no remote description yet)');
        }
      }
    } catch (error) {
      console.error("Error handling signal:", error);
      toast({
        title: "Signaling error",
        description: "Failed to process call signal",
        variant: "destructive"
      });
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

  const endCall = () => {
    cleanup();
    setCallStatus("ended");
    onEnd();
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Remote Video */}
      <div className="flex-1 relative bg-gray-900">
        {callStatus === "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Phone className="h-12 w-12 mx-auto mb-4 text-white animate-pulse" />
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

      {/* Local Video (Picture in Picture) */}
      <div className="absolute top-4 right-4 w-32 h-40 rounded-lg overflow-hidden border-2 border-white/20 shadow-xl">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      </div>

      {/* Controls */}
      <Card className="absolute bottom-0 left-0 right-0 backdrop-blur-xl bg-black/80 border-t border-white/10 p-4">
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