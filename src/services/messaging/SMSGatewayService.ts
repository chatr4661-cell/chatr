/**
 * SMS/RCS Gateway Service
 * Fallback messaging for non-CHATR users
 * Ready for Twilio/Vonage integration
 */

import { supabase } from '@/integrations/supabase/client';

export interface SMSMessage {
  id: string;
  to: string;
  from: string;
  body: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  type: 'sms' | 'rcs' | 'mms';
  createdAt: string;
  deliveredAt?: string;
  error?: string;
}

export interface RCSCapabilities {
  supported: boolean;
  features: {
    richCards: boolean;
    carousels: boolean;
    suggestedReplies: boolean;
    suggestedActions: boolean;
    fileTransfer: boolean;
    groupChat: boolean;
    readReceipts: boolean;
    typingIndicators: boolean;
  };
}

export interface RecipientCapability {
  phoneNumber: string;
  isChatrUser: boolean;
  rcsCapable: boolean;
  rcsFeatures?: RCSCapabilities;
  preferredChannel: 'chatr' | 'rcs' | 'sms';
  lastChecked: number;
}

class SMSGatewayServiceClass {
  private capabilityCache = new Map<string, RecipientCapability>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Check if a phone number is a CHATR user
   */
  async isChatrUser(phoneNumber: string): Promise<boolean> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('phone', normalizedPhone)
        .limit(1);

      return !error && data && data.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check RCS capability for a phone number
   * In production: Query RCS provider (Google Jibe/Twilio)
   */
  async checkRCSCapability(phoneNumber: string): Promise<RCSCapabilities> {
    // Mock implementation - would query RCS provider
    // Most modern Android phones support RCS
    const isAndroidLikely = !phoneNumber.includes('iphone'); // Simplified check
    
    return {
      supported: isAndroidLikely && Math.random() > 0.3, // 70% RCS adoption mock
      features: {
        richCards: true,
        carousels: true,
        suggestedReplies: true,
        suggestedActions: true,
        fileTransfer: true,
        groupChat: false, // RCS group chat less common
        readReceipts: true,
        typingIndicators: true,
      },
    };
  }

  /**
   * Get recipient capability (with caching)
   */
  async getRecipientCapability(phoneNumber: string): Promise<RecipientCapability> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    
    // Check cache
    const cached = this.capabilityCache.get(normalizedPhone);
    if (cached && Date.now() - cached.lastChecked < this.CACHE_TTL) {
      return cached;
    }

    // Check CHATR first
    const isChatr = await this.isChatrUser(normalizedPhone);
    if (isChatr) {
      const capability: RecipientCapability = {
        phoneNumber: normalizedPhone,
        isChatrUser: true,
        rcsCapable: false,
        preferredChannel: 'chatr',
        lastChecked: Date.now(),
      };
      this.capabilityCache.set(normalizedPhone, capability);
      return capability;
    }

    // Check RCS
    const rcsCapabilities = await this.checkRCSCapability(normalizedPhone);
    const capability: RecipientCapability = {
      phoneNumber: normalizedPhone,
      isChatrUser: false,
      rcsCapable: rcsCapabilities.supported,
      rcsFeatures: rcsCapabilities,
      preferredChannel: rcsCapabilities.supported ? 'rcs' : 'sms',
      lastChecked: Date.now(),
    };
    
