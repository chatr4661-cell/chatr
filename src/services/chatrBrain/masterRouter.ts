/**
 * MASTER ROUTER - Central Brain for Agent Coordination
 * Decides which agent, when, priority, confidence, fallbacks, overrides
 */

import { AgentType, DetectedIntent, IntentCategory, ActionType } from './types';

// ============ Router Configuration ============

interface AgentScore {
  agent: AgentType;
  score: number;
  confidence: number;
  reason: string;
}

interface RoutingDecision {
  primary: AgentType;
  secondary: AgentType[];
  confidence: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  fallbackChain: AgentType[];
  overrideReason?: string;
}

interface RoutingContext {
  query: string;
  intent: DetectedIntent;
  userHistory?: string[];
  currentAgent?: AgentType;
  urgency?: number;
}

// Confidence thresholds
const THRESHOLDS = {
  HIGH_CONFIDENCE: 0.85,
  MEDIUM_CONFIDENCE: 0.6,
  LOW_CONFIDENCE: 0.4,
  MINIMUM_CONFIDENCE: 0.2,
};

// Priority keywords
const PRIORITY_KEYWORDS = {
  critical: ['emergency', 'urgent', 'immediately', 'asap', 'help now', 'dying', 'accident'],
  high: ['important', 'soon', 'today', 'need', 'must', 'quickly'],
  medium: ['want', 'looking for', 'interested', 'could you'],
  low: ['maybe', 'someday', 'curious', 'wondering', 'just asking'],
};

// Agent domain keywords with weights
const AGENT_KEYWORDS: Record<AgentType, { keywords: string[]; weight: number }[]> = {
  personal: [
    { keywords: ['my', 'me', 'i want', 'i need', 'i like', 'i prefer'], weight: 0.3 },
    { keywords: ['habit', 'routine', 'reminder', 'preference', 'favorite'], weight: 0.8 },
    { keywords: ['mood', 'feeling', 'personal', 'private'], weight: 0.7 },
  ],
  work: [
    { keywords: ['meeting', 'calendar', 'schedule', 'deadline', 'project'], weight: 0.9 },
    { keywords: ['colleague', 'boss', 'team', 'office', 'work', 'task'], weight: 0.8 },
    { keywords: ['email', 'document', 'report', 'presentation'], weight: 0.7 },
  ],
  search: [
    { keywords: ['what is', 'how to', 'why', 'explain', 'tell me about'], weight: 0.8 },
    { keywords: ['search', 'find information', 'look up', 'research'], weight: 0.9 },
    { keywords: ['news', 'latest', 'current', 'trending'], weight: 0.7 },
  ],
  local: [
    { keywords: ['near me', 'nearby', 'around', 'local', 'closest'], weight: 0.95 },
    { keywords: ['restaurant', 'shop', 'store', 'service', 'plumber', 'electrician'], weight: 0.85 },
    { keywords: ['food', 'delivery', 'order', 'grocery'], weight: 0.8 },
  ],
  jobs: [
    { keywords: ['job', 'career', 'hiring', 'vacancy', 'opening', 'position'], weight: 0.95 },
    { keywords: ['salary', 'interview', 'resume', 'cv', 'apply'], weight: 0.9 },
    { keywords: ['company', 'employer', 'work experience', 'skills'], weight: 0.7 },
  ],
  health: [
    { keywords: ['doctor', 'hospital', 'clinic', 'medical', 'health'], weight: 0.95 },
    { keywords: ['symptom', 'pain', 'sick', 'fever', 'cough', 'headache'], weight: 0.9 },
    { keywords: ['medicine', 'prescription', 'pharmacy', 'treatment'], weight: 0.85 },
    { keywords: ['appointment', 'checkup', 'diagnosis'], weight: 0.8 },
  ],
};

// Fallback chains - what agent to try if primary fails
const FALLBACK_CHAINS: Record<AgentType, AgentType[]> = {
  personal: ['search', 'work'],
  work: ['personal', 'search'],
  search: ['local', 'personal'],
  local: ['search', 'health'],
  jobs: ['search', 'work'],
  health: ['local', 'search'],
};

// Override rules - when to force an agent regardless of scoring
const OVERRIDE_RULES: { condition: (ctx: RoutingContext) => boolean; agent: AgentType; reason: string }[] = [
  {
    condition: (ctx) => /emergency|911|ambulance|dying|heart attack/i.test(ctx.query),
    agent: 'health',
    reason: 'Emergency health situation detected',
  },
  {
    condition: (ctx) => /suicide|kill myself|end my life/i.test(ctx.query),
    agent: 'health',
    reason: 'Mental health emergency detected',
  },
  {
    condition: (ctx) => ctx.intent.actionRequired === 'book_appointment' && ctx.intent.entities.condition,
    agent: 'health',
    reason: 'Medical appointment booking with condition',
  },
];

/**
 * Master Router Service
 */
class MasterRouterService {
  private lastDecision: RoutingDecision | null = null;
  private routingHistory: RoutingDecision[] = [];

