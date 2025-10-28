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
    const { query } = await req.json();
    
    if (!query) {
      throw new Error('Query is required');
    }

    // Multi-source search aggregation
    const results = await aggregateSearch(query);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function aggregateSearch(query: string) {
  const results: any[] = [];

  // Source 1: Bing Web Search API (if available)
  try {
    const bingResults = await searchBing(query);
    results.push(...bingResults);
  } catch (e) {
    console.log('Bing search unavailable:', e);
  }

  // Source 2: Google Programmable Search (if available)
  try {
    const googleResults = await searchGoogle(query);
    results.push(...googleResults);
  } catch (e) {
    console.log('Google search unavailable:', e);
  }

  // Source 3: Fallback web scraper (polite)
  if (results.length === 0) {
    results.push(...await fallbackSearch(query));
  }

  // Deduplicate and rank
  return deduplicateAndRank(results);
}

async function searchBing(query: string) {
  const apiKey = Deno.env.get('BING_SEARCH_API_KEY');
  if (!apiKey) throw new Error('Bing API key not configured');

  const response = await fetch(
    `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=10`,
    {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey
      }
    }
  );

  if (!response.ok) throw new Error('Bing API error');

  const data = await response.json();
  return (data.webPages?.value || []).map((item: any) => ({
    title: item.name,
    snippet: item.snippet,
    url: item.url,
    source: 'Bing',
    favicon: `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}`
  }));
}

async function searchGoogle(query: string) {
  const apiKey = Deno.env.get('GOOGLE_API_KEY');
  const cx = Deno.env.get('GOOGLE_SEARCH_CX');
  
  if (!apiKey || !cx) throw new Error('Google API credentials not configured');

  const response = await fetch(
    `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=10`
  );

  if (!response.ok) throw new Error('Google API error');

  const data = await response.json();
  return (data.items || []).map((item: any) => ({
    title: item.title,
    snippet: item.snippet,
    url: item.link,
    source: 'Google',
    favicon: `https://www.google.com/s2/favicons?domain=${new URL(item.link).hostname}`
  }));
}

async function fallbackSearch(query: string) {
  // Simple DuckDuckGo HTML scraper (respects robots.txt)
  console.log('Using fallback search for:', query);
  
  // For demo: return mock results
  return [
    {
      title: `Search results for: ${query}`,
      snippet: 'Fallback search results. Configure Bing or Google API for real results.',
      url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      source: 'DuckDuckGo',
      favicon: 'https://duckduckgo.com/favicon.ico'
    }
  ];
}

function deduplicateAndRank(results: any[]) {
  // Deduplicate by URL
  const seen = new Set();
  const unique = results.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  // Simple ranking: source priority + position
  const ranked = unique.map((r, idx) => ({
    ...r,
    score: (r.source === 'Google' ? 1.2 : 1.0) * (1 / (idx + 1))
  }));

  return ranked.sort((a, b) => b.score - a.score).slice(0, 10);
}
