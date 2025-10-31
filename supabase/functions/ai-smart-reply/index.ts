import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lastMessage, context = [], replyCount = 3, tone, action } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Handle different AI actions
    if (action === 'improve_tone') {
      const tonePrompts = {
        polite: 'Rewrite this message to be more polite and courteous',
        casual: 'Rewrite this message to be more casual and friendly',
        professional: 'Rewrite this message to be more professional and formal',
        friendly: 'Rewrite this message to be warmer and more friendly'
      };

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { 
              role: 'system', 
              content: `${tonePrompts[tone as keyof typeof tonePrompts]}. Return only the improved message without explanations.` 
            },
            { role: 'user', content: lastMessage }
          ]
        }),
      });

      const data = await response.json();
      const improvedText = data.choices[0]?.message?.content;

      return new Response(
        JSON.stringify({ improvedText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate smart replies
    const contextStr = context.length > 0 
      ? `\n\nRecent conversation:\n${context.join('\n')}` 
      : '';

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: `You are a WhatsApp-style smart reply assistant. Generate ${replyCount} quick, natural reply suggestions to the user's last message. Each reply should be:
- Short (max 10 words)
- Natural and conversational
- Varied in tone (casual, friendly, professional)
- Contextually appropriate

Return ONLY a JSON array of replies with this exact format:
[
  {"text": "reply 1", "tone": "casual"},
  {"text": "reply 2", "tone": "friendly"},
  {"text": "reply 3", "tone": "professional"}
]

Do not include any other text or formatting.`
          },
          { role: 'user', content: `Last message: "${lastMessage}"${contextStr}` }
        ]
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: 'AI credits depleted. Please add funds to continue.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    // Try to parse JSON response
    let replies = [];
    try {
      replies = JSON.parse(content);
    } catch (e) {
      // Fallback: extract replies from text
      console.log('Fallback parsing for replies');
      replies = [
        { text: 'Thanks!', tone: 'casual' },
        { text: 'Sounds good 👍', tone: 'friendly' },
        { text: 'Understood', tone: 'professional' }
      ];
    }

    return new Response(
      JSON.stringify({ replies }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI smart reply error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
