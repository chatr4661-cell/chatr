/**
 * CHATR BRAIN - Action Dispatcher
 * Connects AI outputs to actual transactions and actions
 */

import { ActionType, AgentType, DetectedIntent } from './types';

export interface ActionConfig {
  type: ActionType;
  route: string;
  buttonLabel: string;
  requiredFields: string[];
  description: string;
}

/**
 * Action configurations
 */
const ACTION_CONFIGS: Record<ActionType, ActionConfig> = {
  book_appointment: {
    type: 'book_appointment',
    route: '/chatr-world/healthcare',
    buttonLabel: 'Book Appointment',
    requiredFields: ['service', 'date'],
    description: 'Book a healthcare or service appointment',
  },
  apply_job: {
    type: 'apply_job',
    route: '/chatr-world/jobs',
    buttonLabel: 'Apply Now',
    requiredFields: ['jobId'],
    description: 'Apply for a job position',
  },
  order_food: {
    type: 'order_food',
    route: '/chatr-world/food',
    buttonLabel: 'Order Food',
    requiredFields: ['restaurantId'],
    description: 'Order food from a restaurant',
  },
  make_payment: {
    type: 'make_payment',
    route: '/chatr-wallet',
    buttonLabel: 'Pay Now',
    requiredFields: ['amount'],
    description: 'Make a payment via ChatrPay',
  },
  save_contact: {
    type: 'save_contact',
    route: '/contacts',
    buttonLabel: 'Save Contact',
    requiredFields: ['phone'],
    description: 'Save a new contact',
  },
  set_reminder: {
    type: 'set_reminder',
    route: '/reminders',
    buttonLabel: 'Set Reminder',
    requiredFields: ['message', 'time'],
    description: 'Set a reminder',
  },
  file_complaint: {
    type: 'file_complaint',
    route: '/support',
    buttonLabel: 'File Complaint',
    requiredFields: ['description'],
    description: 'File a complaint or report an issue',
  },
  call_service: {
    type: 'call_service',
    route: '/call',
    buttonLabel: 'Call Now',
    requiredFields: ['phone'],
    description: 'Call a service provider',
  },
  navigate: {
    type: 'navigate',
    route: '/maps',
    buttonLabel: 'Get Directions',
    requiredFields: ['destination'],
    description: 'Navigate to a location',
  },
  none: {
    type: 'none',
    route: '',
    buttonLabel: '',
    requiredFields: [],
    description: 'No action required',
  },
};

export interface DispatchedAction {
  type: ActionType;
  config: ActionConfig;
  data: Record<string, unknown>;
  ready: boolean;
  missingFields: string[];
}

/**
 * Action Dispatcher Service
 * Prepares actions for execution based on AI intent detection
 */
class ActionDispatcherService {
  /**
   * Prepare action from detected intent
   */
  prepareAction(
    intent: DetectedIntent,
    agent: AgentType,
    extractedData: Record<string, unknown> = {}
  ): DispatchedAction | null {
    if (intent.actionRequired === 'none') {
      return null;
    }

    const config = ACTION_CONFIGS[intent.actionRequired];
    
    // Merge extracted entities with provided data
    const data: Record<string, unknown> = {
      ...extractedData,
      ...intent.entities,
      agent,
      intent: intent.primary,
    };

    // Check which required fields are missing
    const missingFields = config.requiredFields.filter(
      field => !data[field] && data[field] !== 0
    );

    return {
      type: intent.actionRequired,
      config,
      data,
      ready: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Get action config by type
   */
  getActionConfig(type: ActionType): ActionConfig {
    return ACTION_CONFIGS[type];
  }

  /**
   * Build action button for UI
   */
  buildActionButton(action: DispatchedAction): {
    label: string;
    route: string;
    params: Record<string, string>;
    disabled: boolean;
    tooltip?: string;
  } {
    if (!action.ready) {
      return {
        label: action.config.buttonLabel,
        route: action.config.route,
        params: {},
        disabled: true,
        tooltip: `Missing: ${action.missingFields.join(', ')}`,
      };
    }

    // Build query params from data
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(action.data)) {
      if (value !== undefined && value !== null) {
        params[key] = String(value);
      }
    }

    return {
      label: action.config.buttonLabel,
      route: action.config.route,
      params,
      disabled: false,
    };
  }

  /**
   * Get suggested follow-up actions based on agent type
   */
  getSuggestedActions(agent: AgentType): ActionType[] {
    switch (agent) {
      case 'health':
        return ['book_appointment', 'call_service', 'navigate'];
      case 'jobs':
        return ['apply_job', 'save_contact'];
      case 'local':
        return ['book_appointment', 'order_food', 'call_service', 'navigate'];
      case 'work':
        return ['set_reminder', 'make_payment'];
      case 'personal':
        return ['set_reminder', 'save_contact'];
      case 'search':
        return ['navigate', 'save_contact'];
      default:
        return [];
    }
  }

  /**
   * Check if action requires authentication
   */
  requiresAuth(type: ActionType): boolean {
    const authRequired: ActionType[] = [
      'book_appointment',
      'apply_job',
      'order_food',
      'make_payment',
      'save_contact',
      'set_reminder',
      'file_complaint',
    ];
    return authRequired.includes(type);
  }

  /**
   * Check if action requires payment
   */
  requiresPayment(type: ActionType): boolean {
    return type === 'make_payment' || type === 'order_food' || type === 'book_appointment';
  }
}

export const actionDispatcher = new ActionDispatcherService();
