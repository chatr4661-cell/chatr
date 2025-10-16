import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { sendSignal, subscribeToCallSignals, getTurnConfig } from "@/utils/webrtcSignaling";
import { Badge } from "@/components/ui/badge";

interface EnhancedVoiceCallProps {
  conversationId: string;
  callId: string;
  contactName: string;
  contactAvatar?: string;
  isInitiator: boolean;
  userId: string;
  partnerId: string;
  onEnd: () => void;
}

export default function EnhancedVoiceCall({ 
  callId, 
  contactName, 
  contactAvatar, 
  isInitiator, 
  partnerId, 
  onEnd 
}: EnhancedVoiceCallProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<"connecting" | "ringing" | "connected" | "ended">("connecting");
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "poor">("good");
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
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

      // Monitor connection quality
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
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          packetLoss = report.packetsLost / (report.packetsReceived + report.packetsLost) || 0;
          jitter = report.jitter || 0;
        }
      });

      // Determine quality based on metrics
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
      setCallStatus("ringing");
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });
      
      setLocalStream(stream);

      // Get TURN configuration
      const iceServers = await getTurnConfig();
      console.log('🔧 Using ICE servers:', iceServers.length, 'servers');

      const pc = new RTCPeerConnection({
        iceServers,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });
      
      peerConnectionRef.current = pc;

      // Configure audio codec preferences
      const transceivers = pc.getTransceivers();
      transceivers.forEach(transceiver => {
        if (transceiver.sender.track?.kind === 'audio') {
          const capabilities = RTCRtpSender.getCapabilities('audio');
          if (capabilities) {
            const opusCodec = capabilities.codecs.find(codec => 
              codec.mimeType === 'audio/opus'
            );
            if (opusCodec) {
              transceiver.setCodecPreferences([opusCodec]);
            }
          }
        }
      });

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
        }
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(e => console.log('Audio play error:', e));
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
        console.log("Connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          setCallStatus("connected");
        } else if (pc.connectionState === "failed") {
          toast({
            title: "Connection lost",
            description: "Attempting to reconnect...",
            variant: "destructive"
          });
          // Auto-reconnect logic could go here
        }
      };

      if (isInitiator) {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true
        });
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
        description: "Failed to start voice call",
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
        setCallStatus("connected");
      } else if (signal.signal_type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
        setCallStatus("connected");
      } else if (signal.signal_type === 'ice-candidate') {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data));
        }
      }
    } catch (error) {
      console.error("Error handling signal:", error);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setAudioEnabled(audioTrack.enabled);
    }
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = speakerEnabled;
      setSpeakerEnabled(!speakerEnabled);
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
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
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
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-primary/20 via-background to-secondary/20 backdrop-blur-xl flex flex-col items-center justify-center p-6">
      <Card className="w-full max-w-sm backdrop-blur-xl bg-white/5 border-white/10 p-8">
        <div className="flex flex-col items-center space-y-6">
          {/* Quality Indicator */}
          {callStatus === "connected" && (
            <Badge variant="outline" className="absolute top-4 right-4">
              <div className={`w-2 h-2 rounded-full ${getQualityColor()} mr-2`} />
              {connectionQuality}
            </Badge>
          )}

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

          {/* Contact Name & Status */}
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">{contactName}</h2>
            {callStatus === "connecting" && (
              <p className="text-sm text-muted-foreground">Connecting...</p>
            )}
            {callStatus === "ringing" && (
              <p className="text-sm text-muted-foreground">Ringing...</p>
            )}
            {callStatus === "connected" && (
              <p className="text-sm text-muted-foreground font-mono">{formatDuration(callDuration)}</p>
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
              variant={speakerEnabled ? "default" : "secondary"}
              size="lg"
              onClick={toggleSpeaker}
              className="rounded-full h-16 w-16"
            >
              {speakerEnabled ? <Volume2 className="h-7 w-7" /> : <VolumeX className="h-7 w-7" />}
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
