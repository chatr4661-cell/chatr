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
    image?: string;
  }>;
  location?: {
    lat: number | null;
    lon: number | null;
    city?: string;
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
        JSON.stringify({ text: null, sources: [], images: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build context from search results with source attribution
    const contextText = results
      .slice(0, 8)
      .map((r, i) => `[Source ${i + 1}: ${new URL(r.url).hostname}]\nTitle: ${r.title}\nContent: ${r.snippet}`)
      .join('\n\n');

    const locationContext = location?.city 
      ? `\nUser is searching from: ${location.city}`
      : '';

    // Extract images from results
    const images = results
      .filter(r => r.image)
      .slice(0, 4)
      .map(r => ({ url: r.image!, source: new URL(r.url).hostname }));

    // Perplexity-style system prompt for rich, informative content
    const systemPrompt = `You are an expert AI search assistant that provides comprehensive, well-researched answers in the style of Perplexity AI.

RESPONSE FORMAT:
1. Start with a clear, engaging opening paragraph that directly answers the query (2-3 sentences)
2. Add relevant sections with headers when appropriate (use ## for headers)
3. Use inline citations like "according to Wikipedia" or "as noted on britannica.com" - NO bracketed numbers
4. Write in flowing prose, not bullet points
5. Include specific facts, dates, statistics when available
6. End with a brief conclusion or key takeaway

STYLE GUIDELINES:
- Write naturally like a knowledgeable friend explaining something
- Be comprehensive but concise (200-350 words)
- Bold important terms or names using **term**
- Use paragraph breaks for readability
- Cite sources naturally within sentences, not at the end
- If it's a location/place query, include geography, demographics, notable features

Search Results Context:
${contextText}${locationContext}

Remember: Write like Perplexity - informative, flowing prose with natural source citations.`;

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
          { role: 'user', content: `Provide a comprehensive answer about: ${query}` },
        ],
        temperature: 0.6,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limited', text: null, sources: [], images: [] }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Credits depleted', text: null, sources: [], images: [] }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ text: null, sources: [], images: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || null;
    
    // Extract source information
    const sources = results.slice(0, 6).map(r => ({
      title: r.title,
      url: r.url,
      domain: new URL(r.url).hostname.replace('www.', '')
    }));

    return new Response(
      JSON.stringify({ 
        text: aiText, 
        sources,
        images 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI answer error:', error);
    return new Response(
      JSON.stringify({ text: null, sources: [], images: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
