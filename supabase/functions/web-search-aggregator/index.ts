// Web Search Aggregator - Searches across multiple external sources
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchParams {
  query: string;
  sources?: string[]; // ['perplexity', 'openai', 'web']
  maxResults?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, sources = ['perplexity', 'openai', 'web'], maxResults = 10 }: SearchParams = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const results: any[] = [];
    const errors: any[] = [];

    // Parallel search across all sources
    const searchPromises: Promise<any>[] = [];

    // 1. Perplexity AI Search (real-time web search)
    if (sources.includes('perplexity') && OPENAI_API_KEY) {
      searchPromises.push(
        fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-large-128k-online',
            messages: [
              {
                role: 'system',
                content: 'You are a search assistant. Provide comprehensive, factual information with sources.'
              },
              {
                role: 'user',
                content: `Search for: ${query}. Provide detailed results including services, products, or information relevant to this query.`
              }
            ],
            temperature: 0.2,
            max_tokens: 2000,
            return_related_questions: true,
            search_recency_filter: 'month'
          }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.choices?.[0]?.message?.content) {
              results.push({
                source: 'perplexity',
                type: 'ai_search',
                content: data.choices[0].message.content,
                related_questions: data.related_questions || [],
                timestamp: new Date().toISOString()
              });
            }
          })
          .catch(error => {
            console.error('Perplexity error:', error);
            errors.push({ source: 'perplexity', error: error.message });
          })
      );
    }

    // 2. OpenAI GPT-5 Search Enhancement
    if (sources.includes('openai') && OPENAI_API_KEY) {
      searchPromises.push(
        fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5-2025-08-07',
            messages: [
              {
                role: 'system',
                content: `You are an intelligent search assistant. For the query, provide:
1. A comprehensive summary of what the user is looking for
2. Top 5 specific recommendations with details
3. Key factors to consider
4. Related search suggestions

Format as JSON with this structure:
{
  "summary": "brief summary",
  "recommendations": [{"name": "", "description": "", "why": ""}],
  "factors": ["factor1", "factor2"],
  "related_searches": ["search1", "search2"]
}`
              },
              {
                role: 'user',
                content: query
              }
            ],
            max_completion_tokens: 2000
          }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.choices?.[0]?.message?.content) {
              try {
                const parsed = JSON.parse(data.choices[0].message.content);
                results.push({
                  source: 'openai',
                  type: 'ai_recommendations',
                  ...parsed,
                  timestamp: new Date().toISOString()
                });
              } catch {
                results.push({
                  source: 'openai',
                  type: 'ai_recommendations',
                  content: data.choices[0].message.content,
                  timestamp: new Date().toISOString()
                });
              }
            }
          })
          .catch(error => {
            console.error('OpenAI error:', error);
            errors.push({ source: 'openai', error: error.message });
          })
      );
    }

    // 3. Lovable AI Search (using Gemini)
    if (sources.includes('web') && LOVABLE_API_KEY) {
      searchPromises.push(
        fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                content: 'You are a helpful search assistant. Provide detailed, accurate information about services, products, and businesses.'
              },
              {
                role: 'user',
                content: `Find information about: ${query}. Include details about availability, pricing, locations, and contact information if relevant.`
              }
            ],
            temperature: 0.3,
          }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.choices?.[0]?.message?.content) {
              results.push({
                source: 'gemini',
                type: 'web_search',
                content: data.choices[0].message.content,
                timestamp: new Date().toISOString()
              });
            }
          })
          .catch(error => {
            console.error('Lovable AI error:', error);
            errors.push({ source: 'gemini', error: error.message });
          })
      );
    }

    // Wait for all searches to complete
    await Promise.all(searchPromises);

    // Synthesize results using AI
    let synthesis = null;
    if (results.length > 0 && LOVABLE_API_KEY) {
      try {
        const synthesisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                content: 'You are a search results synthesizer. Combine multiple search results into a clear, actionable summary with specific recommendations.'
              },
              {
                role: 'user',
                content: `Query: "${query}"\n\nSearch Results:\n${JSON.stringify(results, null, 2)}\n\nProvide a synthesized summary with top recommendations.`
              }
            ],
            temperature: 0.3,
          }),
        });

        const synthesisData = await synthesisResponse.json();
        if (synthesisData.choices?.[0]?.message?.content) {
          synthesis = synthesisData.choices[0].message.content;
        }
      } catch (error) {
        console.error('Synthesis error:', error);
      }
    }

    return new Response(
      JSON.stringify({
        query,
        results,
        synthesis,
        sources_searched: sources,
        total_results: results.length,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Web search aggregator error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
