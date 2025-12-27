/**
 * Push Notification Utilities
 * Handles sending FCM push notifications for messages and calls
 */

import { supabase } from '@/integrations/supabase/client';

interface MessageNotificationPayload {
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  conversationId: string;
  messageContent: string;
  messageId: string;
  isGroup?: boolean;
}

interface CallNotificationPayload {
  receiverId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callId: string;
  callType: 'audio' | 'video';
}

/**
 * Send push notification for a new message
 * This ensures the recipient gets notified even if the app is closed/killed
 */
export const sendMessageNotification = async (payload: MessageNotificationPayload): Promise<boolean> => {
  try {
    console.log('📲 Sending message push notification to:', payload.recipientId);
    
    const { data, error } = await supabase.functions.invoke('fcm-notify', {
      body: {
        type: 'message',
        ...payload
      }
    });

    if (error) {
      console.warn('⚠️ FCM message notification failed:', error);
      return false;
    }

    console.log('✅ Message push notification sent:', data);
    return true;
  } catch (error) {
    console.warn('⚠️ FCM message notification error:', error);
    return false;
  }
};

/**
 * Send push notification for an incoming call
 * This wakes up the device and shows the call UI even if the app is closed/killed
 */
export const sendCallNotification = async (payload: CallNotificationPayload): Promise<boolean> => {
  try {
    console.log('📲 Sending call push notification to:', payload.receiverId);
    
    const { data, error } = await supabase.functions.invoke('fcm-notify', {
      body: {
        type: 'call',
        ...payload
      }
    });

    if (error) {
      console.warn('⚠️ FCM call notification failed:', error);
      return false;
    }

    console.log('✅ Call push notification sent:', data);
    return true;
  } catch (error) {
    console.warn('⚠️ FCM call notification error:', error);
    return false;
  }
};

/**
 * Get conversation participants (excluding current user)
 */
export const getConversationRecipients = async (
  conversationId: string, 
  currentUserId: string
): Promise<Array<{ id: string; username: string; avatar_url?: string }>> => {
  try {
    // Get conversation participants
    const { data: participants, error: partError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', currentUserId);

    if (partError || !participants || participants.length === 0) {
      console.log('No participants found:', partError);
      return [];
    }

    const recipientIds = participants.map(p => p.user_id);

    // Get recipient profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', recipientIds);

    if (profileError) {
      console.error('Failed to get recipient profiles:', profileError);
      return [];
    }

    return profiles || [];
  } catch (error) {
    console.error('Error getting conversation recipients:', error);
    return [];
  }
};

/**
 * Notify all participants of a conversation about a new message
 */
export const notifyConversationParticipants = async (
  conversationId: string,
  senderId: string,
  senderName: string,
  senderAvatar: string | undefined,
  messageId: string,
  messageContent: string,
  isGroup: boolean = false
): Promise<void> => {
  try {
    const recipients = await getConversationRecipients(conversationId, senderId);
    
    if (recipients.length === 0) {
      console.log('No recipients to notify');
      return;
    }

    console.log(`📲 Notifying ${recipients.length} recipient(s) about new message`);

    // Send notifications in parallel
    await Promise.allSettled(
      recipients.map(recipient =>
        sendMessageNotification({
          recipientId: recipient.id,
          senderId,
          senderName,
          senderAvatar,
          conversationId,
          messageContent: messageContent.slice(0, 100), // Truncate for notification
          messageId,
          isGroup
        })
      )
    );
  } catch (error) {
    console.error('Error notifying participants:', error);
  }
};
