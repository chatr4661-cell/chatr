import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { IncomingCallScreen } from "./IncomingCallScreen";
import UnifiedCallScreen from "./UnifiedCallScreen";

import { sendSignal } from "@/utils/webrtcSignaling";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { clearPreCallMediaStream, setPreCallMediaStream, takePreCallMediaStream } from "@/utils/preCallMedia";
// Native call state helpers - inlined to avoid module resolution issues
const isCallAcceptedByNative = (callId?: string): boolean => {
  const state = (window as any).__CALL_STATE__;
  if (!state?.accepted) return false;
  if (callId && state.callId !== callId) return false;
  console.log(`[NativeCall] Call ${callId?.slice(0, 8) || 'any'} already accepted by native`);
  return true;
};

const clearNativeCallState = (): void => {
  (window as any).__CALL_STATE__ = undefined;
  console.log('[NativeCall] Native call state cleared');
};

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
  
  // CRITICAL: Listen for native call acceptance event
  // This is dispatched by MainActivity when user answers via native UI
  useEffect(() => {
    // Listen for nativeCallAction events from MainActivity.handleAnswerCall()
    const handleNativeCallAction = async (event: CustomEvent) => {
      const { action, callId, callerId, callerName, callerAvatar, callType } = event.detail || {};
      console.log(`📱 [GlobalCallListener] nativeCallAction: ${action} for call ${callId?.slice(0, 8)}`);
      
      if (action === 'answer' && callId) {
        console.log('📱 [GlobalCallListener] Native answered call - starting WebRTC as receiver');
        
        // Dismiss any incoming UI
        setIncomingCall(null);
        
        // CRITICAL: Skip if we already have an active call for this ID
        if (activeCallRef.current?.id === callId) {
          console.log('📱 [GlobalCallListener] Already have active call, skipping');
          return;
        }
        
        // Pre-acquire media for the call
        try {
          const isVideo = callType === 'video';
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: isVideo 
          });
          setPreCallMediaStream(callId, stream);
        } catch (mediaErr) {
          console.warn('📱 [GlobalCallListener] Could not pre-acquire media:', mediaErr);
        }
        
        // Update call status to active (may already be done by native JS bridge, but ensure it)
        try {
          await supabase.from('calls')
            .update({ status: 'active', started_at: new Date().toISOString() })
            .eq('id', callId);
        } catch (dbErr) {
          console.warn('📱 [GlobalCallListener] Could not update call status:', dbErr);
        }
        
        // Start WebRTC as receiver (non-initiator)
        setActiveCall({
          id: callId,
          caller_id: callerId,
          call_type: callType || 'audio',
          isInitiator: false, // Receiver waits for offer
          partnerId: callerId,
          callerName: callerName || 'Unknown',
          callerAvatar: callerAvatar,
          preAcquiredStream: takePreCallMediaStream(callId),
        });
        
      } else if (action === 'reject' && callId) {
        console.log('📱 [GlobalCallListener] Native rejected call');
        setIncomingCall(null);
      }
    };
    
    // Also handle legacy chatr:native_call_accepted event
    const handleNativeCallAccepted = (event: CustomEvent<{ callId: string }>) => {
      const { callId } = event.detail;
      console.log(`📱 [GlobalCallListener] Native accepted call event: ${callId?.slice(0, 8)}`);
      
      const current = incomingCallRef.current;
      if (current && current.id === callId) {
        console.log('📱 [GlobalCallListener] Dismissing web incoming UI - native accepted');
        setIncomingCall(null);
      }
    };
    
    window.addEventListener('nativeCallAction', handleNativeCallAction as EventListener);
    window.addEventListener('chatr:native_call_accepted', handleNativeCallAccepted as EventListener);
    
    return () => {
      window.removeEventListener('nativeCallAction', handleNativeCallAction as EventListener);
      window.removeEventListener('chatr:native_call_accepted', handleNativeCallAccepted as EventListener);
    };
  }, []);
  
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

    // Call updates relevant to this receiver (ended/answered elsewhere)
    // NOTE: For native shell, WebRTC is started via nativeCallAction event instead
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

          // CRITICAL: Skip if we already have an active call - prevents duplicate WebRTC instances
          if (activeCallRef.current?.id === call.id) {
            console.log("📱 [GlobalCallListener] Already have active call for this ID, skipping");
            // But check if it was ended
            if (call.status === "ended" || call.status === "missed") {
              console.log("📵 [GlobalCallListener] Active call ended by partner (receiver side)");
              setActiveCall(null);
              toast.info("Call ended");
            }
            return;
          }

          // Handle call ended for any call we might be tracking
          const currentActive = activeCallRef.current;
          if (currentActive && call.id === currentActive.id) {
            if (call.status === "ended" || call.status === "missed") {
              console.log("📵 [GlobalCallListener] Active call ended by partner (receiver side)");
              setActiveCall(null);
              toast.info("Call ended");
              return;
            }
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

          // Start WebRTC immediately when caller initiates
          if (call.status === "ringing" && !activeCallRef.current) {
            const { data: receiverProfile } = await supabase
              .from("profiles")
              .select("username, avatar_url, phone_number")
              .eq("id", call.receiver_id)
              .maybeSingle();

            console.log("🚀 [GlobalCallListener] Starting WebRTC as INITIATOR");

            const preAcquiredStream = takePreCallMediaStream(call.id);

            setActiveCall({
              ...call,
              isInitiator: true,
              partnerId: call.receiver_id,
              callerName: receiverProfile?.username || call.receiver_name || "Unknown",
              callerAvatar: receiverProfile?.avatar_url || call.receiver_avatar,
              contactPhone: receiverProfile?.phone_number || call.receiver_phone,
              preAcquiredStream,
            });

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
          
          // FaceTime-style: Video signals no longer require acceptance dialog
          // WebRTC renegotiation handles video track exchange automatically
          // Legacy: Keep backward compatibility for old signals but don't show toasts
          if (signalData?.videoUpgradeRequest || signalData?.videoUpgradeAccepted) {
            console.log("📹 [GlobalCallListener] Partner enabled video via renegotiation");
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

  // GUARD: Block web accept if native already accepted
  const handleAnswer = async () => {
    if (!incomingCall) return;

    // CRITICAL: If native already accepted, skip - auto-join will handle it
    if (isCallAcceptedByNative(incomingCall.id)) {
      console.log('🚫 [GlobalCallListener] Web accept blocked - native already accepted');
      return;
    }

    try {
      // Acquire media under the user's gesture and hand it to the call UI.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.call_type === 'video',
      });

      setPreCallMediaStream(incomingCall.id, stream);

      await handleAnswerDirect();
    } catch (error: any) {
      console.error('Permission request failed:', error);
      if (incomingCall?.id) clearPreCallMediaStream(incomingCall.id);

      // Device busy: let user retry (do NOT auto-reject)
      if (error?.name === 'NotReadableError') {
        toast.error(incomingCall.call_type === 'video'
          ? 'Camera/microphone is busy. Close other apps and try again.'
          : 'Microphone is busy. Close other apps and try again.'
        );
        return;
      }

      // Simple, friendly messages for non-technical users
      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        toast.error(incomingCall.call_type === 'video'
          ? 'Please allow camera and microphone to answer video calls'
          : 'Please allow microphone to answer calls'
        );
      } else if (error?.name === 'NotFoundError') {
        toast.error(incomingCall.call_type === 'video'
          ? 'No camera or microphone found'
          : 'No microphone found'
        );
      } else {
        toast.error('Could not access device. Please try again.');
      }

      // CRITICAL: Do NOT auto-reject for permission errors
      // The user should be able to retry or manually end the call
      // Only reject if it's a hard "not found" error
      if (error?.name === 'NotFoundError') {
        await handleReject();
      }
    }
  };

  // Direct answer (used after media acquired or for auto-join)
  const handleAnswerDirect = async () => {
    if (!incomingCall) return;

    // CRITICAL: If native already accepted, skip DB update - native already did it
    const nativeAccepted = isCallAcceptedByNative(incomingCall.id);
    if (nativeAccepted) {
      console.log('✅ [GlobalCallListener] Auto-joining call (native accepted)');
    } else {
      console.log('✅ [GlobalCallListener] Answering call (web accept):', incomingCall.id);
    }

    const preAcquiredStream = takePreCallMediaStream(incomingCall.id);

    setActiveCall({
      ...incomingCall,
      isInitiator: false,
      partnerId: incomingCall.caller_id,
      preAcquiredStream,
    });
    setIncomingCall(null);

    // Only update DB if this is a web accept (not native auto-join)
    if (!nativeAccepted) {
      const { error } = await supabase
        .from("calls")
        .update({ status: "active", started_at: new Date().toISOString() })
        .eq("id", incomingCall.id);

      if (error) console.error("Failed to update call status:", error);
    }
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

    // Clear native call state when call ends
    clearNativeCallState();

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
  // CRITICAL: Only render when incoming AND no active call to ensure clean ringtone stop
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

  // Handle voice to video upgrade - FaceTime style (no acceptance needed)
  // The WebRTC renegotiation handles video automatically on both sides
  const handleUpgradeToVideo = async () => {
    if (!activeCall) {
      console.warn("⚠️ No active call to upgrade");
      return;
    }
    
    console.log("📹 FaceTime-style video upgrade for call:", activeCall.id);
    
    // Simply enable video flag - UnifiedCallScreen handles the rest via WebRTC renegotiation
    setActiveCall({ ...activeCall, videoEnabled: true });
    
    // Update database for record-keeping
    try {
      await supabase.from("calls").update({ call_type: 'video' }).eq("id", activeCall.id);
    } catch (e) {
      console.error("Failed to update call type:", e);
    }
  };

  // FaceTime-style: Accept/Decline no longer needed - video just works via WebRTC renegotiation

  // Show active call (both caller and receiver) - UNIFIED for voice and video
  if (activeCall) {
    const contactName = activeCall.isInitiator 
      ? activeCall.callerName 
      : activeCall.callerName;

    return (
      <UnifiedCallScreen
        callId={activeCall.id}
        contactName={contactName}
        contactAvatar={activeCall.callerAvatar}
        contactPhone={activeCall.caller_phone || activeCall.receiver_phone}
        isInitiator={activeCall.isInitiator}
        partnerId={activeCall.partnerId}
        callType={activeCall.call_type === 'video' ? 'video' : 'voice'}
        preAcquiredStream={activeCall.preAcquiredStream}
        onEnd={handleEndCall}
        onSwitchToVideo={handleUpgradeToVideo}
        videoEnabled={activeCall.videoEnabled}
      />
    );
  }

  return null;
}
