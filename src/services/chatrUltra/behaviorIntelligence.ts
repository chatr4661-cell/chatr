/**
 * CHATR ULTRA - Behavior Intelligence Layer
 * On-device behavior analysis for personalization (with user permission)
 */

export interface BehaviorPattern {
  category: string;
  frequency: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  context: string;
}

export interface UserBehaviorProfile {
  enabled: boolean;
  patterns: BehaviorPattern[];
  interests: string[];
  preferences: {
    responseStyle: 'detailed' | 'concise' | 'technical' | 'simple';
    preferredModules: string[];
    activeHours: number[];
  };
  lastUpdated: Date;
}

/**
 * Behavior Intelligence Service
 * Analyzes on-device behavior to improve AI responses
 */
class BehaviorIntelligenceService {
  private behaviorProfile: UserBehaviorProfile | null = null;
  private permissionGranted = false;

  /**
   * Request permission to analyze behavior
   */
  async requestPermission(): Promise<boolean> {
    // In production, show permission dialog
    const granted = confirm(
      'CHATR ULTRA can analyze your on-device behavior to provide better recommendations.\n\n' +
      'This includes:\n' +
      '- App usage patterns\n' +
      '- Search history (on-device only)\n' +
      '- Screen activity\n' +
      '- Category-level location\n\n' +
      'All analysis stays on your device. Nothing is sent to servers.\n\n' +
      'Enable behavior intelligence?'
    );

    this.permissionGranted = granted;

    if (granted) {
      await this.initializeBehaviorProfile();
    }

    return granted;
  }

  /**
   * Check if permission is granted
   */
  isEnabled(): boolean {
    return this.permissionGranted && this.behaviorProfile !== null;
  }

  /**
   * Initialize behavior profile
   */
  private async initializeBehaviorProfile(): Promise<void> {
    console.log('🧠 [Behavior Intelligence] Initializing profile...');

    // Load from local storage or create new
    const stored = localStorage.getItem('chatr_ultra_behavior_profile');
    
    if (stored) {
      this.behaviorProfile = JSON.parse(stored);
      console.log('✅ [Behavior Intelligence] Loaded existing profile');
    } else {
      this.behaviorProfile = {
        enabled: true,
        patterns: [],
        interests: [],
        preferences: {
          responseStyle: 'concise',
          preferredModules: [],
          activeHours: [],
        },
        lastUpdated: new Date(),
      };
      this.saveBehaviorProfile();
      console.log('✅ [Behavior Intelligence] Created new profile');
    }
  }

  /**
   * Get current behavior profile
   */
  getProfile(): UserBehaviorProfile | null {
    return this.behaviorProfile;
  }

  /**
   * Record a behavior pattern
   */
  recordPattern(category: string, context: string): void {
    if (!this.isEnabled()) return;

    const hour = new Date().getHours();
    const timeOfDay = this.getTimeOfDay(hour);

    const pattern: BehaviorPattern = {
      category,
      frequency: 1,
      timeOfDay,
      context,
    };

    // Update or add pattern
    const existing = this.behaviorProfile!.patterns.find(
      p => p.category === category && p.timeOfDay === timeOfDay
    );

    if (existing) {
      existing.frequency++;
    } else {
      this.behaviorProfile!.patterns.push(pattern);
    }

    // Update active hours
    if (!this.behaviorProfile!.preferences.activeHours.includes(hour)) {
      this.behaviorProfile!.preferences.activeHours.push(hour);
    }

    this.behaviorProfile!.lastUpdated = new Date();
    this.saveBehaviorProfile();
  }

  /**
   * Update user interests based on queries
   */
  updateInterests(query: string): void {
    if (!this.isEnabled()) return;

    // Extract potential interests from query
    const keywords = this.extractKeywords(query);
    
    keywords.forEach(keyword => {
      if (!this.behaviorProfile!.interests.includes(keyword)) {
        this.behaviorProfile!.interests.push(keyword);
      }
    });

    // Keep only top 20 interests
    this.behaviorProfile!.interests = this.behaviorProfile!.interests.slice(-20);
    
    this.saveBehaviorProfile();
  }

  /**
   * Get personalized response style
   */
  getPreferredResponseStyle(): string {
    if (!this.isEnabled()) return 'concise';
    return this.behaviorProfile!.preferences.responseStyle;
  }

  /**
   * Get recommended modules based on behavior
   */
  getRecommendedModules(): string[] {
    if (!this.isEnabled()) return [];

    // Return most frequently used modules
    const moduleFrequency: Record<string, number> = {};

    this.behaviorProfile!.patterns.forEach(pattern => {
      if (pattern.category.startsWith('module_')) {
        const module = pattern.category.replace('module_', '');
        moduleFrequency[module] = (moduleFrequency[module] || 0) + pattern.frequency;
      }
    });

    return Object.entries(moduleFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([module]) => module);
  }

  /**
   * Personalize AI prompt based on behavior
   */
  personalizePrompt(basePrompt: string, module: string): string {
    if (!this.isEnabled()) return basePrompt;

    const style = this.getPreferredResponseStyle();
    const interests = this.behaviorProfile!.interests.slice(-5);

    let personalized = basePrompt;

    // Add style guidance
    if (style === 'detailed') {
      personalized += '\n\nProvide detailed, comprehensive responses.';
    } else if (style === 'concise') {
      personalized += '\n\nKeep responses brief and to the point.';
    } else if (style === 'technical') {
      personalized += '\n\nProvide technical, in-depth explanations.';
    } else if (style === 'simple') {
      personalized += '\n\nUse simple language and avoid jargon.';
    }

    // Add context from interests
    if (interests.length > 0) {
      personalized += `\n\nUser interests: ${interests.join(', ')}`;
    }

    return personalized;
  }

  /**
   * Clear all behavior data
   */
  clearBehaviorData(): void {
    this.behaviorProfile = null;
    this.permissionGranted = false;
    localStorage.removeItem('chatr_ultra_behavior_profile');
    console.log('🗑️ [Behavior Intelligence] All data cleared');
  }

  // Helper methods
  private getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  private extractKeywords(query: string): string[] {
    // Simple keyword extraction
    const words = query.toLowerCase().split(/\s+/);
    const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might']);
    
    return words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 5);
  }

  private saveBehaviorProfile(): void {
    if (this.behaviorProfile) {
      localStorage.setItem('chatr_ultra_behavior_profile', JSON.stringify(this.behaviorProfile));
    }
  }
}

export const behaviorIntelligence = new BehaviorIntelligenceService();
