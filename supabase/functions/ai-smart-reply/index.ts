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
    const { lastMessage, conversationContext, replyCount = 3 } = await req.json();
    
    if (!lastMessage) {
      throw new Error('No message provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build context
    let contextText = '';
    if (conversationContext && conversationContext.length > 0) {
      contextText = '\n\nRecent conversation:\n' + 
        conversationContext.map((m: any) => `${m.sender_name}: ${m.content}`).join('\n');
    }

    const systemPrompt = `Generate ${replyCount} short, natural, and contextually appropriate reply suggestions.
    
    Style requirements:
    - Write like a real person texting, not a bot
    - Make them diverse: one casual, one professional, one with emoji or enthusiasm
    - NO markdown formatting or asterisks
    - Keep each reply under 20 words
    - Sound natural and conversational
    
    Return only the replies, one per line, without numbering.`;

    console.log('Generating smart replies for:', lastMessage.substring(0, 50));

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
          { role: 'user', content: `Last message: "${lastMessage}"${contextText}` }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const repliesText = data.choices[0]?.message?.content || '';
    
    // Parse replies (one per line)
    const replies = repliesText
      .split('\n')
      .map((r: string) => r.trim())
      .filter((r: string) => r.length > 0 && !r.match(/^\d+[\.\)]/)) // Remove numbered lines
      .slice(0, replyCount);

    console.log('Generated', replies.length, 'smart replies');

    return new Response(
      JSON.stringify({ replies }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-smart-reply:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
