import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchParams {
  query: string;
  maxResults?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, maxResults = 10 }: SearchParams = await req.json();
    console.log('Perplexity-style search request:', { query, maxResults });

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Step 1: Scrape DuckDuckGo for real web results (fast)
    console.log('Fetching DuckDuckGo results...');
    const duckResults = await searchDuckDuckGo(query, maxResults);
    console.log(`Got ${duckResults.length} DuckDuckGo results`);

    // Step 2: Generate AI summary using Lovable AI (parallel)
    console.log('Generating AI summary...');
    const aiSummaryPromise = generateAISummary(query, duckResults, LOVABLE_API_KEY);

    // Wait for AI summary
    const aiSummary = await aiSummaryPromise;
    console.log('AI summary generated');

    return new Response(
      JSON.stringify({
        success: true,
        query,
        aiSummary,
        results: duckResults,
        sources: duckResults.map(r => ({ title: r.title, url: r.url })),
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Perplexity search error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function searchDuckDuckGo(query: string, maxResults: number) {
  try {
    // Use DuckDuckGo Instant Answer API (free, fast, no API key)
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`DuckDuckGo API error: ${response.status}`);
    }

    const data = await response.json();
    
    const results: any[] = [];

    // Extract instant answer
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        snippet: data.AbstractText,
        url: data.AbstractURL || `https://duckduckgo.com/?q=${encodedQuery}`,
        source: 'instant_answer'
      });
    }

    // Extract related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, maxResults - results.length)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
            snippet: topic.Text,
            url: topic.FirstURL,
            source: 'related_topic'
          });
        }
      }
    }

    // If no results from API, use HTML scraping fallback
    if (results.length === 0) {
      console.log('No API results, attempting HTML scraping...');
      const htmlResults = await scrapeDuckDuckGoHTML(query, maxResults);
      results.push(...htmlResults);
    }

    return results.slice(0, maxResults);
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    // Return fallback results
    return [{
      title: `Search results for: ${query}`,
      snippet: `DuckDuckGo search for "${query}". Please try the search again.`,
      url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      source: 'fallback'
    }];
  }
}

async function scrapeDuckDuckGoHTML(query: string, maxResults: number) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTML fetch error: ${response.status}`);
    }

    const html = await response.text();
    const results: any[] = [];

    // Simple regex-based extraction (DuckDuckGo HTML is relatively stable)
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/g;
    
    let match;
    while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
      const [, url, title, snippet] = match;
      if (url && title) {
        // Decode DuckDuckGo redirect URL
        const actualUrl = decodeURIComponent(url.replace(/^\/\/duckduckgo\.com\/l\/\?uddg=/, '').split('&')[0]);
        results.push({
          title: title.trim(),
          snippet: snippet.trim() || title.trim(),
          url: actualUrl.startsWith('http') ? actualUrl : `https://${actualUrl}`,
          source: 'html_scrape'
        });
      }
    }

    return results;
  } catch (error) {
    console.error('HTML scraping error:', error);
    return [];
  }
}

async function generateAISummary(query: string, searchResults: any[], apiKey: string) {
  try {
    // Format search results for context
    const context = searchResults
      .slice(0, 5)
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`)
      .join('\n\n');

    const prompt = `You are an expert research assistant. Based on the following search results for the query "${query}", provide a comprehensive, accurate summary that:

1. Directly answers the user's query in 2-3 paragraphs
2. Synthesizes information from multiple sources
3. Includes specific facts, numbers, and details
4. Uses natural, conversational language
5. Cites sources using [1], [2], etc. notation

Search Results:
${context}

Provide a detailed, informative summary:`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a research assistant that provides accurate, comprehensive summaries based on search results. Always cite sources using [number] notation.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 800,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI summary error:', response.status, errorText);
      
      if (response.status === 429) {
        return 'AI summary temporarily unavailable due to rate limits. Please try again in a moment.';
      }
      if (response.status === 402) {
        return 'AI summary temporarily unavailable. Please contact support.';
      }
      
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No summary available.';
  } catch (error) {
    console.error('AI summary generation error:', error);
    return `Based on the search results, here's what we found about "${query}". The search returned ${searchResults.length} relevant results with detailed information.`;
  }
}
