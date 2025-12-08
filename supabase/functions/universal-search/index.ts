import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  displayUrl: string;
  faviconUrl: string | null;
  source: string;
  detectedType: string;
  score: number;
  rank: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      query,
      sessionId,
      userId,
      gpsLat,
      gpsLon
    }: SearchRequest = await req.json();

    if (!query || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'query and sessionId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get IP from request
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // IP-based geolocation lookup
    let ipLat: number | null = null;
    let ipLon: number | null = null;
    let ipCountry: string | null = null;
    let ipCity: string | null = null;

    try {
      const ipResponse = await fetch(`http://ip-api.com/json/${clientIP === 'unknown' ? '' : clientIP}?fields=status,country,countryCode,city,lat,lon`);
      const ipData = await ipResponse.json();
      
      if (ipData.status === 'success') {
        ipLat = ipData.lat;
        ipLon = ipData.lon;
        ipCountry = ipData.countryCode;
        ipCity = ipData.city;
        console.log(`IP location resolved: ${ipCity}, ${ipCountry} (${ipLat}, ${ipLon})`);
      }
    } catch (ipErr) {
      console.error('IP geolocation error:', ipErr);
    }

    // Get last known location
    let lastLat: number | null = null;
    let lastLon: number | null = null;

    try {
      const { data: lastLoc } = await supabase
        .from('last_locations')
        .select('*')
        .or(`user_id.eq.${userId || 'null'},session_id.eq.${sessionId}`)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      lastLat = lastLoc?.lat || null;
      lastLon = lastLoc?.lon || null;
    } catch (locErr) {
      console.log('No last location found');
    }

    // Update last known location if GPS provided
    if (gpsLat && gpsLon) {
      try {
        await supabase
          .from('last_locations')
          .upsert({
            user_id: userId || null,
            session_id: sessionId,
            lat: gpsLat,
            lon: gpsLon,
            source: 'gps',
            updated_at: new Date().toISOString()
          }, {
            onConflict: userId ? 'user_id' : 'session_id'
          });
      } catch (upsertErr) {
        console.error('Failed to update last location:', upsertErr);
      }
    }

    // Determine best available location (GPS > IP > Last Known)
    const effectiveLat = gpsLat || ipLat || lastLat;
    const effectiveLon = gpsLon || ipLon || lastLon;
    const effectiveCity = ipCity || 'India';
    const effectiveCountry = ipCountry || 'IN';

    console.log(`Effective location: ${effectiveCity}, ${effectiveCountry} (${effectiveLat}, ${effectiveLon})`);

    // Build location-aware search queries for broader coverage
    let searchQuery = query;
    const localKeywords = ['near me', 'nearby', 'local', 'shop', 'store', 'restaurant', 'doctor', 'hospital', 'clinic', 'job', 'service', 'best', 'top', 'places'];
    const isLocalQuery = localKeywords.some(kw => query.toLowerCase().includes(kw));
    
    // Enhance query with location context for better results
    if (effectiveCity && !query.toLowerCase().includes(effectiveCity.toLowerCase())) {
      if (isLocalQuery) {
        searchQuery = `${query} in ${effectiveCity}, India`;
      }
    }

    // Generate broader search variations for more dynamic results
    const searchVariations = [
      searchQuery,
      `${query} ${effectiveCity || 'India'}`,
      `best ${query}`,
      `${query} 2024 2025`
    ];

    let results: SearchResult[] = [];
    let searchEngine = 'google_custom_search';

    // Try Google Custom Search first with expanded parameters
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_SEARCH_API_KEY');
    const GOOGLE_CX_ID = Deno.env.get('GOOGLE_SEARCH_CX_ID');

    if (GOOGLE_API_KEY && GOOGLE_CX_ID) {
      // Primary search with location bias
      const googleParams = new URLSearchParams({
        q: searchQuery,
        key: GOOGLE_API_KEY,
        cx: GOOGLE_CX_ID,
        num: '10',
        gl: effectiveCountry?.toLowerCase() || 'in',
        hl: 'en',
        safe: 'active',
        dateRestrict: 'y1', // Results from last year for freshness
      });

      // Add geo-targeting if we have coordinates
      if (effectiveLat && effectiveLon) {
        googleParams.set('lr', 'lang_en');
      }

      const googleUrl = `https://www.googleapis.com/customsearch/v1?${googleParams.toString()}`;
      
      console.log(`Calling Google Custom Search: "${searchQuery}" (gl=${effectiveCountry?.toLowerCase() || 'in'}, coords: ${effectiveLat},${effectiveLon})`);
      
      try {
        const googleResponse = await fetch(googleUrl);
        const googleData = await googleResponse.json();

        console.log(`Google API response status: ${googleResponse.status}`);
        
        if (googleResponse.ok && googleData.items) {
          const rawResults = googleData.items || [];
          console.log(`Google returned ${rawResults.length} primary results`);

          results = rawResults.map((item: any, index: number) => {
            const detectedType = classifyResult(query, item);
            const score = calculateScore(item, index, query, effectiveLat, effectiveLon);
            
            // Extract best available image from pagemap
            const image = item.pagemap?.cse_image?.[0]?.src || 
                         item.pagemap?.cse_thumbnail?.[0]?.src ||
                         item.pagemap?.metatags?.[0]?.['og:image'] ||
                         null;
            
            return {
              title: item.title,
              snippet: item.snippet,
              url: item.link,
              displayUrl: item.displayLink,
              faviconUrl: image,
              image: image,
              source: 'google',
              detectedType,
              score,
              rank: index + 1
            };
          });

          // If we have fewer than 10 results, try a broader search
          if (results.length < 8) {
            console.log('Trying broader search for more results...');
            const broaderParams = new URLSearchParams({
              q: `${query} India`,
              key: GOOGLE_API_KEY,
              cx: GOOGLE_CX_ID,
              num: '10',
              gl: 'in',
              hl: 'en',
            });
            
            const broaderResponse = await fetch(`https://www.googleapis.com/customsearch/v1?${broaderParams.toString()}`);
            const broaderData = await broaderResponse.json();
            
            if (broaderResponse.ok && broaderData.items) {
              const additionalResults = broaderData.items
                .filter((item: any) => !results.some((r: any) => r.url === item.link))
                .map((item: any, index: number) => {
                  const detectedType = classifyResult(query, item);
                  const score = calculateScore(item, results.length + index, query, effectiveLat, effectiveLon);
                  const image = item.pagemap?.cse_image?.[0]?.src || item.pagemap?.cse_thumbnail?.[0]?.src || null;
                  
                  return {
                    title: item.title,
                    snippet: item.snippet,
                    url: item.link,
                    displayUrl: item.displayLink,
                    faviconUrl: image,
                    image: image,
                    source: 'google',
                    detectedType,
                    score: score - 10, // Slightly lower priority for broader results
                    rank: results.length + index + 1
                  };
                });
              
              results = [...results, ...additionalResults];
              console.log(`Added ${additionalResults.length} broader results, total: ${results.length}`);
            }
          }
        } else {
          // Log detailed error info
          const errorCode = googleData.error?.code || googleResponse.status;
          const errorMessage = googleData.error?.message || 'Unknown error';
          const errorReason = googleData.error?.errors?.[0]?.reason || 'unknown';
          
          console.error(`Google API error - Status: ${googleResponse.status}, Code: ${errorCode}, Reason: ${errorReason}, Message: ${errorMessage}`);
          
          // Check for quota-related errors (403, 429, or specific reasons)
          const isQuotaError = errorCode === 429 || errorCode === 403 || 
                              errorReason === 'quotaExceeded' || 
                              errorReason === 'rateLimitExceeded' ||
                              errorReason === 'dailyLimitExceeded' ||
                              errorMessage.toLowerCase().includes('quota');
          
          if (isQuotaError) {
            console.log('Google quota/rate limit issue detected, falling back to alternatives');
          }
          
          searchEngine = 'duckduckgo';
          results = await searchDuckDuckGo(searchQuery, query, effectiveLat, effectiveLon);
        }
      } catch (googleErr) {
        console.error('Google search error:', googleErr);
        searchEngine = 'duckduckgo';
        results = await searchDuckDuckGo(searchQuery, query, effectiveLat, effectiveLon);
      }
    } else {
      console.log('No Google credentials, using DuckDuckGo');
      searchEngine = 'duckduckgo';
      results = await searchDuckDuckGo(searchQuery, query, effectiveLat, effectiveLon);
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);
    results.forEach((r, i) => r.rank = i + 1);

    // Log search to database
    let searchId: string | null = null;
    try {
      const { data: searchLog } = await supabase
        .from('search_logs')
        .insert({
          user_id: userId || null,
          session_id: sessionId,
          query,
          source: 'web',
          engine: searchEngine,
          gps_lat: gpsLat || null,
          gps_lon: gpsLon || null,
          ip: clientIP,
          ip_country: ipCountry,
          ip_city: ipCity,
          ip_lat: ipLat,
          ip_lon: ipLon,
          last_known_lat: lastLat,
          last_known_lon: lastLon
        })
        .select()
        .single();

      searchId = searchLog?.id;
    } catch (logErr) {
      console.error('Failed to log search:', logErr);
    }

    // Fetch Google Image Search results for real photos
    let imageResults: Array<{ url: string; thumbnail: string; source: string; title: string }> = [];
    
    if (GOOGLE_API_KEY && GOOGLE_CX_ID) {
      try {
        const imageParams = new URLSearchParams({
          q: query,
          key: GOOGLE_API_KEY,
          cx: GOOGLE_CX_ID,
          searchType: 'image',
          num: '6',
          safe: 'active',
        });
        
        const imageUrl = `https://www.googleapis.com/customsearch/v1?${imageParams.toString()}`;
        console.log(`Fetching Google Images for: "${query}"`);
        
        const imageResponse = await fetch(imageUrl);
        const imageData = await imageResponse.json();
        
        if (imageResponse.ok && imageData.items) {
          imageResults = imageData.items.map((img: any) => ({
            url: img.link,
            thumbnail: img.image?.thumbnailLink || img.link,
            source: img.displayLink,
            title: img.title
          }));
          console.log(`Got ${imageResults.length} images from Google`);
        }
      } catch (imgErr) {
        console.error('Google Image Search error:', imgErr);
      }
    }

    // Call AI answer function with images for richer response
    let aiAnswer: { text: string | null; sources: any[]; images: any[] } = { text: null, sources: [], images: [] };
    
    try {
      const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-answer', {
        body: {
          query,
          results: results.slice(0, 8).map((r: any) => ({
            title: r.title,
            snippet: r.snippet,
            url: r.url,
            image: r.image
          })),
          images: imageResults, // Pass actual image search results
          location: effectiveLat && effectiveLon ? { lat: effectiveLat, lon: effectiveLon, city: effectiveCity } : null
        }
      });

      if (!aiError && aiData) {
        aiAnswer = {
          text: aiData.text || null,
          sources: aiData.sources || [],
          images: aiData.images || imageResults // Use Google Images if AI doesn't return images
        };
      } else {
        // If AI fails, still include image results
        aiAnswer.images = imageResults;
      }
    } catch (aiErr) {
      console.error('AI answer error:', aiErr);
      aiAnswer.images = imageResults;
    }

    return new Response(
      JSON.stringify({
        searchId,
        query,
        aiAnswer,
        searchEngine,
        location: {
          gpsLat,
          gpsLon,
          ipLat,
          ipLon,
          ipCity,
          ipCountry,
          lastLat,
          lastLon,
          effectiveLat,
          effectiveLon,
          effectiveCity
        },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Universal search error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// DuckDuckGo fallback search using multiple approaches
async function searchDuckDuckGo(
  searchQuery: string,
  originalQuery: string,
  lat?: number | null,
  lon?: number | null
): Promise<any[]> {
  let results: any[] = [];
  
  // Approach 1: DuckDuckGo HTML Scraping (most reliable for general queries)
  try {
    console.log(`Trying DuckDuckGo HTML scraping for: "${searchQuery}"`);
    const ddgHtmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
    
    const htmlResponse = await fetch(ddgHtmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      signal: AbortSignal.timeout(8000)
    });
    
    if (htmlResponse.ok) {
      const html = await htmlResponse.text();
      
      // Parse results from HTML - look for result links
      const resultPattern = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
      const snippetPattern = /<a[^>]*class="result__snippet"[^>]*>([^<]+(?:<[^>]+>[^<]*<\/[^>]+>)*[^<]*)<\/a>/gi;
      
      // Alternative patterns for different HTML structures
      const urlMatches = html.matchAll(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/a>/gi);
      const snippetMatches = [...html.matchAll(/<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([^]*?)<\/a>/gi)];
      
      let idx = 0;
      for (const match of urlMatches) {
        if (results.length >= 15) break;
        
        let url = match[1];
        // DuckDuckGo redirects through uddg parameter
        if (url.includes('uddg=')) {
          const uddgMatch = url.match(/uddg=([^&]+)/);
          if (uddgMatch) {
            url = decodeURIComponent(uddgMatch[1]);
          }
        }
        
        // Skip DuckDuckGo internal links
        if (url.includes('duckduckgo.com') && !url.includes('/c/')) continue;
        
        const title = match[2].replace(/<[^>]+>/g, '').trim();
        if (!title || title.length < 3) continue;
        
        let snippet = '';
        if (snippetMatches[idx]) {
          snippet = snippetMatches[idx][1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }
        
        try {
          const domain = new URL(url).hostname;
          results.push({
            title,
            snippet: snippet || title,
            url,
            displayUrl: domain,
            faviconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
            image: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
            source: 'duckduckgo',
            detectedType: classifyResult(originalQuery, { title, snippet, link: url }),
            score: 60 - (idx * 2),
            rank: results.length + 1
          });
        } catch (urlErr) {
          // Invalid URL, skip
        }
        idx++;
      }
      
      console.log(`DuckDuckGo HTML scraping returned ${results.length} results`);
    }
  } catch (htmlErr) {
    console.error('DuckDuckGo HTML scraping error:', htmlErr);
  }
  
  // Approach 2: DuckDuckGo Instant Answer API (for known entities)
  if (results.length < 5) {
    try {
      console.log(`Trying DuckDuckGo Instant Answer API for: "${searchQuery}"`);
      const ddgApiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_redirect=1&no_html=1`;
      
      const apiResponse = await fetch(ddgApiUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        
        // Extract related topics
        if (apiData.RelatedTopics && apiData.RelatedTopics.length > 0) {
          for (const topic of apiData.RelatedTopics.slice(0, 5)) {
            if (topic.FirstURL && topic.Text && !results.some(r => r.url === topic.FirstURL)) {
              const domain = new URL(topic.FirstURL).hostname;
              results.push({
                title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
                snippet: topic.Text,
                url: topic.FirstURL,
                displayUrl: domain,
                faviconUrl: topic.Icon?.URL || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
                image: topic.Icon?.URL || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
                source: 'duckduckgo',
                detectedType: classifyResult(originalQuery, { title: topic.Text, snippet: topic.Text, link: topic.FirstURL }),
                score: 50,
                rank: results.length + 1
              });
            }
          }
        }
        
        // Add main abstract result if available
        if (apiData.AbstractURL && apiData.Abstract && !results.some(r => r.url === apiData.AbstractURL)) {
          const domain = new URL(apiData.AbstractURL).hostname;
          results.unshift({
            title: apiData.Heading || originalQuery,
            snippet: apiData.Abstract,
            url: apiData.AbstractURL,
            displayUrl: domain,
            faviconUrl: apiData.Image || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
            image: apiData.Image || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
            source: 'duckduckgo',
            detectedType: classifyResult(originalQuery, { title: apiData.Heading, snippet: apiData.Abstract, link: apiData.AbstractURL }),
            score: 80,
            rank: 1
          });
        }
        
        console.log(`DuckDuckGo API added results, total: ${results.length}`);
      }
    } catch (apiErr) {
      console.error('DuckDuckGo API error:', apiErr);
    }
  }
  
  // Approach 3: Brave Search API (free tier available)
  if (results.length < 5) {
    try {
      console.log(`Trying Brave Search for: "${searchQuery}"`);
      const braveUrl = `https://search.brave.com/api/suggest?q=${encodeURIComponent(searchQuery)}`;
      
      // Try web search through suggest API which doesn't need auth
      const braveResponse = await fetch(`https://search.brave.com/search?q=${encodeURIComponent(searchQuery)}&source=web`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html'
        },
        signal: AbortSignal.timeout(5000)
      });
      
      // We can't easily parse Brave's JS-rendered page, so skip if no results yet
      console.log(`Brave search attempted`);
    } catch (braveErr) {
      console.log('Brave search fallback skipped');
    }
  }
  
  // Approach 4: Wikipedia search as final fallback
  if (results.length < 3) {
    try {
      console.log(`Trying Wikipedia search as fallback...`);
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(originalQuery)}&limit=5&format=json&origin=*`;
      
      const wikiResponse = await fetch(wikiUrl, { signal: AbortSignal.timeout(5000) });
      if (wikiResponse.ok) {
        const wikiData = await wikiResponse.json();
        const [, titles, descriptions, urls] = wikiData;
        
        if (titles && titles.length > 0) {
          for (let i = 0; i < titles.length; i++) {
            if (!results.some(r => r.url === urls[i])) {
              results.push({
                title: titles[i],
                snippet: descriptions[i] || `Wikipedia article about ${titles[i]}`,
                url: urls[i],
                displayUrl: 'en.wikipedia.org',
                faviconUrl: 'https://www.google.com/s2/favicons?domain=wikipedia.org&sz=128',
                image: 'https://www.google.com/s2/favicons?domain=wikipedia.org&sz=128',
                source: 'wikipedia',
                detectedType: 'information',
                score: 35,
                rank: results.length + 1
              });
            }
          }
          console.log(`Wikipedia added results, total: ${results.length}`);
        }
      }
    } catch (wikiErr) {
      console.error('Wikipedia search error:', wikiErr);
    }
  }
  
  console.log(`Total fallback results: ${results.length}`);
  return results;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function classifyResult(query: string, item: any): string {
  const url = (item.link || item.url || '').toLowerCase();
  const title = (item.title || '').toLowerCase();
  const snippet = (item.snippet || '').toLowerCase();
  const combined = `${query} ${title} ${snippet} ${url}`.toLowerCase();

  // Local business patterns
  if (
    combined.includes('near me') ||
    combined.includes('plumber') ||
    combined.includes('electrician') ||
    combined.includes('salon') ||
    combined.includes('mechanic') ||
    combined.includes('repair')
  ) {
    return 'local_business';
  }

  // Restaurant patterns
  if (
    url.includes('zomato') ||
    url.includes('swiggy') ||
    combined.includes('restaurant') ||
    combined.includes('food') ||
    combined.includes('biryani') ||
    combined.includes('cafe')
  ) {
    return 'restaurant';
  }

  // Health patterns
  if (
    combined.includes('doctor') ||
    combined.includes('hospital') ||
    combined.includes('clinic') ||
    combined.includes('pharmacy') ||
    combined.includes('medical')
  ) {
    return 'health';
  }

  // Travel patterns
  if (
    url.includes('booking.com') ||
    url.includes('tripadvisor') ||
    url.includes('makemytrip') ||
    combined.includes('hotel') ||
    combined.includes('flight') ||
    combined.includes('travel')
  ) {
    return 'travel';
  }

  // Ecommerce patterns
  if (
    url.includes('amazon') ||
    url.includes('flipkart') ||
    url.includes('myntra') ||
    combined.includes('buy') ||
    combined.includes('shop') ||
    combined.includes('price')
  ) {
    return 'ecommerce';
  }

  // Job patterns
  if (
    url.includes('naukri') ||
    url.includes('indeed') ||
    url.includes('linkedin') ||
    combined.includes('job') ||
    combined.includes('career') ||
    combined.includes('hiring')
  ) {
    return 'job';
  }

  // Education patterns
  if (
    url.includes('coursera') ||
    url.includes('udemy') ||
    combined.includes('course') ||
    combined.includes('learn') ||
    combined.includes('education')
  ) {
    return 'education';
  }

  return 'generic_web';
}

function calculateScore(
  item: any,
  index: number,
  query: string,
  lat?: number | null,
  lon?: number | null
): number {
  let score = 100 - index * 5; // Base rank

  const url = item.link || item.url || '';
  const title = item.title || '';
  const snippet = item.snippet || '';
  const combined = `${title} ${snippet}`.toLowerCase();
  const queryWords = query.toLowerCase().split(' ');

  // Relevance boost
  let matchCount = 0;
  queryWords.forEach(word => {
    if (combined.includes(word)) matchCount++;
  });
  score += matchCount * 10;

  // Local boost if location mentioned
  if (combined.includes('near') || combined.includes('nearby')) {
    score += 15;
  }

  // Indian domain boost
  if (url.includes('.in') || url.includes('india')) {
    score += 20;
  }

  // Quality signals
  if (item.pagemap?.metatags?.[0]?.['og:description']) {
    score += 5;
  }

  return score;
}
