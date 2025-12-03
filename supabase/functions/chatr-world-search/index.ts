import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_SEARCH_API_KEY');
const GOOGLE_CX = Deno.env.get('GOOGLE_SEARCH_CX_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface SearchRequest {
  query: string;
  type?: 'web' | 'images' | 'local' | 'all';
  location?: { lat: number; lon: number };
  page?: number;
}

// Simple hash function for caching
function hashQuery(query: string): string {
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

async function searchGoogle(query: string, type: string = 'web', start: number = 1) {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    throw new Error('Google Search API not configured');
  }

  const params = new URLSearchParams({
    key: GOOGLE_API_KEY,
    cx: GOOGLE_CX,
    q: query,
    start: start.toString(),
    num: '10',
    gl: 'in',
    cr: 'countryIN',
  });

  if (type === 'images') {
    params.set('searchType', 'image');
  }

  const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Google API error:', error);
    throw new Error(`Google API error: ${response.status}`);
  }

  return response.json();
}

async function searchDuckDuckGo(query: string) {
  // Fallback to DuckDuckGo when Google quota exceeded
  const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1`);
  
  if (!response.ok) {
    throw new Error('DuckDuckGo API error');
  }

  const data = await response.json();
  
  // Transform DuckDuckGo response to match Google format
  const results = [];
  
  if (data.AbstractText) {
    results.push({
      title: data.Heading || query,
      link: data.AbstractURL || '',
      snippet: data.AbstractText,
      source: 'duckduckgo'
    });
  }

  if (data.RelatedTopics) {
    for (const topic of data.RelatedTopics.slice(0, 9)) {
      if (topic.FirstURL) {
        results.push({
          title: topic.Text?.split(' - ')[0] || '',
          link: topic.FirstURL,
          snippet: topic.Text || '',
          source: 'duckduckgo'
        });
      }
    }
  }

  return { items: results, searchInformation: { totalResults: results.length.toString() } };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { query, type = 'all', location, page = 1 }: SearchRequest = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const queryHash = hashQuery(query + type + page);
    
    // Check cache first
    const { data: cached } = await supabase
      .from('chatr_search_cache')
      .select('*')
      .eq('query_hash', queryHash)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      // Update hit count
      await supabase
        .from('chatr_search_cache')
        .update({ hit_count: cached.hit_count + 1 })
        .eq('id', cached.id);

      return new Response(
        JSON.stringify({ ...cached.results, source: 'cache' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check API usage
    const { data: usageData } = await supabase.rpc('check_api_limit', { 
      api: 'google_search', 
      daily_max: 10000 
    });

    let searchResults;
    let source = 'google';

    if (!usageData?.allowed) {
      // Fallback to DuckDuckGo
      console.log('Google API limit reached, using DuckDuckGo');
      searchResults = await searchDuckDuckGo(query);
      source = 'duckduckgo';
    } else {
      try {
        const start = (page - 1) * 10 + 1;
        searchResults = await searchGoogle(query, type === 'images' ? 'images' : 'web', start);
        source = 'google';
      } catch (error) {
        console.error('Google search failed, falling back to DuckDuckGo:', error);
        searchResults = await searchDuckDuckGo(query);
        source = 'duckduckgo';
      }
    }

    // Transform results
    const results = {
      query,
      totalResults: searchResults.searchInformation?.totalResults || '0',
      items: (searchResults.items || []).map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet || item.htmlSnippet,
        image: item.pagemap?.cse_thumbnail?.[0]?.src || item.link,
        displayLink: item.displayLink,
        source
      })),
      source,
      page,
      apiUsage: usageData
    };

    // Cache results
    await supabase.from('chatr_search_cache').upsert({
      query_hash: queryHash,
      query,
      results,
      source,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }, { onConflict: 'query_hash' });

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});