/**
 * CHATR ACTIONS ENGINE (CAE) - Centralized Action Execution System
 * Executes all actions through a single engine: job apply, book doctor, find service, etc.
 */

import { ActionType, AgentType } from './types';
import { memoryLayer } from './memoryLayer';

// ============ Action Definitions ============

interface ActionDefinition {
  type: ActionType;
  name: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  requiresAuth: boolean;
  requiresPayment: boolean;
  route?: string;
  handler: (params: ActionParams) => Promise<ActionResult>;
}

interface ActionParams {
  userId: string;
  agent: AgentType;
  data: Record<string, unknown>;
  context?: Record<string, unknown>;
}

interface ActionResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  nextAction?: ActionType;
  route?: string;
  error?: string;
}

interface QueuedAction {
  id: string;
  action: ActionType;
  params: ActionParams;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  createdAt: Date;
  processedAt?: Date;
  result?: ActionResult;
  retryCount: number;
  maxRetries: number;
}

// ============ Action Handlers ============

const actionHandlers: Record<ActionType, ActionDefinition> = {
  book_appointment: {
    type: 'book_appointment',
    name: 'Book Appointment',
    description: 'Book a medical or service appointment',
    requiredFields: ['providerId', 'date', 'time'],
    optionalFields: ['notes', 'reason', 'patientName'],
    requiresAuth: true,
    requiresPayment: false,
    route: '/healthcare/booking',
    handler: async (params) => {
      const { providerId, date, time, reason } = params.data;
      
      if (!providerId || !date || !time) {
        return {
          success: false,
          message: 'Missing required booking details',
          error: 'MISSING_FIELDS',
        };
      }

      // Track in memory
      memoryLayer.startTask('book_appointment', { providerId, date, time, reason });

      return {
        success: true,
        message: `Appointment ready to book for ${date} at ${time}`,
        route: `/healthcare/booking?provider=${providerId}&date=${date}&time=${time}`,
        data: { providerId, date, time, reason },
      };
    },
  },

  apply_job: {
    type: 'apply_job',
    name: 'Apply for Job',
    description: 'Submit a job application',
    requiredFields: ['jobId'],
    optionalFields: ['resumeId', 'coverLetter', 'expectedSalary'],
    requiresAuth: true,
    requiresPayment: false,
    route: '/jobs/apply',
    handler: async (params) => {
      const { jobId, jobTitle, company } = params.data;
      
      if (!jobId) {
        return {
          success: false,
          message: 'Job ID is required',
          error: 'MISSING_JOB_ID',
        };
      }

      memoryLayer.startTask('apply_job', { jobId, jobTitle, company });

      return {
        success: true,
        message: `Ready to apply for ${jobTitle || 'this position'}`,
        route: `/chatr-world/jobs/apply/${jobId}`,
        data: { jobId },
      };
    },
  },

  order_food: {
    type: 'order_food',
    name: 'Order Food',
    description: 'Place a food delivery order',
    requiredFields: ['restaurantId'],
    optionalFields: ['items', 'address', 'instructions'],
    requiresAuth: true,
    requiresPayment: true,
    route: '/food/order',
    handler: async (params) => {
      const { restaurantId, restaurantName, items } = params.data;
      
      if (!restaurantId) {
        return {
          success: false,
          message: 'Restaurant is required',
          error: 'MISSING_RESTAURANT',
        };
      }

      memoryLayer.startTask('order_food', { restaurantId, items });

      return {
        success: true,
        message: `Ready to order from ${restaurantName || 'restaurant'}`,
        route: `/chatr-world/food/order/${restaurantId}`,
        data: { restaurantId, items },
        nextAction: 'make_payment',
      };
    },
  },

  make_payment: {
    type: 'make_payment',
    name: 'Make Payment',
    description: 'Process a payment',
    requiredFields: ['amount'],
    optionalFields: ['method', 'description', 'orderId'],
    requiresAuth: true,
    requiresPayment: true,
    route: '/pay',
    handler: async (params) => {
      const { amount, description, orderId } = params.data;
      
      if (!amount) {
        return {
          success: false,
          message: 'Payment amount is required',
          error: 'MISSING_AMOUNT',
        };
      }

      memoryLayer.startTask('make_payment', { amount, orderId });

      return {
        success: true,
        message: `Ready to pay ₹${amount}`,
        route: `/chatrpay/pay?amount=${amount}&ref=${orderId || ''}`,
        data: { amount, description, orderId },
      };
    },
  },

  save_contact: {
    type: 'save_contact',
    name: 'Save Contact',
    description: 'Save a new contact',
    requiredFields: ['name'],
    optionalFields: ['phone', 'email', 'company', 'notes'],
    requiresAuth: true,
    requiresPayment: false,
    route: '/contacts/new',
    handler: async (params) => {
      const { name, phone, email } = params.data;
      
      if (!name) {
        return {
          success: false,
          message: 'Contact name is required',
          error: 'MISSING_NAME',
        };
      }

      memoryLayer.startTask('save_contact', { name, phone, email });

      return {
        success: true,
        message: `Ready to save contact: ${name}`,
        route: `/contacts/new?name=${encodeURIComponent(name as string)}${phone ? `&phone=${phone}` : ''}`,
        data: { name, phone, email },
      };
    },
  },

  set_reminder: {
    type: 'set_reminder',
    name: 'Set Reminder',
    description: 'Create a reminder',
    requiredFields: ['title', 'datetime'],
    optionalFields: ['description', 'repeat'],
    requiresAuth: true,
    requiresPayment: false,
    handler: async (params) => {
      const { title, datetime, description } = params.data;
      
      if (!title || !datetime) {
        return {
          success: false,
          message: 'Reminder title and time are required',
          error: 'MISSING_FIELDS',
        };
      }

      memoryLayer.startTask('set_reminder', { title, datetime });
      memoryLayer.remember(`Reminder set: ${title} at ${datetime}`, { type: 'reminder' });

      return {
        success: true,
        message: `Reminder set: ${title}`,
        data: { title, datetime, description },
      };
    },
  },

  file_complaint: {
    type: 'file_complaint',
    name: 'File Complaint',
    description: 'Submit a complaint or issue',
    requiredFields: ['subject', 'description'],
    optionalFields: ['category', 'priority', 'attachments'],
    requiresAuth: true,
    requiresPayment: false,
    route: '/support/complaint',
    handler: async (params) => {
      const { subject, description, category } = params.data;
      
      if (!subject || !description) {
        return {
          success: false,
          message: 'Complaint subject and description are required',
          error: 'MISSING_FIELDS',
        };
      }

      memoryLayer.startTask('file_complaint', { subject, category });

      return {
        success: true,
        message: 'Ready to submit your complaint',
        route: '/support/complaint',
        data: { subject, description, category },
      };
    },
  },

  call_service: {
    type: 'call_service',
    name: 'Call Service',
    description: 'Initiate a call to a service provider',
    requiredFields: ['phoneNumber'],
    optionalFields: ['serviceName', 'providerId'],
    requiresAuth: false,
    requiresPayment: false,
    handler: async (params) => {
      const { phoneNumber, serviceName } = params.data;
      
      if (!phoneNumber) {
        return {
          success: false,
          message: 'Phone number is required',
          error: 'MISSING_PHONE',
        };
      }

      return {
        success: true,
        message: `Ready to call ${serviceName || phoneNumber}`,
        route: `tel:${phoneNumber}`,
        data: { phoneNumber, serviceName },
      };
    },
  },

  navigate: {
    type: 'navigate',
    name: 'Navigate',
    description: 'Navigate to a location or page',
    requiredFields: ['destination'],
    optionalFields: ['coordinates', 'address'],
    requiresAuth: false,
    requiresPayment: false,
    handler: async (params) => {
      const { destination, coordinates, address } = params.data;
      
      if (!destination) {
        return {
          success: false,
          message: 'Destination is required',
          error: 'MISSING_DESTINATION',
        };
      }

      const route = coordinates 
        ? `https://maps.google.com/?q=${(coordinates as { lat: number; lon: number }).lat},${(coordinates as { lat: number; lon: number }).lon}`
        : address 
          ? `https://maps.google.com/?q=${encodeURIComponent(address as string)}`
          : destination as string;

      return {
        success: true,
        message: `Navigating to ${address || destination}`,
        route,
        data: { destination, coordinates, address },
      };
    },
  },

  none: {
    type: 'none',
    name: 'No Action',
    description: 'No action required',
    requiredFields: [],
    optionalFields: [],
    requiresAuth: false,
    requiresPayment: false,
    handler: async () => ({
      success: true,
      message: 'No action needed',
    }),
  },
};

