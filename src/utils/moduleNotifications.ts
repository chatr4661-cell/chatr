import { supabase } from '@/integrations/supabase/client';

// Notification types for all modules
export type NotificationType =
  // Food Delivery
  | 'food_order_placed'
  | 'food_order_confirmed'
  | 'food_order_preparing'
  | 'food_order_out_for_delivery'
  | 'food_order_delivered'
  | 'food_order_cancelled'
  // Appointments
  | 'appointment_booked'
  | 'appointment_confirmed'
  | 'appointment_reminder'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  // Service Bookings
  | 'booking_created'
  | 'booking_accepted'
  | 'booking_started'
  | 'booking_completed'
  | 'booking_cancelled'
  // Payments
  | 'payment_received'
  | 'payment_sent'
  | 'payment_failed'
  | 'wallet_credited'
  | 'wallet_debited'
  // Health
  | 'health_reminder'
  | 'medication_reminder'
  | 'health_alert'
  | 'doctor_message'
  // Community
  | 'community_post'
  | 'community_comment'
  | 'community_mention'
  | 'community_like'
  // Marketplace
  | 'order_placed'
  | 'order_shipped'
  | 'order_delivered'
  | 'price_drop'
  // General
  | 'promo_offer'
  | 'system_alert';

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Main notification sender
export const sendModuleNotification = async (payload: NotificationPayload): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-module-notification', {
      body: payload
    });

    if (error) {
      console.error('Failed to send notification:', error);
      return false;
    }

    return data?.success ?? false;
  } catch (error) {
    console.error('Notification error:', error);
    return false;
  }
};

// ==================== FOOD DELIVERY NOTIFICATIONS ====================

export const sendFoodOrderNotification = async (
  userId: string,
  orderId: string,
  status: 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled',
  restaurantName?: string,
  estimatedTime?: string
): Promise<boolean> => {
  const statusMessages: Record<string, { title: string; body: string }> = {
    placed: {
      title: 'Order Placed! 🍽️',
      body: `Your order from ${restaurantName || 'restaurant'} has been placed successfully.`
    },
    confirmed: {
      title: 'Order Confirmed! ✅',
      body: `${restaurantName || 'Restaurant'} has confirmed your order. Preparing soon!`
    },
    preparing: {
      title: 'Preparing Your Food 👨‍🍳',
      body: `Your order is being prepared. ${estimatedTime ? `Ready in ${estimatedTime}` : ''}`
    },
    out_for_delivery: {
      title: 'On The Way! 🚴',
      body: `Your order is out for delivery. ${estimatedTime ? `Arriving in ${estimatedTime}` : ''}`
    },
    delivered: {
      title: 'Order Delivered! 🎉',
      body: 'Your order has been delivered. Enjoy your meal!'
    },
    cancelled: {
      title: 'Order Cancelled',
      body: 'Your order has been cancelled. Refund will be processed shortly.'
    }
  };

  const message = statusMessages[status];

  return sendModuleNotification({
    userId,
    type: `food_order_${status}` as NotificationType,
    title: message.title,
    body: message.body,
    data: {
      orderId,
      route: `/food/order/${orderId}`,
      action: 'view_order'
    }
  });
};

// ==================== APPOINTMENT NOTIFICATIONS ====================

