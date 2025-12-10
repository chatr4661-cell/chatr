/**
 * CHATR BRAIN - Main Orchestrator
 * The unified AI brain that routes to all agents
 */

import { 
  AgentType, 
  BrainRequest, 
  BrainResponse, 
  DetectedIntent,
  SharedContext 
} from './types';
import { intentRouter } from './intentRouter';
import { sharedContext } from './sharedContext';
import { buildSystemPrompt, getAgentPersona } from './agentPersonas';
import { actionDispatcher } from './actionDispatcher';
import { supabase } from '@/integrations/supabase/client';

/**
 * CHATR Brain Orchestrator
 * The central AI routing and coordination system
 */
class ChatrBrainService {
  private initialized = false;
  private context: SharedContext | null = null;

  /**
   * Initialize the brain for a user
   */
  async initialize(userId: string): Promise<void> {
    if (this.initialized) return;

    console.log('🧠 [CHATR Brain] Initializing...');
    
    // Initialize shared context
    this.context = await sharedContext.initialize(userId);
    
    this.initialized = true;
    console.log('✅ [CHATR Brain] Ready');
  }

  /**
   * Process a query through the brain
   */
  async process(request: BrainRequest): Promise<BrainResponse> {
    const startTime = performance.now();

    // Ensure initialized
    if (!this.initialized) {
      await this.initialize(request.userId);
    }

    console.log('🧠 [CHATR Brain] Processing:', request.query);

    // Step 1: Detect intent and route to agents
    const intent = intentRouter.detectIntent(request.query);
    console.log('🎯 [CHATR Brain] Intent:', intent.primary, '→ Agents:', intent.agents);

    // Use forced agent if specified
    const agents = request.forceAgent 
      ? [request.forceAgent] 
      : intent.agents;

    // Step 2: Update context with this query
    sharedContext.addQuery(request.query);
    sharedContext.updateSession({ lastAgent: agents[0] });

    // Step 3: Get agent-specific context
    const agentContext = sharedContext.getAgentContext(agents[0]);

    // Step 4: Build system prompt for primary agent
    const systemPrompt = buildSystemPrompt(agents[0], agentContext);

    // Step 5: Call AI with multi-agent awareness
    const aiResponse = await this.callAI(
      request.query,
      systemPrompt,
      agents,
      intent
    );

    // Step 6: Prepare action if needed
    let action: BrainResponse['action'] = undefined;
    if (intent.actionRequired !== 'none') {
      const dispatchedAction = actionDispatcher.prepareAction(
        intent,
        agents[0],
        request.context as Record<string, unknown>
      );

      if (dispatchedAction) {
        const button = actionDispatcher.buildActionButton(dispatchedAction);
        action = {
          type: dispatchedAction.type,
          data: dispatchedAction.data,
          ready: dispatchedAction.ready,
          buttonLabel: button.label,
          route: button.route,
        };
      }
    }

    // Step 7: Generate follow-up suggestions
    const followUp = this.generateFollowUp(intent, agents[0]);

    const latencyMs = performance.now() - startTime;
    console.log(`✅ [CHATR Brain] Response in ${latencyMs.toFixed(0)}ms`);

    return {
      answer: aiResponse.text,
      agents,
      intent,
      action,
      sources: aiResponse.sources,
      followUp,
      latencyMs,
    };
  }

  /**
   * Call AI service with context
   */
  private async callAI(
    query: string,
    systemPrompt: string,
    agents: AgentType[],
    intent: DetectedIntent
  ): Promise<{ text: string; sources?: string[] }> {
    try {
      // Call the unified brain edge function
      const { data, error } = await supabase.functions.invoke('chatr-brain', {
        body: {
          query,
          systemPrompt,
          agents,
          intent,
          context: sharedContext.getContextSummary(),
        },
      });

      if (error) {
        console.error('AI call error:', error);
        throw error;
      }

      return {
        text: data.answer || 'I couldn\'t process that request. Please try again.',
        sources: data.sources,
      };
    } catch (error) {
      console.error('❌ [CHATR Brain] AI call failed:', error);
      
      // Fallback response
      return {
        text: this.getFallbackResponse(agents[0], query),
      };
    }
  }

  /**
   * Generate follow-up suggestions
   */
  private generateFollowUp(intent: DetectedIntent, agent: AgentType): string[] {
    const suggestions: string[] = [];
    const persona = getAgentPersona(agent);

    // Agent-specific follow-ups
    switch (agent) {
      case 'health':
        suggestions.push('Find doctors near me');
        suggestions.push('Book an appointment');
        suggestions.push('Health tips');
        break;
      case 'jobs':
        suggestions.push('Jobs matching my skills');
        suggestions.push('Resume tips');
        suggestions.push('Salary trends');
        break;
      case 'local':
        suggestions.push('Show on map');
        suggestions.push('Call now');
        suggestions.push('Book service');
        break;
      case 'work':
        suggestions.push('Set a reminder');
        suggestions.push('Summarize my tasks');
        suggestions.push('Schedule meeting');
        break;
      case 'personal':
        suggestions.push('My preferences');
        suggestions.push('Daily routine');
        suggestions.push('Recommendations');
        break;
      default:
        suggestions.push('Tell me more');
        suggestions.push('Search something else');
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Get fallback response when AI fails
   */
  private getFallbackResponse(agent: AgentType, query: string): string {
    const persona = getAgentPersona(agent);
    return `I'm ${persona.name}, and I'm having trouble connecting right now. ` +
      `Please try again in a moment, or try rephrasing your question.`;
  }

  /**
   * Quick intent check without full processing
   */
  quickDetect(query: string): DetectedIntent {
    return intentRouter.detectIntent(query);
  }

  /**
   * Get available agents
   */
  getAgents(): AgentType[] {
    return ['personal', 'work', 'search', 'local', 'jobs', 'health'];
  }

  /**
   * Get agent info
   */
  getAgentInfo(type: AgentType) {
    return getAgentPersona(type);
  }

  /**
   * Update user location
   */
  updateLocation(location: SharedContext['location']): void {
    sharedContext.updateLocation(location);
  }

  /**
   * Check if brain is ready
   */
  isReady(): boolean {
    return this.initialized;
  }
}

export const chatrBrain = new ChatrBrainService();
