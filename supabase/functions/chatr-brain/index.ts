/**
 * CHATR BRAIN - Unified AI Routing Edge Function
 * Routes queries to appropriate agents and returns intelligent responses
 * Uses Lovable AI Gateway for streaming responses
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrainRequest {
  query: string;
  systemPrompt: string;
  agents: string[];
  intent: {
    primary: string;
    agents: string[];
    actionRequired: string;
  };
  context?: string;
  userMemory?: {
    name?: string;
    preferences?: string[];
    locality?: string;
    jobRole?: string;
  };
  conversationHistory?: Array<{ role: string; content: string }>;
  stream?: boolean;
}

// Master CHATR Intelligence System Prompt
const CHATR_INTELLIGENCE_PROMPT = `You are CHATR Intelligence — a unified AI assistant with 6 specialized capabilities:
1. Personal AI – personal context, memory, reminders
2. Work AI – emails, tasks, documents
3. Search AI – factual answers, real-time info, web knowledge
4. Local AI – nearby services, food, businesses
5. Jobs AI – job matching, career advice
6. Health AI – health info, doctor search

CRITICAL RULES:
- You have access to real-time information. Answer weather, news, sports, etc. with current data.
- When user asks about weather, provide actual weather conditions for their location.
- For location-based queries, use the provided location context.
- Be concise (2-3 sentences max unless more detail is requested).
- Be helpful and action-oriented.

LOCATION HANDLING:
- If location is provided, use it for local queries (weather, nearby services, etc.)
- Format: "In [City], the weather is..." or "Near you in [City]..."

RESPONSE STYLE:
- Direct answers, no meta-commentary
- Natural, conversational tone
- Include actionable suggestions when relevant`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, systemPrompt, agents, intent, context, userMemory, conversationHistory, stream }: BrainRequest = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build enhanced prompt with multi-agent awareness
    const enhancedPrompt = buildEnhancedPrompt(systemPrompt, agents, intent, context, userMemory);

    console.log(`🧠 [CHATR Intelligence] Processing for agents: ${agents.join(', ')}`);
    console.log(`🎯 [CHATR Intelligence] Intent: ${intent.primary}, Action: ${intent.actionRequired}`);

    // Build messages array with conversation history
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: enhancedPrompt }
    ];
    
    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory.slice(-10)); // Last 10 messages for context
    }
    
    messages.push({ role: 'user', content: query });

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        stream: stream === true,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    // If streaming, pass through the response
    if (stream) {
      return new Response(aiResponse.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || 'Unable to process your request.';

    // Detect if this is an identity/name response to trigger memory storage
    const isIdentityResponse = intent.primary === 'conversation' && 
      (query.toLowerCase().includes('my name is') || 
       query.toLowerCase().includes("i'm ") ||
       query.toLowerCase().includes('call me '));

    console.log(`✅ [CHATR Intelligence] Response generated for: ${intent.primary}`);

    return new Response(
      JSON.stringify({ 
        answer,
        agents,
        intent: intent.primary,
        shouldStoreMemory: isIdentityResponse,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [CHATR Intelligence] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Build enhanced prompt with multi-agent context and CHATR Intelligence master prompt
 */
function buildEnhancedPrompt(
  systemPrompt: string,
  agents: string[],
  intent: { primary: string; actionRequired: string },
  context?: string,
  userMemory?: { name?: string; preferences?: string[]; locality?: string; jobRole?: string }
): string {
  // Start with the master CHATR Intelligence prompt
  let enhanced = CHATR_INTELLIGENCE_PROMPT;

  // Add agent-specific context
  if (systemPrompt && systemPrompt !== enhanced) {
    enhanced += `\n\n--- AGENT-SPECIFIC CONTEXT ---\n${systemPrompt}`;
  }

  // Add multi-agent coordination if multiple agents
  if (agents.length > 1) {
    enhanced += `\n\n--- MULTI-AGENT COORDINATION ---
You are coordinating with other CHATR agents: ${agents.slice(1).join(', ')}.
Consider their expertise when answering. For example:
- If health is involved, prioritize safety
- If local services are involved, consider location
- If jobs are involved, focus on skills matching`;
  }

  // Add detected intent
  enhanced += `\n\n--- DETECTED INTENT ---
Primary Intent: ${intent.primary}
Primary Agent: ${agents[0] || 'search'}`;
  
  if (intent.actionRequired !== 'none') {
    enhanced += `\nAction Required: ${intent.actionRequired}
If the user wants to complete this action, provide clear next steps or confirm readiness.`;
  }

  // Add user memory context if available
  if (userMemory) {
    enhanced += `\n\n--- USER MEMORY ---`;
    if (userMemory.name) enhanced += `\nUser Name: ${userMemory.name}`;
    if (userMemory.locality) enhanced += `\nLocation: ${userMemory.locality}`;
    if (userMemory.jobRole) enhanced += `\nJob/Role: ${userMemory.jobRole}`;
    if (userMemory.preferences?.length) enhanced += `\nPreferences: ${userMemory.preferences.join(', ')}`;
  }

  // Add session context
  if (context) {
    enhanced += `\n\n--- SESSION CONTEXT ---\n${context}`;
  }

  // Final reminder
  enhanced += `\n\n--- FINAL REMINDER ---
Keep responses concise (2-4 sentences unless asked for more).
Be helpful and action-oriented.
If an action can be completed in CHATR (booking, ordering, applying), mention it.
Use simple language accessible to all users.`;

  return enhanced;
}
