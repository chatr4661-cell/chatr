/**
 * CHATR BRAIN - Type Definitions
 * Core types for the unified AI routing system
 */

// ============ Agent Types ============
export type AgentType = 
  | 'personal'   // Personal AI - habits, tone, preferences
  | 'work'       // Work AI - tasks, docs, meetings
  | 'search'     // Search AI - Perplexity-style answers
  | 'local'      // Local Services AI - plumbers, food, doctors
  | 'jobs'       // Job-Matching AI - resume, skills, applications
  | 'health';    // Health AI - symptoms, doctor search

// ============ Intent Types ============
export type IntentCategory = 
  | 'question'      // Asking for information
  | 'action'        // Wants to complete a task
  | 'search'        // Looking for something
  | 'booking'       // Wants to book/schedule
  | 'transaction'   // Wants to pay/buy
  | 'support'       // Needs help/guidance
  | 'conversation'; // General chat

// ============ Action Types ============
export type ActionType = 
  | 'book_appointment'
  | 'apply_job'
  | 'order_food'
  | 'make_payment'
  | 'save_contact'
  | 'set_reminder'
  | 'file_complaint'
  | 'call_service'
  | 'navigate'
  | 'none';

// ============ Core Interfaces ============

export interface DetectedIntent {
  primary: IntentCategory;
  confidence: number;
  agents: AgentType[];      // Which agents to involve
  actionRequired: ActionType;
  keywords: string[];
  entities: {
    location?: string;
    date?: string;
    time?: string;
    amount?: number;
    person?: string;
    service?: string;
    condition?: string;   // For health
    skill?: string;       // For jobs
  };
}

export interface SharedContext {
  userId: string;
  location: {
    lat?: number;
    lon?: number;
    city?: string;
    state?: string;
    country?: string;
  };
  preferences: {
    responseStyle: 'detailed' | 'concise' | 'technical' | 'simple';
    language: string;
    tone: 'formal' | 'casual' | 'friendly';
  };
  memory: {
    recentQueries: string[];
    interests: string[];
    healthHistory?: string[];
    jobPreferences?: {
      skills: string[];
      salary?: number;
      type?: string;
    };
    savedLocations?: string[];
  };
  session: {
    conversationId?: string;
    lastAgent?: AgentType;
    lastAction?: ActionType;
    timestamp: Date;
  };
}

export interface AgentPersona {
  name: string;
  type: AgentType;
  systemPrompt: string;
  capabilities: string[];
  restrictions: string[];
  tone: string;
  responseFormat: string;
}

export interface AgentResponse {
  text: string;
  agent: AgentType;
  confidence: number;
  action?: {
    type: ActionType;
    data: Record<string, unknown>;
    ready: boolean;
  };
  sources?: string[];
  followUp?: string[];
}

export interface BrainRequest {
  query: string;
  userId: string;
  context?: Partial<SharedContext>;
  forceAgent?: AgentType;
}

export interface BrainResponse {
  answer: string;
  agents: AgentType[];
  intent: DetectedIntent;
  action?: {
    type: ActionType;
    data: Record<string, unknown>;
    ready: boolean;
    buttonLabel?: string;
    route?: string;
  };
  sources?: string[];
  followUp?: string[];
  latencyMs: number;
}
