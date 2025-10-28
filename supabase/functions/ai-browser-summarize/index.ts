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
    const { query, results } = await req.json();
    
    if (!query || !results) {
      throw new Error('Query and results required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Prepare context from results
    const context = results.map((r: any, idx: number) => 
      `[${idx + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`
    ).join('\n\n');

    // Call Lovable AI for summarization
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert summarizer. Given search results, produce:
1) A 2-line TL;DR with inline citation markers like [1]
2) 6 bullet points summarizing key info with citations
3) 3 suggested follow-up questions
4) Confidence score (0-1)
5) Extract top 5 source citations

Format as JSON:
{
  "tldr": "...",
  "bullets": ["...", "..."],
  "followUps": ["...", "...", "..."],
  "confidence": 0.85,
  "citations": [{"text": "Source 1", "url": "..."}]
}`
          },
          {
            role: 'user',
            content: `Query: ${query}\n\nSearch Results:\n${context}\n\nProvide summary in JSON format.`
          }
        ]
      })
    });

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }

    if (response.status === 402) {
      throw new Error('AI credits exhausted. Please add credits to your workspace.');
    }

    if (!response.ok) {
      throw new Error('AI summary generation failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No summary generated');
    }

    // Parse JSON response
    const summary = JSON.parse(content);

    // Generate recommendations (simple similarity-based)
    const recommendations = await generateRecommendations(query, results);

    return new Response(
      JSON.stringify({ summary, recommendations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Summarization error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function generateRecommendations(query: string, results: any[]) {
  // Simple keyword-based recommendations
  const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3);
  
  return results.slice(0, 4).map((r: any, idx: number) => {
    const titleLower = r.title.toLowerCase();
    const snippetLower = r.snippet.toLowerCase();
    
    // Calculate score based on keyword matches
    let score = 0;
    keywords.forEach(kw => {
      if (titleLower.includes(kw)) score += 0.3;
      if (snippetLower.includes(kw)) score += 0.2;
    });
    score += 0.5 * (1 / (idx + 1)); // Recency boost
    
    return {
      title: r.title,
      reason: `Relevant to your search for "${query}"`,
      url: r.url,
      score: Math.min(score, 1)
    };
  }).sort((a, b) => b.score - a.score);
}
