import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, VideoOff, Mic, MicOff, PhoneOff, SwitchCamera } from "lucide-react";
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
    
    return () => {
      cleanup();
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
    let callTimeout: NodeJS.Timeout | null = null;
    
    try {
      console.log('🎥 [ProductionVideoCall] Initializing call...', { callId, contactName, isInitiator, partnerId });
      setCallStatus(isInitiator ? "connecting" : "ringing");
      
      // Set call timeout - 45 seconds for faster timeout
      if (isInitiator) {
        callTimeout = setTimeout(() => {
          if (callStatus === 'connecting' || callStatus === 'ringing') {
            console.warn('⏰ Call timed out - no answer');
            toast({
              title: "Call Timeout",
              description: "No answer - call ended",
              variant: "destructive"
            });
            endCall();
          }
        }, 45000);
      }
      
      // Request camera and microphone permissions with optimized constraints
      console.log('📷 Requesting media permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: {
          echoCancellation: { ideal: true, exact: true },
          noiseSuppression: { ideal: true, exact: true },
          autoGainControl: { ideal: true },
          sampleRate: 48000
        }
      });
      
      console.log('✅ Media stream obtained:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Mute local to prevent feedback
        localVideoRef.current.play().catch(e => console.log('Local video play:', e));
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

      // Handle incoming remote stream - INSTANT CONNECTION
      pc.ontrack = (event) => {
        console.log('📺 [ontrack] Received remote track:', event.track.kind);
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          // CRITICAL: Instant video playback
          remoteVideoRef.current.play().then(() => {
            console.log('✅ Remote video playing instantly!');
            setCallStatus("connected");
            triggerHaptic('success');
          }).catch(err => {
            console.error('❌ Remote video play failed:', err);
            // Immediate retry
            setTimeout(() => {
              remoteVideoRef.current?.play().then(() => {
                setCallStatus("connected");
              });
            }, 50);
          });
          console.log('✅ Remote video ref set');
        }
        console.log('✅ Call connected!');
      };

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('📡 [onicecandidate] Sending ICE candidate:', {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex
          });
          try {
            await sendSignal({
              type: 'ice-candidate',
              callId,
              data: event.candidate,
              to: partnerId
            });
            console.log('✅ ICE candidate sent successfully');
          } catch (error) {
            console.error('❌ Failed to send ICE candidate:', error);
          }
        } else {
          console.log('📡 ✅ All ICE candidates sent (null candidate received)');
        }
      };

      // Monitor ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log('❄️ [ICE Connection State]:', pc.iceConnectionState);
        console.log('   Local Description:', pc.localDescription ? 'SET' : 'NOT SET');
        console.log('   Remote Description:', pc.remoteDescription ? 'SET' : 'NOT SET');
        
        if (pc.iceConnectionState === 'failed') {
          console.error('❌ ICE connection failed - attempting restart');
          pc.restartIce();
        } else if (pc.iceConnectionState === 'connected') {
          console.log('✅ ICE connection established!');
        } else if (pc.iceConnectionState === 'completed') {
          console.log('✅ ICE gathering complete!');
        }
      };

      // Monitor connection state with auto-recovery
      pc.onconnectionstatechange = () => {
        console.log('🔗 [WebRTC Connection State]:', pc.connectionState);
        console.log('   ICE Gathering:', pc.iceGatheringState);
        console.log('   Signaling State:', pc.signalingState);
        
        if (pc.connectionState === "connected") {
          setCallStatus("connected");
          setConnectionQuality("excellent");
          console.log('✅ ✅ ✅ WebRTC P2P connection established!');
        } else if (pc.connectionState === "failed") {
          setCallStatus("reconnecting");
          setConnectionQuality("reconnecting");
          console.warn('⚠️ Connection failed, attempting ICE restart...');
          
          // Auto-recovery: restart ICE immediately
          setTimeout(async () => {
            if (pc.connectionState === "failed" && isInitiator) {
              try {
                const offer = await pc.createOffer({ iceRestart: true });
                await pc.setLocalDescription(offer);
                await sendSignal({ type: 'offer', callId, data: offer, to: partnerId });
                console.log('🔄 ICE restart initiated');
              } catch (e) {
                console.error('❌ ICE restart failed:', e);
              }
            }
          }, 1000);
        } else if (pc.connectionState === "disconnected") {
          setCallStatus("reconnecting");
          setConnectionQuality("reconnecting");
          console.warn('⚠️ Connection disconnected - waiting for reconnection...');
          
          // Give it 5 seconds to reconnect, then force restart
          setTimeout(() => {
            if (pc.connectionState === "disconnected") {
              console.warn('🔄 Still disconnected, forcing ICE restart');
              pc.restartIce();
            }
          }, 5000);
        } else if (pc.connectionState === "closed") {
          console.log('📴 Connection closed');
        }
      };

      // **CRITICAL FIX**: Load past signals BEFORE subscribing to new ones
      console.log('📥 Loading past signals for receiver...');
      const { getSignals, deleteProcessedSignals } = await import('@/utils/webrtcSignaling');
      const pastSignals = await getSignals(callId, isInitiator ? partnerId : (await supabase.auth.getUser()).data.user?.id || '');
      
      if (pastSignals.length > 0) {
        console.log(`📥 Processing ${pastSignals.length} past signals`);
        for (const signal of pastSignals) {
          await handleSignal(signal);
        }
        // Clean up processed signals
        await deleteProcessedSignals(callId, isInitiator ? partnerId : (await supabase.auth.getUser()).data.user?.id || '');
      }

      // Subscribe to future signals
      console.log('📡 Subscribing to future signals...');
      const { subscribeToCallSignals } = await import('@/utils/webrtcSignaling');
      const unsubscribe = subscribeToCallSignals(callId, handleSignal);
      
      // Store unsubscribe function for cleanup
      (window as any).__callSignalUnsubscribe = unsubscribe;

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
    if (!pc) {
      console.warn('⚠️ [handleSignal] PeerConnection not initialized, queueing signal');
      // Queue signal for when PC is ready
      setTimeout(() => handleSignal(signal), 200);
      return;
    }

    try {
      console.log('📥 [handleSignal] Processing signal:', {
        type: signal.signal_type,
        from: signal.from_user,
        signalingState: pc.signalingState,
        iceConnectionState: pc.iceConnectionState
      });

      if (signal.signal_type === 'offer') {
        console.log('📞 [handleSignal] Received OFFER - setting as remote description');
        
        // CRITICAL: Set remote description first
        await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
        console.log('✅ Remote description set from OFFER');
        
        // CRITICAL: Create answer immediately
        console.log('📝 [handleSignal] Creating ANSWER...');
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('✅ Local description set (ANSWER)');
        
        // CRITICAL: Send answer back to caller
        console.log('📤 [handleSignal] Sending ANSWER signal...');
        await sendSignal({
          type: 'answer',
          callId,
          data: answer,
          to: partnerId
        });
        console.log('✅ ANSWER sent successfully - connection should establish');
        
      } else if (signal.signal_type === 'answer') {
        console.log('✅ [handleSignal] Received ANSWER - setting as remote description');
        
        // Only set if we don't already have remote description
        if (!pc.remoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
          console.log('✅ Remote description set from ANSWER - P2P connection should complete');
        } else {
          console.log('ℹ️ Remote description already set, skipping');
        }
        
      } else if (signal.signal_type === 'ice-candidate') {
        // Queue if remote description not set yet
        if (!pc.remoteDescription) {
          console.warn('⚠️ [handleSignal] Remote description not set - queueing ICE candidate');
          setTimeout(() => handleSignal(signal), 200);
          return;
        }
        
        console.log('❄️ [handleSignal] Adding ICE candidate');
        await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data));
        console.log('✅ ICE candidate added successfully');
      }
    } catch (error) {
      console.error("❌ [handleSignal] Error processing signal:", {
        type: signal.signal_type,
        error,
        signalingState: pc?.signalingState,
        iceConnectionState: pc?.iceConnectionState
      });
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
    
    // Unsubscribe from signals
    if ((window as any).__callSignalUnsubscribe) {
      (window as any).__callSignalUnsubscribe();
      delete (window as any).__callSignalUnsubscribe;
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
    <div 
      className="fixed inset-0 z-50 bg-black flex flex-col"
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
      {!isPiPActive && (
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
      {videoEnabled && controlsVisible && (
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
            {/* Primary Controls - FaceTime style (minimal) */}
            <div className="flex items-center justify-center gap-8">
              {/* Video Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleVideo}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all",
                  videoEnabled 
                    ? "bg-gray-700 hover:bg-gray-600" 
                    : "bg-red-500 hover:bg-red-600"
                )}
              >
                {videoEnabled ? 
                  <Video className="h-7 w-7 text-white" /> : 
                  <VideoOff className="h-7 w-7 text-white" />
                }
              </motion.button>
              
              {/* End Call - Red button (larger) */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={endCall}
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-2xl transition-all"
              >
                <PhoneOff className="h-8 w-8 text-white" />
              </motion.button>

              {/* Audio Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleAudio}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all",
                  audioEnabled 
                    ? "bg-gray-700 hover:bg-gray-600" 
                    : "bg-red-500 hover:bg-red-600"
                )}
              >
                {audioEnabled ? 
                  <Mic className="h-7 w-7 text-white" /> : 
                  <MicOff className="h-7 w-7 text-white" />
                }
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}