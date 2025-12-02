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

    // GeoIP lookup (stub - returns null for now)
    let ipLat: number | null = null;
    let ipLon: number | null = null;
    let ipCountry: string | null = null;
    let ipCity: string | null = null;

    // Get last known location
    const { data: lastLoc } = await supabase
      .from('last_locations')
      .select('*')
      .or(`user_id.eq.${userId || 'null'},session_id.eq.${sessionId}`)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    const lastLat = lastLoc?.lat || null;
    const lastLon = lastLoc?.lon || null;

    // Update last known location if GPS provided
    if (gpsLat && gpsLon) {
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
    }

    // Call Google Custom Search API
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_SEARCH_API_KEY');
    const GOOGLE_CX_ID = Deno.env.get('GOOGLE_SEARCH_CX_ID');

    if (!GOOGLE_API_KEY || !GOOGLE_CX_ID) {
      console.error('Missing Google API credentials');
      return new Response(
        JSON.stringify({ 
          error: 'Google API credentials not configured',
          results: [],
          aiAnswer: null
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleUrl = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX_ID}&num=10`;
    
    console.log('Calling Google Custom Search API...');
    const googleResponse = await fetch(googleUrl);
    const googleData = await googleResponse.json();

    if (!googleResponse.ok) {
      console.error('Google API error:', googleData);
      return new Response(
        JSON.stringify({ 
          error: 'Google API error',
          results: [],
          aiAnswer: null
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize Google results
    const rawResults = googleData.items || [];
    console.log(`Google returned ${rawResults.length} results`);

    // Classify and score results
    const results = rawResults.map((item: any, index: number) => {
      const detectedType = classifyResult(query, item);
      const score = calculateScore(item, index, query, gpsLat, gpsLon, lastLat, lastLon);
      
      return {
        title: item.title,
        snippet: item.snippet,
        url: item.link,
        displayUrl: item.displayLink,
        faviconUrl: item.pagemap?.cse_image?.[0]?.src || null,
        source: 'google',
        detectedType,
        score,
        rank: index + 1
      };
    });

    // Sort by score
    results.sort((a: any, b: any) => b.score - a.score);
    results.forEach((r: any, i: number) => r.rank = i + 1);

    // Log search to database
    const { data: searchLog } = await supabase
      .from('search_logs')
      .insert({
        user_id: userId || null,
        session_id: sessionId,
        query,
        source: 'web',
        engine: 'google_custom_search',
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

    const searchId = searchLog?.id;

    // Call AI answer function
    let aiAnswer: { text: string | null; sources: string[] } = { text: null, sources: [] };
    
    try {
      const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-answer', {
        body: {
          query,
          results: results.slice(0, 5).map((r: any) => ({
            title: r.title,
            snippet: r.snippet,
            url: r.url
          })),
          location: gpsLat && gpsLon ? { lat: gpsLat, lon: gpsLon } : null
        }
      });

      if (!aiError && aiData) {
        aiAnswer = {
          text: aiData.text || null,
          sources: aiData.sources || []
        };
      }
    } catch (aiErr) {
      console.error('AI answer error:', aiErr);
    }

    return new Response(
      JSON.stringify({
        searchId,
        query,
        aiAnswer,
        location: {
          gpsLat,
          gpsLon,
          ipLat,
          ipLon,
          lastLat,
          lastLon
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

function classifyResult(query: string, item: any): string {
  const url = item.link.toLowerCase();
  const title = item.title.toLowerCase();
  const snippet = item.snippet.toLowerCase();
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
  gpsLat?: number,
  gpsLon?: number,
  lastLat?: number | null,
  lastLon?: number | null
): number {
  let score = 100 - index * 5; // Base Google rank

  const combined = `${item.title} ${item.snippet}`.toLowerCase();
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

  // Quality signals
  if (item.pagemap?.metatags?.[0]?.['og:description']) {
    score += 5; // Has rich metadata
  }

  return score;
}
