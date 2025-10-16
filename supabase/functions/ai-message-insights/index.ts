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
    const { messages, analysisType } = await req.json();
    
    if (!messages || messages.length === 0) {
      throw new Error('No messages provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const conversationText = messages
      .map((m: any) => `${m.sender_name}: ${m.content}`)
      .join('\n');

    let systemPrompt = '';
    if (analysisType === 'sentiment') {
      systemPrompt = `Analyze the overall sentiment of this conversation. Return a JSON object with:
      - sentiment: "positive", "neutral", or "negative"
      - confidence: 0-100
      - summary: Brief explanation
      - mood_indicators: Array of detected emotions`;
    } else if (analysisType === 'topics') {
      systemPrompt = `Extract and list the main topics discussed in this conversation. Return a JSON object with:
      - topics: Array of main topics
      - keywords: Array of key terms
      - category: General category (work, personal, planning, etc.)`;
    } else if (analysisType === 'urgency') {
      systemPrompt = `Analyze the urgency and importance of this conversation. Return a JSON object with:
      - urgency: "low", "medium", or "high"
      - requires_action: boolean
      - deadline_mentioned: boolean
      - priority_score: 0-100`;
    } else if (analysisType === 'language') {
      systemPrompt = `Detect the languages used in this conversation. Return a JSON object with:
      - languages: Array of detected languages (ISO codes)
      - primary_language: Most used language
      - mixed_language: boolean`;
    }

    console.log('Analyzing messages:', analysisType);

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
            content: systemPrompt + '\n\nReturn ONLY valid JSON, no markdown or explanations.' 
          },
          { role: 'user', content: conversationText }
        ],
        temperature: 0.2,
        max_tokens: 500,
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
    let insights = data.choices[0]?.message?.content || '{}';

    // Clean JSON if wrapped in markdown
    insights = insights.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsedInsights = JSON.parse(insights);
      console.log('Insights generated successfully');
      
      return new Response(
        JSON.stringify({ insights: parsedInsights }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (e) {
      console.error('Failed to parse insights JSON:', insights);
      return new Response(
        JSON.stringify({ insights: { error: 'Failed to parse AI response', raw: insights } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in ai-message-insights:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
