import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { IncomingCallScreen } from "./IncomingCallScreen";
import ProductionVideoCall from "./ProductionVideoCall";
import GSMStyleVoiceCall from "./GSMStyleVoiceCall";
import { useToast } from "@/hooks/use-toast";
import { sendSignal } from "@/utils/webrtcSignaling";
import { Capacitor } from "@capacitor/core";

// ARCHITECTURE: Skip web-based call handling when running inside native Android/iOS shell
// Native shell uses TelecomManager (Android) / CallKit (iOS) for incoming calls
const isNativeShell = () => Capacitor.isNativePlatform();

export function GlobalCallListener() {
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [outgoingCall, setOutgoingCall] = useState<any>(null); // NEW: Track outgoing calls (caller side)
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const incomingCallRef = useRef<any>(null);
  const outgoingCallRef = useRef<any>(null);
  
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);
  
  useEffect(() => {
    outgoingCallRef.current = outgoingCall;
  }, [outgoingCall]);

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

  // Subscribe once per logged-in user
  // CRITICAL: Skip subscription in native shell - native handles calls via TelecomManager/CallKit
  useEffect(() => {
    if (!userId) return;
    
    // Native shell uses FCM → TelecomManager/CallKit for incoming calls
    // Web listener would cause duplicate notifications
    if (isNativeShell()) {
      console.log("📱 [GlobalCallListener] Native shell detected - deferring to native call handling");
      return;
    }

    console.log("🔔 GlobalCallListener active for user:", userId);

    // Incoming calls (receiver side)
    const incomingChannel = supabase
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

    // Call updates relevant to this receiver (ended/answered elsewhere)
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
        (payload) => {
          const call = payload.new as any;
          const currentIncoming = incomingCallRef.current;

          if (!currentIncoming) return;
          if (call.id !== currentIncoming.id) return;

          if (call.status === "ended" || call.status === "missed") {
            console.log("📵 Incoming call cancelled by caller");
            setIncomingCall(null);
            toast({
              title: "Call Cancelled",
              description: "The caller cancelled the call",
            });
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

          if (call.status === "ringing") {
            const { data: receiverProfile } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", call.receiver_id)
              .maybeSingle();

            setOutgoingCall({
              ...call,
              receiverName: receiverProfile?.username || call.receiver_name || "Unknown",
              receiverAvatar: receiverProfile?.avatar_url || call.receiver_avatar,
            });
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

          console.log("📤 [GlobalCallListener] Outgoing call UPDATE:", call.id, "status:", call.status);

          if (!currentOutgoing || call.id !== currentOutgoing.id) return;

          // CRITICAL: Receiver accepted the call - start WebRTC as initiator!
          if (call.status === "active") {
            console.log("🎉 [GlobalCallListener] Call accepted by receiver! Starting WebRTC...");
            
            const { data: receiverProfile } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", call.receiver_id)
              .maybeSingle();

            setActiveCall({
              ...call,
              isInitiator: true, // Caller is the initiator
              partnerId: call.receiver_id,
              callerName: receiverProfile?.username || call.receiver_name || "Unknown",
              callerAvatar: receiverProfile?.avatar_url || call.receiver_avatar,
            });
            setOutgoingCall(null);
            
            toast({
              title: "Call Connected",
              description: `Connected with ${receiverProfile?.username || "Unknown"}`,
            });
          }

          // Receiver rejected, missed, or call ended
          if (call.status === "ended" || call.status === "rejected" || call.status === "missed") {
            console.log("📵 [GlobalCallListener] Outgoing call ended/rejected/missed, missed:", call.missed);
            setOutgoingCall(null);
            
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
            
            toast({ title, description });
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 outgoing-updates channel status:", status);
      });

    return () => {
      supabase.removeChannel(incomingChannel);
      supabase.removeChannel(updatesChannel);
      supabase.removeChannel(outgoingChannel);
      supabase.removeChannel(outgoingUpdatesChannel);
    };
  }, [userId, toast]);

  const handleAnswer = async () => {
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

    toast({
      title: "Call Declined",
      description: `Call from ${incomingCall.callerName} declined`,
    });
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

    toast({
      title: "Call Cancelled",
      description: "Call was cancelled",
    });
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
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-primary/20 to-background flex items-center justify-center">
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
        isInitiator={activeCall.isInitiator}
        partnerId={activeCall.partnerId}
        onEnd={handleEndCall}
      />
    );
  }

  return null;
}
