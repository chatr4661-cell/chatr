/**
 * CHATR ULTRA - Module-Specific Handlers
 * Each CHATR module has custom AI logic and behavior
 */

import { deviceAI, DeviceAIResponse } from './deviceAI';
import { webExtraction, ExtractedContent } from './webExtraction';

export type ChatrModule = 
  | 'ai-agents'
  | 'chatr-world'
  | 'local-jobs'
  | 'healthcare'
  | 'browser'
  | 'care';

export interface ModuleRequest {
  module: ChatrModule;
  query: string;
  context?: Record<string, any>;
}

export interface ModuleResponse {
  answer: string;
  structured?: any;
  sources?: string[];
  confidence: number;
  moduleUsed: ChatrModule;
}

/**
 * Module Handler Service
 * Routes requests to module-specific AI logic
 */
class ModuleHandlerService {
  /**
   * Process a request for a specific CHATR module
   */
  async handleModuleRequest(request: ModuleRequest): Promise<ModuleResponse> {
    console.log(`🎯 [Module Handler] Processing ${request.module} request`);

    switch (request.module) {
      case 'ai-agents':
        return this.handleAIAgents(request);
      case 'chatr-world':
        return this.handleChatrWorld(request);
      case 'local-jobs':
        return this.handleLocalJobs(request);
      case 'healthcare':
        return this.handleHealthcare(request);
      case 'browser':
        return this.handleBrowser(request);
      case 'care':
        return this.handleCare(request);
      default:
        throw new Error(`Unknown module: ${request.module}`);
    }
  }

  /**
   * AI AGENTS MODULE
   * Create, train, and optimize AI agents
   */
  private async handleAIAgents(request: ModuleRequest): Promise<ModuleResponse> {
    const systemPrompt = `You are an AI Agent trainer and optimizer.
Your role:
- Create high-quality training data (Q/A pairs, persona, rules)
- Improve agent reasoning, personality, memory, behavior
- Detect weak training areas and recommend fixes
- Support skill-based upgrades
- Provide analytics (quality, accuracy, helpfulness)

Response format:
- Be structured, actionable, and specific
- Use bullet points and clear steps
- Provide examples when relevant`;

    const response = await deviceAI.runInference(request.query, undefined, { systemPrompt });

    return {
      answer: response.text,
      confidence: response.confidence,
      moduleUsed: 'ai-agents',
    };
  }

  /**
   * CHATR WORLD MODULE
   * Provide information about countries, cities, cultures, global data
   */
  private async handleChatrWorld(request: ModuleRequest): Promise<ModuleResponse> {
    const systemPrompt = `You are a global information expert.
Provide information about countries, cities, cultures, and global trends.
Format:
- Lists for comparisons
- Clear guides
- Travel costs and opportunities
- Cultural insights
Keep responses structured and easy to scan.`;

    // Check if query needs web extraction
    const needsWebData = this.needsWebExtraction(request.query);
    let webContext = '';

    if (needsWebData) {
      // Extract web data (placeholder - would need actual URL)
      // In production, this would search and extract from relevant pages
      webContext = '\n\n[Note: For most accurate info, specific web extraction would be performed here]';
    }

    const response = await deviceAI.runInference(
      request.query + webContext,
      undefined,
      { systemPrompt }
    );

    return {
      answer: response.text,
      confidence: response.confidence,
      moduleUsed: 'chatr-world',
    };
  }

  /**
   * LOCAL JOBS MODULE
   * Parse and analyze job listings
   */
  private async handleLocalJobs(request: ModuleRequest): Promise<ModuleResponse> {
    const systemPrompt = `You are a job matching and career advisor AI.
Parse job listings and provide:
- Role, skills, salary, company, location
- Apply-match score for user
- Resume/skills improvement suggestions
Format as structured job cards.`;

    const response = await deviceAI.runInference(request.query, undefined, { systemPrompt });

    return {
      answer: response.text,
      confidence: response.confidence,
      moduleUsed: 'local-jobs',
    };
  }

  /**
   * HEALTHCARE & HEALTH HUB MODULE
   * Provide safe, grounded health guidance
   */
  private async handleHealthcare(request: ModuleRequest): Promise<ModuleResponse> {
    const systemPrompt = `You are a health and wellness advisor.
SAFETY RULES:
- Never diagnose medical conditions
- Always recommend consulting healthcare professionals for serious issues
- Provide general health, wellness, fitness, nutrition guidance
- Cross-check answers for safety

Provide:
- Daily routines
- Preventive care plans
- Health checklists
- Doctor/hospital suggestions (based on public data)

Be empathetic, clear, and always safe.`;

    // Use multi-model verification for safety
    const multiResponse = await deviceAI.runMultiModel(request.query, { 
      systemPrompt,
      minModels: 2,
    });

    return {
      answer: multiResponse.finalAnswer,
      confidence: multiResponse.consensusScore,
      moduleUsed: 'healthcare',
      sources: ['Multi-model verified for safety'],
    };
  }

  /**
   * CHATR BROWSER MODULE
   * Mini search engine with web extraction
   */
  private async handleBrowser(request: ModuleRequest): Promise<ModuleResponse> {
    const systemPrompt = `You are an intelligent search assistant.
Extract and summarize web content into:
- Key facts
- Insights
- Guides
- Pros/cons
- Tables
- Rankings

Remove ads, clutter, noise. Provide clean, verified answers.`;

    let extractedContent: ExtractedContent | null = null;
    let webContext = '';

    // If URL provided in context, extract it
    if (request.context?.url) {
      try {
        extractedContent = await webExtraction.extractFromURL(request.context.url);
        webContext = `\n\nExtracted content from ${extractedContent.metadata.url}:\n${extractedContent.text}`;
      } catch (error) {
        console.error('Web extraction failed:', error);
      }
    }

    const response = await deviceAI.runInference(
      request.query + webContext,
      undefined,
      { systemPrompt }
    );

    return {
      answer: response.text,
      confidence: response.confidence,
      moduleUsed: 'browser',
      sources: extractedContent ? [extractedContent.metadata.url] : undefined,
    };
  }

  /**
   * CARE MODULE
   * Life, career, relationships, emotional support
   */
  private async handleCare(request: ModuleRequest): Promise<ModuleResponse> {
    const systemPrompt = `You are an empathetic life and career advisor.
Provide logical, actionable guidance for:
- Relationships
- Mental well-being
- Career decisions
- Life problems

Rules:
- Be supportive, stabilizing, constructive
- Never provide harmful advice
- Use safety-first reasoning
- Keep responses empathetic yet practical`;

    // Use multi-model verification for safety
    const multiResponse = await deviceAI.runMultiModel(request.query, { 
      systemPrompt,
      minModels: 2,
    });

    return {
      answer: multiResponse.finalAnswer,
      confidence: multiResponse.consensusScore,
      moduleUsed: 'care',
    };
  }

  /**
   * Determine if query needs web extraction
   */
  private needsWebExtraction(query: string): boolean {
    const webIndicators = [
      'latest',
      'current',
      'recent',
      'news',
      'today',
      'price',
      'cost',
      'review',
      'comparison',
    ];

    const lowerQuery = query.toLowerCase();
    return webIndicators.some(indicator => lowerQuery.includes(indicator));
  }
}

export const moduleHandler = new ModuleHandlerService();
