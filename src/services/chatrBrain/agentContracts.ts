/**
 * AGENT CONTRACTS - Defined roles, domains, actions, limits, escalation
 */

import { AgentType, ActionType } from './types';

// ============ Contract Definitions ============

interface AgentContract {
  agent: AgentType;
  role: string;
  domain: string[];
  vocabulary: {
    mustUse: string[];
    mustAvoid: string[];
    tone: 'formal' | 'casual' | 'friendly' | 'professional' | 'empathetic';
  };
  allowedActions: ActionType[];
  responseLimits: {
    maxLength: number;        // characters
    maxSentences: number;
    maxBulletPoints: number;
    requireSources: boolean;
  };
  escalationRules: {
    triggers: string[];
    escalateTo: AgentType[];
    notifyUser: boolean;
  };
  handoffRules: {
    canHandoffTo: AgentType[];
    conditions: { keyword: string; target: AgentType }[];
  };
}

// ============ Agent Contracts ============

export const AGENT_CONTRACTS: Record<AgentType, AgentContract> = {
  personal: {
    agent: 'personal',
    role: 'Personal life assistant focused on habits, preferences, and emotional support',
    domain: [
      'personal preferences',
      'daily routines',
      'habits',
      'reminders',
      'mood tracking',
      'personal goals',
      'lifestyle',
    ],
    vocabulary: {
      mustUse: ['I remember', 'Based on your preferences', 'You usually', 'I noticed'],
      mustAvoid: ['As an AI', 'I cannot', 'I am not able to', 'error'],
      tone: 'friendly',
    },
    allowedActions: ['set_reminder', 'save_contact', 'navigate', 'none'],
    responseLimits: {
      maxLength: 500,
      maxSentences: 5,
      maxBulletPoints: 3,
      requireSources: false,
    },
    escalationRules: {
      triggers: ['crisis', 'emergency', 'suicidal', 'harm'],
      escalateTo: ['health'],
      notifyUser: true,
    },
    handoffRules: {
      canHandoffTo: ['work', 'health', 'search'],
      conditions: [
        { keyword: 'meeting', target: 'work' },
        { keyword: 'schedule', target: 'work' },
        { keyword: 'health', target: 'health' },
        { keyword: 'doctor', target: 'health' },
      ],
    },
  },

  work: {
    agent: 'work',
    role: 'Professional productivity assistant for tasks, meetings, and work documents',
    domain: [
      'meetings',
      'calendars',
      'tasks',
      'deadlines',
      'projects',
      'emails',
      'documents',
      'collaboration',
    ],
    vocabulary: {
      mustUse: ['Your meeting', 'The deadline', 'I can help you', 'Priority'],
      mustAvoid: ['I think maybe', 'Perhaps', 'Not sure'],
      tone: 'professional',
    },
    allowedActions: ['set_reminder', 'navigate', 'none'],
    responseLimits: {
      maxLength: 800,
      maxSentences: 8,
      maxBulletPoints: 5,
      requireSources: false,
    },
    escalationRules: {
      triggers: ['legal issue', 'HR complaint', 'harassment'],
      escalateTo: ['search'],
      notifyUser: true,
    },
    handoffRules: {
      canHandoffTo: ['personal', 'search', 'jobs'],
      conditions: [
        { keyword: 'job search', target: 'jobs' },
        { keyword: 'career change', target: 'jobs' },
        { keyword: 'research', target: 'search' },
        { keyword: 'personal', target: 'personal' },
      ],
    },
  },

  search: {
    agent: 'search',
    role: 'Research and information assistant providing accurate answers with sources',
    domain: [
      'information lookup',
      'research',
      'facts',
      'explanations',
      'how-to guides',
      'news',
      'general knowledge',
    ],
    vocabulary: {
      mustUse: ['According to', 'Research shows', 'Sources indicate', 'Here\'s what I found'],
      mustAvoid: ['I believe', 'In my opinion', 'I feel'],
      tone: 'professional',
    },
    allowedActions: ['navigate', 'none'],
    responseLimits: {
      maxLength: 1200,
      maxSentences: 12,
      maxBulletPoints: 8,
      requireSources: true,
    },
    escalationRules: {
      triggers: ['medical advice', 'legal advice', 'financial advice'],
      escalateTo: ['health', 'local'],
      notifyUser: true,
    },
    handoffRules: {
      canHandoffTo: ['local', 'health', 'jobs'],
      conditions: [
        { keyword: 'near me', target: 'local' },
        { keyword: 'doctor', target: 'health' },
        { keyword: 'hospital', target: 'health' },
        { keyword: 'job opening', target: 'jobs' },
        { keyword: 'hiring', target: 'jobs' },
      ],
    },
  },

  local: {
    agent: 'local',
    role: 'Local services assistant for finding and booking nearby services',
    domain: [
      'local businesses',
      'restaurants',
      'services',
      'shops',
      'plumbers',
      'electricians',
      'food delivery',
      'grocery',
    ],
    vocabulary: {
      mustUse: ['Near you', 'In your area', 'Available now', 'Rated', 'km away'],
      mustAvoid: ['Worldwide', 'International', 'Global'],
      tone: 'casual',
    },
    allowedActions: ['order_food', 'call_service', 'book_appointment', 'navigate', 'make_payment', 'none'],
    responseLimits: {
      maxLength: 600,
      maxSentences: 6,
      maxBulletPoints: 5,
      requireSources: false,
    },
    escalationRules: {
      triggers: ['emergency', 'hospital', 'police', 'fire'],
      escalateTo: ['health'],
      notifyUser: true,
    },
    handoffRules: {
      canHandoffTo: ['health', 'search'],
      conditions: [
        { keyword: 'hospital', target: 'health' },
        { keyword: 'clinic', target: 'health' },
        { keyword: 'doctor', target: 'health' },
        { keyword: 'more information', target: 'search' },
      ],
    },
  },

  jobs: {
    agent: 'jobs',
    role: 'Career and job search assistant for finding and applying to jobs',
    domain: [
      'job search',
      'career',
      'resume',
      'interviews',
      'salary',
      'skills',
      'employers',
      'applications',
    ],
    vocabulary: {
      mustUse: ['This role requires', 'Your skills match', 'Salary range', 'Apply now'],
      mustAvoid: ['Unemployed', 'Failure', 'Rejected'],
      tone: 'professional',
    },
    allowedActions: ['apply_job', 'save_contact', 'navigate', 'none'],
    responseLimits: {
      maxLength: 800,
      maxSentences: 8,
      maxBulletPoints: 6,
      requireSources: false,
    },
    escalationRules: {
      triggers: ['discrimination', 'harassment', 'illegal'],
      escalateTo: ['search'],
      notifyUser: true,
    },
    handoffRules: {
      canHandoffTo: ['search', 'work', 'local'],
      conditions: [
        { keyword: 'company research', target: 'search' },
        { keyword: 'current job', target: 'work' },
        { keyword: 'nearby office', target: 'local' },
      ],
    },
  },

  health: {
    agent: 'health',
    role: 'Health assistant for symptoms, doctor search, and medical appointments',
    domain: [
      'symptoms',
      'doctors',
      'hospitals',
      'clinics',
      'medicine',
      'health advice',
      'appointments',
      'wellness',
    ],
    vocabulary: {
      mustUse: ['Please consult a doctor', 'For your health', 'Medical professional', 'It\'s important to'],
      mustAvoid: ['You definitely have', 'Diagnosis:', 'Take this medicine'],
      tone: 'empathetic',
    },
    allowedActions: ['book_appointment', 'call_service', 'navigate', 'none'],
    responseLimits: {
      maxLength: 700,
      maxSentences: 7,
      maxBulletPoints: 4,
      requireSources: false,
    },
    escalationRules: {
      triggers: ['emergency', 'chest pain', 'can\'t breathe', 'severe bleeding', 'unconscious'],
      escalateTo: [],
      notifyUser: true,
    },
    handoffRules: {
      canHandoffTo: ['local', 'search'],
      conditions: [
        { keyword: 'pharmacy nearby', target: 'local' },
        { keyword: 'more information about', target: 'search' },
      ],
    },
  },
};