/**
 * Chatr Actions Engine
 */
class ChatrActionsEngine {
  private actionQueue: QueuedAction[] = [];
  private isProcessing = false;
  private actionHistory: QueuedAction[] = [];

  /**
   * Execute an action
   */
  async execute(
    action: ActionType,
    params: Omit<ActionParams, 'agent'> & { agent?: AgentType }
  ): Promise<ActionResult> {
    const definition = actionHandlers[action];
    
    if (!definition) {
      return {
        success: false,
        message: `Unknown action: ${action}`,
        error: 'UNKNOWN_ACTION',
      };
    }

    // Validate required fields
    const missingFields = definition.requiredFields.filter(
      field => !params.data[field]
    );

    if (missingFields.length > 0) {
      return {
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        error: 'MISSING_FIELDS',
        data: { missingFields },
      };
    }

    // Execute the action
    try {
      console.log(`⚡ [CAE] Executing: ${action}`);
      const result = await definition.handler({
        ...params,
        agent: params.agent || 'personal',
      });
      
      // Update task in memory if tracked
      const tasks = memoryLayer.getPendingTasks();
      const task = tasks.find(t => t.action === action);
      if (task) {
        memoryLayer.updateTask(
          task.id,
          result.success ? 'completed' : 'failed',
          result
        );
      }

      return result;
    } catch (error) {
      console.error(`[CAE] Error executing ${action}:`, error);
      return {
        success: false,
        message: 'Action execution failed',
        error: error instanceof Error ? error.message : 'EXECUTION_ERROR',
      };
    }
  }

