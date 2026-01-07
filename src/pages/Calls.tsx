import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdvancedPhoneDialer } from "@/components/dialer/AdvancedPhoneDialer";
import { BottomNav } from "@/components/BottomNav";
import { PermissionPrompt } from "@/components/calling/PermissionPrompt";

export default function Calls() {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingCall, setPendingCall] = useState<{
    contactId: string;
    contactName: string;
    callType: 'voice' | 'video';
  } | null>(null);

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

  // Wrapper to check permissions before making a call
  const handleCallRequest = (contactId: string, contactName: string, callType: 'voice' | 'video') => {
    // Show permission prompt first
    setPendingCall({ contactId, contactName, callType });
  };

  const handlePermissionGranted = () => {
    if (pendingCall) {
      handleCall(pendingCall.contactId, pendingCall.contactName, pendingCall.callType);
    }
    setPendingCall(null);
  };

  const handlePermissionCancelled = () => {
    setPendingCall(null);
    toast.error('Call cancelled - microphone access needed');
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
      {/* Permission prompt for outgoing calls */}
      {pendingCall && (
        <PermissionPrompt
          type={pendingCall.callType}
          onPermissionGranted={handlePermissionGranted}
          onCancel={handlePermissionCancelled}
        />
      )}
      <AdvancedPhoneDialer onCall={handleCallRequest} />
      <BottomNav />
    </div>
  );
}
