/**
 * Smart notification deep-link router.
 *
 * Converts a notification (type + metadata + action_url) into the exact
 * in-app route that should open. Used by both the in-app click handler
 * (Notifications.tsx) and the FCM service worker (firebase-messaging-sw.js
 * mirrors a subset of this logic for cold-start clicks).
 */

export interface NotificationLike {
  type?: string | null;
  action_url?: string | null;
  metadata?: Record<string, any> | null;
}

export function resolveNotificationRoute(n: NotificationLike): string {
  const meta = (n.metadata ?? {}) as Record<string, any>;
  const t = (n.type ?? '').toLowerCase();

  // Explicit action_url wins (orchestrator already sets these for most events).
  if (n.action_url && typeof n.action_url === 'string' && n.action_url.startsWith('/')) {
    return n.action_url;
  }

  switch (t) {
    case 'call':
    case 'missed_call': {
      const callerId = meta.caller_id || meta.user_id || meta.sender_id;
      if (callerId) return `/chat?user=${callerId}`;
      return '/calls';
    }

    case 'message':
    case 'chat':
    case 'unread_msgs': {
      const conv = meta.conversation_id;
      const sender = meta.sender_id || meta.user_id;
      if (conv) return `/chat?conversation=${conv}`;
      if (sender) return `/chat?user=${sender}`;
      return '/chat';
    }

    case 'appointment':
    case 'booking': {
      const id = meta.appointment_id || meta.booking_id;
      if (id) return `/appointments/${id}`;
      return '/appointments';
    }

    case 'earning':
    case 'mission':
    case 'micro_task': {
      const missionId = meta.mission_id || meta.task_id;
      if (missionId) return `/earn?mission=${missionId}`;
      return '/earn';
    }

    case 'wellness':
    case 'lifestyle':
    case 'nudge':
      return meta.route || '/home';

    case 'payment':
    case 'wallet':
      return '/wallet';

    case 'order':
    case 'food':
      return meta.order_id ? `/orders/${meta.order_id}` : '/orders';

    case 'friend':
    case 'invite':
      return meta.user_id ? `/profile/${meta.user_id}` : '/contacts';

    case 'digest':
    case 'digest_update':
      return meta.route || '/home';

    default:
      return meta.route || '/notifications';
  }
}
