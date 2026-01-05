import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ModuleNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
}

export const useModuleNotifications = (userId?: string) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Handle notification click/action
  const handleNotificationAction = useCallback((notification: ModuleNotification) => {
    const route = notification.data?.route;
    if (route) {
      navigate(route);
    }
  }, [navigate]);

  // Play notification sound based on type
  const playNotificationSound = useCallback((type: string) => {
    let soundFile = '/sounds/notification.mp3';
    
    if (type.includes('call')) {
      soundFile = '/sounds/ringtone.mp3';
    } else if (type.includes('payment') || type.includes('wallet')) {
      soundFile = '/sounds/payment.mp3';
    } else if (type.includes('order') || type.includes('food')) {
      soundFile = '/sounds/order.mp3';
    }

    try {
      const audio = new Audio(soundFile);
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Fallback to default
        const fallback = new Audio('/sounds/notification.mp3');
        fallback.volume = 0.5;
        fallback.play().catch(console.error);
      });
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((notification: ModuleNotification) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const browserNotif = new Notification(notification.title, {
        body: notification.message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: notification.id,
        data: notification.data
      });

      browserNotif.onclick = () => {
        window.focus();
        handleNotificationAction(notification);
        browserNotif.close();
      };
    }
  }, [handleNotificationAction]);

  useEffect(() => {
    if (!userId) return;

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Subscribe to realtime notifications
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification = payload.new as ModuleNotification;
          
          // Play sound
          playNotificationSound(notification.type);

          // Show toast notification
          toast({
            title: notification.title,
            description: notification.message,
            duration: 5000,
            onClick: () => handleNotificationAction(notification)
          });

          // Show browser notification if not focused
          if (document.hidden) {
            showBrowserNotification(notification);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast, playNotificationSound, handleNotificationAction, showBrowserNotification]);

  return {
    handleNotificationAction,
    playNotificationSound,
    showBrowserNotification
  };
};

// Hook for specific module subscriptions
export const useFoodOrderNotifications = (userId?: string, orderId?: string) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId || !orderId) return;

    const channel = supabase
      .channel(`food_order:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'food_orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          const order = payload.new as any;
          const statusMessages: Record<string, { title: string; message: string }> = {
            confirmed: { title: 'Order Confirmed! ✅', message: 'Your order is being prepared.' },
            preparing: { title: 'Preparing Your Food 👨‍🍳', message: 'Your delicious meal is being prepared.' },
            out_for_delivery: { title: 'On The Way! 🚴', message: 'Your order is out for delivery.' },
            delivered: { title: 'Order Delivered! 🎉', message: 'Enjoy your meal!' },
            cancelled: { title: 'Order Cancelled', message: 'Your order has been cancelled.' }
          };

          const statusInfo = statusMessages[order.status];
          if (statusInfo) {
            toast({
              title: statusInfo.title,
              description: statusInfo.message,
              duration: 5000
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, orderId, toast, navigate]);
};

export const useAppointmentNotifications = (userId?: string) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`appointments:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${userId}`
        },
        (payload) => {
          const appointment = payload.new as any;
          const eventType = payload.eventType;

          if (eventType === 'INSERT') {
            toast({
              title: 'Appointment Booked! 📅',
              description: `Your appointment has been scheduled.`,
              duration: 5000
            });
          } else if (eventType === 'UPDATE' && appointment.status === 'confirmed') {
            toast({
              title: 'Appointment Confirmed! ✅',
              description: `Your appointment has been confirmed.`,
              duration: 5000
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);
};

export const usePaymentNotifications = (userId?: string) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`payments:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const transaction = payload.new as any;
          const amount = transaction.amount;
          const type = transaction.transaction_type;

          if (type === 'credit') {
            toast({
              title: 'Payment Received! 💰',
              description: `₹${amount} has been credited to your wallet.`,
              duration: 5000
            });
          } else if (type === 'debit') {
            toast({
              title: 'Payment Sent',
              description: `₹${amount} has been debited from your wallet.`,
              duration: 5000
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);
};

export const useHealthNotifications = (userId?: string) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    // Subscribe to medication reminders
    const checkMedicationReminders = async () => {
      const { data: reminders } = await supabase
        .from('medication_reminders')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (reminders?.length) {
        const now = new Date();
        reminders.forEach(reminder => {
          // Check each time slot
          const timeSlots = reminder.time_slots || [];
          const todayStr = now.toISOString().split('T')[0];
          
          timeSlots.forEach((timeSlot: string) => {
            const reminderTime = new Date(`${todayStr}T${timeSlot}`);
            if (Math.abs(now.getTime() - reminderTime.getTime()) < 60000) { // Within 1 minute
              toast({
                title: 'Medication Reminder 💊',
                description: `Time to take your ${reminder.medicine_name}`,
                duration: 10000
              });
            }
          });
        });
      }
    };

    // Check every minute
    const interval = setInterval(checkMedicationReminders, 60000);
    checkMedicationReminders(); // Check immediately

    return () => {
      clearInterval(interval);
    };
  }, [userId, toast]);
};
