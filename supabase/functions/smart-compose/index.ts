import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { recentMessages, context } = await req.json();

    if (!recentMessages || recentMessages.length === 0) {
      throw new Error('No conversation context provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build conversation history for context
    const conversationContext = recentMessages
      .slice(-5) // Last 5 messages for context
      .map((msg: any) => `${msg.sender}: ${msg.content}`)
      .join('\n');

    console.log('Generating smart replies for context:', conversationContext);

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
            content: `You are a smart reply assistant for a messaging app. Generate 3 SHORT, natural, contextually appropriate reply suggestions based on the conversation. 
            
Rules:
- Keep replies under 10 words each
- Make them conversational and natural
- Match the tone of the conversation
- Include variety: casual, friendly, and appropriate options
- Return ONLY a JSON array of 3 strings, nothing else`
          },
          {
            role: 'user',
            content: `Recent conversation:\n${conversationContext}\n\nContext: ${context || 'general chat'}\n\nGenerate 3 smart reply suggestions.`
          }
        ],
        temperature: 0.8,
        max_tokens: 150
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
        JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI response:', aiResponse);

    // Parse JSON array from response
    let suggestions;
    try {
      suggestions = JSON.parse(aiResponse);
    } catch (e) {
      // If AI didn't return pure JSON, extract array manually
      const match = aiResponse.match(/\[.*\]/s);
      if (match) {
        suggestions = JSON.parse(match[0]);
      } else {
        throw new Error('Invalid AI response format');
      }
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Smart compose error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
