/**
 * Agent Auto-Reply Service
 * Intercepts Chatr messages and auto-replies using AI agents
 */

import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface AutoReplyConfig {
  enabled: boolean;
  agentId: string | null;
  excludedConversations: string[];
  responseDelay: number; // ms
  onlyWhenAway: boolean;
}

interface AutoReplyService {
  start: () => void;
  stop: () => void;
  setConfig: (config: Partial<AutoReplyConfig>) => void;
  getConfig: () => AutoReplyConfig;
  isRunning: () => boolean;
}

let channel: RealtimeChannel | null = null;
let currentUserId: string | null = null;
let isProcessing = false;

const defaultConfig: AutoReplyConfig = {
  enabled: false,
  agentId: null,
  excludedConversations: [],
  responseDelay: 2000,
  onlyWhenAway: false
};

let config: AutoReplyConfig = { ...defaultConfig };

// Store for tracking replied messages to avoid duplicates
const repliedMessages = new Set<string>();

async function handleIncomingMessage(payload: any) {
  if (!config.enabled || !config.agentId || isProcessing) return;
  
  const message = payload.new;
  
  // Skip if we already replied to this message
  if (repliedMessages.has(message.id)) return;
  
  // Skip our own messages
  if (message.sender_id === currentUserId) return;
  
  // Skip excluded conversations
  if (config.excludedConversations.includes(message.conversation_id)) return;
  
  // Skip non-text messages
  if (message.message_type !== 'text') return;

  // Mark as processing to prevent duplicate replies
  isProcessing = true;
  repliedMessages.add(message.id);

  try {
    // Add delay for natural feel
    await new Promise(resolve => setTimeout(resolve, config.responseDelay));

    // Get conversation history for context
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('content, sender_id')
      .eq('conversation_id', message.conversation_id)
      .order('created_at', { ascending: false })
      .limit(10);

    const history = (recentMessages || []).reverse().map(m => ({
      role: m.sender_id === currentUserId ? 'assistant' : 'user',
      content: m.content
    }));

    // Get AI agent response
    const { data, error } = await supabase.functions.invoke('ai-agent-chat', {
      body: {
        agentId: config.agentId,
        message: message.content,
        conversationHistory: history
      }
    });

    if (error) throw error;

    // Send the auto-reply
    await supabase.from('messages').insert({
      conversation_id: message.conversation_id,
      sender_id: currentUserId,
      content: data.reply,
      message_type: 'text',
      metadata: { autoReply: true, agentId: config.agentId }
    });

    console.log('📤 Auto-reply sent:', data.reply.substring(0, 50) + '...');

  } catch (error) {
    console.error('Auto-reply error:', error);
  } finally {
    isProcessing = false;
  }
}

async function start() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('Cannot start auto-reply: not authenticated');
    return;
  }

  currentUserId = user.id;

  // Subscribe to new messages
  channel = supabase
    .channel('auto-reply-messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },
      handleIncomingMessage
    )
    .subscribe();

  console.log('🤖 Auto-reply service started');
}

function stop() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
  repliedMessages.clear();
  console.log('🤖 Auto-reply service stopped');
}

function setConfig(newConfig: Partial<AutoReplyConfig>) {
  config = { ...config, ...newConfig };
  
  // Save to local storage for persistence
  localStorage.setItem('chatr_auto_reply_config', JSON.stringify(config));
  
  // Start/stop based on enabled state
  if (config.enabled && !channel) {
    start();
  } else if (!config.enabled && channel) {
    stop();
  }
}

function getConfig(): AutoReplyConfig {
  // Load from local storage
  const saved = localStorage.getItem('chatr_auto_reply_config');
  if (saved) {
    try {
      config = { ...defaultConfig, ...JSON.parse(saved) };
    } catch {
      config = { ...defaultConfig };
    }
  }
  return config;
}

function isRunning(): boolean {
  return channel !== null;
}

export const agentAutoReply: AutoReplyService = {
  start,
  stop,
  setConfig,
  getConfig,
  isRunning
};

// React hook for auto-reply
export function useAutoReply() {
  const config = getConfig();
  
  const enable = (agentId: string) => {
    setConfig({ enabled: true, agentId });
  };
  
  const disable = () => {
    setConfig({ enabled: false });
  };
  
  const setDelay = (ms: number) => {
    setConfig({ responseDelay: ms });
  };
  
  const excludeConversation = (conversationId: string) => {
    const excluded = [...config.excludedConversations, conversationId];
    setConfig({ excludedConversations: excluded });
  };
  
  const includeConversation = (conversationId: string) => {
    const excluded = config.excludedConversations.filter(id => id !== conversationId);
    setConfig({ excludedConversations: excluded });
  };

  return {
    config,
    enable,
    disable,
    setDelay,
    excludeConversation,
    includeConversation,
    isRunning: isRunning()
  };
}
