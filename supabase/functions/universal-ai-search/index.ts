// Universal AI search intent detection using OpenRouter

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    // Call OpenRouter AI to understand search intent
    const aiResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://chatr.chat',
        'X-Title': 'Chatr Universal Search',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are an AI search assistant for Chatr.chat - a universal search platform.
Analyze the user's search query and extract:
1. Intent: What is the user looking for?
2. Category: Main category
3. Keywords: Important search terms
4. Location intent: If location mentioned or implied
5. Suggestions: 3-5 related search suggestions

Respond in JSON format:
{
  "intent": "brief intent description",
  "category": "main category",
  "keywords": ["keyword1", "keyword2"],
  "location": "location if mentioned or null",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`
          },
          {
            role: 'user',
            content: `Analyze this search query: "${query}"`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content || '{}';

    let parsedIntent;
    try {
      parsedIntent = JSON.parse(aiMessage);
    } catch {
      parsedIntent = {
        intent: 'general search',
        category: 'general',
        keywords: [query],
        location: null,
        suggestions: [`Find ${query}`, `Best ${query}`, `${query} near me`]
      };
    }

    return new Response(
      JSON.stringify(parsedIntent),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Universal AI Search error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
