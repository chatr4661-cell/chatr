import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  sessionId: string;
  userId?: string;
  gpsLat?: number;
  gpsLon?: number;
}

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, sessionId, userId, gpsLat, gpsLon }: SearchRequest = await req.json();

    if (!query || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'query and sessionId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🚀 ULTRA FAST: Skip all blocking operations
    // - No IP location lookup (use GPS or skip)
    // - No database queries before search
    // - Direct DuckDuckGo (Google has 429 issues)
    
    const effectiveLat = gpsLat || null;
    const effectiveLon = gpsLon || null;
    const effectiveCity = 'India';

    // Build search query
    let searchQuery = query;
    const localKeywords = ['near me', 'nearby', 'local'];
    const isLocalQuery = localKeywords.some(kw => query.toLowerCase().includes(kw));
    
    if (isLocalQuery && effectiveLat && effectiveLon) {
      searchQuery = `${query} India`;
    }

    // 🔥 DIRECT DUCKDUCKGO - Skip Google (quota issues)
    console.log(`⚡ Direct DDG search: "${searchQuery}"`);
    const results = await fastDuckDuckGo(searchQuery, query, effectiveLat, effectiveLon);
    
    const searchTime = Date.now() - startTime;
    console.log(`✅ Search complete: ${results.length} results in ${searchTime}ms`);

    // Extract quick images
    const quickImages = results
      .filter((r: any) => r.image && !r.image.includes('favicon') && !r.image.includes('icon'))
      .slice(0, 4)
      .map((r: any) => ({
        url: r.image,
        thumbnail: r.image,
        source: r.displayUrl,
        title: r.title
      }));

    // 🔥 FIRE AND FORGET: Log in background (don't await)
    logSearchInBackground(userId, sessionId, query, gpsLat, gpsLon).catch(() => {});

    return new Response(
      JSON.stringify({
        searchId: null,
        query,
        aiAnswer: { text: null, sources: [], images: quickImages },
        aiAnswerError: null,
        aiAnswerStatus: null,
        fetchAiSeparately: true,
        searchEngine: 'duckduckgo',
        location: {
          gpsLat, gpsLon,
          ipLat: null, ipLon: null, ipCity: null, ipCountry: 'IN',
          lastLat: null, lastLon: null,
          effectiveLat, effectiveLon, effectiveCity
        },
        results,
        timing: { searchMs: searchTime }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// 🚀 ULTRA FAST DuckDuckGo - single HTTP call, minimal processing
async function fastDuckDuckGo(searchQuery: string, originalQuery: string, lat?: number | null, lon?: number | null): Promise<any[]> {
  const results: any[] = [];
  
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
    
    const response = await fetch(ddgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(3000) // 3s max
    });

    if (!response.ok) throw new Error('DDG failed');
    
    const html = await response.text();
    
    // Fast regex extraction
    const linkPattern = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetPattern = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    
    const links = [...html.matchAll(linkPattern)];
    const snippets = [...html.matchAll(snippetPattern)];
    
    for (let i = 0; i < Math.min(links.length, 10); i++) {
      const linkMatch = links[i];
      const snippetMatch = snippets[i];
      
      if (!linkMatch) continue;
      
      let url = linkMatch[1];
      const title = decode(linkMatch[2].replace(/<[^>]*>/g, ''));
      const snippet = snippetMatch ? decode(snippetMatch[1].replace(/<[^>]*>/g, '')) : '';
      
      // Extract actual URL
      if (url.includes('uddg=')) {
        const urlMatch = url.match(/uddg=([^&]*)/);
        if (urlMatch) url = decodeURIComponent(urlMatch[1]);
      }
      
      if (!url.startsWith('http')) continue;
      
      try {
        const domain = new URL(url).hostname;
        const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        
        results.push({
          title,
          snippet,
          url,
          displayUrl: domain,
          faviconUrl: favicon,
          image: favicon,
          source: 'duckduckgo',
          detectedType: classify(originalQuery, title, snippet, url),
          score: 100 - i * 5,
          rank: i + 1
        });
      } catch { }
    }
    
    // Fallback to Instant Answer API if HTML failed
    if (results.length === 0) {
      const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_redirect=1`;
      const apiResp = await fetch(apiUrl, { signal: AbortSignal.timeout(2000) });
      
      if (apiResp.ok) {
        const data = await apiResp.json();
        
        if (data.AbstractText && data.AbstractURL) {
          const domain = new URL(data.AbstractURL).hostname;
          results.push({
            title: data.Heading || searchQuery,
            snippet: data.AbstractText,
            url: data.AbstractURL,
            displayUrl: domain,
            faviconUrl: data.Image || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
            image: data.Image || null,
            source: 'duckduckgo',
            detectedType: 'generic_web',
            score: 95,
            rank: 1
          });
        }
        
        for (let i = 0; i < Math.min(data.RelatedTopics?.length || 0, 8); i++) {
          const topic = data.RelatedTopics[i];
          if (topic.FirstURL && topic.Text) {
            try {
              const domain = new URL(topic.FirstURL).hostname;
              results.push({
                title: topic.Text.split(' - ')[0].substring(0, 60),
                snippet: topic.Text,
                url: topic.FirstURL,
                displayUrl: domain,
                faviconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
                image: topic.Icon?.URL || null,
                source: 'duckduckgo',
                detectedType: 'generic_web',
                score: 90 - i * 5,
                rank: results.length + 1
              });
            } catch { }
          }
        }
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('DDG error:', error);
    return results;
  }
}

function decode(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function classify(query: string, title: string, snippet: string, url: string): string {
  const combined = `${query} ${title} ${snippet} ${url}`.toLowerCase();
  
  if (combined.includes('shop') || combined.includes('buy') || combined.includes('amazon') || combined.includes('flipkart')) return 'ecommerce';
  if (combined.includes('restaurant') || combined.includes('food') || combined.includes('zomato')) return 'restaurant';
  if (combined.includes('hotel') || combined.includes('travel') || combined.includes('booking')) return 'travel';
  if (combined.includes('doctor') || combined.includes('hospital') || combined.includes('clinic')) return 'healthcare';
  if (combined.includes('job') || combined.includes('career') || combined.includes('hiring')) return 'job';
  if (combined.includes('learn') || combined.includes('course') || combined.includes('education')) return 'education';
  
  return 'generic_web';
}

// Background logging - doesn't block response
async function logSearchInBackground(userId: string | undefined, sessionId: string, query: string, gpsLat?: number, gpsLon?: number) {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabase.from('search_logs').insert({
      user_id: userId || null,
      session_id: sessionId,
      query,
      source: 'web',
      engine: 'duckduckgo',
      gps_lat: gpsLat || null,
      gps_lon: gpsLon || null
    });
  } catch (e) {
    console.error('Background log failed:', e);
  }
}
