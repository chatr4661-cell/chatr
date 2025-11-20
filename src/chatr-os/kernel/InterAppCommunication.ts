/**
 * CHATR OS - Inter-App Communication (IAC)
 * 
 * Enables communication between mini-apps similar to Android Intents.
 * Apps can send messages, share data, and trigger actions in other apps.
 * 
 * Week 1 - Core OS Infrastructure
 */

import { supabase } from '@/integrations/supabase/client';
import { appLifecycleManager } from './AppLifecycleManager';

export type MessageType = 'intent' | 'share' | 'deeplink' | 'broadcast';
export type MessageStatus = 'pending' | 'delivered' | 'acknowledged' | 'failed' | 'expired';

export interface InterAppMessage {
  id: string;
  sourceAppId: string;
  targetAppId: string;
  userId: string;
  messageType: MessageType;
  action: string;
  payload: Record<string, any>;
  priority: number;
  sentAt: string;
  deliveredAt?: string;
  acknowledgedAt?: string;
  expiresAt?: string;
  status: MessageStatus;
  errorMessage?: string;
}

export interface MessageHandler {
  action: string;
  handler: (message: InterAppMessage) => void | Promise<void>;
}

class InterAppCommunication {
  private messageHandlers: Map<string, MessageHandler[]> = new Map(); // packageName -> handlers
  private messageListenerChannel?: any;

  /**
   * Initialize the IAC bus
   */
  async initialize() {
    console.log('📡 CHATR OS: Initializing Inter-App Communication');
    
    // Setup real-time listener for incoming messages
    await this.setupMessageListener();
    
    // Process any pending messages
    await this.processPendingMessages();
    
    console.log('✅ Inter-App Communication ready');
  }

