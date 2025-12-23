import { supabase } from '@/integrations/supabase/client';

/**
 * Notification Service - handles sending push notifications
 */
export const NotificationService = {
  /**
   * Send a push notification to a user
   */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
    notificationType: 'chat' | 'call' | 'group' | 'transaction' | 'update' | 'marketing' = 'chat'
  ): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId,
          title,
          body,
          data,
          notificationType
        }
      });

      if (error) {
        console.error('Push notification error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      return false;
    }
  },

  /**
   * Send a chat message notification
   */
  async sendChatNotification(
    recipientId: string,
    senderName: string,
    message: string,
    conversationId: string
  ): Promise<boolean> {
    return this.sendToUser(
      recipientId,
      senderName,
      message.length > 50 ? message.substring(0, 50) + '...' : message,
      {
        conversationId,
        click_action: `/chat/${conversationId}`
      },
      'chat'
    );
  },

  /**
   * Send an incoming call notification
   */
  async sendCallNotification(
    recipientId: string,
    callerName: string,
    callId: string,
    isVideo: boolean
  ): Promise<boolean> {
    return this.sendToUser(
      recipientId,
      `Incoming ${isVideo ? 'Video' : 'Voice'} Call`,
      `${callerName} is calling you...`,
      {
        callId,
        callerName,
        isVideo,
        notificationType: 'call',
        click_action: `/call/${callId}`
      },
      'call'
    );
  },

  /**
   * Send a missed call notification
   */
  async sendMissedCallNotification(
    recipientId: string,
    callerName: string,
    callId: string,
    isVideo: boolean
  ): Promise<boolean> {
    return this.sendToUser(
      recipientId,
      `Missed ${isVideo ? 'Video' : 'Voice'} Call`,
      `You missed a call from ${callerName}`,
      {
        callId,
        callerName,
        isVideo,
        notificationType: 'missed_call',
        click_action: '/call-history'
      },
      'call'
    );
  },

  /**
   * Send a group notification
   */
  async sendGroupNotification(
    recipientIds: string[],
    title: string,
    body: string,
    groupId: string
  ): Promise<void> {
    await Promise.allSettled(
      recipientIds.map(userId =>
        this.sendToUser(
          userId,
          title,
          body,
          {
            groupId,
            click_action: `/chat/${groupId}`
          },
          'group'
        )
      )
    );
  },

  /**
   * Send a transaction notification
   */
  async sendTransactionNotification(
    userId: string,
    title: string,
    body: string,
    transactionId: string
  ): Promise<boolean> {
    return this.sendToUser(
      userId,
      title,
      body,
      {
        transactionId,
        click_action: '/chatr-wallet'
      },
      'transaction'
    );
  },

  /**
   * Send a KYC status notification
   */
  async sendKYCNotification(
    userId: string,
    status: 'approved' | 'rejected',
    reason?: string
  ): Promise<boolean> {
    const title = status === 'approved' 
      ? '✅ KYC Verification Approved' 
      : '❌ KYC Verification Rejected';
    
    const body = status === 'approved'
      ? 'Your identity has been verified successfully.'
      : `Your verification was rejected. ${reason || 'Please resubmit your documents.'}`;

    return this.sendToUser(
      userId,
      title,
      body,
      {
        click_action: '/kyc-verification'
      },
      'update'
    );
  }
};