  /**
   * Queue an action for later execution
   */
  queue(
    action: ActionType,
    params: ActionParams,
    priority = 5
  ): string {
    const queuedAction: QueuedAction = {
      id: this.generateId(),
      action,
      params,
      status: 'queued',
      priority,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };

    this.actionQueue.push(queuedAction);
    this.actionQueue.sort((a, b) => b.priority - a.priority);

    console.log(`📋 [CAE] Queued: ${action} (priority: ${priority})`);
    return queuedAction.id;
  }

  /**
   * Process the action queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.actionQueue.length > 0) {
      const queuedAction = this.actionQueue.shift();
      if (!queuedAction || queuedAction.status !== 'queued') continue;

      queuedAction.status = 'processing';
      queuedAction.processedAt = new Date();

      try {
        const result = await this.execute(
          queuedAction.action,
          queuedAction.params
        );
        
        queuedAction.result = result;
        queuedAction.status = result.success ? 'completed' : 'failed';
      } catch (error) {
        queuedAction.status = 'failed';
        queuedAction.retryCount++;

        if (queuedAction.retryCount < queuedAction.maxRetries) {
          queuedAction.status = 'queued';
          this.actionQueue.push(queuedAction);
        }
      }

      this.actionHistory.push(queuedAction);
    }

    this.isProcessing = false;
  }

  /**
   * Get action definition
   */
  getActionDefinition(action: ActionType): ActionDefinition | undefined {
    return actionHandlers[action];
  }

  /**
   * Get available actions for an agent
   */
  getAgentActions(agent: AgentType): ActionType[] {
    // Import would be circular, so we define inline
    const agentActions: Record<AgentType, ActionType[]> = {
      personal: ['set_reminder', 'save_contact', 'navigate', 'none'],
      work: ['set_reminder', 'navigate', 'none'],
      search: ['navigate', 'none'],
      local: ['order_food', 'call_service', 'book_appointment', 'navigate', 'make_payment', 'none'],
      jobs: ['apply_job', 'save_contact', 'navigate', 'none'],
      health: ['book_appointment', 'call_service', 'navigate', 'none'],
    };

    return agentActions[agent] || ['none'];
  }

  /**
   * Check if action requires auth
   */
  requiresAuth(action: ActionType): boolean {
    return actionHandlers[action]?.requiresAuth ?? false;
  }

  /**
   * Check if action requires payment
   */
  requiresPayment(action: ActionType): boolean {
    return actionHandlers[action]?.requiresPayment ?? false;
  }

  /**
   * Get action history
   */
  getHistory(): QueuedAction[] {
    return [...this.actionHistory];
  }

  /**
   * Cancel a queued action
   */
  cancel(actionId: string): boolean {
    const action = this.actionQueue.find(a => a.id === actionId);
    if (action && action.status === 'queued') {
      action.status = 'cancelled';
      return true;
    }
    return false;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { queued: number; processing: number } {
    return {
      queued: this.actionQueue.filter(a => a.status === 'queued').length,
      processing: this.actionQueue.filter(a => a.status === 'processing').length,
    };
  }

  private generateId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const actionsEngine = new ChatrActionsEngine();
export type { ActionDefinition, ActionParams, ActionResult, QueuedAction };
