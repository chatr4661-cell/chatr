import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
    const data = await response.json();
    
    const results: SearchResult[] = [];
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, 3)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
            url: topic.FirstURL,
            snippet: topic.Text,
            source: 'DuckDuckGo'
          });
        }
      }
    }
    return results;
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return [];
  }
}

async function searchWikipedia(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`
    );
    const data = await response.json();
    
    const results: SearchResult[] = [];
    if (data.query?.search) {
      for (const item of data.query.search.slice(0, 2)) {
        results.push({
          title: item.title,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
          snippet: item.snippet.replace(/<[^>]*>/g, ''),
          source: 'Wikipedia'
        });
      }
    }
    return results;
  } catch (error) {
    console.error('Wikipedia search error:', error);
    return [];
  }
}

async function summarizeWithAI(query: string, results: SearchResult[]): Promise<string> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const context = results.map(r => 
      `Source: ${r.source}\nTitle: ${r.title}\nContent: ${r.snippet}`
    ).join('\n\n');

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
            content: 'You are a helpful AI assistant that provides concise, accurate summaries based on search results. Provide a clear, well-structured answer.'
          },
          {
            role: 'user',
            content: `Based on these search results for "${query}":\n\n${context}\n\nProvide a comprehensive summary that answers the query.`
          }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI summarization error:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Searching for:', query);

    // Search multiple sources in parallel
    const [duckDuckGoResults, wikipediaResults] = await Promise.all([
      searchDuckDuckGo(query),
      searchWikipedia(query),
    ]);

    const allResults = [...duckDuckGoResults, ...wikipediaResults];

    console.log('Found results:', allResults.length);

    // Generate AI summary
    let summary = '';
    if (allResults.length > 0) {
      try {
        summary = await summarizeWithAI(query, allResults);
      } catch (error) {
        console.error('Summary generation failed:', error);
        summary = 'Unable to generate AI summary at this time.';
      }
    } else {
      summary = 'No results found for your query.';
    }

    return new Response(
      JSON.stringify({
        summary,
        results: allResults,
        query,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Search failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
