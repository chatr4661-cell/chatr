import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { setPreCallMediaStream } from '@/utils/preCallMedia';

/**
 * Native Call Bridge Handler
 * 
 * Bridges native Android/iOS call actions to WebRTC.
 * When user answers/rejects from native UI, this updates the database
 * and acquires media permissions.
 */
export const useNativeCallBridge = () => {
  const { toast } = useToast();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    console.log('📱 [NativeCallBridge] Active');

    const handleNativeCallAction = async (event: CustomEvent) => {
      const { action, callId, callerName, callType } = event.detail;

      console.log(`📱 [NativeCallBridge] Action: ${action} for call ${callId?.slice(0, 8)}`);

      if (action === 'answer') {
        // Acquire media permission immediately
        try {
          console.log('🎤 [NativeCallBridge] Acquiring media...');
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: callType === 'video',
          });
          console.log('✅ [NativeCallBridge] Media acquired');
          setPreCallMediaStream(callId, stream);
        } catch (mediaErr: any) {
          console.error('❌ [NativeCallBridge] Media failed:', mediaErr);
          toast({
            title: 'Microphone Access',
            description: mediaErr?.name === 'NotReadableError' 
              ? 'Microphone busy - close other apps'
              : 'Please allow microphone access',
            variant: 'destructive',
          });
        }

        // Update call status to active
        const { error } = await supabase
          .from('calls')
          .update({ 
            status: 'active', 
            started_at: new Date().toISOString() 
          })
          .eq('id', callId);

        if (error) {
          console.error('❌ [NativeCallBridge] Status update failed:', error);
          toast({
            title: 'Call Error',
            description: 'Failed to connect',
            variant: 'destructive',
          });
        } else {
          console.log('✅ [NativeCallBridge] Call status: active');
        }
      } else if (action === 'reject') {
        await supabase
          .from('calls')
          .update({ 
            status: 'ended', 
            ended_at: new Date().toISOString(),
            missed: false 
          })
          .eq('id', callId);

      // Silent - no toast for call declined
      }
    };

    const handleNativeReply = async (event: CustomEvent) => {
      const { conversationId, message } = event.detail;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: message,
            message_type: 'text',
          });

        if (!error) {
          toast({ title: 'Message sent' });
        }
      } catch (err) {
        console.error('❌ [NativeCallBridge] Reply error:', err);
      }
    };

    window.addEventListener('nativeCallAction', handleNativeCallAction as EventListener);
    window.addEventListener('nativeReply', handleNativeReply as EventListener);

    return () => {
      window.removeEventListener('nativeCallAction', handleNativeCallAction as EventListener);
      window.removeEventListener('nativeReply', handleNativeReply as EventListener);
    };
  }, [toast]);
};

export default useNativeCallBridge;
