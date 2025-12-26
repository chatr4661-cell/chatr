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
  images?: Array<{
    url: string;
    thumbnail: string;
    source: string;
    title: string;
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
    const { query, results, images: googleImages, location }: AIAnswerRequest = await req.json();
    console.log('📝 AI Answer request for:', query);

    if (!query || !results || results.length === 0) {
      console.log('❌ No query or results provided');
      return new Response(
        JSON.stringify({ text: null, sources: [], images: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('❌ GOOGLE_GEMINI_API_KEY not configured');
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }
    console.log('✅ Gemini API key found');

    // Build context from search results with source attribution
    const contextText = results
      .slice(0, 8)
      .map((r, i) => `[Source ${i + 1}: ${new URL(r.url).hostname}]\nTitle: ${r.title}\nContent: ${r.snippet}`)
      .join('\n\n');

    const locationContext = location?.city 
      ? `\nUser is searching from: ${location.city}`
      : '';

    // Use Google Image Search results if available, otherwise fall back to webpage images
    const images = googleImages && googleImages.length > 0
      ? googleImages.slice(0, 6).map(img => ({ 
          url: img.thumbnail || img.url, 
          fullUrl: img.url,
          source: img.source,
          title: img.title
        }))
      : results
          .filter(r => r.image && !r.image.includes('favicon'))
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

    console.log('🚀 Calling Gemini API...');
    
    // Use Google Gemini API directly
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nUser Query: ${query}\n\nProvide a comprehensive answer about this topic.` }]
          }
        ],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 600,
        },
      }),
    });
    
    console.log('📡 Gemini response status:', response.status);

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
    console.log('📊 Gemini response:', JSON.stringify(data).substring(0, 200));
    
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    console.log('✅ AI text generated:', aiText ? 'yes' : 'no');
    
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
