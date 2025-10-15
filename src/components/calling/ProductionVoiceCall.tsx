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
  const iceRestartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const signalVersionRef = useRef<number>(1);
  const lastFailedStateRef = useRef<number>(0);
  const pendingIceCandidatesRef = useRef<any[]>([]);

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
    
    return () => {
      cleanup();
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

  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initializeCall = async () => {
    try {
      console.log('🎤 ========== STARTING VOICE CALL INITIALIZATION ==========');
      console.log('🎤 Call ID:', callId);
      console.log('🎤 Contact Name:', contactName);
      console.log('🎤 Is Initiator:', isInitiator);
      console.log('🎤 Partner ID:', partnerId);
      
      console.log('🎤 Initializing voice call...');
      setCallStatus(isInitiator ? "connecting" : "ringing");
      
      // Set call timeout - 45 seconds ONLY for unanswered calls
      // This will be cleared when we receive an answer signal
      if (isInitiator) {
        callTimeoutRef.current = setTimeout(() => {
          console.warn('⏰ Call timed out - no answer within 45 seconds');
          toast({
            title: "Call Timeout",
            description: "No answer - call ended",
            variant: "destructive"
          });
          endCall();
        }, 45000);
        console.log('⏰ Set 45s timeout for unanswered call');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true, exact: true },
          noiseSuppression: { ideal: true, exact: true },
          autoGainControl: { ideal: true },
          sampleRate: { ideal: 48000 },
          sampleSize: { ideal: 24 },
          channelCount: { ideal: 2 },
          // @ts-ignore - Browser-specific extensions
          googEchoCancellation: true,
          googNoiseSuppression: true,
          googHighpassFilter: true,
          googAutoGainControl: true,
          googTypingNoiseDetection: true
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
        console.log('🔊 [ontrack] Received remote audio track');
        const [remoteStream] = event.streams;
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
          remoteAudioRef.current.autoplay = true;
        }
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.volume = 1.0;
        
        // CRITICAL: Instant audio playback
        remoteAudioRef.current.play().then(() => {
          console.log('✅ Remote audio playing instantly!');
          setCallStatus("connected");
          triggerHaptic('success');
        }).catch(e => {
          console.error('❌ Audio play error:', e);
          // Immediate retry without waiting for interaction
          setTimeout(() => {
            remoteAudioRef.current?.play().then(() => {
              console.log('✅ Audio playing on retry');
              setCallStatus("connected");
            }).catch(() => {
              // Final fallback - still set connected
              setCallStatus("connected");
            });
          }, 50);
        });
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('📡 [onicecandidate] Sending ICE candidate:', {
            candidate: event.candidate.candidate?.substring(0, 50),
            sdpMid: event.candidate.sdpMid
          });
          try {
            await sendSignal({
              type: 'ice-candidate',
              callId,
              data: event.candidate,
              to: partnerId
            });
            console.log('✅ ICE candidate sent');
          } catch (error) {
            console.error('❌ Failed to send ICE candidate:', error);
          }
        } else {
          console.log('📡 ✅ All ICE candidates sent (null candidate)');
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('❄️ [ICE Connection State]:', {
          state: pc.iceConnectionState,
          timestamp: new Date().toISOString(),
          hasLocalDesc: !!pc.localDescription,
          hasRemoteDesc: !!pc.remoteDescription,
          queuedCandidates: pendingIceCandidatesRef.current.length
        });
        
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          console.log('🎉 🎉 🎉 ICE CONNECTION SUCCESSFUL!');
          setCallStatus('connected');
          lastFailedStateRef.current = 0;
          
          // Play success sound
          const successAudio = new Audio('/notification.mp3');
          successAudio.volume = 0.3;
          successAudio.play().catch(e => console.log('Could not play success sound'));
          
          if (iceRestartTimeoutRef.current) {
            clearTimeout(iceRestartTimeoutRef.current);
            iceRestartTimeoutRef.current = null;
          }
        } else if (pc.iceConnectionState === 'failed') {
          console.log('⚠️ ICE connection failed - starting grace period');
          
          const now = Date.now();
          if (lastFailedStateRef.current === 0) {
            lastFailedStateRef.current = now;
            
            iceRestartTimeoutRef.current = setTimeout(() => {
              if (pc.iceConnectionState === 'failed') {
                console.log('❌ Still failed after 10s - restarting ICE');
                pc.restartIce();
              }
            }, 10000);
          }
        } else if (pc.iceConnectionState === 'checking' || pc.iceConnectionState === 'new') {
          lastFailedStateRef.current = 0;
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("🔗 [Connection State]:", pc.connectionState);
        
        if (pc.connectionState === "connected") {
          setCallStatus("connected");
          setConnectionQuality("good");
          lastFailedStateRef.current = 0;
          console.log('✅ ✅ ✅ Voice call P2P connection established!');
        } else if (pc.connectionState === "disconnected") {
          setCallStatus("reconnecting");
          setConnectionQuality("reconnecting");
        }
      };

      // **CRITICAL FIX**: Load past signals BEFORE subscribing
      console.log('📥 Loading past signals for receiver...');
      const { getSignals, deleteProcessedSignals } = await import('@/utils/webrtcSignaling');
      const currentUserId = (await supabase.auth.getUser()).data.user?.id || '';
      const pastSignals = await getSignals(callId, currentUserId);
      
      if (pastSignals.length > 0) {
        console.log(`📥 Processing ${pastSignals.length} past signals`);
        for (const signal of pastSignals) {
          await handleSignal(signal);
        }
        await deleteProcessedSignals(callId, currentUserId);
      }

      // Subscribe to future signals
      console.log('📡 Subscribing to future signals...');
      const { subscribeToCallSignals } = await import('@/utils/webrtcSignaling');
      const unsubscribe = await subscribeToCallSignals(callId, currentUserId, handleSignal);
      (window as any).__voiceCallSignalUnsubscribe = unsubscribe;

      if (isInitiator) {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true
        });
        await pc.setLocalDescription(offer);
        
        console.log('📤 Sending offer (version:', signalVersionRef.current, ')');
        await sendSignal({
          type: 'offer',
          callId,
          data: { ...offer, version: signalVersionRef.current },
          to: partnerId
        });
      }

    } catch (error: any) {
      console.error("Error initializing call:", error);
      
      // Clear timeout on error
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      
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
    if (!pc) {
      console.warn('⚠️ [handleSignal] PeerConnection not ready, queueing signal');
      setTimeout(() => handleSignal(signal), 200);
      return;
    }

    try {
      console.log('📥 [handleSignal] Processing signal:', {
        type: signal.signal_type,
        version: signal.signal_data?.version || 'no-version'
      });

      if (signal.signal_type === 'offer') {
        console.log('📞 [handleSignal] Received OFFER');
        
        if (signal.signal_data?.version) {
          signalVersionRef.current = signal.signal_data.version;
        }
        
        const currentRemote = pc.remoteDescription;
        if (!currentRemote || currentRemote.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
          
          // CRITICAL FIX: Process ALL pending ICE candidates after remote description is set
          console.log('📞 Processing', pendingIceCandidatesRef.current.length, 'pending ICE candidates');
          while (pendingIceCandidatesRef.current.length > 0) {
            const candidate = pendingIceCandidatesRef.current.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
              console.log('✅ Queued candidate added successfully');
            } catch (error) {
              console.error('❌ Failed to add queued candidate:', error);
            }
          }
          console.log('✅ All queued ICE candidates processed');

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          await sendSignal({
            type: 'answer',
            callId,
            data: { ...answer, version: signalVersionRef.current },
            to: partnerId
          });

          console.log('✅ ANSWER sent');
        }
        
      } else if (signal.signal_type === 'answer') {
        console.log('✅ [handleSignal] Received ANSWER');
        
        // CRITICAL: Clear the timeout since receiver answered!
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
          console.log('✅ Cleared call timeout - receiver answered!');
        }
        
        const signalVersion = signal.signal_data?.version || 0;
        if (signalVersion >= signalVersionRef.current) {
          if (pc.signalingState === 'have-local-offer' || pc.signalingState === 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
            
            // CRITICAL FIX: Process ALL pending ICE candidates after remote description is set
            console.log('✅ Processing', pendingIceCandidatesRef.current.length, 'pending ICE candidates');
            while (pendingIceCandidatesRef.current.length > 0) {
              const candidate = pendingIceCandidatesRef.current.shift();
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('✅ Queued candidate added successfully');
              } catch (error) {
                console.error('❌ Failed to add queued candidate:', error);
              }
            }
            console.log('✅ All queued ICE candidates processed');
            console.log('✅ Remote description set from ANSWER');
          }
        }
        
      } else if (signal.signal_type === 'ice-candidate') {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data));
        } else {
          pendingIceCandidatesRef.current.push(signal.signal_data);
        }
      }
    } catch (error) {
      console.error("❌ [handleSignal] Error:", error);
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
    
    // Unsubscribe from signals
    if ((window as any).__voiceCallSignalUnsubscribe) {
      (window as any).__voiceCallSignalUnsubscribe();
      delete (window as any).__voiceCallSignalUnsubscribe;
    }
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
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Top Status Bar - FaceTime style */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-8 left-0 right-0 flex justify-between items-center px-8 z-20"
      >
        <div className="bg-white/10 backdrop-blur-md rounded-full px-5 py-2">
          <span className="text-white/90 text-sm font-medium">
            {callStatus === "ringing" ? "Ringing..." : callStatus === "connected" ? formatDuration(callDuration) : "Connecting..."}
          </span>
        </div>
        
        {callStatus === "connected" && (
          <QualityIndicator quality={connectionQuality} />
        )}
      </motion.div>

      {/* Avatar - Center */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col items-center gap-8"
      >
        <Avatar className="h-48 w-48 border-4 border-white/20 shadow-2xl">
          <AvatarImage src={contactAvatar} className="object-cover" />
          <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-800 text-white text-6xl">
            {contactName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <h2 className="text-4xl font-semibold text-white">{contactName}</h2>
      </motion.div>

      {/* Bottom Controls - FaceTime style */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-8 z-20"
      >
        {/* Mute Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleAudio}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all",
            audioEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-red-500 hover:bg-red-600"
          )}
        >
          {audioEnabled ? <Mic className="h-7 w-7 text-white" /> : <MicOff className="h-7 w-7 text-white" />}
        </motion.button>

        {/* End Call Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={endCall}
          className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-2xl transition-all"
        >
          <PhoneOff className="h-8 w-8 text-white" />
        </motion.button>

        {/* Speaker Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleSpeaker}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all",
            speakerEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-800 hover:bg-gray-700"
          )}
        >
          {speakerEnabled ? <Volume2 className="h-7 w-7 text-white" /> : <VolumeX className="h-7 w-7 text-white" />}
        </motion.button>
      </motion.div>
    </div>
  );
}