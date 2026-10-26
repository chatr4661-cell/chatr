import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdvancedPhoneDialer } from "@/components/dialer/AdvancedPhoneDialer";
import { clearPreCallMediaStream, setPreCallMediaStream } from "@/utils/preCallMedia";
import { useNativeHaptics } from "@/hooks/useNativeHaptics";

const getStoredUserId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const isExplicit = localStorage.getItem('chatr_explicit_signout') === '1' || sessionStorage.getItem('chatr_explicit_signout') === '1';
    if (isExplicit) return null;

    const vault = localStorage.getItem('chatr_permanent_session_vault');
    if (vault) {
      try {
        const parsed = JSON.parse(vault);
        if (parsed?.user?.id) return parsed.user.id;
      } catch {}
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
        const val = localStorage.getItem(key);
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (parsed?.user?.id) return parsed.user.id;
          } catch {}
        }
      }
    }
  } catch {}
  return null;
};

export default function Calls() {
  const navigate = useNavigate();
  const haptics = useNativeHaptics();
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => getStoredUserId());

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        setCurrentUserId(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    // 1. Check local session first (works seamlessly offline or during network drops)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      setCurrentUserId(session.user.id);
      return;
    }

    // 2. Secondary check via getUser()
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.id) {
      setCurrentUserId(userData.user.id);
      return;
    }

    // 3. Check durable session vault / local tokens
    const storedId = getStoredUserId();
    if (storedId) {
      setCurrentUserId(storedId);
      return;
    }

    // 4. Only redirect to /auth if user explicitly signed out or has no stored credentials
    const isExplicit = localStorage.getItem('chatr_explicit_signout') === '1' || sessionStorage.getItem('chatr_explicit_signout') === '1';
    const hasTokens = Object.keys(localStorage).some(k => (k.startsWith('sb-') || k.includes('auth-token') || k === 'chatr_permanent_session_vault') && !!localStorage.getItem(k));

    if (isExplicit || !hasTokens) {
      navigate('/auth');
      return;
    }
  };

  const generateCallId = () => {
    const cryptoAny = crypto as any;
    if (cryptoAny?.randomUUID) return cryptoAny.randomUUID() as string;

    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const b = Array.from(bytes, toHex).join('');
    return `${b.slice(0, 8)}-${b.slice(8, 12)}-${b.slice(12, 16)}-${b.slice(16, 20)}-${b.slice(20)}`;
  };

  const requestPermissionsAndCall = async (contactId: string, contactName: string, callType: 'voice' | 'video') => {
    const callId = generateCallId();
    haptics.medium();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });

      setPreCallMediaStream(callId, stream);
      await handleCall(contactId, contactName, callType, callId);
    } catch (error: any) {
      clearPreCallMediaStream(callId);
      haptics.error();
      console.error('Permission request failed:', error);

      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        toast.error(callType === 'video'
          ? 'Please allow camera and microphone to make video calls'
          : 'Please allow microphone to make voice calls'
        );
      } else if (error?.name === 'NotReadableError') {
        toast.error(callType === 'video'
          ? 'Camera/microphone is busy. Close other apps and try again.'
          : 'Microphone is busy. Close other apps and try again.'
        );
      } else if (error?.name === 'NotFoundError') {
        toast.error(callType === 'video'
          ? 'No camera or microphone found on this device'
          : 'No microphone found on this device'
        );
      } else {
        toast.error('Could not access device. Please try again.');
      }
    }
  };

  const handleCall = async (contactId: string, contactName: string, callType: 'voice' | 'video', callId: string) => {
    let activeUserId = currentUserId;
    if (!activeUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      activeUserId = user?.id || getStoredUserId();
      if (activeUserId) setCurrentUserId(activeUserId);
    }

    if (!activeUserId) {
      clearPreCallMediaStream(callId);
      toast.error('Please sign in to make calls');
      return;
    }

    try {
      const { data: receiverProfile, error: receiverError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', contactId)
        .single();

      if (receiverError || !receiverProfile) {
        clearPreCallMediaStream(callId);
        toast.error('Contact not found');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', activeUserId)
        .single();

      let conversationId: string | null = null;

      const { data: myParticipantRows, error: myPartErr } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', activeUserId);

      if (myPartErr) {
        console.error('Failed to load conversation participants:', myPartErr);
      }

      const myConversationIds = (myParticipantRows || [])
        .map((r: any) => r.conversation_id)
        .filter(Boolean);

      if (myConversationIds.length > 0) {
        const { data: sharedConv, error: sharedErr } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', contactId)
          .in('conversation_id', myConversationIds)
          .limit(1)
          .maybeSingle();

        if (sharedErr) {
          console.error('Failed to find shared conversation:', sharedErr);
        }

        if (sharedConv?.conversation_id) {
          conversationId = sharedConv.conversation_id;
        }
      }

      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({ created_by: activeUserId, is_group: false })
          .select('id')
          .single();

        if (convError || !newConv?.id) {
          console.error('Could not create conversation:', convError);
          clearPreCallMediaStream(callId);
          toast.error('Could not create conversation');
          return;
        }

        const { error: participantsError } = await supabase
          .from('conversation_participants')
          .insert([
            { conversation_id: newConv.id, user_id: activeUserId },
            { conversation_id: newConv.id, user_id: contactId },
          ]);

        if (participantsError) {
          console.error('Could not add participants:', participantsError);
          clearPreCallMediaStream(callId);
          toast.error('Could not create conversation');
          return;
        }

        conversationId = newConv.id;
      }

      const { data: callData, error: callError } = await supabase
        .from('calls')
        .insert({
          id: callId,
          conversation_id: conversationId!,
          caller_id: activeUserId,
          caller_name: profile?.username || 'Unknown',
          caller_avatar: profile?.avatar_url,
          receiver_id: contactId,
          receiver_name: receiverProfile.username || 'Unknown',
          receiver_avatar: receiverProfile.avatar_url,
          call_type: callType,
          status: 'ringing'
        })
        .select()
        .single();

      if (callError || !callData?.id) {
        console.error('Call creation failed:', callError);
        clearPreCallMediaStream(callId);
        toast.error('Could not start call');
        return;
      }

      haptics.success();

      try {
        console.log('📲 Sending FCM call notification to:', contactId);
        const { data: fcmData, error: fcmError } = await supabase.functions.invoke('fcm-notify', {
          body: {
            type: 'call',
            receiverId: contactId,
            callerId: activeUserId,
            callerName: profile?.username || 'Unknown',
            callerAvatar: profile?.avatar_url || '',
            callId: callData.id,
            callType: callType
          }
        });
        const isUndelivered = fcmError || !fcmData?.success;
        if (isUndelivered) {
          console.warn('⚠️ [Calls] Edge function undelivered, running direct FCM dispatch:', fcmError || fcmData);
          const { dispatchDirectFCMCall } = await import('@/services/fcmDirectDispatcher');
          await dispatchDirectFCMCall({
            receiverId: contactId,
            callerId: activeUserId,
            callerName: profile?.username || 'Unknown',
            callerAvatar: profile?.avatar_url || '',
            callId: callData.id,
            callType: callType,
            conversationId: conversationId || '',
          });
        } else {
          console.log('✅ FCM call notification sent');
        }
      } catch (fcmError) {
        console.warn('⚠️ FCM notification failed, attempting direct dispatch fallback:', fcmError);
        try {
          const { dispatchDirectFCMCall } = await import('@/services/fcmDirectDispatcher');
          await dispatchDirectFCMCall({
            receiverId: contactId,
            callerId: activeUserId,
            callerName: profile?.username || 'Unknown',
            callerAvatar: profile?.avatar_url || '',
            callId: callData.id,
            callType: callType,
            conversationId: conversationId || '',
          });
        } catch (directErr) {
          console.error('❌ Direct FCM dispatch failed:', directErr);
        }
      }

    } catch (error) {
      console.error('Error starting call:', error);
      clearPreCallMediaStream(callId);
      haptics.error();
      toast.error('Failed to start call');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#030818] text-white safe-area-pt safe-area-pb overflow-hidden chatr-responsive-bottom-pad">
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <AdvancedPhoneDialer onCall={requestPermissionsAndCall} />
      </div>
    </div>
  );
}
