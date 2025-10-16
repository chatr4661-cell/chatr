import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, PhoneOff, Phone, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { sendSignal, subscribeToCallSignals } from "@/utils/webrtcSignaling";

interface VoiceCallProps {
  conversationId: string;
  callId: string;
  contactName: string;
  contactAvatar?: string;
  isInitiator: boolean;
  userId: string;
  partnerId: string;
  onEnd: () => void;
}

export default function VoiceCall({ conversationId, callId, contactName, contactAvatar, isInitiator, userId, partnerId, onEnd }: VoiceCallProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<"connecting" | "ringing" | "connected" | "ended">("connecting");
  const [callDuration, setCallDuration] = useState(0);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const { toast } = useToast();
  const callTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    initializeCall();
    
    // Subscribe to signaling messages
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
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callStatus]);

  const initializeCall = async () => {
    try {
      setCallStatus("ringing");
      
      // Get local audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setLocalStream(stream);

      // Create peer connection
      const configuration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      };
      
      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle incoming stream
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.play();
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
        console.log('📞 Creating offer as initiator');
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
        description: "Failed to start voice call",
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
        setCallStatus("connected");
      } else if (signal.signal_type === 'answer') {
        console.log('📥 Processing answer');
        await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
        setCallStatus("connected");
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
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-primary/20 via-background to-secondary/20 backdrop-blur-xl flex flex-col items-center justify-center p-6">
      <Card className="w-full max-w-sm backdrop-blur-xl bg-white/5 border-white/10 p-8">
        <div className="flex flex-col items-center space-y-6">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-white/20">
              <AvatarImage src={contactAvatar} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-3xl">
                {contactName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {callStatus === "ringing" && (
              <div className="absolute inset-0 rounded-full border-4 border-primary/50 animate-ping" />
            )}
          </div>

          {/* Contact Name */}
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">{contactName}</h2>
            {callStatus === "connecting" && (
              <p className="text-sm text-muted-foreground">Connecting...</p>
            )}
            {callStatus === "ringing" && (
              <p className="text-sm text-muted-foreground">Ringing...</p>
            )}
            {callStatus === "connected" && (
              <p className="text-sm text-muted-foreground">{formatDuration(callDuration)}</p>
            )}
          </div>

          {/* Audio Wave Animation */}
          {callStatus === "connected" && audioEnabled && (
            <div className="flex items-center justify-center gap-1 h-12">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 40 + 10}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 pt-6">
            <Button
              variant={audioEnabled ? "default" : "destructive"}
              size="lg"
              onClick={toggleAudio}
              className="rounded-full h-16 w-16"
            >
              {audioEnabled ? <Mic className="h-7 w-7" /> : <MicOff className="h-7 w-7" />}
            </Button>
            
            <Button
              variant="destructive"
              size="lg"
              onClick={endCall}
              className="rounded-full h-16 w-16"
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}