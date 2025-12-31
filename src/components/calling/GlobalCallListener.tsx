import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { IncomingCallScreen } from "./IncomingCallScreen";
import ProductionVideoCall from "./ProductionVideoCall";
import ProductionVoiceCall from "./ProductionVoiceCall";
import { useToast } from "@/hooks/use-toast";
import { sendSignal } from "@/utils/webrtcSignaling";
import { Capacitor } from "@capacitor/core";

// ARCHITECTURE: Skip web-based call handling when running inside native Android/iOS shell
// Native shell uses TelecomManager (Android) / CallKit (iOS) for incoming calls
const isNativeShell = () => Capacitor.isNativePlatform();

export function GlobalCallListener() {
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const incomingCallRef = useRef<any>(null);
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

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
          // IMPORTANT: use only supported filter ops (eq)
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          const call = payload.new as any;
          console.log("📞 New call INSERT (receiver match):", call);

          if (call.status !== "ringing") return;

          // Fetch caller profile (best-effort)
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

          if (call.status === "ended") {
            console.log("📵 Incoming call ended by caller");
            setIncomingCall(null);
            toast({
              title: "Call Ended",
              description: "The caller ended the call",
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

    return () => {
      supabase.removeChannel(incomingChannel);
      supabase.removeChannel(updatesChannel);
    };
  }, [userId, toast]);

  const handleAnswer = async () => {
    if (!incomingCall) return;

    console.log("✅ Answering call:", incomingCall.id);

    // Instant UI response
    setActiveCall({
      ...incomingCall,
      isInitiator: false,
      partnerId: incomingCall.caller_id,
    });
    setIncomingCall(null);

    // Update call status in background
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

  if (activeCall) {
    if (activeCall.call_type === "video") {
      return (
        <ProductionVideoCall
          callId={activeCall.id}
          contactName={activeCall.callerName}
          isInitiator={activeCall.isInitiator}
          partnerId={activeCall.partnerId}
          onEnd={handleEndCall}
        />
      );
    }

    return (
      <ProductionVoiceCall
        callId={activeCall.id}
        contactName={activeCall.callerName}
        isInitiator={activeCall.isInitiator}
        partnerId={activeCall.partnerId}
        onEnd={handleEndCall}
      />
    );
  }

  return null;
}
