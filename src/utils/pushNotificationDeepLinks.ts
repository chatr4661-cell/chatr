/**
 * Push Notification Deep Link Handler
 * Ensures all FCM notifications include proper deep link payloads
 */

import { parseDeepLink, navigateToDeepLink } from './deepLinkHandler';

export interface NotificationDeepLink {
  route: string;
  params?: Record<string, string>;
  action?: string;
}

// Notification type to deep link mapping
export const NOTIFICATION_DEEP_LINKS: Record<string, NotificationDeepLink> = {
  // Messaging
  'new_message': { route: '/chat', params: { conversationId: ':conversationId' } },
  'group_message': { route: '/chat', params: { conversationId: ':conversationId' } },
  'message_reaction': { route: '/chat', params: { conversationId: ':conversationId', messageId: ':messageId' } },
  'mention': { route: '/chat', params: { conversationId: ':conversationId', messageId: ':messageId' } },
  
  // Calls
  'incoming_call': { route: '/incoming-call', params: { callId: ':callId' }, action: 'ANSWER_CALL' },
  'missed_call': { route: '/call-history' },
  'video_call': { route: '/video-call', params: { callId: ':callId' } },
  
  // Social
  'friend_request': { route: '/contacts', action: 'VIEW_REQUESTS' },
  'friend_accepted': { route: '/profile', params: { userId: ':userId' } },
  'story_view': { route: '/stories' },
  'story_reaction': { route: '/stories' },
  'community_invite': { route: '/communities', params: { communityId: ':communityId' } },
  'community_post': { route: '/communities', params: { communityId: ':communityId', postId: ':postId' } },
  
  // Health
  'medicine_reminder': { route: '/medicine-reminders', action: 'TAKE_MEDICINE' },
  'appointment_reminder': { route: '/booking', params: { appointmentId: ':appointmentId' } },
  'health_alert': { route: '/health' },
  'lab_result': { route: '/lab-reports', params: { reportId: ':reportId' } },
  
  // Business
  'order_update': { route: '/marketplace', params: { orderId: ':orderId' } },
  'booking_confirmed': { route: '/booking', params: { bookingId: ':bookingId' } },
  'payment_received': { route: '/chatr-wallet' },
  'refund_processed': { route: '/chatr-wallet' },
  
  // Jobs
  'job_application_update': { route: '/jobs', params: { applicationId: ':applicationId' } },
  'new_job_match': { route: '/jobs' },
  
  // Rewards
  'points_earned': { route: '/points' },
  'reward_available': { route: '/rewards' },
  'daily_challenge': { route: '/chatr-games' },
  
  // AI
  'ai_agent_response': { route: '/ai-agents', params: { agentId: ':agentId' } },
  'ai_task_complete': { route: '/ai-assistant' },
  
  // System
  'security_alert': { route: '/settings', action: 'SECURITY' },
  'account_update': { route: '/account' },
  'app_update': { route: '/download' },
};

/**
 * Build deep link URL from notification payload
 */
export const buildDeepLinkFromNotification = (
  notificationType: string,
  data: Record<string, string>
): string => {
  const linkConfig = NOTIFICATION_DEEP_LINKS[notificationType];
  
  if (!linkConfig) {
    console.warn(`[PushDeepLink] Unknown notification type: ${notificationType}`);
    return '/';
  }

  let route = linkConfig.route;
  
  // Replace param placeholders with actual values
  if (linkConfig.params) {
    Object.entries(linkConfig.params).forEach(([key, placeholder]) => {
      const paramName = placeholder.replace(':', '');
      const value = data[paramName];
      if (value) {
        route = route.replace(`:${paramName}`, value);
      }
    });
  }

  // Add query params if any
  const queryParams = new URLSearchParams();
  if (linkConfig.action) {
    queryParams.set('action', linkConfig.action);
  }
  
  // Add any extra data as query params
  Object.entries(data).forEach(([key, value]) => {
    if (!['notificationType', 'title', 'body'].includes(key)) {
      queryParams.set(key, value);
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `${route}?${queryString}` : route;
};

/**
 * Handle push notification tap - navigate to deep link
 */
export const handleNotificationTap = (notification: {
  type: string;
  data: Record<string, string>;
}) => {
  console.log('[PushDeepLink] Handling notification tap:', notification);
  
  const deepLink = buildDeepLinkFromNotification(notification.type, notification.data);
  const route = parseDeepLink(`chatr://${deepLink}`);
  
  if (route) {
    navigateToDeepLink(route);
  }
};

/**
 * Generate FCM payload with deep link
 */
export const generateFCMPayload = (
  notificationType: string,
  title: string,
  body: string,
  data: Record<string, string>
): {
  notification: { title: string; body: string };
  data: Record<string, string>;
  android: {
    notification: {
      click_action: string;
      channel_id: string;
    };
  };
  apns: {
    payload: {
      aps: {
        'mutable-content': number;
        'content-available': number;
      };
    };
  };
} => {
  const deepLink = buildDeepLinkFromNotification(notificationType, data);
  
  return {
    notification: {
      title,
      body,
    },
    data: {
      ...data,
      notificationType,
      deepLink,
      click_action: `https://chatr.chat${deepLink}`,
    },
    android: {
      notification: {
        click_action: `chatr:/${deepLink}`,
        channel_id: getChannelId(notificationType),
      },
    },
    apns: {
      payload: {
        aps: {
          'mutable-content': 1,
          'content-available': 1,
        },
      },
    },
  };
};

/**
 * Get Android notification channel ID based on notification type
 */
const getChannelId = (notificationType: string): string => {
  if (notificationType.includes('call')) return 'calls';
  if (notificationType.includes('message')) return 'messages';
  if (notificationType.includes('health') || notificationType.includes('medicine')) return 'health';
  if (notificationType.includes('order') || notificationType.includes('payment')) return 'transactions';
  return 'default';
};

/**
 * Validate deep link is working
 */
export const validateDeepLink = (url: string): boolean => {
  const route = parseDeepLink(url);
  return route !== null;
};
