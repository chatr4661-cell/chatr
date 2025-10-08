import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useChatContext } from "@/contexts/ChatContext";

interface NotificationPayload {
  new: any;
  old?: any;
  eventType: string;
}

export const useRealtimeNotifications = (userId: string | undefined) => {
  const { toast } = useToast();
  const { activeConversationId } = useChatContext();

  useEffect(() => {
    if (!userId) return;

    let userNotificationTone = '/notification.mp3';

    // Get user's preferred notification tone
    const getUserTone = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('notification_tone')
        .eq('id', userId)
        .single();
      
      if (data?.notification_tone) {
        userNotificationTone = data.notification_tone;
      }
    };

    getUserTone();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('messages-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=neq.${userId}`
        },
        async (payload: NotificationPayload) => {
          const message = payload.new;
          
          // Get conversation participants to check if this message is for the current user
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', message.conversation_id);

          const isForCurrentUser = participants?.some(p => p.user_id === userId);
          
          // Don't notify if this message is from the active conversation
          const isFromActiveConversation = message.conversation_id === activeConversationId;
          
          if (isForCurrentUser && !isFromActiveConversation) {
            // Get sender info with proper error handling
            const { data: sender, error: senderError } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', message.sender_id)
              .single();

            if (senderError) {
              console.error('Error fetching sender info:', senderError);
            }

            const senderName = sender?.username || 'Someone';

            // Show notification with sender name (clicking opens chat)
            toast({
              title: senderName,
              description: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
              duration: 5000,
            });

            // Play notification sound once for 2 seconds
            const audio = new Audio('/ringtones/jetsons.mp3');
            audio.loop = false;
            audio.volume = 0.7;
            audio.play().catch(e => console.log('Could not play sound:', e));
            
            // Stop after 2 seconds
            setTimeout(() => {
              audio.pause();
              audio.currentTime = 0;
            }, 2000);

            // Send browser notification only if window is not focused
            if ('Notification' in window && Notification.permission === 'granted' && !document.hasFocus()) {
              const notification = new Notification(`${sender?.username || 'New Message'}`, {
                body: message.content.substring(0, 100),
                icon: sender?.avatar_url || '/favicon.png',
                badge: '/favicon.png',
                tag: message.conversation_id, // Prevent duplicate notifications for same conversation
                requireInteraction: false,
              });

              // Close notification after 5 seconds
              setTimeout(() => notification.close(), 5000);

              // Click notification to focus window
              notification.onclick = () => {
                window.focus();
                notification.close();
              };
            }
          }
        }
      )
      .subscribe();

    // Call notifications are handled by CallInterface component

    // Subscribe to appointment updates
    const appointmentsChannel = supabase
      .channel('appointments-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${userId}`
        },
        async (payload: NotificationPayload) => {
          const appointment = payload.new;
          
          if (payload.eventType === 'UPDATE') {
            toast({
              title: "Appointment Updated",
              description: `Your appointment status: ${appointment.status}`,
              duration: 5000,
            });
          } else if (payload.eventType === 'INSERT') {
            toast({
              title: "Appointment Confirmed",
              description: "Your appointment has been scheduled",
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(appointmentsChannel);
    };
  }, [userId, toast]);
};