  /**
   * Main routing method - decides which agent handles the query
   */
  route(context: RoutingContext): RoutingDecision {
    // Check for override rules first
    for (const rule of OVERRIDE_RULES) {
      if (rule.condition(context)) {
        const decision = this.createDecision(rule.agent, 1.0, 'critical', rule.reason);
        this.recordDecision(decision);
        return decision;
      }
    }

    // Score all agents
    const scores = this.scoreAllAgents(context);
    
    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    // Determine primary and secondary agents
    const primary = scores[0];
    const secondary = scores
      .slice(1)
      .filter(s => s.score >= THRESHOLDS.MINIMUM_CONFIDENCE)
      .slice(0, 2)
      .map(s => s.agent);

    // Determine priority
    const priority = this.determinePriority(context.query);

    // Get confidence
    const confidence = primary.score;

    // Create decision
    const decision: RoutingDecision = {
      primary: primary.agent,
      secondary,
      confidence,
      priority,
      fallbackChain: FALLBACK_CHAINS[primary.agent],
    };

    this.recordDecision(decision);
    return decision;
  }

  /**
   * Score all agents for a query
   */
  private scoreAllAgents(context: RoutingContext): AgentScore[] {
    const scores: AgentScore[] = [];
    const queryLower = context.query.toLowerCase();

    for (const agent of Object.keys(AGENT_KEYWORDS) as AgentType[]) {
      const score = this.scoreAgent(agent, queryLower, context);
      scores.push(score);
    }

    // Boost based on intent
    this.applyIntentBoosts(scores, context.intent);

    // Boost based on context continuity
    if (context.currentAgent) {
      this.applyContinuityBoost(scores, context.currentAgent);
    }

    return scores;
  }

  /**
   * Score a single agent
   */
  private scoreAgent(agent: AgentType, queryLower: string, _context: RoutingContext): AgentScore {
    let score = 0;
    const matchedKeywords: string[] = [];

    const keywordGroups = AGENT_KEYWORDS[agent];
    
    for (const group of keywordGroups) {
      for (const keyword of group.keywords) {
        if (queryLower.includes(keyword)) {
          score += group.weight;
          matchedKeywords.push(keyword);
        }
      }
    }

    // Normalize score
    const normalizedScore = Math.min(score / 2, 1);

    return {
      agent,
      score: normalizedScore,
      confidence: normalizedScore,
      reason: matchedKeywords.length > 0 
        ? `Matched: ${matchedKeywords.join(', ')}` 
        : 'No keyword matches',
    };
  }

  /**
   * Apply boosts based on detected intent
   */
  private applyIntentBoosts(scores: AgentScore[], intent: DetectedIntent): void {
    // Boost agents that are already in the intent
    for (const score of scores) {
      if (intent.agents.includes(score.agent)) {
        score.score = Math.min(score.score + 0.2, 1);
        score.reason += ' (intent match boost)';
      }
    }

    // Action-based boosts
    const actionAgentMap: Partial<Record<ActionType, AgentType>> = {
      book_appointment: 'health',
      apply_job: 'jobs',
      order_food: 'local',
      call_service: 'local',
      set_reminder: 'personal',
    };

    const boostedAgent = actionAgentMap[intent.actionRequired];
    if (boostedAgent) {
      const score = scores.find(s => s.agent === boostedAgent);
      if (score) {
        score.score = Math.min(score.score + 0.3, 1);
        score.reason += ` (action boost: ${intent.actionRequired})`;
      }
    }
  }

  /**
   * Apply boost for conversation continuity
   */
  private applyContinuityBoost(scores: AgentScore[], currentAgent: AgentType): void {
    const score = scores.find(s => s.agent === currentAgent);
    if (score && score.score >= THRESHOLDS.LOW_CONFIDENCE) {
      score.score = Math.min(score.score + 0.15, 1);
      score.reason += ' (continuity boost)';
    }
  }

  /**
   * Determine priority based on keywords
   */
  private determinePriority(query: string): RoutingDecision['priority'] {
    const queryLower = query.toLowerCase();

    for (const keyword of PRIORITY_KEYWORDS.critical) {
      if (queryLower.includes(keyword)) return 'critical';
    }
    for (const keyword of PRIORITY_KEYWORDS.high) {
      if (queryLower.includes(keyword)) return 'high';
    }
    for (const keyword of PRIORITY_KEYWORDS.medium) {
      if (queryLower.includes(keyword)) return 'medium';
    }
    return 'low';
  }

  /**
   * Create a decision object
   */
  private createDecision(
    agent: AgentType,
    confidence: number,
    priority: RoutingDecision['priority'],
    overrideReason?: string
  ): RoutingDecision {
    return {
      primary: agent,
      secondary: [],
      confidence,
      priority,
      fallbackChain: FALLBACK_CHAINS[agent],
      overrideReason,
    };
  }

  /**
   * Record decision for analytics
   */
  private recordDecision(decision: RoutingDecision): void {
    this.lastDecision = decision;
    this.routingHistory.push(decision);
    
    // Keep only last 50 decisions
    if (this.routingHistory.length > 50) {
      this.routingHistory.shift();
    }
  }

  /**
   * Get last decision
   */
  getLastDecision(): RoutingDecision | null {
    return this.lastDecision;
  }

  /**
   * Get routing history
   */
  getHistory(): RoutingDecision[] {
    return [...this.routingHistory];
  }

  /**
   * Try fallback agent
   */
  getFallback(currentAgent: AgentType): AgentType | null {
    const fallbacks = FALLBACK_CHAINS[currentAgent];
    return fallbacks.length > 0 ? fallbacks[0] : null;
  }
}

export const masterRouter = new MasterRouterService();
export type { RoutingDecision, RoutingContext, AgentScore };
