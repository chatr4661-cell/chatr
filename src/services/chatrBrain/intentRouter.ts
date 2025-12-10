/**
 * CHATR BRAIN - Intent Router
 * Detects user intent and routes to appropriate agent(s)
 */

import { 
  AgentType, 
  IntentCategory, 
  ActionType, 
  DetectedIntent 
} from './types';

// Intent detection patterns
const INTENT_PATTERNS: Record<IntentCategory, RegExp[]> = {
  question: [
    /^(what|who|when|where|why|how|is|are|can|does|do|which)\b/i,
    /\?$/,
    /tell me|explain|describe/i,
  ],
  action: [
    /^(book|order|apply|hire|schedule|set|create|send|call|pay)/i,
    /i want to|i need to|please|can you/i,
  ],
  search: [
    /^(find|search|look for|show me|get me|where can i)/i,
    /near me|nearby|in \w+|around/i,
  ],
  booking: [
    /book|appointment|schedule|reserve|slot/i,
    /available|availability|when can/i,
  ],
  transaction: [
    /pay|payment|buy|purchase|order|checkout/i,
    /price|cost|how much|wallet|balance/i,
  ],
  support: [
    /help|support|issue|problem|not working|error/i,
    /how do i|can't|unable/i,
  ],
  conversation: [
    /^(hi|hello|hey|good morning|good evening)/i,
    /thanks|thank you|bye|goodbye/i,
  ],
};

// Agent routing based on keywords
const AGENT_KEYWORDS: Record<AgentType, string[]> = {
  personal: [
    'remind', 'remember', 'my preference', 'i like', 'i prefer',
    'habit', 'routine', 'personal', 'my style', 'for me',
  ],
  work: [
    'meeting', 'task', 'document', 'project', 'deadline',
    'summary', 'notes', 'calendar', 'schedule', 'work',
    'presentation', 'report', 'email', 'office',
  ],
  search: [
    'search', 'find', 'look up', 'what is', 'who is',
    'news', 'latest', 'information', 'learn about',
  ],
  local: [
    'plumber', 'electrician', 'carpenter', 'mechanic',
    'restaurant', 'food', 'grocery', 'delivery',
    'service', 'provider', 'near me', 'nearby', 'local',
    'taxi', 'cab', 'hotel', 'shop', 'store',
  ],
  jobs: [
    'job', 'career', 'resume', 'cv', 'salary', 'hiring',
    'apply', 'interview', 'company', 'work from home',
    'internship', 'fresher', 'experience', 'skills',
    'opening', 'vacancy', 'recruitment', 'naukri',
  ],
  health: [
    'doctor', 'hospital', 'clinic', 'medicine', 'symptoms',
    'fever', 'pain', 'headache', 'sick', 'illness',
    'health', 'medical', 'appointment', 'checkup',
    'ambulance', 'emergency', 'pharmacy', 'lab', 'test',
  ],
};

// Action detection patterns
const ACTION_PATTERNS: Record<ActionType, RegExp[]> = {
  book_appointment: [/book|appointment|schedule|reserve|slot/i],
  apply_job: [/apply|job application|submit resume|send cv/i],
  order_food: [/order food|order from|hungry|delivery/i],
  make_payment: [/pay|payment|transfer|send money/i],
  save_contact: [/save number|add contact|remember number/i],
  set_reminder: [/remind|reminder|alert|notify/i],
  file_complaint: [/complain|report|file complaint|issue/i],
  call_service: [/call|phone|dial|connect/i],
  navigate: [/navigate|directions|route|go to/i],
  none: [],
};

/**
 * Intent Router Service
 * Analyzes queries and routes to appropriate agents
 */
class IntentRouterService {
  /**
   * Detect intent from user query
   */
  detectIntent(query: string): DetectedIntent {
    const lowerQuery = query.toLowerCase();
    
    // Detect primary intent category
    const primary = this.detectIntentCategory(lowerQuery);
    
    // Detect which agents should handle this
    const agents = this.detectAgents(lowerQuery);
    
    // Detect if action is required
    const actionRequired = this.detectAction(lowerQuery);
    
    // Extract entities
    const entities = this.extractEntities(query);
    
    // Extract keywords
    const keywords = this.extractKeywords(lowerQuery);
    
    return {
      primary,
      confidence: this.calculateConfidence(lowerQuery, agents),
      agents,
      actionRequired,
      keywords,
      entities,
    };
  }

