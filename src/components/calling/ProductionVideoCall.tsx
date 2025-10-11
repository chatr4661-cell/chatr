import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, VideoOff, Mic, MicOff, PhoneOff, SwitchCamera, Monitor, MonitorOff, UserPlus, Maximize2, Minimize2, Wand2, PictureInPicture2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendSignal, subscribeToCallSignals, getTurnConfig } from "@/utils/webrtcSignaling";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";
import { getOptimalVideoConstraints, getOptimalAudioConstraints, setBandwidth, setPreferredCodec, QUALITY_PRESETS } from "@/utils/videoQualityManager";
import { useNetworkStats } from "@/hooks/useNetworkStats";
import { useCallUI } from "@/hooks/useCallUI";
import { useCallHaptics } from "@/hooks/useCallHaptics";
import { usePictureInPicture } from "@/hooks/usePictureInPicture";
import { DraggableVideoWindow } from "./DraggableVideoWindow";
import { CallStateTransition } from "./CallStateTransition";
import { QualityIndicator } from "./QualityIndicator";
import { VideoEffectsPanel } from "./VideoEffectsPanel";
import { CallMediaCapture } from "./CallMediaCapture";
import { motion, AnimatePresence } from "framer-motion";
import { VIDEO_EFFECTS } from "@/utils/videoEffects";

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
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const [currentEffect, setCurrentEffect] = useState("none");
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  
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

  const { trigger: triggerHaptic } = useCallHaptics();
  
  const { isPiPActive, isPiPSupported, togglePiP: toggleBrowserPiP } = usePictureInPicture({
    videoRef: remoteVideoRef,
    enabled: true
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
      console.log('🎥 [ProductionVideoCall] Initializing call...', { callId, contactName, isInitiator, partnerId });
      setCallStatus(isInitiator ? "dialing" : "ringing");
      
      // Request camera and microphone permissions
      console.log('📷 Requesting media permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });
      
      console.log('✅ Media stream obtained:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log('✅ Local video ref set');
      }

      // Get ICE/TURN servers
      console.log('🔧 Fetching TURN config...');
      const iceServers = await getTurnConfig();
      console.log('🔧 ICE servers:', iceServers.length, 'servers configured');

      const pc = new RTCPeerConnection({
        iceServers,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });
      
      peerConnectionRef.current = pc;
      console.log('✅ PeerConnection created');

      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        console.log(`➕ Adding ${track.kind} track to peer connection`);
        pc.addTrack(track, stream);
      });

      // Handle incoming remote stream
      pc.ontrack = (event) => {
        console.log('📺 [ontrack] Received remote track:', event.track.kind);
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          console.log('✅ Remote video ref set');
        }
        setCallStatus("connected");
        console.log('✅ Call connected!');
      };

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('📡 [onicecandidate] Sending ICE candidate');
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
          console.log('📡 All ICE candidates sent');
        }
      };

      // Monitor ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log('❄️ [ICE state]:', pc.iceConnectionState);
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log('🔗 [Connection state]:', pc.connectionState);
        
        if (pc.connectionState === "connected") {
          setCallStatus("connected");
          setConnectionQuality("excellent");
          console.log('✅ WebRTC connection established!');
        } else if (pc.connectionState === "failed") {
          setCallStatus("reconnecting");
          setConnectionQuality("reconnecting");
          console.log('🔄 Connection failed, attempting ICE restart...');
          pc.restartIce();
        } else if (pc.connectionState === "disconnected") {
          setCallStatus("reconnecting");
          setConnectionQuality("reconnecting");
          console.log('⚠️ Connection disconnected');
        }
      };

      // Create and send offer if initiator
      if (isInitiator) {
        console.log('📞 [Initiator] Creating offer...');
        const offer = await pc.createOffer({
          offerToReceiveVideo: true,
          offerToReceiveAudio: true
        });
        await pc.setLocalDescription(offer);
        console.log('📞 Local description set');
        
        console.log('📤 Sending offer signal...');
        try {
          await sendSignal({
            type: 'offer',
            callId,
            data: offer,
            to: partnerId
          });
          console.log('✅ Offer sent successfully');
        } catch (error) {
          console.error('❌ Failed to send offer:', error);
          throw error;
        }
      }

    } catch (error: any) {
      console.error("❌ [ProductionVideoCall] Error initializing call:", error);
      toast({
        title: "Call initialization failed",
        description: error.message || "Failed to start video call. Please check camera/microphone permissions.",
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

  const toggleVideo = async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setVideoEnabled(videoTrack.enabled);
      await triggerHaptic(videoTrack.enabled ? 'unmute' : 'mute');
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
        video: getOptimalVideoConstraints('ultra', facingMode)
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
    if (!localStream) return;
    
    setIsSwitchingCamera(true);
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    
    try {
      // Stop current video track first
      const oldVideoTrack = localStream.getVideoTracks()[0];
      if (oldVideoTrack) {
        oldVideoTrack.stop();
      }

      // Get new stream with switched camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: newFacingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60, min: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      const newAudioTrack = newStream.getAudioTracks()[0];
      
      // Replace tracks in peer connection
      const videoSender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
      const audioSender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'audio');
      
      if (videoSender && newVideoTrack) {
        await videoSender.replaceTrack(newVideoTrack);
      }
      
      if (audioSender && newAudioTrack) {
        await audioSender.replaceTrack(newAudioTrack);
      }

      // Update local stream
      setLocalStream(newStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }
      setFacingMode(newFacingMode);
      setIsSwitchingCamera(false);
      
      await triggerHaptic('cameraSwitch');
      
      toast({
        title: `Switched to ${newFacingMode === 'user' ? 'front' : 'back'} camera`,
      });
    } catch (error) {
      console.error("Error switching camera:", error);
      setIsSwitchingCamera(false);
      await triggerHaptic('error');
      toast({
        title: "Camera switch failed",
        description: "Camera not available",
        variant: "destructive"
      });
    }
  };

  const togglePiP = () => {
    setIsPiPMode(!isPiPMode);
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

      {/* Status Badge - FaceTime style (top left) */}
      <AnimatePresence>
        {callStatus === "connected" && controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute top-6 left-6 z-10"
          >
            <div className="bg-white/10 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                connectionQuality === "excellent" && "bg-green-400",
                connectionQuality === "good" && "bg-yellow-400",
                connectionQuality === "poor" && "bg-red-400",
                connectionQuality === "reconnecting" && "bg-orange-400 animate-pulse"
              )} />
              <span className="text-white/90 text-sm font-medium">
                {formatDuration(callDuration)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remote Video (Full Screen) - FaceTime black background */}
      <div className="flex-1 relative bg-black">
        <motion.video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
          initial={{ opacity: 0 }}
          animate={{ opacity: callStatus === 'connected' ? 1 : 0.3 }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Local Video - FaceTime style rounded rectangle (top right) */}
      {!isPiPMode && !isPiPActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: 100 }}
          animate={{ 
            opacity: isSwitchingCamera ? 0 : 1, 
            scale: isSwitchingCamera ? 0.8 : 1,
            x: 0
          }}
          transition={{ type: "spring", damping: 20 }}
          className="absolute top-20 right-6 w-32 h-44 rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl z-10"
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
          {!videoEnabled && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <VideoOff className="h-8 w-8 text-white/50" />
            </div>
          )}
        </motion.div>
      )}

      {/* Camera Switch - Bottom left corner (FaceTime style) */}
      {videoEnabled && !isScreenSharing && controlsVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute bottom-8 left-6 z-20"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={switchCamera}
            disabled={isSwitchingCamera}
            className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg transition-all disabled:opacity-50"
            title={facingMode === 'user' ? 'Switch to Back Camera' : 'Switch to Front Camera'}
          >
            <SwitchCamera className={cn("h-5 w-5 text-white", isSwitchingCamera && "animate-spin")} />
          </motion.button>
        </motion.div>
      )}

      {/* FaceTime-style Bottom Controls */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute bottom-8 left-0 right-0 z-10 px-6"
          >
            {/* Primary Controls - FaceTime style */}
            <div className="flex items-center justify-center gap-6 mb-6">
              {/* Video Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleVideo}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all backdrop-blur-md",
                  videoEnabled 
                    ? "bg-white/20 hover:bg-white/30 border-2 border-white/30" 
                    : "bg-red-500 hover:bg-red-600"
                )}
              >
                {videoEnabled ? 
                  <Video className="h-7 w-7 text-white" /> : 
                  <VideoOff className="h-7 w-7 text-white" />
                }
              </motion.button>
              
              {/* Audio Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleAudio}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all backdrop-blur-md",
                  audioEnabled 
                    ? "bg-white/20 hover:bg-white/30 border-2 border-white/30" 
                    : "bg-red-500 hover:bg-red-600"
                )}
              >
                {audioEnabled ? 
                  <Mic className="h-7 w-7 text-white" /> : 
                  <MicOff className="h-7 w-7 text-white" />
                }
              </motion.button>

              {/* End Call - Red button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-2xl transition-all"
              >
                <PhoneOff className="h-7 w-7 text-white" />
              </motion.button>

              {/* Effects */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowEffectsPanel(!showEffectsPanel)}
                className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border-2 border-white/30 flex items-center justify-center shadow-2xl transition-all"
              >
                <Wand2 className="h-7 w-7 text-white" />
              </motion.button>
            </div>

            {/* Secondary Controls - Smaller icons */}
            <div className="flex items-center justify-center gap-6">
              <CallMediaCapture videoRef={remoteVideoRef} />

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg transition-all"
                title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
              >
                {isScreenSharing ? 
                  <MonitorOff className="h-5 w-5 text-white" /> : 
                  <Monitor className="h-5 w-5 text-white" />
                }
              </motion.button>

              {isPiPSupported && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleBrowserPiP}
                  className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg transition-all"
                  title="Picture in Picture"
                >
                  <PictureInPicture2 className="h-5 w-5 text-white" />
                </motion.button>
              )}

              {onAddParticipant && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onAddParticipant}
                  className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg transition-all"
                  title="Add Participant"
                >
                  <UserPlus className="h-5 w-5 text-white" />
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Effects Panel */}
      <VideoEffectsPanel
        isOpen={showEffectsPanel}
        onClose={() => setShowEffectsPanel(false)}
        currentEffect={currentEffect}
        onEffectChange={(effectId) => {
          setCurrentEffect(effectId);
          triggerHaptic('success');
        }}
      />
    </div>
  );
}