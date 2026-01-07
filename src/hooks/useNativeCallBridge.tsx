import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { setPreCallMediaStream } from '@/utils/preCallMedia';

/**
 * Native Call Bridge Handler
 * 
 * Listens for events from the native Android layer when the user
 * answers/rejects calls from the native UI or notifications.
 * 
 * This bridges the native TelecomManager/IncomingCallActivity to WebRTC.
 */
export const useNativeCallBridge = () => {
  const { toast } = useToast();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    console.log('📱 [NativeCallBridge] Initializing native call bridge');

    // Handle native call actions (answer/reject from native UI)
    const handleNativeCallAction = async (event: CustomEvent) => {
      const { action, callId, callerId, callerName, callerAvatar, callType, conversationId } = event.detail;

      console.log(`📱 [NativeCallBridge] Received action: ${action} for call ${callId}`);

      if (action === 'answer') {
        console.log('✅ [NativeCallBridge] Processing answer from native');
        
        // CRITICAL: Acquire media permission FIRST under the native gesture context
        // This ensures the WebView has permission before WebRTC starts
        try {
          console.log('🎤 [NativeCallBridge] Acquiring media permission...');
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: callType === 'video',
          });
          console.log('✅ [NativeCallBridge] Media acquired successfully');
          
          // Store the stream for WebRTC to use
          setPreCallMediaStream(callId, stream);
        } catch (mediaErr: any) {
          console.error('❌ [NativeCallBridge] Failed to acquire media:', mediaErr);
          // Show error but don't block - WebRTC will try again
          toast({
            title: 'Microphone Access',
            description: mediaErr?.name === 'NotReadableError' 
              ? 'Microphone is busy. Close other apps and try again.'
              : 'Please allow microphone access',
            variant: 'destructive',
          });
          // Continue anyway - let WebRTC handle the retry
        }

        // Update call status to active in database
        const { error } = await supabase
          .from('calls')
          .update({ 
            status: 'active', 
            started_at: new Date().toISOString() 
          })
          .eq('id', callId);

        if (error) {
          console.error('❌ [NativeCallBridge] Failed to update call status:', error);
          toast({
            title: 'Call Error',
            description: 'Failed to connect the call',
            variant: 'destructive',
          });
        } else {
          console.log('✅ [NativeCallBridge] Call status updated to active');
          // GlobalCallListener will pick up the status change and start WebRTC
        }
      } else if (action === 'reject') {
        console.log('❌ [NativeCallBridge] Processing reject from native');
        
        await supabase
          .from('calls')
          .update({ 
            status: 'ended', 
            ended_at: new Date().toISOString(),
            missed: false 
          })
          .eq('id', callId);

        toast({
          title: 'Call Declined',
          description: `Declined call from ${callerName || 'Unknown'}`,
        });
      }
    };

    // Handle direct reply from notifications
    const handleNativeReply = async (event: CustomEvent) => {
      const { conversationId, message } = event.detail;

      console.log(`💬 [NativeCallBridge] Sending reply to ${conversationId}: ${message}`);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('❌ [NativeCallBridge] No user logged in');
          return;
        }

        // Send the message
        const { error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: message,
            message_type: 'text',
          });

        if (error) {
          console.error('❌ [NativeCallBridge] Failed to send reply:', error);
          toast({
            title: 'Failed to send',
            description: 'Could not send your reply',
            variant: 'destructive',
          });
        } else {
          console.log('✅ [NativeCallBridge] Reply sent successfully');
          toast({
            title: 'Message sent',
            description: 'Your reply has been sent',
          });
        }
      } catch (err) {
        console.error('❌ [NativeCallBridge] Error sending reply:', err);
      }
    };

    // Add event listeners
    window.addEventListener('nativeCallAction', handleNativeCallAction as EventListener);
    window.addEventListener('nativeReply', handleNativeReply as EventListener);

    return () => {
      window.removeEventListener('nativeCallAction', handleNativeCallAction as EventListener);
      window.removeEventListener('nativeReply', handleNativeReply as EventListener);
    };
  }, [toast]);
};

export default useNativeCallBridge;