export const sendAppointmentNotification = async (
  userId: string,
  appointmentId: string,
  status: 'booked' | 'confirmed' | 'reminder' | 'cancelled' | 'rescheduled',
  providerName?: string,
  appointmentDate?: string,
  appointmentTime?: string
): Promise<boolean> => {
  const statusMessages: Record<string, { title: string; body: string }> = {
    booked: {
      title: 'Appointment Booked! 📅',
      body: `Your appointment with ${providerName || 'doctor'} is booked for ${appointmentDate || 'scheduled date'}.`
    },
    confirmed: {
      title: 'Appointment Confirmed! ✅',
      body: `Your appointment with ${providerName || 'doctor'} is confirmed for ${appointmentDate} at ${appointmentTime || ''}.`
    },
    reminder: {
      title: 'Appointment Reminder ⏰',
      body: `Reminder: Your appointment with ${providerName || 'doctor'} is ${appointmentDate === 'tomorrow' ? 'tomorrow' : `on ${appointmentDate}`} at ${appointmentTime || ''}.`
    },
    cancelled: {
      title: 'Appointment Cancelled',
      body: `Your appointment with ${providerName || 'doctor'} has been cancelled.`
    },
    rescheduled: {
      title: 'Appointment Rescheduled 🔄',
      body: `Your appointment has been rescheduled to ${appointmentDate} at ${appointmentTime || ''}.`
    }
  };

  const message = statusMessages[status];

  return sendModuleNotification({
    userId,
    type: `appointment_${status}` as NotificationType,
    title: message.title,
    body: message.body,
    data: {
      appointmentId,
      route: `/appointments/${appointmentId}`,
      action: 'view_appointment'
    }
  });
};

// ==================== SERVICE BOOKING NOTIFICATIONS ====================

export const sendBookingNotification = async (
  userId: string,
  bookingId: string,
  status: 'created' | 'accepted' | 'started' | 'completed' | 'cancelled',
  serviceName?: string,
  providerName?: string
): Promise<boolean> => {
  const statusMessages: Record<string, { title: string; body: string }> = {
    created: {
      title: 'Booking Requested! 📝',
      body: `Your ${serviceName || 'service'} booking has been submitted. Awaiting confirmation.`
    },
    accepted: {
      title: 'Booking Accepted! ✅',
      body: `${providerName || 'Provider'} has accepted your ${serviceName || 'service'} booking.`
    },
    started: {
      title: 'Service Started 🔧',
      body: `Your ${serviceName || 'service'} has started. ${providerName || 'Provider'} is on the way.`
    },
    completed: {
      title: 'Service Completed! 🎉',
      body: `Your ${serviceName || 'service'} has been completed. Please rate your experience.`
    },
    cancelled: {
      title: 'Booking Cancelled',
      body: `Your ${serviceName || 'service'} booking has been cancelled.`
    }
  };

  const message = statusMessages[status];

  return sendModuleNotification({
    userId,
    type: `booking_${status}` as NotificationType,
    title: message.title,
    body: message.body,
    data: {
      bookingId,
      route: `/bookings/${bookingId}`,
      action: 'view_booking'
    }
  });
};

// ==================== PAYMENT NOTIFICATIONS ====================

export const sendPaymentNotification = async (
  userId: string,
  type: 'received' | 'sent' | 'failed' | 'wallet_credited' | 'wallet_debited',
  amount: number,
  currency: string = '₹',
  fromTo?: string,
  transactionId?: string
): Promise<boolean> => {
  const typeMessages: Record<string, { title: string; body: string }> = {
    received: {
      title: 'Payment Received! 💰',
      body: `You received ${currency}${amount} ${fromTo ? `from ${fromTo}` : ''}.`
    },
    sent: {
      title: 'Payment Sent ✅',
      body: `${currency}${amount} sent successfully ${fromTo ? `to ${fromTo}` : ''}.`
    },
    failed: {
      title: 'Payment Failed ❌',
      body: `Your payment of ${currency}${amount} failed. Please try again.`
    },
    wallet_credited: {
      title: 'Wallet Credited! 💳',
      body: `${currency}${amount} has been added to your wallet.`
    },
    wallet_debited: {
      title: 'Wallet Debited',
      body: `${currency}${amount} has been debited from your wallet.`
    }
  };

  const notificationType = type === 'wallet_credited' ? 'wallet_credited' 
    : type === 'wallet_debited' ? 'wallet_debited'
    : `payment_${type}` as NotificationType;

  const message = typeMessages[type];

  return sendModuleNotification({
    userId,
    type: notificationType,
    title: message.title,
    body: message.body,
    data: {
      transactionId: transactionId || '',
      route: '/wallet',
      action: 'view_transaction'
    }
  });
};

