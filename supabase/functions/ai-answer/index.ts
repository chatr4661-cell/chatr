import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIAnswerRequest {
  query: string;
  results: Array<{
    title: string;
    snippet: string;
    url: string;
  }>;
  location?: {
    lat: number | null;
    lon: number | null;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, results, location }: AIAnswerRequest = await req.json();

    if (!query || !results || results.length === 0) {
      return new Response(
        JSON.stringify({ text: null, sources: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build context from search results
    const contextText = results
      .slice(0, 5)
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`)
      .join('\n\n');

    const locationContext = location?.lat && location?.lon
      ? `\nUser Location: approximately ${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`
      : '';

    const systemPrompt = `You are CHATR Search AI assistant. Your job is to provide a concise, helpful answer to the user's search query based on the web search results provided.

Guidelines:
- Synthesize information from multiple sources when relevant
- Be direct and factual
- If the query is location-specific and location data is available, prioritize local results
- Keep answers under 150 words
- Cite sources by mentioning the website name (not URLs) when making specific claims
- If results are insufficient, acknowledge what's missing

Search Results:
${contextText}${locationContext}`;

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
          { role: 'user', content: query },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ text: null, sources: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || null;
    const sources = results.slice(0, 3).map(r => r.url);

    return new Response(
      JSON.stringify({ text: aiText, sources }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI answer error:', error);
    return new Response(
      JSON.stringify({ text: null, sources: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
