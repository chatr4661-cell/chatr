import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId, message, conversationId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      throw new Error('Agent not found');
    }

    // Get conversation history
    const { data: messages } = await supabase
      .from('messages')
      .select('content, sender_id, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    // Get training data
    const { data: trainingData } = await supabase
      .from('ai_agent_training')
      .select('question, answer')
      .eq('agent_id', agentId)
      .limit(10);

    const conversationHistory = messages?.map(m => ({
      role: m.sender_id === agent.user_id ? 'assistant' : 'user',
      content: m.content
    })) || [];

    const trainingContext = trainingData?.map(t => 
      `Q: ${t.question}\nA: ${t.answer}`
    ).join('\n\n') || '';

    const systemPrompt = `You are ${agent.agent_name}, an AI assistant.
Description: ${agent.agent_description}
Personality: ${agent.agent_personality}
Purpose: ${agent.agent_purpose}
${agent.knowledge_base ? `Knowledge Base:\n${agent.knowledge_base}\n` : ''}
${trainingContext ? `Training Examples:\n${trainingContext}\n` : ''}
Keep responses concise and helpful (2-3 sentences).`;

    // Call OpenRouter AI
    const aiResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://chatr.chat',
        'X-Title': 'Chatr Agent Chat',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.slice(-10),
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices[0]?.message?.content;

    if (!reply) throw new Error('No response from AI');

    // Save agent's response
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: agent.user_id,
      content: reply,
      message_type: 'text'
    });

    return new Response(
      JSON.stringify({ reply, agentName: agent.agent_name }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-agent-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
