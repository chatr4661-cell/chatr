import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, summaryType } = await req.json();
    
    if (!messages || messages.length === 0) {
      throw new Error('No messages provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Prepare conversation text
    const conversationText = messages
      .map((m: any) => `${m.sender_name}: ${m.content}`)
      .join('\n');

    let systemPrompt = '';
    if (summaryType === 'brief') {
      systemPrompt = 'Summarize this conversation in 2-3 sentences, highlighting key points.';
    } else if (summaryType === 'detailed') {
      systemPrompt = 'Provide a detailed summary of this conversation including main topics discussed, decisions made, and action items.';
    } else if (summaryType === 'action_items') {
      systemPrompt = 'Extract all action items, tasks, and to-dos from this conversation. Format as a bullet list.';
    } else if (summaryType === 'meeting_notes') {
      systemPrompt = 'Create meeting notes from this conversation including: Topics Discussed, Decisions Made, Action Items, and Next Steps.';
    } else {
      systemPrompt = 'Summarize this conversation concisely.';
    }

    console.log('Generating summary for', messages.length, 'messages');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: conversationText }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add more credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices[0]?.message?.content || 'Unable to generate summary';

    console.log('Summary generated successfully');

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-chat-summary:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