  /**
   * Send a message from one app to another
   */
  async sendMessage(
    sourcePackageName: string,
    targetPackageName: string,
    action: string,
    payload: Record<string, any> = {},
    options: {
      messageType?: MessageType;
      priority?: number;
      expiresIn?: number; // seconds
    } = {}
  ): Promise<InterAppMessage | null> {
    const sourceApp = appLifecycleManager.getApp(sourcePackageName);
    const targetApp = appLifecycleManager.getApp(targetPackageName);

    if (!sourceApp || !targetApp) {
      console.error('❌ Source or target app not found');
      return null;
    }

    try {
      const expiresAt = options.expiresIn
        ? new Date(Date.now() + options.expiresIn * 1000).toISOString()
        : undefined;

      const { data: message, error } = await supabase
        .from('inter_app_messages')
        .insert({
          source_app_id: sourceApp.id,
          target_app_id: targetApp.id,
          user_id: sourceApp.userId,
          message_type: options.messageType || 'intent',
          action,
          payload,
          priority: options.priority || 0,
          expires_at: expiresAt,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      const interAppMessage: InterAppMessage = {
        id: message.id,
        sourceAppId: message.source_app_id,
        targetAppId: message.target_app_id,
        userId: message.user_id,
        messageType: message.message_type as MessageType,
        action: message.action,
        payload: (message.payload as Record<string, any>) || {},
        priority: message.priority,
        sentAt: message.sent_at,
        deliveredAt: message.delivered_at,
        acknowledgedAt: message.acknowledged_at,
        expiresAt: message.expires_at,
        status: message.status as MessageStatus
      };

      console.log(`📤 Sent IAC message: ${sourceApp.appName} → ${targetApp.appName} (${action})`);
      
      // Try to deliver immediately if target app is running
      if (targetApp.lifecycleState === 'running') {
        await this.deliverMessage(interAppMessage);
      }

      return interAppMessage;
    } catch (error) {
      console.error('Failed to send IAC message:', error);
      return null;
    }
  }

  /**
   * Broadcast a message to all apps
   */
  async broadcastMessage(
    sourcePackageName: string,
    action: string,
    payload: Record<string, any> = {}
  ): Promise<void> {
    const sourceApp = appLifecycleManager.getApp(sourcePackageName);
    if (!sourceApp) {
      console.error('❌ Source app not found');
      return;
    }

    // Get all installed apps except source
    const { data: apps, error } = await supabase
      .from('chatr_os_apps')
      .select('id, app_name, package_name')
      .eq('user_id', sourceApp.userId)
      .neq('id', sourceApp.id);

    if (error || !apps) {
      console.error('Failed to fetch apps for broadcast:', error);
      return;
    }

    // Send message to each app
    for (const app of apps) {
      await this.sendMessage(
        sourcePackageName,
        app.package_name,
        action,
        payload,
        { messageType: 'broadcast', priority: -1 }
      );
    }

    console.log(`📢 Broadcasted: ${action} to ${apps.length} apps`);
  }

  /**
   * Register a message handler for an app
   */
  registerHandler(packageName: string, action: string, handler: (message: InterAppMessage) => void | Promise<void>) {
    const handlers = this.messageHandlers.get(packageName) || [];
    handlers.push({ action, handler });
    this.messageHandlers.set(packageName, handlers);
    console.log(`📝 Registered handler: ${packageName} - ${action}`);
  }

  /**
   * Unregister a message handler
   */
  unregisterHandler(packageName: string, action: string) {
    const handlers = this.messageHandlers.get(packageName);
    if (handlers) {
      const filtered = handlers.filter(h => h.action !== action);
      this.messageHandlers.set(packageName, filtered);
      console.log(`🗑️ Unregistered handler: ${packageName} - ${action}`);
    }
  }

  /**
   * Deliver a message to its target app
   */
  private async deliverMessage(message: InterAppMessage) {
    try {
      // Get target app
      const targetApp = Array.from(appLifecycleManager['activeApps'].values())
        .find(app => app.id === message.targetAppId);

      if (!targetApp) {
        console.error('❌ Target app not found for message delivery');
        return;
      }

      // Find registered handlers for this app and action
      const handlers = this.messageHandlers.get(targetApp.packageName) || [];
      const matchingHandlers = handlers.filter(h => h.action === message.action || h.action === '*');

      if (matchingHandlers.length === 0) {
        console.warn(`⚠️ No handlers registered for ${targetApp.packageName} - ${message.action}`);
        return;
      }

      // Execute all matching handlers
      for (const { handler } of matchingHandlers) {
        try {
          await handler(message);
        } catch (error) {
          console.error(`Error in message handler for ${targetApp.packageName}:`, error);
        }
      }

      // Mark as delivered
      await supabase
        .from('inter_app_messages')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq('id', message.id);

      console.log(`📥 Delivered message to ${targetApp.appName}`);
    } catch (error) {
      console.error('Failed to deliver message:', error);
      
      // Mark as failed
      await supabase
        .from('inter_app_messages')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', message.id);
    }
  }

  /**
   * Acknowledge receipt of a message
   */
  async acknowledgeMessage(messageId: string) {
    try {
      await supabase
        .from('inter_app_messages')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', messageId);
      
      console.log(`✅ Acknowledged message: ${messageId}`);
    } catch (error) {
      console.error('Failed to acknowledge message:', error);
    }
  }

  /**
   * Setup real-time listener for incoming messages
   */
  private async setupMessageListener() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    this.messageListenerChannel = supabase
      .channel('inter_app_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inter_app_messages',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const message = payload.new as any;
          const interAppMessage: InterAppMessage = {
            id: message.id,
            sourceAppId: message.source_app_id,
            targetAppId: message.target_app_id,
            userId: message.user_id,
            messageType: message.message_type,
            action: message.action,
            payload: (message.payload as Record<string, any>) || {},
            priority: message.priority,
            sentAt: message.sent_at,
            status: message.status
          };
          
          await this.deliverMessage(interAppMessage);
        }
      )
      .subscribe();

    console.log('👂 Listening for inter-app messages');
  }

  /**
   * Process any pending messages on startup
   */
  private async processPendingMessages() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: messages, error } = await supabase
        .from('inter_app_messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('sent_at', { ascending: true });

      if (error) throw error;

      if (messages && messages.length > 0) {
        console.log(`📬 Processing ${messages.length} pending messages`);
        
        for (const msg of messages) {
          const message: InterAppMessage = {
            id: msg.id,
            sourceAppId: msg.source_app_id,
            targetAppId: msg.target_app_id,
            userId: msg.user_id,
            messageType: msg.message_type as MessageType,
            action: msg.action,
            payload: (msg.payload as Record<string, any>) || {},
            priority: msg.priority,
            sentAt: msg.sent_at,
            status: msg.status as MessageStatus
          };
          
          await this.deliverMessage(message);
        }
      }
    } catch (error) {
      console.error('Failed to process pending messages:', error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.messageListenerChannel) {
      supabase.removeChannel(this.messageListenerChannel);
    }
    this.messageHandlers.clear();
    console.log('🧹 Inter-App Communication destroyed');
  }
}

// Singleton instance
export const interAppCommunication = new InterAppCommunication();