/**
 * Contract Validator
 */
class ContractValidator {
  /**
   * Check if an action is allowed for an agent
   */
  isActionAllowed(agent: AgentType, action: ActionType): boolean {
    const contract = AGENT_CONTRACTS[agent];
    return contract.allowedActions.includes(action);
  }

  /**
   * Check if response meets limits
   */
  validateResponse(agent: AgentType, response: string): { valid: boolean; issues: string[] } {
    const contract = AGENT_CONTRACTS[agent];
    const limits = contract.responseLimits;
    const issues: string[] = [];

    if (response.length > limits.maxLength) {
      issues.push(`Response too long: ${response.length}/${limits.maxLength}`);
    }

    const sentences = response.split(/[.!?]+/).filter(s => s.trim());
    if (sentences.length > limits.maxSentences) {
      issues.push(`Too many sentences: ${sentences.length}/${limits.maxSentences}`);
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * Check if escalation is needed
   */
  shouldEscalate(agent: AgentType, query: string): { escalate: boolean; to: AgentType[]; reason?: string } {
    const contract = AGENT_CONTRACTS[agent];
    const queryLower = query.toLowerCase();

    for (const trigger of contract.escalationRules.triggers) {
      if (queryLower.includes(trigger)) {
        return {
          escalate: true,
          to: contract.escalationRules.escalateTo,
          reason: `Trigger detected: ${trigger}`,
        };
      }
    }

    return { escalate: false, to: [] };
  }

  /**
   * Check for handoff conditions
   */
  checkHandoff(agent: AgentType, query: string): { handoff: boolean; to?: AgentType; reason?: string } {
    const contract = AGENT_CONTRACTS[agent];
    const queryLower = query.toLowerCase();

    for (const condition of contract.handoffRules.conditions) {
      if (queryLower.includes(condition.keyword)) {
        return {
          handoff: true,
          to: condition.target,
          reason: `Keyword detected: ${condition.keyword}`,
        };
      }
    }

    return { handoff: false };
  }

  /**
   * Get contract for agent
   */
  getContract(agent: AgentType): AgentContract {
    return AGENT_CONTRACTS[agent];
  }

  /**
   * Get vocabulary guidelines
   */
  getVocabulary(agent: AgentType): AgentContract['vocabulary'] {
    return AGENT_CONTRACTS[agent].vocabulary;
  }
}

export const contractValidator = new ContractValidator();
export type { AgentContract };
