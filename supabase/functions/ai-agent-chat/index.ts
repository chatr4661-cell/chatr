// AI Agent Chat – uses Lovable AI Gateway (zero-cost) and real conversation history
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { agentId, message, conversationHistory } = await req.json();
    if (!agentId || !message) {
      return new Response(JSON.stringify({ error: 'agentId and message required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single();
    if (agentError || !agent) throw new Error('Agent not found');

    const { data: trainingData } = await supabase
      .from('ai_agent_training')
      .select('question, answer')
      .eq('agent_id', agentId)
      .limit(20);

    const trainingContext = (trainingData || [])
      .map(t => `Q: ${t.question}\nA: ${t.answer}`)
      .join('\n\n');

    const systemPrompt = `You are ${agent.agent_name}, an AI agent on Chatr.
Description: ${agent.agent_description || ''}
Personality: ${agent.agent_personality}
Purpose: ${agent.agent_purpose}
${agent.knowledge_base ? `\nKnowledge Base:\n${agent.knowledge_base}\n` : ''}
${trainingContext ? `\nTraining Examples:\n${trainingContext}\n` : ''}
Stay in character. Keep responses concise and helpful (2-4 sentences unless asked for detail).`;

    const history = Array.isArray(conversationHistory) ? conversationHistory.slice(-20) : [];

    const aiResponse = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: message }
        ],
      }),
    });

    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit reached. Try again shortly.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: 'AI credits exhausted. Add credits in workspace settings.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error('AI gateway error', aiResponse.status, t);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content;
    if (!reply) throw new Error('No reply from AI');

    // Increment usage counters (user msg + assistant reply)
    // First message in a session → also increment conversations
    const isFirstTurn = history.length === 0;
    await supabase
      .from('ai_agents')
      .update({
        total_messages: (agent.total_messages || 0) + 2,
        total_conversations: (agent.total_conversations || 0) + (isFirstTurn ? 1 : 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId);

    // Daily analytics
    const today = new Date().toISOString().slice(0, 10);
    const { data: existingRow } = await supabase
      .from('ai_agent_analytics')
      .select('id, messages_sent, conversations_started')
      .eq('agent_id', agentId)
      .eq('date', today)
      .maybeSingle();

    if (existingRow) {
      await supabase
        .from('ai_agent_analytics')
        .update({
          messages_sent: (existingRow.messages_sent || 0) + 2,
          conversations_started: (existingRow.conversations_started || 0) + (isFirstTurn ? 1 : 0),
        })
        .eq('id', existingRow.id);
    } else {
      await supabase
        .from('ai_agent_analytics')
        .insert({
          agent_id: agentId,
          date: today,
          messages_sent: 2,
          conversations_started: isFirstTurn ? 1 : 0,
        });
    }

    return new Response(
      JSON.stringify({ reply, agentName: agent.agent_name }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('ai-agent-chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
