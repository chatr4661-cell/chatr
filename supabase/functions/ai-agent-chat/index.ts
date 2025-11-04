import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId, message, conversationId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      console.error('Agent not found:', agentError);
      throw new Error('Agent not found');
    }

    // Get conversation history
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('content, sender_id, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
    }

    // Get training data
    const { data: trainingData } = await supabase
      .from('ai_agent_training')
      .select('question, answer')
      .eq('agent_id', agentId)
      .limit(10);

    // Build context
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

Guidelines:
- Stay in character as ${agent.agent_name}
- Be ${agent.agent_personality}
- Focus on ${agent.agent_purpose}
- Keep responses concise and helpful (2-3 sentences)
- If you don't know something, be honest
- Never break character or mention you're an AI unless asked`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices[0]?.message?.content;

    if (!reply) {
      throw new Error('No response from AI');
    }

    // Save agent's response to database
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: agent.user_id,
        content: reply,
        message_type: 'text'
      });

    if (insertError) {
      console.error('Error saving message:', insertError);
    }

    // Update analytics
    const today = new Date().toISOString().split('T')[0];
    const { error: analyticsError } = await supabase
      .from('ai_agent_analytics')
      .upsert({
        agent_id: agentId,
        metric_date: today,
        messages_sent: 1
      }, {
        onConflict: 'agent_id,metric_date',
        ignoreDuplicates: false
      });
    
    if (analyticsError) {
      console.error('Analytics error:', analyticsError);
    }

    return new Response(
      JSON.stringify({ reply, agentName: agent.agent_name }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-agent-chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