  /**
   * Detect primary intent category
   */
  private detectIntentCategory(query: string): IntentCategory {
    let bestMatch: IntentCategory = 'conversation';
    let bestScore = 0;

    for (const [category, patterns] of Object.entries(INTENT_PATTERNS)) {
      const score = patterns.filter(p => p.test(query)).length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = category as IntentCategory;
      }
    }

    return bestMatch;
  }

  /**
   * Detect which agents should handle the query
   */
  private detectAgents(query: string): AgentType[] {
    const agents: AgentType[] = [];
    const scores: Record<AgentType, number> = {
      personal: 0,
      work: 0,
      search: 0,
      local: 0,
      jobs: 0,
      health: 0,
    };

    // Score each agent based on keyword matches
    for (const [agent, keywords] of Object.entries(AGENT_KEYWORDS)) {
      for (const keyword of keywords) {
        if (query.includes(keyword)) {
          scores[agent as AgentType] += keyword.split(' ').length; // Weight multi-word matches
        }
      }
    }

    // Get agents with score > 0, sorted by score
    const sortedAgents = Object.entries(scores)
      .filter(([_, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([agent]) => agent as AgentType);

    // Take top agents (max 3 for multi-agent routing)
    if (sortedAgents.length > 0) {
      return sortedAgents.slice(0, 3);
    }

    // Default to search if no specific agent matched
    return ['search'];
  }

  /**
   * Detect required action
   */
  private detectAction(query: string): ActionType {
    for (const [action, patterns] of Object.entries(ACTION_PATTERNS)) {
      if (action === 'none') continue;
      if (patterns.some(p => p.test(query))) {
        return action as ActionType;
      }
    }
    return 'none';
  }

  /**
   * Extract entities from query
   */
  private extractEntities(query: string): DetectedIntent['entities'] {
    const entities: DetectedIntent['entities'] = {};

    // Location patterns
    const locationMatch = query.match(/(?:in|at|near|around)\s+([A-Za-z\s]+?)(?:\s|$|,)/i);
    if (locationMatch) {
      entities.location = locationMatch[1].trim();
    }

    // Date patterns
    const dateMatch = query.match(/(?:on|for|by)\s+(tomorrow|today|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2})/i);
    if (dateMatch) {
      entities.date = dateMatch[1];
    }

    // Time patterns
    const timeMatch = query.match(/(?:at|by)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (timeMatch) {
      entities.time = timeMatch[1];
    }

    // Amount patterns
    const amountMatch = query.match(/(?:₹|rs\.?|inr|rupees?)\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
    if (amountMatch) {
      entities.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    // Skill patterns (for jobs)
    const skillPatterns = ['react', 'python', 'java', 'javascript', 'node', 'sql', 'marketing', 'sales', 'design'];
    for (const skill of skillPatterns) {
      if (query.toLowerCase().includes(skill)) {
        entities.skill = skill;
        break;
      }
    }

    return entities;
  }

  /**
   * Extract keywords from query
   */
  private extractKeywords(query: string): string[] {
    const stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'can', 'may', 'might', 'i', 'me',
      'my', 'we', 'our', 'you', 'your', 'it', 'its', 'they', 'them',
      'this', 'that', 'these', 'those', 'to', 'of', 'in', 'for',
      'on', 'with', 'at', 'by', 'from', 'or', 'and', 'but', 'if',
      'then', 'so', 'as', 'just', 'get', 'want', 'need', 'please',
    ]);

    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10);
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(query: string, agents: AgentType[]): number {
    // Base confidence from agent match quality
    let confidence = 0.5;

    // Increase if specific agents matched
    if (agents.length > 0 && agents[0] !== 'search') {
      confidence += 0.2;
    }

    // Increase for longer, more specific queries
    const wordCount = query.split(/\s+/).length;
    if (wordCount > 5) {
      confidence += 0.1;
    }

    // Increase for entity extraction success
    const entities = this.extractEntities(query);
    if (Object.keys(entities).length > 0) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }
}

export const intentRouter = new IntentRouterService();