    this.capabilityCache.set(normalizedPhone, capability);
    return capability;
  }

  /**
   * Send message with automatic channel selection
   */
  async sendMessage(
    to: string,
    body: string,
    from?: string,
    mediaUrl?: string
  ): Promise<SMSMessage> {
    const capability = await this.getRecipientCapability(to);
    
    console.log(`[SMSGateway] Sending to ${to} via ${capability.preferredChannel}`);

    if (capability.isChatrUser) {
      // Route through CHATR internal messaging
      return this.sendViaChatr(to, body, from);
    }

    if (capability.rcsCapable) {
      // Try RCS first, fallback to SMS
      try {
        return await this.sendViaRCS(to, body, from, mediaUrl);
      } catch (error) {
        console.warn('[SMSGateway] RCS failed, falling back to SMS:', error);
        return this.sendViaSMS(to, body, from, mediaUrl);
      }
    }

    // Default to SMS
    return this.sendViaSMS(to, body, from, mediaUrl);
  }

  /**
   * Send via CHATR internal messaging
   */
  private async sendViaChatr(
    to: string,
    body: string,
    from?: string
  ): Promise<SMSMessage> {
    // This would create a message in the conversations table
    console.log('[SMSGateway] Routing to CHATR internal messaging');
    
    return {
      id: `chatr_${Date.now()}`,
      to,
      from: from || 'CHATR',
      body,
      status: 'sent',
      type: 'sms', // Internal but tracked as SMS for consistency
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Send via RCS
   * In production: Use Google Jibe or Twilio RCS API
   */
  private async sendViaRCS(
    to: string,
    body: string,
    from?: string,
    mediaUrl?: string
  ): Promise<SMSMessage> {
    console.log('[SMSGateway] Sending via RCS');
    
    // Mock implementation - would call RCS provider API
    // RCS supports rich features like read receipts, typing, media
    
    return {
      id: `rcs_${Date.now()}`,
      to,
      from: from || 'CHATR',
      body,
      status: 'sent',
      type: 'rcs',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Send via SMS
   * In production: Use Twilio/Vonage SMS API
   */
  private async sendViaSMS(
    to: string,
    body: string,
    from?: string,
    mediaUrl?: string
  ): Promise<SMSMessage> {
    console.log('[SMSGateway] Sending via SMS');
    
    // Mock implementation - would call SMS provider API
    // In production, this calls the edge function which uses Twilio
    
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { to, body, from, mediaUrl },
      });

      if (error) throw error;

      return {
        id: data?.messageId || `sms_${Date.now()}`,
        to,
        from: from || 'CHATR',
        body,
        status: 'sent',
        type: mediaUrl ? 'mms' : 'sms',
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[SMSGateway] SMS send failed:', error);
      
      return {
        id: `sms_failed_${Date.now()}`,
        to,
        from: from || 'CHATR',
        body,
        status: 'failed',
        type: 'sms',
        createdAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'SMS send failed',
      };
    }
  }

  /**
   * Send RCS rich card
   */
  async sendRichCard(
    to: string,
    card: {
      title: string;
      description: string;
      imageUrl?: string;
      suggestions?: Array<{ text: string; postbackData: string }>;
    }
  ): Promise<SMSMessage> {
    const capability = await this.getRecipientCapability(to);
    
    if (!capability.rcsCapable) {
      // Fallback to plain text SMS
      const body = `${card.title}\n${card.description}`;
      return this.sendViaSMS(to, body);
    }

    console.log('[SMSGateway] Sending RCS rich card');
    // Mock - would send via RCS provider
    
    return {
      id: `rcs_card_${Date.now()}`,
      to,
      from: 'CHATR',
      body: JSON.stringify(card),
      status: 'sent',
      type: 'rcs',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Send invite to join CHATR
   */
  async sendChatrInvite(to: string, inviterName: string): Promise<SMSMessage> {
    const body = `${inviterName} invited you to CHATR! Get free HD calls, instant messaging, and more. Download now: https://chatr.app/download`;
    
    const capability = await this.getRecipientCapability(to);
    
    if (capability.rcsCapable) {
      return this.sendRichCard(to, {
        title: '📱 Join CHATR',
        description: `${inviterName} wants to connect with you on CHATR`,
        imageUrl: 'https://chatr.app/invite-banner.png',
        suggestions: [
          { text: 'Download Now', postbackData: 'download' },
          { text: 'Learn More', postbackData: 'info' },
        ],
      });
    }

    return this.sendViaSMS(to, body);
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (!cleaned.startsWith('+')) {
      // Assume US if no country code
      if (cleaned.length === 10) {
        cleaned = '+1' + cleaned;
      } else if (!cleaned.startsWith('1') && cleaned.length === 11) {
        cleaned = '+' + cleaned;
      } else {
        cleaned = '+' + cleaned;
      }
    }
    return cleaned;
  }

  /**
   * Get message delivery status
   */
  async getMessageStatus(messageId: string): Promise<SMSMessage['status']> {
    // Mock - would query SMS provider for delivery receipt
    return 'delivered';
  }

  /**
   * Handle incoming SMS/RCS webhook
   */
  async handleIncomingMessage(payload: {
    from: string;
    to: string;
    body: string;
    type: 'sms' | 'rcs';
  }): Promise<void> {
    console.log('[SMSGateway] Incoming message:', payload);
    
    // Check if sender is now a CHATR user
    const isChatr = await this.isChatrUser(payload.from);
    if (isChatr) {
      // Route to internal messaging
      console.log('[SMSGateway] Sender is CHATR user, routing internally');
    } else {
      // Store as external message
      console.log('[SMSGateway] External message received');
    }
  }
}

export const SMSGatewayService = new SMSGatewayServiceClass();
