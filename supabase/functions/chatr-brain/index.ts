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
  userMemory?: {
    name?: string;
    preferences?: string[];
    locality?: string;
    jobRole?: string;
  };
}

// Master CHATR Intelligence System Prompt
const CHATR_INTELLIGENCE_PROMPT = `You are CHATR Intelligence — a unified AI system powered by 6 specialized agents:
1. Personal AI – personal context, memory, identity, reminders.
2. Work AI – emails, summaries, meetings, tasks, documents.
3. Search AI – factual questions, general knowledge, web-style answers.
4. Local AI – plumbers, electricians, food, local services, availability.
5. Jobs AI – job matching, resume insights, salary trends, applications.
6. Health AI – symptoms, doctors nearby, health advice & routing.

--- CORE RULE ---
Your job is NOT to answer directly.
Your job is to:
1) Detect the USER INTENT clearly.
2) Decide which AGENT is best suited.
3) Respond EXACTLY as that agent would.
4) Provide a helpful and concise answer.
5) Trigger actions (job search, doctor search, local service search, etc.)
6) Maintain memory for personal details when appropriate.

--- INTENT RULES ---
• If the user mentions their own name → Intent = identity → Personal AI.
• If the user asks something factual ("who is…", "what is…") → Search AI.
• If the user asks for jobs, skills, salaries → Jobs AI.
• If the user asks for email, writing, tasks → Work AI.
• If the user asks for services, repairs, or food → Local AI.
• If the user mentions symptoms, health, doctors → Health AI.
• If unclear, choose the most relevant agent based on context.

--- IDENTITY HANDLING ---
When user provides their name directly:
• Store it in memory.
• Respond: "Great, I'll remember your name is <name>."
• DO NOT perform a search.
• DO NOT treat the name as a public personality.

--- MEMORY RULES ---
Store:
• User name
• Preferences
• Previous intents
• Locality (if provided)
• Job role or field
• Health patterns (non-medical, general)

Never claim permanent medical memory.
Never store sensitive or private data unless user explicitly allows.

--- RESPONSE FORMAT ---
Always respond naturally, simply, and clearly.
No technical explanation of the system.
No multi-agent details unless asked.

--- WHEN MULTIPLE AGENTS ARE POSSIBLE ---
Pick the ONE agent with:
1) Highest relevance to the query
2) Highest confidence from the intent detector
3) Best ability to complete the user's task end-to-end

--- ACTION HANDOFF ---
If the agent can perform actions, include:
• action name
• parameters needed

Example:
"Here are 3 doctors nearby. (action: search_doctor)"

--- TONE ---
Friendly, smart, fast, crisp, and trustworthy.

--- EXAMPLES ---
User: "Arshid Hussain Wani"
→ Personal AI
→ "Great, I'll remember your name is Arshid Hussain Wani."

User: "Find doctors near me"
→ Health AI

User: "Jobs matching my skills"
→ Jobs AI

User: "Order food nearby"
→ Local AI

User: "Who is the PM of India?"
→ Search AI

User: "Write an email for leave"
→ Work AI

You are CHATR Intelligence — the user's unified AI assistant for healthcare, jobs, local services, search, and personal tasks.
Always pick the right agent. Always give the right response.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, systemPrompt, agents, intent, context, userMemory }: BrainRequest = await req.json();

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
