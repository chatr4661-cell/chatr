/**
 * SEARCH AI AGENT
 * Perplexity-style search and information retrieval
 */

import { AgentType, DetectedIntent } from '../types';
import { memoryLayer } from '../memoryLayer';
import { AgentResponse, AgentContext } from './personalAI';

/**
 * Search AI Agent
 * Provides Perplexity-style intelligent search with sources
 */
class SearchAIAgent {
  readonly type: AgentType = 'search';
  readonly name = 'Search AI';

  /**
   * Process a search query
   */
  async process(context: AgentContext): Promise<AgentResponse> {
    const { query, intent } = context;
    
    // Detect search patterns
    const patterns = this.detectPatterns(query);
    const searchType = this.classifySearch(query);
    
    // Build response
    const response = await this.generateResponse(context, patterns, searchType);
    
    // Store search in memory for personalization
    memoryLayer.agentRemember(this.type, `Search: ${query}`, {
      intent: intent.primary,
      searchType,
      timestamp: new Date().toISOString(),
    });
    
    // Track user interests
    this.trackInterests(query);
    
    return response;
  }

  /**
   * Detect search patterns
   */
  private detectPatterns(query: string): string[] {
    const patterns: string[] = [];
    const queryLower = query.toLowerCase();
    
    if (/what is|what are|define|meaning of/i.test(queryLower)) patterns.push('definition');
    if (/how to|how do|steps to|guide/i.test(queryLower)) patterns.push('howto');
    if (/why|reason|because|explain/i.test(queryLower)) patterns.push('explanation');
    if (/best|top|recommended|popular/i.test(queryLower)) patterns.push('recommendation');
    if (/compare|vs|versus|difference/i.test(queryLower)) patterns.push('comparison');
    if (/news|latest|recent|today/i.test(queryLower)) patterns.push('news');
    if (/history|origin|started|when did/i.test(queryLower)) patterns.push('history');
    if (/where|location|place/i.test(queryLower)) patterns.push('location');
    
    return patterns;
  }

  /**
   * Classify the type of search
   */
  private classifySearch(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (/recipe|cook|make|prepare/i.test(queryLower)) return 'recipe';
    if (/code|programming|developer|api/i.test(queryLower)) return 'technical';
    if (/movie|film|show|series/i.test(queryLower)) return 'entertainment';
    if (/stock|market|finance|invest/i.test(queryLower)) return 'finance';
    if (/weather|temperature|rain|forecast/i.test(queryLower)) return 'weather';
    if (/sport|game|match|score/i.test(queryLower)) return 'sports';
    if (/science|research|study/i.test(queryLower)) return 'science';
    
    return 'general';
  }

  /**
   * Generate search response
   */
  private async generateResponse(
    context: AgentContext,
    patterns: string[],
    searchType: string
  ): Promise<AgentResponse> {
    const { query } = context;
    let confidence = 0.8;
    let message = '';
    
    // Build appropriate response based on patterns
    if (patterns.includes('definition')) {
      message = this.buildDefinitionResponse(query);
      confidence = 0.85;
    } else if (patterns.includes('howto')) {
      message = this.buildHowToResponse(query);
      confidence = 0.85;
    } else if (patterns.includes('comparison')) {
      message = this.buildComparisonResponse(query);
      confidence = 0.8;
    } else if (patterns.includes('news')) {
      message = this.buildNewsResponse(query);
      confidence = 0.75;
    } else if (patterns.includes('recommendation')) {
      message = this.buildRecommendationResponse(query, searchType);
      confidence = 0.8;
    } else {
      message = this.buildGeneralResponse(query, searchType);
      confidence = 0.75;
    }
    
    // Add navigation action if location-related
    const actions: AgentResponse['actions'] = [];
    if (patterns.includes('location')) {
      actions.push({
        type: 'navigate',
        data: { destination: query },
        ready: true,
      });
    }
    
    return {
      message,
      confidence,
      actions,
      metadata: {
        patterns,
        searchType,
        requiresLiveSearch: true,
      },
    };
  }

  /**
   * Build definition response
   */
  private buildDefinitionResponse(query: string): string {
    const topic = query.replace(/what is|what are|define|meaning of/gi, '').trim();
    return `I'll search for information about "${topic}". This query requires a live search to provide accurate, up-to-date information with sources.`;
  }

  /**
   * Build how-to response
   */
  private buildHowToResponse(query: string): string {
    const task = query.replace(/how to|how do i|steps to|guide for/gi, '').trim();
    return `I can help you learn how to ${task}. Let me find the best guides and tutorials for you.`;
  }

  /**
   * Build comparison response
   */
  private buildComparisonResponse(query: string): string {
    return `I'll compare these options for you and provide a detailed analysis with pros and cons.`;
  }

  /**
   * Build news response
   */
  private buildNewsResponse(query: string): string {
    const topic = query.replace(/news|latest|recent|today/gi, '').trim();
    return `Let me find the latest news${topic ? ` about ${topic}` : ''}. I'll provide summaries with sources.`;
  }

  /**
   * Build recommendation response
   */
  private buildRecommendationResponse(query: string, searchType: string): string {
    return `Based on your query and ${searchType} category, I'll find the best recommendations with reviews and ratings.`;
  }

  /**
   * Build general search response
   */
  private buildGeneralResponse(query: string, searchType: string): string {
    return `I'm searching for "${query}" in the ${searchType} category. I'll provide a comprehensive answer with verified sources.`;
  }

  /**
   * Track user interests for personalization
   */
  private trackInterests(query: string): void {
    const searchType = this.classifySearch(query);
    const currentInterests = memoryLayer.getPreference<string[]>('search_interests') || [];
    
    if (!currentInterests.includes(searchType)) {
      currentInterests.push(searchType);
      // Keep only last 10 interests
      if (currentInterests.length > 10) currentInterests.shift();
      memoryLayer.inferPreference('search_interests', currentInterests);
    }
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): string[] {
    return [
      'Web search with sources',
      'Definition lookup',
      'How-to guides',
      'News aggregation',
      'Comparison analysis',
      'Recommendation engine',
    ];
  }
}

export const searchAI = new SearchAIAgent();
