/**
 * CHATR BRAIN - Unified AI Routing Edge Function
 * Routes queries to appropriate agents and returns intelligent responses
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
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, systemPrompt, agents, intent, context }: BrainRequest = await req.json();

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
    const enhancedPrompt = buildEnhancedPrompt(systemPrompt, agents, intent, context);

    console.log(`🧠 [CHATR Brain] Processing for agents: ${agents.join(', ')}`);

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: enhancedPrompt },
          { role: 'user', content: query }
        ],
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
          JSON.stringify({ error: 'AI credits depleted.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || 'Unable to process your request.';

    console.log(`✅ [CHATR Brain] Response generated for: ${intent.primary}`);

    return new Response(
      JSON.stringify({ 
        answer,
        agents,
        intent: intent.primary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [CHATR Brain] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Build enhanced prompt with multi-agent context
 */
function buildEnhancedPrompt(
  systemPrompt: string,
  agents: string[],
  intent: { primary: string; actionRequired: string },
  context?: string
): string {
  let enhanced = systemPrompt;

  // Add multi-agent coordination if multiple agents
  if (agents.length > 1) {
    enhanced += `\n\nYou are coordinating with other CHATR agents: ${agents.slice(1).join(', ')}.
Consider their expertise when answering. For example:
- If health is involved, prioritize safety
- If local services are involved, consider location
- If jobs are involved, focus on skills matching`;
  }

  // Add intent-specific guidance
  enhanced += `\n\nUser Intent: ${intent.primary}`;
  
  if (intent.actionRequired !== 'none') {
    enhanced += `\nAction Required: ${intent.actionRequired}
If the user wants to complete this action, provide clear next steps or confirm readiness.`;
  }

  // Add user context
  if (context) {
    enhanced += `\n\nUser Context:\n${context}`;
  }

  // Add CHATR-specific branding
  enhanced += `\n\nIMPORTANT: You are part of CHATR, India's super app.
- Keep responses concise (2-4 sentences unless asked for more)
- Be helpful and action-oriented
- If an action can be completed in CHATR (booking, ordering, applying), mention it
- Use simple language accessible to all users`;

  return enhanced;
}
