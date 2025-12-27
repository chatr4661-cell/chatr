import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Global notification listener that works on ALL screens
 * Handles message and appointment notifications app-wide
 */
export function GlobalNotificationListener() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);

  // Get and track current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Set up notification subscriptions
  useEffect(() => {
    if (!userId) return;

    console.log('🔔 GlobalNotificationListener active for user:', userId);

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('global-messages-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=neq.${userId}`
        },
        async (payload) => {
          const message = payload.new as any;
          
          // Check if this message is for the current user
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', message.conversation_id);

          const isForCurrentUser = participants?.some(p => p.user_id === userId);
          
          if (isForCurrentUser) {
            // Get sender info
            const { data: sender } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', message.sender_id)
              .single();

            const senderName = sender?.username || 'Someone';

            // Show toast notification
            toast({
              title: senderName,
              description: (message.content?.substring(0, 50) || 'New message') + 
                ((message.content?.length || 0) > 50 ? '...' : ''),
              duration: 5000,
            });

            // Play notification sound
            try {
              const audio = new Audio('/ringtones/message-notify.mp3');
              audio.volume = 0.5;
              audio.play().catch(() => {});
            } catch (e) {
              console.log('🔇 Could not play notification sound');
            }

            // Browser notification if window not focused
            if ('Notification' in window && Notification.permission === 'granted' && !document.hasFocus()) {
              const notification = new Notification(senderName, {
                body: message.content?.substring(0, 100) || 'New message',
                icon: sender?.avatar_url || '/favicon.png',
                tag: message.conversation_id,
              });
              setTimeout(() => notification.close(), 5000);
              notification.onclick = () => {
                window.focus();
                notification.close();
              };
            }
          }
        }
      )
      .subscribe();

    // Subscribe to appointment updates
    const appointmentsChannel = supabase
      .channel('global-appointments-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${userId}`
        },
        async (payload) => {
          const appointment = payload.new as any;
          
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

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(appointmentsChannel);
    };
  }, [userId, toast]);

  return null;
}
