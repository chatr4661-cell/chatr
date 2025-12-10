/**
 * INTER-AGENT BUS - Cross-Agent Communication System
 * Enables agents to talk to each other and share context
 */

import { AgentType, ActionType, DetectedIntent } from './types';

// ============ Message Types ============

type MessageType = 
  | 'handoff'      // Agent transfers control to another
  | 'request'      // Agent requests info from another
  | 'response'     // Response to a request
  | 'broadcast'    // Broadcast to all agents
  | 'notify'       // One-way notification
  | 'escalate';    // Emergency escalation

interface AgentMessage {
  id: string;
  type: MessageType;
  from: AgentType;
  to: AgentType | 'all';
  payload: {
    query?: string;
    context?: Record<string, unknown>;
    intent?: DetectedIntent;
    action?: ActionType;
    data?: Record<string, unknown>;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  };
  timestamp: Date;
  correlationId?: string;  // For request-response tracking
  ttl?: number;            // Time to live in seconds
}

interface MessageHandler {
  agent: AgentType;
  handler: (message: AgentMessage) => Promise<AgentMessage | void>;
}

// ============ Message Queue ============

interface QueuedMessage extends AgentMessage {
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Inter-Agent Bus Service
 */
class InterAgentBusService {
  private handlers: Map<AgentType, MessageHandler['handler'][]> = new Map();
  private messageQueue: QueuedMessage[] = [];
  private messageHistory: AgentMessage[] = [];
  private correlationMap: Map<string, (response: AgentMessage) => void> = new Map();
  private isProcessing = false;

  constructor() {
    // Initialize handlers for all agents
    const agents: AgentType[] = ['personal', 'work', 'search', 'local', 'jobs', 'health'];
    agents.forEach(agent => this.handlers.set(agent, []));
  }

  /**
   * Register a message handler for an agent
   */
  registerHandler(agent: AgentType, handler: MessageHandler['handler']): void {
    const handlers = this.handlers.get(agent) || [];
    handlers.push(handler);
    this.handlers.set(agent, handlers);
    console.log(`📬 [InterAgentBus] Handler registered for ${agent}`);
  }

  /**
   * Send a message between agents
   */
  async send(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<AgentMessage | void> {
    const fullMessage: AgentMessage = {
      ...message,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.logMessage(fullMessage);

    // Handle broadcast
    if (message.to === 'all') {
      await this.broadcast(fullMessage);
      return;
    }

    // Queue the message
    const queuedMessage: QueuedMessage = {
      ...fullMessage,
      attempts: 0,
      maxAttempts: 3,
      status: 'pending',
    };

    this.messageQueue.push(queuedMessage);
    
    // Process the queue
    return this.processQueue();
  }

  /**
   * Send a request and wait for response
   */
  async request(
    from: AgentType,
    to: AgentType,
    payload: AgentMessage['payload'],
    timeout = 5000
  ): Promise<AgentMessage | null> {
    const correlationId = this.generateId();

    return new Promise((resolve) => {
      // Set timeout
      const timer = setTimeout(() => {
        this.correlationMap.delete(correlationId);
        resolve(null);
      }, timeout);

      // Register response handler
      this.correlationMap.set(correlationId, (response) => {
        clearTimeout(timer);
        this.correlationMap.delete(correlationId);
        resolve(response);
      });

      // Send the request
      this.send({
        type: 'request',
        from,
        to,
        payload,
        correlationId,
      });
    });
  }

  /**
   * Handoff from one agent to another
   */
  async handoff(
    from: AgentType,
    to: AgentType,
    query: string,
    context: Record<string, unknown>,
    intent?: DetectedIntent
  ): Promise<void> {
    console.log(`🔄 [InterAgentBus] Handoff: ${from} → ${to}`);

    await this.send({
      type: 'handoff',
      from,
      to,
      payload: {
        query,
        context,
        intent,
        priority: 'high',
      },
    });
  }

  /**
   * Escalate to another agent (emergency)
   */
  async escalate(
    from: AgentType,
    to: AgentType,
    query: string,
    reason: string
  ): Promise<void> {
    console.log(`🚨 [InterAgentBus] Escalation: ${from} → ${to} (${reason})`);

    await this.send({
      type: 'escalate',
      from,
      to,
      payload: {
        query,
        data: { reason },
        priority: 'critical',
      },
    });
  }

  /**
   * Notify an agent (one-way)
   */
  async notify(
    from: AgentType,
    to: AgentType,
    data: Record<string, unknown>
  ): Promise<void> {
    await this.send({
      type: 'notify',
      from,
      to,
      payload: { data },
    });
  }

  /**
   * Broadcast to all agents
   */
  private async broadcast(message: AgentMessage): Promise<void> {
    const agents: AgentType[] = ['personal', 'work', 'search', 'local', 'jobs', 'health'];
    
    for (const agent of agents) {
      if (agent !== message.from) {
        const handlers = this.handlers.get(agent) || [];
        for (const handler of handlers) {
          try {
            await handler(message);
          } catch (error) {
            console.error(`[InterAgentBus] Broadcast error for ${agent}:`, error);
          }
        }
      }
    }
  }

  /**
   * Process the message queue
   */
  private async processQueue(): Promise<AgentMessage | void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    let lastResponse: AgentMessage | void;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (!message) continue;

      if (message.status === 'completed' || message.status === 'failed') continue;

      message.status = 'processing';
      message.attempts++;

      try {
        const handlers = this.handlers.get(message.to as AgentType) || [];
        
        for (const handler of handlers) {
          const response = await handler(message);
          
          if (response) {
            // Handle response for request type
            if (message.correlationId && this.correlationMap.has(message.correlationId)) {
              this.correlationMap.get(message.correlationId)!(response);
            }
            lastResponse = response;
          }
        }

        message.status = 'completed';
      } catch (error) {
        console.error(`[InterAgentBus] Error processing message:`, error);
        
        if (message.attempts >= message.maxAttempts) {
          message.status = 'failed';
        } else {
          message.status = 'pending';
          this.messageQueue.push(message);
        }
      }
    }

    this.isProcessing = false;
    return lastResponse;
  }

  /**
   * Log message to history
   */
  private logMessage(message: AgentMessage): void {
    this.messageHistory.push(message);
    
    // Keep only last 100 messages
    if (this.messageHistory.length > 100) {
      this.messageHistory.shift();
    }

    console.log(`📨 [InterAgentBus] ${message.type}: ${message.from} → ${message.to}`);
  }

  /**
   * Get message history
   */
  getHistory(): AgentMessage[] {
    return [...this.messageHistory];
  }

  /**
   * Get messages for an agent
   */
  getMessagesForAgent(agent: AgentType): AgentMessage[] {
    return this.messageHistory.filter(m => m.to === agent || m.to === 'all');
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all handlers (for testing)
   */
  clearHandlers(): void {
    this.handlers.forEach((_, key) => this.handlers.set(key, []));
  }
}

export const interAgentBus = new InterAgentBusService();
export type { AgentMessage, MessageType };
