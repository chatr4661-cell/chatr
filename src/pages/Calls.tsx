import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdvancedPhoneDialer } from "@/components/dialer/AdvancedPhoneDialer";
import { BottomNav } from "@/components/BottomNav";

export default function Calls() {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setCurrentUserId(user.id);
  };

  // Auto-request permissions silently before making the call
  const requestPermissionsAndCall = async (contactId: string, contactName: string, callType: 'voice' | 'video') => {
    try {
      // Auto-request permission - browser shows native prompt
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });
      // Stop tracks immediately (just needed to trigger permission)
      stream.getTracks().forEach(track => track.stop());

      // Give the OS/WebView a moment to fully release devices before WebRTC requests again
      await new Promise(resolve => setTimeout(resolve, 250));

      // Permission granted, proceed with call
      await handleCall(contactId, contactName, callType);
    } catch (error: any) {
      console.error('Permission request failed:', error);

      // Simple, friendly messages for non-technical users
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error(callType === 'video'
          ? 'Please allow camera and microphone to make video calls'
          : 'Please allow microphone to make voice calls'
        );
      } else if (error.name === 'NotReadableError') {
        toast.error(callType === 'video'
          ? 'Camera/microphone is busy. Close other apps and try again.'
          : 'Microphone is busy. Close other apps and try again.'
        );
      } else if (error.name === 'NotFoundError') {
        toast.error(callType === 'video'
          ? 'No camera or microphone found on this device'
          : 'No microphone found on this device'
        );
      } else {
        toast.error('Could not access device. Please try again.');
      }
    }
  };

  const handleCall = async (contactId: string, contactName: string, callType: 'voice' | 'video') => {
    if (!currentUserId) {
      toast.error('Please sign in to make calls');
      return;
    }

    try {
      // Get receiver profile
      const { data: receiverProfile, error: receiverError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', contactId)
        .single();

      if (receiverError || !receiverProfile) {
        toast.error('Contact not found');
        return;
      }

      // Get caller profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', currentUserId)
        .single();

      // Find or create a 1:1 conversation (uses conversation_participants join table)
      let conversationId: string | null = null;

      const { data: myParticipantRows, error: myPartErr } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId);

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
          .insert({ created_by: currentUserId, is_group: false })
          .select('id')
          .single();

        if (convError || !newConv?.id) {
          console.error('Could not create conversation:', convError);
          toast.error('Could not create conversation');
          return;
        }

        const { error: participantsError } = await supabase
          .from('conversation_participants')
          .insert([
            { conversation_id: newConv.id, user_id: currentUserId },
            { conversation_id: newConv.id, user_id: contactId },
          ]);

        if (participantsError) {
          console.error('Could not add participants:', participantsError);
          toast.error('Could not create conversation');
          return;
        }

        conversationId = newConv.id;
      }

      // Create the call record
      const { data: callData, error: callError } = await supabase
        .from('calls')
        .insert({
          conversation_id: conversationId!,
          caller_id: currentUserId,
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

      if (callError) {
        console.error('Call creation failed:', callError);
        toast.error('Could not start call');
        return;
      }

      // Send FCM push notification
      try {
        console.log('📲 Sending FCM call notification to:', contactId);
        await supabase.functions.invoke('fcm-notify', {
          body: {
            type: 'call',
            receiverId: contactId,
            callerId: currentUserId,
            callerName: profile?.username || 'Unknown',
            callerAvatar: profile?.avatar_url || '',
            callId: callData.id,
            callType: callType
          }
        });
        console.log('✅ FCM call notification sent');
      } catch (fcmError) {
        console.warn('⚠️ FCM notification failed:', fcmError);
      }

      toast.success(`${callType === 'voice' ? 'Voice' : 'Video'} call started`);
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
    }
  };

  if (!currentUserId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background pb-16">
      <AdvancedPhoneDialer onCall={requestPermissionsAndCall} />
      <BottomNav />
    </div>
  );
}
