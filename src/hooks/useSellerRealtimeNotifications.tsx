import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Booking {
  id: string;
  customer_name: string;
  service_id: string;
  booking_date: string;
  status: string;
}

export const useSellerRealtimeNotifications = (sellerId: string | undefined) => {
  const { toast } = useToast();
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!sellerId) return;

    // Fetch initial unread notification count
    const fetchNotificationCount = async () => {
      const { count } = await supabase
        .from('chatr_plus_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .eq('status', 'pending');
      
      setNotificationCount(count || 0);
    };

    fetchNotificationCount();

    // Subscribe to new bookings
    const bookingsChannel = supabase
      .channel('seller-bookings-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chatr_plus_bookings',
          filter: `seller_id=eq.${sellerId}`
        },
        async (payload: any) => {
          const booking = payload.new as Booking;
          
          // Show toast notification
          toast({
            title: "New Booking Received! 🎉",
            description: `${booking.customer_name} booked a service for ${new Date(booking.booking_date).toLocaleDateString()}`,
            duration: 8000,
          });

          // Play notification sound
          try {
            const audio = new Audio('/ringtones/message-notify.mp3');
            audio.volume = 0.6;
            audio.play().catch(e => console.log('🔇 Sound blocked:', e));
          } catch (e) {
            console.log('🔇 Could not play sound');
          }

          // Update notification count
          setNotificationCount(prev => prev + 1);

          // Add to notifications list
          setNotifications(prev => [{
            id: booking.id,
            type: 'new_booking',
            title: 'New Booking',
            message: `${booking.customer_name} booked a service`,
            timestamp: new Date(),
            data: booking
          }, ...prev].slice(0, 10));

          // Browser notification
          if ('Notification' in window && Notification.permission === 'granted' && !document.hasFocus()) {
            const notification = new Notification('New Booking Received', {
              body: `${booking.customer_name} booked a service`,
              icon: '/favicon.png',
              badge: '/favicon.png',
            });

            setTimeout(() => notification.close(), 5000);
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chatr_plus_bookings',
          filter: `seller_id=eq.${sellerId}`
        },
        async (payload: any) => {
          const booking = payload.new as Booking;
          
          // Show toast for status changes
          if (booking.status === 'cancelled') {
            toast({
              title: "Booking Cancelled",
              description: `${booking.customer_name}'s booking was cancelled`,
              variant: "destructive",
              duration: 5000,
            });

            setNotifications(prev => [{
              id: booking.id,
              type: 'booking_cancelled',
              title: 'Booking Cancelled',
              message: `${booking.customer_name}'s booking was cancelled`,
              timestamp: new Date(),
              data: booking
            }, ...prev].slice(0, 10));
          }
        }
      )
      .subscribe();

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(bookingsChannel);
    };
  }, [sellerId, toast]);

  const clearNotifications = () => {
    setNotifications([]);
    setNotificationCount(0);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setNotificationCount(prev => Math.max(0, prev - 1));
  };

  return {
    notificationCount,
    notifications,
    clearNotifications,
    markAsRead
  };
};