// ==================== HEALTH NOTIFICATIONS ====================

export const sendHealthNotification = async (
  userId: string,
  type: 'reminder' | 'medication_reminder' | 'alert' | 'doctor_message',
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> => {
  const notificationType: NotificationType = 
    type === 'reminder' ? 'health_reminder'
    : type === 'medication_reminder' ? 'medication_reminder'
    : type === 'alert' ? 'health_alert'
    : 'doctor_message';

  return sendModuleNotification({
    userId,
    type: notificationType,
    title,
    body,
    data: {
      route: '/health',
      ...data
    }
  });
};

// ==================== COMMUNITY NOTIFICATIONS ====================

export const sendCommunityNotification = async (
  userId: string,
  type: 'post' | 'comment' | 'mention' | 'like',
  authorName: string,
  contentPreview?: string,
  postId?: string
): Promise<boolean> => {
  const typeMessages: Record<string, { title: string; body: string }> = {
    post: {
      title: 'New Post 📢',
      body: `${authorName} posted: "${contentPreview?.substring(0, 50) || ''}..."`
    },
    comment: {
      title: 'New Comment 💬',
      body: `${authorName} commented on your post.`
    },
    mention: {
      title: 'You were mentioned! 👋',
      body: `${authorName} mentioned you in a post.`
    },
    like: {
      title: 'New Like ❤️',
      body: `${authorName} liked your post.`
    }
  };

  const message = typeMessages[type];

  return sendModuleNotification({
    userId,
    type: `community_${type}` as NotificationType,
    title: message.title,
    body: message.body,
    data: {
      postId: postId || '',
      route: postId ? `/community/post/${postId}` : '/community',
      action: 'view_post'
    }
  });
};

// ==================== MARKETPLACE NOTIFICATIONS ====================

export const sendMarketplaceNotification = async (
  userId: string,
  type: 'order_placed' | 'order_shipped' | 'order_delivered' | 'price_drop',
  orderId?: string,
  productName?: string,
  trackingInfo?: string
): Promise<boolean> => {
  const typeMessages: Record<string, { title: string; body: string }> = {
    order_placed: {
      title: 'Order Placed! 🛒',
      body: `Your order for ${productName || 'items'} has been placed successfully.`
    },
    order_shipped: {
      title: 'Order Shipped! 📦',
      body: `Your order is on the way. ${trackingInfo ? `Tracking: ${trackingInfo}` : ''}`
    },
    order_delivered: {
      title: 'Order Delivered! 🎉',
      body: `Your order for ${productName || 'items'} has been delivered.`
    },
    price_drop: {
      title: 'Price Drop Alert! 💸',
      body: `${productName || 'An item'} in your wishlist is now on sale!`
    }
  };

  const message = typeMessages[type];

  return sendModuleNotification({
    userId,
    type: type as NotificationType,
    title: message.title,
    body: message.body,
    data: {
      orderId: orderId || '',
      route: orderId ? `/marketplace/order/${orderId}` : '/marketplace',
      action: 'view_order'
    }
  });
};

// ==================== PROMO/SYSTEM NOTIFICATIONS ====================

export const sendPromoNotification = async (
  userId: string,
  title: string,
  body: string,
  promoCode?: string,
  route?: string
): Promise<boolean> => {
  return sendModuleNotification({
    userId,
    type: 'promo_offer',
    title,
    body,
    data: {
      promoCode: promoCode || '',
      route: route || '/',
      action: 'view_offer'
    }
  });
};

export const sendSystemAlert = async (
  userId: string,
  title: string,
  body: string,
  route?: string
): Promise<boolean> => {
  return sendModuleNotification({
    userId,
    type: 'system_alert',
    title,
    body,
    data: {
      route: route || '/',
      action: 'view_alert'
    }
  });
};
