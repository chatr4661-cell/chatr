/**
 * CHATR BRAIN - Main Orchestrator
 * Unifies all AI agent systems into a single processing pipeline
 */

import { AgentType, ActionType, DetectedIntent } from './types';
import { masterRouter, RoutingDecision } from './masterRouter';
import { contractValidator } from './agentContracts';
import { interAgentBus } from './interAgentBus';
import { memoryLayer } from './memoryLayer';
import { actionsEngine } from './actionsEngine';
import { intentRouter } from './intentRouter';

// Import all agents
import { personalAI } from './agents/personalAI';
import { workAI } from './agents/workAI';
import { searchAI } from './agents/searchAI';
import { localAI } from './agents/localAI';
import { jobAI } from './agents/jobAI';
import { healthAI } from './agents/healthAI';

// ============ Types ============

export interface AgentContext {
  query: string;
  intent: DetectedIntent;
  userId: string;
  memory: string;
  globalContext: string;
}

export interface AgentResponse {
  message: string;
  confidence: number;
  actions: {
    type: ActionType;
    data: Record<string, unknown>;
    ready: boolean;
  }[];
  metadata?: Record<string, unknown>;
}

// Common agent interface
export interface IAgent {
  readonly type: AgentType;
  readonly name: string;
  process(context: AgentContext): Promise<AgentResponse>;
  getCapabilities(): string[];
}

