import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeoResult {
  id: string;
  name: string;
  type: string;
  address: string;
  city?: string;
  state?: string;
  latitude: number;
  longitude: number;
  distance: number;
  rating?: number;
  phone?: string;
  website?: string;
  isOpen?: boolean;
  source: 'google' | 'osm' | 'scraper' | 'chatr-db';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    
    // Read from request body instead of URL params
    const requestBody = await req.json();
    const query = requestBody.query || "";
    const latitude = parseFloat(requestBody.lat);
    const longitude = parseFloat(requestBody.lng);
    const radius = parseFloat(requestBody.radius || "5"); // km
    const category = requestBody.category || "general";

    console.log('Received geo-search request:', { query, latitude, longitude, radius, category });

    // Validate coordinates are valid numbers; if invalid, fail gracefully with empty results
    if (isNaN(latitude) || isNaN(longitude)) {
      console.error('Invalid coordinates, returning empty results:', { latitude, longitude, requestBody });
      return new Response(
        JSON.stringify({
          results: [],
          error: "Location coordinates missing or invalid",
          received: { lat: requestBody.lat, lng: requestBody.lng }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check cache first
    const { data: cachedData } = await supabase
      .from("geo_cache")
      .select("*")
      .eq("query", query)
      .eq("category", category)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (cachedData && cachedData.results) {
      console.log("Returning cached results");
      return new Response(
        JSON.stringify({
          results: cachedData.results,
          cached: true,
          sources: cachedData.sources_used,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch from all sources in parallel
    const sources: Promise<GeoResult[]>[] = [];

    // Source 1: OpenStreetMap / Nominatim
    sources.push(fetchFromOSM(query, latitude, longitude, radius, category));

    // Source 2: CHATR Local Database
    sources.push(fetchFromChatrDB(supabase, query, latitude, longitude, radius, category));

    // Source 3: Web Scraper (for specific categories)
    if (['hospitals', 'clinics', 'pharmacies', 'jobs', 'grocery'].includes(category)) {
      sources.push(fetchFromScraper(query, latitude, longitude, category));
    }

    // Fetch all with timeout
    const timeoutPromise = new Promise<GeoResult[]>((resolve) => {
      setTimeout(() => resolve([]), 3000); // 3 second timeout
    });

    const results = await Promise.race([
      Promise.allSettled(sources),
      timeoutPromise.then(() => [])
    ]);

    let allResults: GeoResult[] = [];
    const sourcesUsed: string[] = [];

    if (Array.isArray(results)) {
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allResults = allResults.concat(result.value);
          sourcesUsed.push(['osm', 'chatr-db', 'scraper'][index]);
        }
      });
    }

    // Remove duplicates by name and address
    const uniqueResults = deduplicateResults(allResults);

    // Sort by distance
    const sortedResults = uniqueResults
      .map(r => ({
        ...r,
        distance: calculateDistance(latitude, longitude, r.latitude, r.longitude)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 50); // Limit to 50 results

    // Cache results
    await supabase.from("geo_cache").insert({
      query,
      category,
      latitude,
      longitude,
      radius_km: radius,
      results: sortedResults,
      sources_used: sourcesUsed,
      fetch_duration_ms: Date.now() - startTime,
      result_count: sortedResults.length,
    });

    console.log(`Fetched ${sortedResults.length} results in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({
        results: sortedResults,
        cached: false,
        sources: sourcesUsed,
        fetchTime: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in geo-search:", error);
    return new Response(
      JSON.stringify({ error: error.message, results: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Fetch from OpenStreetMap Nominatim
async function fetchFromOSM(
  query: string,
  lat: number,
  lng: number,
  radius: number,
  category: string
): Promise<GeoResult[]> {
  try {
    const categoryMap: Record<string, string> = {
      hospitals: "hospital",
      clinics: "clinic,doctors",
      pharmacies: "pharmacy",
      doctors: "doctors,clinic",
      labs: "laboratory",
      restaurants: "restaurant",
      grocery: "supermarket,convenience",
      atms: "atm",
      petrol: "fuel",
      transport: "bus_station,subway_station",
    };

    const osmCategory = categoryMap[category] || query;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(osmCategory)}&lat=${lat}&lon=${lng}&bounded=1&limit=20`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "CHATR-App/1.0",
      },
    });

    if (!response.ok) return [];

    const data = await response.json();

    return data.map((item: any) => ({
      id: `osm-${item.place_id}`,
      name: item.display_name.split(',')[0],
      type: category,
      address: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      distance: 0,
      source: 'osm' as const,
    }));
  } catch (error) {
    console.error("OSM fetch error:", error);
    return [];
  }
}

// Fetch from CHATR Local Database
async function fetchFromChatrDB(
  supabase: any,
  query: string,
  lat: number,
  lng: number,
  radius: number,
  category: string
): Promise<GeoResult[]> {
  try {
    const results: GeoResult[] = [];

    // Search local_business_db
    if (['stores', 'food', 'restaurants', 'grocery', 'general'].includes(category)) {
      const { data: businesses } = await supabase
        .from("local_business_db")
        .select("*")
        .ilike("business_name", `%${query}%`)
        .limit(20);

      if (businesses) {
        businesses.forEach((b: any) => {
          if (b.latitude && b.longitude) {
            results.push({
              id: `chatr-business-${b.id}`,
              name: b.business_name,
              type: b.category || category,
              address: b.address,
              city: b.city,
              state: b.state,
              latitude: parseFloat(b.latitude),
              longitude: parseFloat(b.longitude),
              distance: 0,
              rating: b.rating_average,
              phone: b.phone_number,
              source: 'chatr-db' as const,
            });
          }
        });
      }
    }

    // Search jobs
    if (category === 'jobs') {
      const { data: jobs } = await supabase
        .from("jobs_clean_master")
        .select("*")
        .ilike("job_title", `%${query}%`)
        .limit(20);

      if (jobs) {
        jobs.forEach((j: any) => {
          if (j.latitude && j.longitude) {
            results.push({
              id: `chatr-job-${j.id}`,
              name: j.job_title,
              type: 'job',
              address: j.location || j.city,
              city: j.city,
              latitude: parseFloat(j.latitude),
              longitude: parseFloat(j.longitude),
              distance: 0,
              source: 'chatr-db' as const,
            });
          }
        });
      }
    }

    return results;
  } catch (error) {
    console.error("CHATR DB fetch error:", error);
    return [];
  }
}

// Fetch from web scraper
async function fetchFromScraper(
  query: string,
  lat: number,
  lng: number,
  category: string
): Promise<GeoResult[]> {
  try {
    // Use DuckDuckGo search for local results
    const searchQuery = `${query} near me ${category}`;
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    
    // Basic parsing (in production, use a proper HTML parser)
    const results: GeoResult[] = [];
    
    // This is a simplified scraper - in production, implement proper HTML parsing
    // For now, return empty array and rely on other sources
    
    return results;
  } catch (error) {
    console.error("Scraper fetch error:", error);
    return [];
  }
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Remove duplicate results
function deduplicateResults(results: GeoResult[]): GeoResult[] {
  const seen = new Set<string>();
  return results.filter(result => {
    const key = `${result.name.toLowerCase()}-${result.address.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
