/**
 * CHATR BRAIN - Shared Context Store
 * Cross-agent memory and context management
 */

import { SharedContext, AgentType } from './types';

const STORAGE_KEY = 'chatr_brain_context';
const MAX_RECENT_QUERIES = 20;
const MAX_INTERESTS = 30;

/**
 * Shared Context Service
 * Manages cross-agent memory and user context
 */
class SharedContextService {
  private context: SharedContext | null = null;

  /**
   * Initialize context for user
   */
  async initialize(userId: string): Promise<SharedContext> {
    // Try to load from storage
    const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    
    if (stored) {
      this.context = JSON.parse(stored);
      this.context!.session.timestamp = new Date();
      console.log('🧠 [Shared Context] Loaded existing context');
    } else {
      this.context = this.createDefaultContext(userId);
      console.log('🧠 [Shared Context] Created new context');
    }

    this.save();
    return this.context!;
  }

  /**
   * Get current context
   */
  getContext(): SharedContext | null {
    return this.context;
  }

  /**
   * Update location
   */
  updateLocation(location: Partial<SharedContext['location']>): void {
    if (!this.context) return;
    
    this.context.location = {
      ...this.context.location,
      ...location,
    };
    this.save();
  }

  /**
   * Add query to recent history
   */
  addQuery(query: string): void {
    if (!this.context) return;
    
    // Add to recent queries
    this.context.memory.recentQueries.unshift(query);
    this.context.memory.recentQueries = 
      this.context.memory.recentQueries.slice(0, MAX_RECENT_QUERIES);

    // Extract and update interests
    const keywords = this.extractInterests(query);
    for (const keyword of keywords) {
      if (!this.context.memory.interests.includes(keyword)) {
        this.context.memory.interests.push(keyword);
      }
    }
    this.context.memory.interests = 
      this.context.memory.interests.slice(-MAX_INTERESTS);

    this.save();
  }

  /**
   * Update session info
   */
  updateSession(update: Partial<SharedContext['session']>): void {
    if (!this.context) return;
    
    this.context.session = {
      ...this.context.session,
      ...update,
      timestamp: new Date(),
    };
    this.save();
  }

  /**
   * Update job preferences
   */
  updateJobPreferences(prefs: Partial<NonNullable<SharedContext['memory']['jobPreferences']>>): void {
    if (!this.context) return;
    
    this.context.memory.jobPreferences = {
      ...this.context.memory.jobPreferences,
      skills: prefs.skills || this.context.memory.jobPreferences?.skills || [],
      salary: prefs.salary,
      type: prefs.type,
    };
    this.save();
  }

  /**
   * Add health history entry
   */
  addHealthHistory(entry: string): void {
    if (!this.context) return;
    
    if (!this.context.memory.healthHistory) {
      this.context.memory.healthHistory = [];
    }
    
    this.context.memory.healthHistory.unshift(entry);
    this.context.memory.healthHistory = 
      this.context.memory.healthHistory.slice(0, 10);
    this.save();
  }

  /**
   * Save location to favorites
   */
  saveLocation(location: string): void {
    if (!this.context) return;
    
    if (!this.context.memory.savedLocations) {
      this.context.memory.savedLocations = [];
    }
    
    if (!this.context.memory.savedLocations.includes(location)) {
      this.context.memory.savedLocations.push(location);
    }
    this.save();
  }

  /**
   * Update preferences
   */
  updatePreferences(prefs: Partial<SharedContext['preferences']>): void {
    if (!this.context) return;
    
    this.context.preferences = {
      ...this.context.preferences,
      ...prefs,
    };
    this.save();
  }

  /**
   * Get context summary for AI prompts
   */
  getContextSummary(): string {
    if (!this.context) return '';

    const parts: string[] = [];

    // Location context
    if (this.context.location.city) {
      parts.push(`Location: ${this.context.location.city}, ${this.context.location.state || this.context.location.country || ''}`);
    }

    // Interests
    if (this.context.memory.interests.length > 0) {
      parts.push(`Interests: ${this.context.memory.interests.slice(-5).join(', ')}`);
    }

    // Job preferences
    if (this.context.memory.jobPreferences?.skills?.length) {
      parts.push(`Skills: ${this.context.memory.jobPreferences.skills.join(', ')}`);
    }

    // Health context
    if (this.context.memory.healthHistory?.length) {
      parts.push(`Health context: ${this.context.memory.healthHistory.slice(0, 2).join('; ')}`);
    }

    // Response style
    parts.push(`Response style: ${this.context.preferences.responseStyle}`);

    return parts.join('\n');
  }

  /**
   * Get agent-specific context
   */
  getAgentContext(agent: AgentType): string {
    if (!this.context) return '';

    switch (agent) {
      case 'personal':
        return [
          `Interests: ${this.context.memory.interests.slice(-10).join(', ')}`,
          `Style: ${this.context.preferences.responseStyle}, ${this.context.preferences.tone}`,
        ].join('\n');

      case 'jobs':
        const jobPrefs = this.context.memory.jobPreferences;
        return jobPrefs ? [
          `Skills: ${jobPrefs.skills?.join(', ') || 'Not specified'}`,
          `Preferred type: ${jobPrefs.type || 'Any'}`,
          `Salary expectation: ${jobPrefs.salary ? `₹${jobPrefs.salary}` : 'Not specified'}`,
        ].join('\n') : '';

      case 'health':
        return this.context.memory.healthHistory?.length
          ? `Previous health queries: ${this.context.memory.healthHistory.slice(0, 3).join('; ')}`
          : '';

      case 'local':
        return [
          this.context.location.city ? `Location: ${this.context.location.city}` : '',
          this.context.memory.savedLocations?.length 
            ? `Saved places: ${this.context.memory.savedLocations.slice(0, 3).join(', ')}`
            : '',
        ].filter(Boolean).join('\n');

      default:
        return this.getContextSummary();
    }
  }

  /**
   * Clear all context data
   */
  clear(): void {
    if (!this.context) return;
    
    localStorage.removeItem(`${STORAGE_KEY}_${this.context.userId}`);
    this.context = null;
    console.log('🗑️ [Shared Context] Cleared');
  }

  // Private methods
  private createDefaultContext(userId: string): SharedContext {
    return {
      userId,
      location: {},
      preferences: {
        responseStyle: 'concise',
        language: 'en',
        tone: 'friendly',
      },
      memory: {
        recentQueries: [],
        interests: [],
      },
      session: {
        timestamp: new Date(),
      },
    };
  }

  private extractInterests(query: string): string[] {
    const interestKeywords = [
      'job', 'work', 'career', 'health', 'doctor', 'food', 'restaurant',
      'travel', 'hotel', 'movie', 'music', 'sports', 'fitness', 'tech',
      'programming', 'design', 'marketing', 'sales', 'finance', 'business',
    ];

    const words = query.toLowerCase().split(/\s+/);
    return interestKeywords.filter(kw => words.some(w => w.includes(kw)));
  }

  private save(): void {
    if (!this.context) return;
    localStorage.setItem(
      `${STORAGE_KEY}_${this.context.userId}`,
      JSON.stringify(this.context)
    );
  }
}

export const sharedContext = new SharedContextService();
