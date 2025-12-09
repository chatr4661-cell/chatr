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

    // Build location-aware search query
    let searchQuery = query;
    const localKeywords = ['near me', 'nearby', 'local', 'shop', 'store', 'restaurant', 'doctor', 'hospital', 'clinic', 'job', 'service'];
    const isLocalQuery = localKeywords.some(kw => query.toLowerCase().includes(kw));
    
    if (isLocalQuery && effectiveCity && !query.toLowerCase().includes(effectiveCity.toLowerCase())) {
      searchQuery = `${query} in ${effectiveCity}`;
    }

    let results: SearchResult[] = [];
    let searchEngine = 'google_custom_search';

    // Try Google Custom Search first
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_SEARCH_API_KEY');
    const GOOGLE_CX_ID = Deno.env.get('GOOGLE_SEARCH_CX_ID');

    if (GOOGLE_API_KEY && GOOGLE_CX_ID) {
      const googleParams = new URLSearchParams({
        q: searchQuery,
        key: GOOGLE_API_KEY,
        cx: GOOGLE_CX_ID,
        num: '10',
        gl: 'in',
        cr: 'countryIN',
      });

      const googleUrl = `https://www.googleapis.com/customsearch/v1?${googleParams.toString()}`;
      
      console.log(`Calling Google Custom Search: "${searchQuery}" (gl=in, cr=countryIN)`);
      const googleResponse = await fetch(googleUrl);
      const googleData = await googleResponse.json();

      if (googleResponse.ok && googleData.items) {
        // Google succeeded
        const rawResults = googleData.items || [];
        console.log(`Google returned ${rawResults.length} results`);

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
      } else if (googleData.error?.code === 429) {
        // Quota exceeded - fallback to DuckDuckGo
        console.log('Google quota exceeded, falling back to DuckDuckGo');
        searchEngine = 'duckduckgo';
        results = await searchDuckDuckGo(searchQuery, query, effectiveLat, effectiveLon);
      } else {
        console.error('Google API error:', googleData);
        // Try DuckDuckGo as fallback
        searchEngine = 'duckduckgo';
        results = await searchDuckDuckGo(searchQuery, query, effectiveLat, effectiveLon);
      }
    } else {
      // No Google credentials - use DuckDuckGo
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

// DuckDuckGo fallback search using multiple methods
async function searchDuckDuckGo(
  searchQuery: string,
  originalQuery: string,
  lat?: number | null,
  lon?: number | null
): Promise<any[]> {
  let results: any[] = [];
  
  try {
    // Method 1: Try DuckDuckGo HTML search
    console.log(`Trying DuckDuckGo HTML scraping for: "${searchQuery}"`);
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
    
    const response = await fetch(ddgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (response.ok) {
      const html = await response.text();
      
      // Improved regex patterns for DuckDuckGo HTML results
      const resultBlocks = html.match(/<div[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<\/div>/gi) || [];
      console.log(`Found ${resultBlocks.length} result blocks`);
      
      // Alternative pattern: Look for result links and snippets separately
      const linkPattern = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      const snippetPattern = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      
      const links = [...html.matchAll(linkPattern)];
      const snippets = [...html.matchAll(snippetPattern)];
      
      for (let i = 0; i < Math.min(links.length, 10); i++) {
        const linkMatch = links[i];
        const snippetMatch = snippets[i];
        
        if (linkMatch) {
          let url = linkMatch[1];
          const title = decodeHTMLEntities(linkMatch[2].replace(/<[^>]*>/g, ''));
          const snippet = snippetMatch ? decodeHTMLEntities(snippetMatch[1].replace(/<[^>]*>/g, '')) : '';
          
          // Extract actual URL from DuckDuckGo redirect
          if (url.includes('uddg=')) {
            const urlMatch = url.match(/uddg=([^&]*)/);
            if (urlMatch) {
              url = decodeURIComponent(urlMatch[1]);
            }
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
              detectedType: classifyResult(originalQuery, { title, snippet, link: url }),
              score: calculateScore({ title, snippet, link: url }, i, originalQuery, lat, lon),
              rank: i + 1
            });
          } catch (e) {
            // Invalid URL, skip
          }
        }
      }
    }
    
    console.log(`DuckDuckGo HTML scraping returned ${results.length} results`);
    
    // Method 2: If HTML scraping returns nothing, try DuckDuckGo Instant Answer API
    if (results.length === 0) {
      console.log(`Trying DuckDuckGo Instant Answer API for: "${searchQuery}"`);
      
      const instantUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_redirect=1&no_html=1`;
      const instantResponse = await fetch(instantUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CHATRBot/1.0)'
        }
      });
      
      if (instantResponse.ok) {
        const instantData = await instantResponse.json();
        
        // Add abstract result if available
        if (instantData.AbstractText && instantData.AbstractURL) {
          const domain = new URL(instantData.AbstractURL).hostname;
          results.push({
            title: instantData.Heading || searchQuery,
            snippet: instantData.AbstractText,
            url: instantData.AbstractURL,
            displayUrl: domain,
            faviconUrl: instantData.Image || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
            image: instantData.Image || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
            source: 'duckduckgo',
            detectedType: 'generic_web',
            score: 95,
            rank: 1
          });
        }
        
        // Add related topics
        if (instantData.RelatedTopics) {
          for (let i = 0; i < Math.min(instantData.RelatedTopics.length, 8); i++) {
            const topic = instantData.RelatedTopics[i];
            if (topic.FirstURL && topic.Text) {
              try {
                const domain = new URL(topic.FirstURL).hostname;
                results.push({
                  title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 50),
                  snippet: topic.Text,
                  url: topic.FirstURL,
                  displayUrl: domain,
                  faviconUrl: topic.Icon?.URL || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
                  image: topic.Icon?.URL || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
                  source: 'duckduckgo',
                  detectedType: classifyResult(originalQuery, { title: topic.Text, link: topic.FirstURL }),
                  score: 90 - i * 5,
                  rank: results.length + 1
                });
              } catch (e) {
                // Invalid URL
              }
            }
          }
        }
      }
      
      console.log(`DuckDuckGo API added results, total: ${results.length}`);
    }
    
    // Method 3: If still nothing, try Wikipedia as ultimate fallback
    if (results.length === 0) {
      console.log(`Trying Wikipedia search as fallback...`);
      
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*`;
      const wikiResponse = await fetch(wikiUrl);
      
      if (wikiResponse.ok) {
        const wikiData = await wikiResponse.json();
        
        if (wikiData.query?.search) {
          for (let i = 0; i < Math.min(wikiData.query.search.length, 5); i++) {
            const item = wikiData.query.search[i];
            const wikiPageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`;
            
            results.push({
              title: item.title,
              snippet: decodeHTMLEntities(item.snippet.replace(/<[^>]*>/g, '')),
              url: wikiPageUrl,
              displayUrl: 'en.wikipedia.org',
              faviconUrl: 'https://www.google.com/s2/favicons?domain=wikipedia.org&sz=128',
              image: 'https://www.google.com/s2/favicons?domain=wikipedia.org&sz=128',
              source: 'wikipedia',
              detectedType: 'generic_web',
              score: 85 - i * 5,
              rank: i + 1
            });
          }
        }
      }
    }
    
    console.log(`Total fallback results: ${results.length}`);
    return results;
    
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return [];
  }
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
