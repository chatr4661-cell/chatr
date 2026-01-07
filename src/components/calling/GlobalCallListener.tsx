import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { IncomingCallScreen } from "./IncomingCallScreen";
import ProductionVideoCall from "./ProductionVideoCall";
import GSMStyleVoiceCall from "./GSMStyleVoiceCall";

import { sendSignal } from "@/utils/webrtcSignaling";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";

// ARCHITECTURE: Skip web-based call handling when running inside native Android/iOS shell
// Native shell uses TelecomManager (Android) / CallKit (iOS) for incoming calls
const isNativeShell = () => Capacitor.isNativePlatform();

export function GlobalCallListener() {
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [outgoingCall, setOutgoingCall] = useState<any>(null); // NEW: Track outgoing calls (caller side)
  const [userId, setUserId] = useState<string | null>(null);

  const incomingCallRef = useRef<any>(null);
  const outgoingCallRef = useRef<any>(null);
  const activeCallRef = useRef<any>(null);
  
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);
  
  useEffect(() => {
    outgoingCallRef.current = outgoingCall;
  }, [outgoingCall]);
  
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // Track auth state (so this works on ALL screens and after refresh)
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Track if running in native shell
  const isNative = isNativeShell();
  
  // Subscribe once per logged-in user
  // CRITICAL: In native shell, skip INCOMING call notifications (handled by TelecomManager/CallKit)
  // But STILL subscribe to call STATUS updates for WebRTC signaling to work!
  useEffect(() => {
    if (!userId) return;
    
    console.log(`🔔 GlobalCallListener active for user: ${userId} (native: ${isNative})`);
    
    // Native shell: Skip incoming call INSERT listener (native TelecomManager shows incoming UI)
    // Web: Listen for incoming calls normally

    // Incoming calls (receiver side) - SKIP UI in native shell (TelecomManager shows it)
    let incomingChannel: any = null;
    if (!isNative) {
      incomingChannel = supabase
        .channel(`incoming-calls:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "calls",
            filter: `receiver_id=eq.${userId}`,
          },
          async (payload) => {
            const call = payload.new as any;
            console.log("📞 New call INSERT (receiver match):", call);

            if (call.status !== "ringing") return;

            const { data: callerProfile } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", call.caller_id)
              .maybeSingle();

            setIncomingCall({
              ...call,
              callerName: callerProfile?.username || call.caller_name || "Unknown",
              callerAvatar: callerProfile?.avatar_url || call.caller_avatar,
            });
          }
        )
        .subscribe((status) => {
          console.log("📡 incoming-calls channel status:", status);
        });
    }

    // Call updates relevant to this receiver (ended/answered elsewhere, OR native accepted)
    const updatesChannel = supabase
      .channel(`call-updates:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          const call = payload.new as any;
          console.log("📱 [GlobalCallListener] Receiver call UPDATE:", call.id, "status:", call.status);

          // If running in native shell and call becomes active, START WebRTC as receiver!
          if (isNative && call.status === "active" && !activeCallRef.current) {
            console.log("📱 [GlobalCallListener] Native accepted call - starting WebRTC as receiver");
            
            const { data: callerProfile } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", call.caller_id)
              .maybeSingle();

            setActiveCall({
              ...call,
              isInitiator: false, // Receiver is NOT initiator - will wait for offer
              partnerId: call.caller_id,
              callerName: callerProfile?.username || call.caller_name || "Unknown",
              callerAvatar: callerProfile?.avatar_url || call.caller_avatar,
            });
            return;
          }

          // Web mode: handle incoming call updates
          const currentIncoming = incomingCallRef.current;
          if (!currentIncoming) return;
          if (call.id !== currentIncoming.id) return;

          if (call.status === "ended" || call.status === "missed") {
            console.log("📵 Incoming call cancelled by caller");
            setIncomingCall(null);
            toast.info("Call cancelled by caller");
          }

          if (call.status === "active") {
            console.log("📱 Incoming call answered on another device");
            setIncomingCall(null);
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 call-updates channel status:", status);
      });

    // NEW: Outgoing calls (caller side) - listen for when receiver accepts
    const outgoingChannel = supabase
      .channel(`outgoing-calls:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "calls",
          filter: `caller_id=eq.${userId}`,
        },
        async (payload) => {
          const call = payload.new as any;
          console.log("📤 [GlobalCallListener] Outgoing call created:", call.id, "status:", call.status);

          // CRITICAL FIX: Start WebRTC IMMEDIATELY when caller initiates
          // Don't wait for receiver to accept - send OFFER right away
          if (call.status === "ringing" && !activeCallRef.current) {
            const { data: receiverProfile } = await supabase
              .from("profiles")
              .select("username, avatar_url, phone_number")
              .eq("id", call.receiver_id)
              .maybeSingle();

            console.log("🚀 [GlobalCallListener] Starting WebRTC immediately as INITIATOR");
            
            // Set activeCall directly with isInitiator=true to start WebRTC NOW
            setActiveCall({
              ...call,
              isInitiator: true, // CALLER sends OFFER immediately
              partnerId: call.receiver_id,
              callerName: receiverProfile?.username || call.receiver_name || "Unknown",
              callerAvatar: receiverProfile?.avatar_url || call.receiver_avatar,
              contactPhone: receiverProfile?.phone_number || call.receiver_phone,
            });
            
            // Clear any outgoing call state
            setOutgoingCall(null);
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 outgoing-calls channel status:", status);
      });

    // NEW: Listen for outgoing call status changes (accepted/rejected/ended)
    const outgoingUpdatesChannel = supabase
      .channel(`outgoing-updates:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `caller_id=eq.${userId}`,
        },
        async (payload) => {
          const call = payload.new as any;
          const currentOutgoing = outgoingCallRef.current;
          const currentActive = activeCallRef.current;

          console.log("📤 [GlobalCallListener] Outgoing call UPDATE:", call.id, "status:", call.status);

          // If we already have an activeCall for this call, no need to reinitialize
          if (currentActive && call.id === currentActive.id) {
            console.log("📤 [GlobalCallListener] Call already active, ignoring update");
            return;
          }

          // Receiver rejected, missed, or call ended
          if (call.status === "ended" || call.status === "rejected" || call.status === "missed") {
            console.log("📵 [GlobalCallListener] Outgoing call ended/rejected/missed");
            setOutgoingCall(null);
            
            // Also clear activeCall if it matches
            if (currentActive && call.id === currentActive.id) {
              setActiveCall(null);
            }
            
            // Show appropriate message based on the actual outcome
            let title = "Call Ended";
            let description = "Call ended";
            
            if (call.status === "rejected" || call.missed === false) {
              title = "Call Declined";
              description = "The call was declined";
            } else if (call.missed === true) {
              title = "No Answer";
              description = "The call was not answered";
            }
            
            toast.info(description);
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 outgoing-updates channel status:", status);
      });

    // NEW: Listen for video upgrade signals via webrtc_signals table
    const videoUpgradeChannel = supabase
      .channel(`video-upgrade:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "webrtc_signals",
          filter: `to_user=eq.${userId}`,
        },
        (payload) => {
          const signal = payload.new as any;
          const signalData = signal.signal_data;
          
          console.log("📡 [GlobalCallListener] Received signal:", signalData);
          
          // Handle video upgrade request
          if (signalData?.videoUpgradeRequest) {
            console.log("📹 [GlobalCallListener] Video upgrade request received!");
            setActiveCall((prev: any) => prev ? { ...prev, incomingVideoRequest: true, videoRequestFrom: signal.from_user } : prev);
            
            toast.info("📹 Partner wants to switch to video call");
          }
          
          // Handle video upgrade accepted
          if (signalData?.videoUpgradeAccepted) {
            console.log("✅ [GlobalCallListener] Video upgrade accepted!");

            // IMPORTANT: do NOT switch call components by changing call_type in local state.
            // Keep the existing RTCPeerConnection alive and let GSMStyleVoiceCall add a video track.
            setActiveCall((prev: any) =>
              prev
                ? {
                    ...prev,
                    videoEnabled: true,
                    pendingVideoUpgrade: false,
                    incomingVideoRequest: false,
                  }
                : prev
            );

            // Update database for record-keeping only
            supabase.from("calls").update({ call_type: 'video' }).eq("id", signal.call_id);

            toast.success("Video is now active");
          }
          
          // Handle video upgrade declined
          if (signalData?.videoUpgradeDeclined) {
            console.log("❌ [GlobalCallListener] Video upgrade declined");
            setActiveCall((prev: any) => prev ? { ...prev, pendingVideoUpgrade: false } : prev);
            
            toast.info("Partner declined video request");
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 video-upgrade channel status:", status);
      });

    return () => {
      if (incomingChannel) supabase.removeChannel(incomingChannel);
      supabase.removeChannel(updatesChannel);
      supabase.removeChannel(outgoingChannel);
      supabase.removeChannel(outgoingUpdatesChannel);
      supabase.removeChannel(videoUpgradeChannel);
    };
  }, [userId, toast, isNative]);

  // Auto-request permissions silently when answering a call
  const handleAnswer = async () => {
    if (!incomingCall) return;

    try {
      // Auto-request permission - browser shows native prompt
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.call_type === 'video'
      });
      // Stop tracks immediately (WebRTC will create new ones)
      stream.getTracks().forEach(track => track.stop());
      
      // Permission granted, proceed with answering
      await handleAnswerDirect();
    } catch (error: any) {
      console.error('Permission request failed:', error);
      
      // Simple, friendly messages for non-technical users
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error(incomingCall.call_type === 'video' 
          ? 'Please allow camera and microphone to answer video calls' 
          : 'Please allow microphone to answer calls'
        );
      } else if (error.name === 'NotFoundError') {
        toast.error(incomingCall.call_type === 'video'
          ? 'No camera or microphone found'
          : 'No microphone found'
        );
      } else {
        toast.error('Could not access device. Please try again.');
      }
      // Reject the call if permission denied
      await handleReject();
    }
  };

  const handleAnswerDirect = async () => {
    if (!incomingCall) return;

    console.log("✅ Answering call:", incomingCall.id);

    setActiveCall({
      ...incomingCall,
      isInitiator: false,
      partnerId: incomingCall.caller_id,
    });
    setIncomingCall(null);

    const { error } = await supabase
      .from("calls")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", incomingCall.id);

    if (error) console.error("Failed to update call status:", error);
  };

  const handleReject = async () => {
    if (!incomingCall) return;

    console.log("❌ Rejecting call:", incomingCall.id);

    await supabase
      .from("calls")
      .update({ status: "ended", ended_at: new Date().toISOString(), missed: false })
      .eq("id", incomingCall.id);

    try {
      await sendSignal({
        type: "answer" as any,
        callId: incomingCall.id,
        data: { rejected: true },
        to: incomingCall.caller_id,
      });
    } catch (error) {
      console.error("Failed to send reject signal:", error);
    }

    setIncomingCall(null);

    toast.info(`Call from ${incomingCall.callerName} declined`);
  };

  // NEW: Cancel outgoing call
  const handleCancelOutgoing = async () => {
    if (!outgoingCall) return;

    console.log("❌ Cancelling outgoing call:", outgoingCall.id);

    await supabase
      .from("calls")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", outgoingCall.id);

    setOutgoingCall(null);

    toast.info("Call was cancelled");
  };

  const handleEndCall = async () => {
    if (!activeCall) return;

    console.log("📵 Ending active call:", activeCall.id);

    await supabase
      .from("calls")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", activeCall.id);

    try {
      await sendSignal({
        type: "answer" as any,
        callId: activeCall.id,
        data: { ended: true },
        to: activeCall.partnerId,
      });
    } catch (error) {
      console.error("Failed to send end signal:", error);
    }

    setActiveCall(null);
  };

  // Show incoming call screen (receiver side)
  if (incomingCall && !activeCall) {
    return (
      <IncomingCallScreen
        callerName={incomingCall.callerName}
        callerAvatar={incomingCall.callerAvatar}
        callType={incomingCall.call_type}
        onAnswer={handleAnswer}
        onReject={handleReject}
        ringtoneUrl="/ringtone.mp3"
      />
    );
  }

  // NEW: Show outgoing call screen (caller side - waiting for receiver to accept)
  if (outgoingCall && !activeCall) {
    return (
      <div 
        className="fixed inset-0 z-[99999] bg-gradient-to-b from-primary/20 to-background flex items-center justify-center select-none touch-none"
        style={{ 
          height: '100dvh', 
          width: '100vw',
          minHeight: '-webkit-fill-available',
          isolation: 'isolate',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-6 p-8 animate-pulse">
          <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center shadow-2xl">
            {outgoingCall.receiverAvatar ? (
              <img 
                src={outgoingCall.receiverAvatar} 
                alt={outgoingCall.receiverName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-5xl">{outgoingCall.receiverName?.[0]?.toUpperCase() || '?'}</span>
            )}
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">{outgoingCall.receiverName}</h2>
            <p className="text-muted-foreground">
              {outgoingCall.call_type === 'video' ? '📹 Video calling...' : '📞 Calling...'}
            </p>
          </div>
          <button
            onClick={handleCancelOutgoing}
            className="mt-4 px-8 py-3 bg-destructive text-destructive-foreground rounded-full font-medium shadow-lg hover:bg-destructive/90 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Handle voice to video upgrade - send request to partner
  const handleUpgradeToVideo = async () => {
    if (!activeCall) {
      console.warn("⚠️ No active call to upgrade");
      return;
    }
    
    console.log("📹 Requesting video upgrade for call:", activeCall.id);
    
    // Send upgrade request signal to partner
    try {
      await sendSignal({
        type: "answer" as any, // Using answer type for signaling
        callId: activeCall.id,
        data: { videoUpgradeRequest: true, requestedBy: userId },
        to: activeCall.partnerId,
      });
      
      toast.info(`Waiting for ${activeCall.callerName} to accept video...`);
      
      // Store pending upgrade request
      setActiveCall({ ...activeCall, pendingVideoUpgrade: true });
    } catch (error) {
      console.error("Failed to send video upgrade request:", error);
      toast.error("Could not send video request");
    }
  };

  // Accept video upgrade from partner
  const handleAcceptVideoUpgrade = async () => {
    if (!activeCall) return;
    
    console.log("✅ Accepting video upgrade for call:", activeCall.id);
    
    // Update call type in database (for record keeping only)
    await supabase
      .from("calls")
      .update({ call_type: 'video' })
      .eq("id", activeCall.id);
    
    // Send acceptance signal
    try {
      await sendSignal({
        type: "answer" as any,
        callId: activeCall.id,
        data: { videoUpgradeAccepted: true },
        to: activeCall.partnerId,
      });
    } catch (e) {
      console.error("Failed to send upgrade acceptance:", e);
    }
    
    // CRITICAL: Set videoEnabled flag instead of changing call_type
    // This tells GSMStyleVoiceCall to add video WITHOUT switching components
    setActiveCall({ 
      ...activeCall, 
      videoEnabled: true, 
      pendingVideoUpgrade: false, 
      incomingVideoRequest: false 
    });
  };

  // Decline video upgrade
  const handleDeclineVideoUpgrade = async () => {
    if (!activeCall) return;
    
    console.log("❌ Declining video upgrade for call:", activeCall.id);
    
    try {
      await sendSignal({
        type: "answer" as any,
        callId: activeCall.id,
        data: { videoUpgradeDeclined: true },
        to: activeCall.partnerId,
      });
    } catch (e) {
      console.error("Failed to send decline signal:", e);
    }
    
    setActiveCall({ ...activeCall, incomingVideoRequest: false });
    
    toast.info("Continuing with voice call");
  };
  // Show active call (both caller and receiver)
  if (activeCall) {
    const contactName = activeCall.isInitiator 
      ? activeCall.callerName 
      : activeCall.callerName;
      
    if (activeCall.call_type === "video") {
      return (
        <ProductionVideoCall
          callId={activeCall.id}
          contactName={contactName}
          isInitiator={activeCall.isInitiator}
          partnerId={activeCall.partnerId}
          onEnd={handleEndCall}
        />
      );
    }

    return (
      <GSMStyleVoiceCall
        callId={activeCall.id}
        contactName={contactName}
        contactAvatar={activeCall.callerAvatar}
        contactPhone={activeCall.caller_phone || activeCall.receiver_phone}
        isInitiator={activeCall.isInitiator}
        partnerId={activeCall.partnerId}
        onEnd={handleEndCall}
        onSwitchToVideo={handleUpgradeToVideo}
        onAcceptVideoUpgrade={handleAcceptVideoUpgrade}
        onDeclineVideoUpgrade={handleDeclineVideoUpgrade}
        isIncoming={!activeCall.isInitiator}
        incomingVideoRequest={activeCall.incomingVideoRequest}
        pendingVideoUpgrade={activeCall.pendingVideoUpgrade}
        videoEnabled={activeCall.videoEnabled}
      />
    );
  }

  return null;
}
