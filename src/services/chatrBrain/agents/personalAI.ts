/**
 * PERSONAL AI AGENT
 * Handles habits, tone, preferences, reminders, personal context
 */

import { AgentType, ActionType, DetectedIntent } from '../types';
import { memoryLayer } from '../memoryLayer';

export interface AgentResponse {
  message: string;
  confidence: number;
  actions: {
    type: ActionType;
    data: Record<string, unknown>;
    ready: boolean;
  }[];
  metadata?: Record<string, unknown>;
}

export interface AgentContext {
  query: string;
  intent: DetectedIntent;
  userId: string;
  memory: string;
  globalContext: string;
}

export interface IAgent {
  readonly type: AgentType;
  readonly name: string;
  process(context: AgentContext): Promise<AgentResponse>;
  getCapabilities(): string[];
}

/**
 * Personal AI Agent
 * Learns user habits, tone, preferences; handles reminders and personal tasks
 */
class PersonalAIAgent implements IAgent {
  readonly type: AgentType = 'personal';
  readonly name = 'Personal AI';

  /**
   * Process a query and generate response
   */
  async process(context: AgentContext): Promise<AgentResponse> {
    const { query, intent, userId } = context;
    
    // Get agent-specific memory
    memoryLayer.agentRecall(this.type, query, 3);
    
    // Detect personal patterns
    const patterns = this.detectPatterns(query);
    
    // Build response
    const response = await this.generateResponse(context, patterns);
    
    // Store interaction in memory
    memoryLayer.agentRemember(this.type, `User query: ${query}`, {
      intent: intent.primary,
      patterns,
      timestamp: new Date().toISOString(),
    });
    
    // Infer preferences from query
    this.inferPreferences(query, userId);
    
    return response;
  }

  /**
   * Detect personal patterns in query
   */
  private detectPatterns(query: string): string[] {
    const patterns: string[] = [];
    const queryLower = query.toLowerCase();
    
    if (/remind|remember|don't forget/i.test(queryLower)) patterns.push('reminder');
    if (/my|me|i want|i need|i like/i.test(queryLower)) patterns.push('personal');
    if (/habit|routine|daily|every day/i.test(queryLower)) patterns.push('habit');
    if (/prefer|favorite|like|love/i.test(queryLower)) patterns.push('preference');
    if (/mood|feeling|stressed|happy|sad/i.test(queryLower)) patterns.push('emotional');
    if (/help|guide|how do i/i.test(queryLower)) patterns.push('assistance');
    
    return patterns;
  }

  /**
   * Generate response based on context and patterns
   */
  private async generateResponse(
    context: AgentContext,
    patterns: string[]
  ): Promise<AgentResponse> {
    const { query, intent } = context;
    const actions: AgentResponse['actions'] = [];
    let confidence = 0.7;
    
    // Handle reminder requests
    if (patterns.includes('reminder') || intent.actionRequired === 'set_reminder') {
      const reminderData = this.extractReminderData(query, intent);
      if (reminderData.title) {
        actions.push({
          type: 'set_reminder',
          data: reminderData,
          ready: !!reminderData.datetime,
        });
        confidence = 0.9;
      }
    }
    
    // Handle contact saving
    if (intent.actionRequired === 'save_contact') {
      const contactData = this.extractContactData(query, intent);
      if (contactData.name) {
        actions.push({
          type: 'save_contact',
          data: contactData,
          ready: true,
        });
        confidence = 0.85;
      }
    }
    
    // Build personalized message
    const message = this.buildMessage(context, patterns, actions);
    
    return {
      message,
      confidence,
      actions,
      metadata: {
        patterns,
        preferences: memoryLayer.getAllPreferences().length,
      },
    };
  }

  /**
   * Extract reminder data from query
   */
  private extractReminderData(query: string, intent: DetectedIntent): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    
    // Extract title (remove reminder keywords)
    const title = query
      .replace(/remind me to|remind me about|set a reminder for|remember to/gi, '')
      .replace(/at \d{1,2}(:\d{2})?\s?(am|pm)?/gi, '')
      .replace(/tomorrow|today|next week/gi, '')
      .trim();
    
    if (title) data.title = title;
    
    // Use intent entities for date/time
    if (intent.entities.date) data.date = intent.entities.date;
    if (intent.entities.time) data.time = intent.entities.time;
    
    // Combine into datetime if both present
    if (data.date || data.time) {
      data.datetime = `${data.date || 'today'} ${data.time || '09:00'}`;
    }
    
    return data;
  }

  /**
   * Extract contact data from query
   */
  private extractContactData(query: string, intent: DetectedIntent): Record<string, unknown> {
    return {
      name: intent.entities.person || '',
      phone: query.match(/\d{10}/)?.[0] || '',
    };
  }

  /**
   * Build personalized message
   */
  private buildMessage(
    context: AgentContext,
    patterns: string[],
    actions: AgentResponse['actions']
  ): string {
    const { query } = context;
    
    // Check for tone preference
    const tone = memoryLayer.getPreference<string>('communication_tone') || 'friendly';
    
    if (actions.length > 0 && actions[0].ready) {
      const action = actions[0];
      if (action.type === 'set_reminder') {
        return `I'll remind you about "${action.data.title}"${action.data.datetime ? ` at ${action.data.datetime}` : ''}. Would you like me to set this reminder?`;
      }
      if (action.type === 'save_contact') {
        return `I'll save ${action.data.name} to your contacts. Ready when you are!`;
      }
    }
    
    if (patterns.includes('emotional')) {
      return `I hear you. How can I help make things better today?`;
    }
    
    if (patterns.includes('preference')) {
      return `I've noted your preference. I'll remember this for future conversations.`;
    }
    
    return `I understand you're asking about something personal. How can I assist you further?`;
  }

  /**
   * Infer user preferences from query
   */
  private inferPreferences(query: string, _userId: string): void {
    const queryLower = query.toLowerCase();
    
    // Infer communication style
    if (/please|kindly|would you/i.test(queryLower)) {
      memoryLayer.inferPreference('communication_style', 'polite');
    }
    
    // Infer time preferences
    if (/morning|early/i.test(queryLower)) {
      memoryLayer.inferPreference('preferred_time', 'morning');
    } else if (/evening|night|late/i.test(queryLower)) {
      memoryLayer.inferPreference('preferred_time', 'evening');
    }
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): string[] {
    return [
      'Remember user preferences',
      'Set reminders',
      'Save contacts',
      'Track habits',
      'Personal assistance',
      'Mood tracking',
    ];
  }
}

export const personalAI = new PersonalAIAgent();