export interface BrainInput {
  userId: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface BrainOutput {
  reply: string;
  actionsRun: {
    type: ActionType;
    success: boolean;
    data?: Record<string, unknown>;
  }[];
  agentUsed: AgentType;
  memoryUpdated: boolean;
  metadata?: {
    confidence: number;
    routing: RoutingDecision;
    processingTimeMs: number;
  };
}

// Agent registry with common interface
const agentRegistry: Record<AgentType, IAgent> = {
  personal: personalAI,
  work: workAI,
  search: searchAI,
  local: localAI,
  jobs: jobAI,
  health: healthAI,
};

/**
 * Merge responses from multiple agents
 */
function mergeResponses(primary: AgentResponse, secondary: AgentResponse): AgentResponse {
  return {
    message: primary.message + '\n\n' + secondary.message,
    confidence: Math.max(primary.confidence, secondary.confidence),
    actions: [...primary.actions, ...secondary.actions],
    metadata: {
      ...primary.metadata,
      mergedWith: secondary.metadata,
    },
  };
}

/**
 * Main CHATR Brain Orchestrator
 */
export async function runChatrBrain(
  userId: string,
  message: string,
  _context?: Record<string, unknown>
): Promise<BrainOutput> {
  const startTime = Date.now();
  let memoryUpdated = false;

  try {
    // Step 1: Initialize memory if needed
    if (!memoryLayer.isInitialized || memoryLayer.getCurrentUserId() !== userId) {
      await memoryLayer.initialize(userId);
    }

    // Step 2: Detect intent from message using intentRouter service
    const intent = intentRouter.detectIntent(message);
    console.log(`🧠 [Brain] Intent detected: ${intent.primary}, agents: ${intent.agents.join(', ')}`);

    // Step 3: Route to appropriate agent(s) via MasterRouter
    const routingDecision = masterRouter.route({
      query: message,
      intent,
      userHistory: memoryLayer.getRecentQueries(),
      currentAgent: memoryLayer.getLastAgent(),
    });
    console.log(`🎯 [Brain] Routing: ${routingDecision.primary} (confidence: ${routingDecision.confidence.toFixed(2)})`);

    // Step 4: Validate with AgentContracts
    const primaryAgent = routingDecision.primary;
    
    // Check if action is allowed
    if (intent.actionRequired !== 'none') {
      const actionAllowed = contractValidator.isActionAllowed(primaryAgent, intent.actionRequired);
      if (!actionAllowed) {
        console.log(`⚠️ [Brain] Action ${intent.actionRequired} not allowed for ${primaryAgent}`);
        const handoff = contractValidator.checkHandoff(primaryAgent, message);
        if (handoff.handoff && handoff.to) {
          await interAgentBus.handoff(primaryAgent, handoff.to, message, { intent }, intent);
        }
      }
    }

    // Step 5: Check for escalation rules
    const escalation = contractValidator.shouldEscalate(primaryAgent, message);
    if (escalation.escalate) {
      console.log(`🚨 [Brain] Escalating from ${primaryAgent} to ${escalation.to.join(', ')}`);
      for (const targetAgent of escalation.to) {
        await interAgentBus.escalate(primaryAgent, targetAgent, message, escalation.reason || 'Escalation triggered');
      }
    }

    // Step 6: Retrieve memory context
    const globalContext = memoryLayer.getGlobalContext();
    const agentContext = memoryLayer.getAgentContext(primaryAgent);
    const conversationSummary = memoryLayer.getConversationSummary();

    // Step 7: Build agent context
    const agentInput: AgentContext = {
      query: message,
      intent,
      userId,
      memory: agentContext,
      globalContext: `${globalContext}\n\nRecent conversation:\n${conversationSummary}`,
    };

    // Step 8: Process with selected agent
    const agent = agentRegistry[primaryAgent];
    let agentResponse: AgentResponse;

    try {
      agentResponse = await agent.process(agentInput);
    } catch (error) {
      console.error(`[Brain] Agent ${primaryAgent} failed, trying fallback`);
      const fallbackAgent = masterRouter.getFallback(primaryAgent);
      if (fallbackAgent) {
        agentResponse = await agentRegistry[fallbackAgent].process(agentInput);
      } else {
        throw error;
      }
    }

    // Step 9: Check for inter-agent coordination needs
    if (routingDecision.secondary.length > 0 && agentResponse.confidence < 0.7) {
      console.log(`🔄 [Brain] Consulting secondary agents: ${routingDecision.secondary.join(', ')}`);
      
      for (const secondaryAgent of routingDecision.secondary) {
        const secondaryResponse = await agentRegistry[secondaryAgent].process(agentInput);
        
        if (secondaryResponse.confidence > agentResponse.confidence) {
          agentResponse = mergeResponses(agentResponse, secondaryResponse);
        }
      }
    }

    // Step 10: Execute actions if any
    const actionsRun: BrainOutput['actionsRun'] = [];
    
    for (const action of agentResponse.actions) {
      if (action.ready && action.type !== 'none') {
        const result = await actionsEngine.execute(action.type, {
          userId,
          data: action.data,
          agent: primaryAgent,
        });
        
        actionsRun.push({
          type: action.type,
          success: result.success,
          data: result.data,
        });

        if (result.success) {
          memoryLayer.remember(`Action completed: ${action.type}`, {
            action: action.type,
            data: action.data,
            result: result.data,
          });
          memoryUpdated = true;
        }
      }
    }

    // Step 11: Update memory with conversation
    memoryLayer.addConversationTurn(message, agentResponse.message, primaryAgent);
    memoryUpdated = true;

    // Step 12: Build final output
    const processingTimeMs = Date.now() - startTime;
    console.log(`✅ [Brain] Response generated in ${processingTimeMs}ms`);

    return {
      reply: agentResponse.message,
      actionsRun,
      agentUsed: primaryAgent,
      memoryUpdated,
      metadata: {
        confidence: agentResponse.confidence,
        routing: routingDecision,
        processingTimeMs,
      },
    };

  } catch (error) {
    console.error('❌ [Brain] Error:', error);
    
    return {
      reply: "I'm having trouble processing your request. Please try again or rephrase your question.",
      actionsRun: [],
      agentUsed: 'personal',
      memoryUpdated: false,
      metadata: {
        confidence: 0,
        routing: masterRouter.getLastDecision() || {
          primary: 'personal',
          secondary: [],
          confidence: 0,
          priority: 'low',
          fallbackChain: [],
        },
        processingTimeMs: Date.now() - startTime,
      },
    };
  }
}

/**
 * Quick intent detection without full processing
 */
export function quickDetect(message: string): DetectedIntent {
  return intentRouter.detectIntent(message);
}

/**
 * Get available agents
 */
export function getAvailableAgents(): AgentType[] {
  return Object.keys(agentRegistry) as AgentType[];
}

/**
 * Get agent capabilities
 */
export function getAgentCapabilities(agent: AgentType): string[] {
  return agentRegistry[agent]?.getCapabilities() || [];
}

export { agentRegistry };
