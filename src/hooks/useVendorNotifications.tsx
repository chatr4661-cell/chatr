import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VendorNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  created_at: string;
}

// Hook for Food Vendor (Restaurant) notifications
export const useFoodVendorNotifications = (vendorId?: string) => {
  const { toast } = useToast();

  const playOrderSound = useCallback(() => {
    try {
      const audio = new Audio('/sounds/new-order.mp3');
      audio.volume = 0.8;
      audio.play().catch(console.error);
    } catch (error) {
      console.error('Failed to play order sound:', error);
    }
  }, []);

  useEffect(() => {
    if (!vendorId) return;

    // Subscribe to new food orders
    const channel = supabase
      .channel(`vendor_orders:${vendorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'food_orders',
          filter: `vendor_id=eq.${vendorId}`
        },
        (payload) => {
          const order = payload.new as any;
          playOrderSound();
          
          toast({
            title: '🔔 New Order Received!',
            description: `Order #${order.id?.slice(-6).toUpperCase()} - ₹${order.total_amount}`,
            duration: 10000,
            variant: 'default'
          });

          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Order Received!', {
              body: `Order #${order.id?.slice(-6).toUpperCase()} - ₹${order.total_amount}`,
              icon: '/icons/icon-192x192.png',
              requireInteraction: true
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'food_orders',
          filter: `vendor_id=eq.${vendorId}`
        },
        (payload) => {
          const order = payload.new as any;
          const oldOrder = payload.old as any;
          
          if (order.status === 'cancelled' && oldOrder.status !== 'cancelled') {
            toast({
              title: 'Order Cancelled',
              description: `Order #${order.id?.slice(-6).toUpperCase()} has been cancelled.`,
              variant: 'destructive',
              duration: 5000
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendorId, toast, playOrderSound]);
};

// Hook for Service Provider (Home Services) notifications
export const useServiceVendorNotifications = (vendorId?: string) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!vendorId) return;

    const channel = supabase
      .channel(`service_bookings:${vendorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_bookings',
          filter: `provider_id=eq.${vendorId}`
        },
        (payload) => {
          const booking = payload.new as any;
          
          toast({
            title: '🔔 New Booking Request!',
            description: `New ${booking.service_type || 'service'} booking received.`,
            duration: 10000
          });

          // Browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Booking Request!', {
              body: `New ${booking.service_type || 'service'} booking`,
              icon: '/icons/icon-192x192.png',
              requireInteraction: true
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_bookings',
          filter: `provider_id=eq.${vendorId}`
        },
        (payload) => {
          const booking = payload.new as any;
          
          if (booking.status === 'cancelled') {
            toast({
              title: 'Booking Cancelled',
              description: 'A booking has been cancelled.',
              variant: 'destructive',
              duration: 5000
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendorId, toast]);
};

// Hook for Healthcare Provider (Doctor) notifications
export const useHealthcareVendorNotifications = (doctorId?: string) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!doctorId) return;

    const channel = supabase
      .channel(`doctor_appointments:${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `provider_id=eq.${doctorId}`
        },
        (payload) => {
          const appointment = payload.new as any;
          
          toast({
            title: '📅 New Appointment Booked!',
            description: `New appointment on ${new Date(appointment.appointment_date).toLocaleDateString()}`,
            duration: 10000
          });

          // Browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Appointment Booked!', {
              body: `New appointment scheduled`,
              icon: '/icons/icon-192x192.png',
              requireInteraction: true
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `provider_id=eq.${doctorId}`
        },
        (payload) => {
          const appointment = payload.new as any;
          
          if (appointment.status === 'cancelled') {
            toast({
              title: 'Appointment Cancelled',
              description: 'A patient has cancelled their appointment.',
              variant: 'destructive',
              duration: 5000
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId, toast]);
};

// Hook for Chatr+ Seller notifications
export const useChatrPlusSellerNotifications = (sellerId?: string) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!sellerId) return;

    const channel = supabase
      .channel(`chatr_plus_bookings:${sellerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chatr_plus_bookings',
          filter: `seller_id=eq.${sellerId}`
        },
        (payload) => {
          const booking = payload.new as any;
          
          toast({
            title: '🎉 New Booking!',
            description: `${booking.customer_name || 'Customer'} booked your service.`,
            duration: 10000
          });

          // Browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Chatr+ Booking!', {
              body: `${booking.customer_name || 'Customer'} booked your service`,
              icon: '/icons/icon-192x192.png',
              requireInteraction: true
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sellerId, toast]);
};

// Combined vendor notification hook
export const useVendorNotifications = (vendorId?: string, vendorType?: 'food' | 'services' | 'healthcare' | 'chatr_plus') => {
  useFoodVendorNotifications(vendorType === 'food' ? vendorId : undefined);
  useServiceVendorNotifications(vendorType === 'services' ? vendorId : undefined);
  useHealthcareVendorNotifications(vendorType === 'healthcare' ? vendorId : undefined);
  useChatrPlusSellerNotifications(vendorType === 'chatr_plus' ? vendorId : undefined);
};
