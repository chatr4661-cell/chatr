/**
 * WORK AI AGENT
 * Handles tasks, documents, meetings, schedules, work-related queries
 */

import { AgentType, ActionType, DetectedIntent } from '../types';
import { memoryLayer } from '../memoryLayer';
import { AgentResponse, AgentContext } from './personalAI';

/**
 * Work AI Agent
 * Manages work tasks, meetings, documents, and professional context
 */
class WorkAIAgent {
  readonly type: AgentType = 'work';
  readonly name = 'Work AI';

  /**
   * Process a work-related query
   */
  async process(context: AgentContext): Promise<AgentResponse> {
    const { query, intent } = context;
    
    // Get work-specific memory
    const workMemory = memoryLayer.agentRecall(this.type, query, 3);
    
    // Detect work patterns
    const patterns = this.detectPatterns(query);
    
    // Build response
    const response = await this.generateResponse(context, patterns);
    
    // Store in agent memory
    memoryLayer.agentRemember(this.type, `Work query: ${query}`, {
      intent: intent.primary,
      patterns,
      timestamp: new Date().toISOString(),
    });
    
    return response;
  }

  /**
   * Detect work-related patterns
   */
  private detectPatterns(query: string): string[] {
    const patterns: string[] = [];
    const queryLower = query.toLowerCase();
    
    if (/meeting|calendar|schedule|appointment/i.test(queryLower)) patterns.push('meeting');
    if (/deadline|due|urgent|priority/i.test(queryLower)) patterns.push('deadline');
    if (/task|todo|to-do|work on/i.test(queryLower)) patterns.push('task');
    if (/email|message|send|reply/i.test(queryLower)) patterns.push('communication');
    if (/document|file|report|presentation/i.test(queryLower)) patterns.push('document');
    if (/team|colleague|boss|manager/i.test(queryLower)) patterns.push('team');
    if (/project|sprint|milestone/i.test(queryLower)) patterns.push('project');
    if (/summarize|summary|brief/i.test(queryLower)) patterns.push('summary');
    
    return patterns;
  }

  /**
   * Generate work-focused response
   */
  private async generateResponse(
    context: AgentContext,
    patterns: string[]
  ): Promise<AgentResponse> {
    const { query, intent } = context;
    const actions: AgentResponse['actions'] = [];
    let confidence = 0.75;
    let message = '';
    
    // Handle meeting-related queries
    if (patterns.includes('meeting')) {
      const meetingData = this.extractMeetingData(query, intent);
      if (meetingData.title || meetingData.time) {
        actions.push({
          type: 'set_reminder',
          data: {
            title: `Meeting: ${meetingData.title || 'Scheduled meeting'}`,
            datetime: meetingData.datetime,
            type: 'meeting',
          },
          ready: !!meetingData.datetime,
        });
        confidence = 0.85;
        message = `I'll help you with your meeting${meetingData.title ? ` about "${meetingData.title}"` : ''}. `;
      }
    }
    
    // Handle task-related queries
    if (patterns.includes('task') || patterns.includes('deadline')) {
      const taskData = this.extractTaskData(query, intent);
      if (taskData.title) {
        actions.push({
          type: 'set_reminder',
          data: {
            title: taskData.title,
            datetime: taskData.deadline,
            type: 'task',
          },
          ready: true,
        });
        confidence = 0.85;
        message += `I've noted the task "${taskData.title}"${taskData.deadline ? ` with deadline ${taskData.deadline}` : ''}. `;
      }
    }
    
    // Handle document queries
    if (patterns.includes('document')) {
      message += `I can help you find and organize your documents. What specifically are you looking for?`;
      confidence = 0.7;
    }
    
    // Handle summary requests
    if (patterns.includes('summary')) {
      message += `I can summarize information for you. Please share the content you'd like me to summarize.`;
      confidence = 0.8;
    }
    
    // Default work message
    if (!message) {
      message = `I understand this is work-related. How can I help with your professional tasks?`;
    }
    
    return {
      message: message.trim(),
      confidence,
      actions,
      metadata: {
        patterns,
        workContext: 'active',
      },
    };
  }

  /**
   * Extract meeting data
   */
  private extractMeetingData(query: string, intent: DetectedIntent): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    
    // Extract meeting title
    const titleMatch = query.match(/meeting (with|about|for) (.+?)( at| on| tomorrow|$)/i);
    if (titleMatch) data.title = titleMatch[2].trim();
    
    // Use intent entities
    if (intent.entities.date) data.date = intent.entities.date;
    if (intent.entities.time) data.time = intent.entities.time;
    if (intent.entities.person) data.attendee = intent.entities.person;
    
    if (data.date || data.time) {
      data.datetime = `${data.date || 'today'} ${data.time || '10:00'}`;
    }
    
    return data;
  }

  /**
   * Extract task data
   */
  private extractTaskData(query: string, intent: DetectedIntent): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    
    // Extract task title
    const title = query
      .replace(/add task|create task|new task|remind me to/gi, '')
      .replace(/by |before |due /gi, '')
      .replace(/tomorrow|today|next week/gi, '')
      .trim();
    
    if (title) data.title = title;
    if (intent.entities.date) data.deadline = intent.entities.date;
    
    return data;
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): string[] {
    return [
      'Schedule meetings',
      'Track tasks and deadlines',
      'Summarize documents',
      'Draft emails',
      'Project management',
      'Team coordination',
    ];
  }
}

export const workAI = new WorkAIAgent();
