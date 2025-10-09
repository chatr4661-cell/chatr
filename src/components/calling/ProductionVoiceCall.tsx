import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { sendSignal, subscribeToCallSignals, getTurnConfig } from "@/utils/webrtcSignaling";
import { cn } from "@/lib/utils";
import { useRingtone } from "@/hooks/useRingtone";
import { useCallUI } from "@/hooks/useCallUI";
import { useCallHaptics } from "@/hooks/useCallHaptics";
import { QualityIndicator } from "./QualityIndicator";
import { motion, AnimatePresence } from "framer-motion";

interface ProductionVoiceCallProps {
  callId: string;
  contactName: string;
  contactAvatar?: string;
  isInitiator: boolean;
  partnerId: string;
  onEnd: () => void;
  onAddParticipant?: () => void;
}

export default function ProductionVoiceCall({ 
  callId, 
  contactName, 
  contactAvatar, 
  isInitiator, 
  partnerId, 
  onEnd,
  onAddParticipant
}: ProductionVoiceCallProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<"connecting" | "ringing" | "connected" | "reconnecting" | "ended">("connecting");
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "poor" | "reconnecting">("good");
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const callTimerRef = useRef<NodeJS.Timeout>();
  const statsIntervalRef = useRef<NodeJS.Timeout>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const { controlsVisible } = useCallUI({ 
    autoHideDelay: 3000,
    enabled: callStatus === 'connected'
  });

  const { trigger: triggerHaptic } = useCallHaptics();

  useRingtone({
    enabled: callStatus === "ringing",
    ringtoneUrl: "/ringtone.mp3",
    volume: 0.8,
    fadeInDuration: 1000,
    fadeOutDuration: 500
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
      let bitrate = 0;

      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          const packetsLost = report.packetsLost || 0;
          const packetsReceived = report.packetsReceived || 0;
          packetLoss = packetsLost / (packetsReceived + packetsLost) || 0;
          jitter = report.jitter || 0;
          bitrate = report.bytesReceived ? (report.bytesReceived * 8) / 1000 : 0;
        }
      });

      // Update call quality in database
      await supabase
        .from('calls')
        .update({
          connection_quality: packetLoss > 0.05 ? 'poor' : packetLoss > 0.02 ? 'good' : 'excellent',
          packet_loss_percentage: parseFloat((packetLoss * 100).toFixed(2))
        })
        .eq('id', callId);

      // Determine quality
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
      console.log('🎤 Initializing voice call...');
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

      const iceServers = await getTurnConfig();
      console.log('🔧 Using ICE servers:', iceServers.length, 'servers');

      const pc = new RTCPeerConnection({
        iceServers,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });
      
      peerConnectionRef.current = pc;

      // Configure audio codec preferences for better quality
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
        
        setTimeout(() => setCallStatus("connected"), 300);
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
          setConnectionQuality("good");
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          handleConnectionFailure();
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
      onEnd();
    }
  };

  const handleConnectionFailure = () => {
    setCallStatus("reconnecting");
    setConnectionQuality("reconnecting");
    
    toast({
      title: "Connection lost",
      description: "Attempting to reconnect...",
      variant: "destructive"
    });

    // Attempt to restart ICE
    reconnectTimeoutRef.current = setTimeout(async () => {
      const pc = peerConnectionRef.current;
      if (pc && isInitiator) {
        try {
          const offer = await pc.createOffer({ iceRestart: true });
          await pc.setLocalDescription(offer);
          await sendSignal({
            type: 'offer',
            callId,
            data: offer,
            to: partnerId
          });
        } catch (error) {
          console.error("Reconnection failed:", error);
          toast({
            title: "Reconnection failed",
            description: "Please try calling again",
            variant: "destructive"
          });
          setTimeout(onEnd, 3000);
        }
      }
    }, 2000);
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

  const toggleAudio = async () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setAudioEnabled(audioTrack.enabled);
      await triggerHaptic(audioTrack.enabled ? 'unmute' : 'mute');
    }
  };

  const toggleSpeaker = async () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = speakerEnabled;
      setSpeakerEnabled(!speakerEnabled);
      await triggerHaptic('success');
    }
  };

  const endCall = async () => {
    // Clean up media streams and connections first
    cleanup();
    
    await triggerHaptic('end');
    
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
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
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
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-background via-background/95 to-primary/5 backdrop-blur-xl flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="w-full max-w-md backdrop-blur-xl bg-card/40 border-border/50 shadow-2xl p-8">
          <div className="flex flex-col items-center space-y-8">
            {/* Quality Indicator */}
            <AnimatePresence>
              {callStatus === "connected" && controlsVisible && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-4 right-4"
                >
                  <QualityIndicator quality={connectionQuality} showLabel />
                </motion.div>
              )}
            </AnimatePresence>

          {/* Avatar */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-xl opacity-20 animate-pulse" />
            <Avatar className="h-40 w-40 border-4 border-white/10 shadow-2xl relative">
              <AvatarImage src={contactAvatar} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-5xl">
                {contactName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {callStatus === "ringing" && (
              <div className="absolute inset-0 rounded-full border-4 border-primary/50 animate-ping" />
            )}
            {callStatus === "reconnecting" && (
              <div className="absolute inset-0 rounded-full border-4 border-orange-500/50 animate-ping" />
            )}
          </div>

          {/* Contact Name & Status */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{contactName}</h2>
            {callStatus === "connecting" && (
              <p className="text-sm text-muted-foreground animate-pulse">Connecting...</p>
            )}
            {callStatus === "ringing" && (
              <p className="text-sm text-muted-foreground animate-pulse">Ringing...</p>
            )}
            {callStatus === "reconnecting" && (
              <p className="text-sm text-orange-500 animate-pulse">Reconnecting...</p>
            )}
            {callStatus === "connected" && (
              <p className="text-lg text-primary font-mono font-semibold tabular-nums">{formatDuration(callDuration)}</p>
            )}
          </div>

          {/* Audio Wave Animation */}
          {callStatus === "connected" && audioEnabled && (
            <div className="flex items-center justify-center gap-1.5 h-16">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-gradient-to-t from-primary to-secondary rounded-full animate-pulse shadow-lg"
                  style={{
                    height: `${Math.random() * 48 + 16}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${0.5 + Math.random() * 0.5}s`
                  }}
                />
              ))}
            </div>
          )}

          {/* Controls */}
          <AnimatePresence>
            {controlsVisible && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center gap-4 pt-6 w-full"
              >
            <Button
              variant={audioEnabled ? "default" : "destructive"}
              size="lg"
              onClick={toggleAudio}
              className="rounded-full h-16 w-16 shadow-lg hover:scale-110 transition-all"
            >
              {audioEnabled ? <Mic className="h-7 w-7" /> : <MicOff className="h-7 w-7" />}
            </Button>

            <Button
              variant={speakerEnabled ? "secondary" : "outline"}
              size="lg"
              onClick={toggleSpeaker}
              className="rounded-full h-16 w-16 shadow-lg hover:scale-110 transition-all"
            >
              {speakerEnabled ? <Volume2 className="h-7 w-7" /> : <VolumeX className="h-7 w-7" />}
            </Button>

            {onAddParticipant && (
              <Button
                variant="outline"
                size="lg"
                onClick={onAddParticipant}
                className="rounded-full h-16 w-16 shadow-lg hover:scale-110 transition-all"
              >
                <UserPlus className="h-7 w-7" />
              </Button>
            )}
            
            <Button
              variant="destructive"
              size="lg"
              onClick={endCall}
              className="rounded-full h-16 w-16 shadow-lg hover:scale-110 transition-all bg-red-500 hover:bg-red-600"
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
      </motion.div>
    </div>
  );
}