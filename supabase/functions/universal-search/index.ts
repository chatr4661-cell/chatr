import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  searchType?: 'all' | 'local' | 'web' | 'jobs' | 'marketplace';
  location?: { latitude: number; longitude: number };
  filters?: {
    maxDistance?: number;
    minRating?: number;
    priceRange?: { min: number; max: number };
    category?: string;
  };
  page?: number;
  limit?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      query,
      searchType = 'all',
      location,
      filters = {},
      page = 1,
      limit = 20
    }: SearchRequest = await req.json();

    console.log('Universal Search Request:', { query, searchType, location });

    // Get user ID if authenticated
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // 1. Classify intent using AI
    const intent = await classifyIntent(query);

    // 2. Check cache first
    const cacheKey = generateCacheKey(query, searchType, location, filters);
    const cachedResult = await checkCache(supabase, cacheKey);
    
    if (cachedResult) {
      await trackAnalytics(supabase, {
        userId,
        query,
        searchType,
        intent,
        resultCount: cachedResult.results.length,
        location,
        responseTime: Date.now() - startTime,
        source: 'cache'
      });

      return new Response(JSON.stringify({
        success: true,
        results: cachedResult.results,
        cached: true,
        intent,
        total: cachedResult.total
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Aggregate results from multiple sources
    const results = await aggregateResults(supabase, {
      query,
      searchType,
      intent,
      location,
      filters,
      page,
      limit
    });

    // 4. Rank results
    const rankedResults = await rankResults(results, query, location, filters);

    // 5. Cache results
    await cacheResults(supabase, cacheKey, rankedResults);

    // 6. Track analytics
    await trackAnalytics(supabase, {
      userId,
      query,
      searchType,
      intent,
      resultCount: rankedResults.length,
      location,
      responseTime: Date.now() - startTime,
      source: 'database'
    });

    return new Response(JSON.stringify({
      success: true,
      results: rankedResults.slice((page - 1) * limit, page * limit),
      cached: false,
      intent,
      total: rankedResults.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Universal Search Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function classifyIntent(query: string): Promise<string> {
  const lowercaseQuery = query.toLowerCase();
  
  // Service keywords
  const serviceKeywords = ['plumber', 'doctor', 'tutor', 'repair', 'delivery', 'service', 'hire', 'book'];
  if (serviceKeywords.some(kw => lowercaseQuery.includes(kw))) return 'service';
  
  // Product keywords
  const productKeywords = ['buy', 'order', 'purchase', 'shop', 'price'];
  if (productKeywords.some(kw => lowercaseQuery.includes(kw))) return 'product';
  
  // Job keywords
  const jobKeywords = ['job', 'hiring', 'vacancy', 'career', 'position', 'opening'];
  if (jobKeywords.some(kw => lowercaseQuery.includes(kw))) return 'job';
  
  // Navigation keywords
  const navKeywords = ['near me', 'nearby', 'location', 'address', 'directions'];
  if (navKeywords.some(kw => lowercaseQuery.includes(kw))) return 'navigation';
  
  return 'information';
}

function generateCacheKey(query: string, searchType: string, location: any, filters: any): string {
  return `search:${query}:${searchType}:${JSON.stringify(location)}:${JSON.stringify(filters)}`;
}

async function checkCache(supabase: any, cacheKey: string) {
  const { data, error } = await supabase
    .from('search_cache')
    .select('*')
    .eq('cache_key', cacheKey)
    .gte('expires_at', new Date().toISOString())
    .single();

  if (data && !error) {
    await supabase.rpc('increment_cache_hit', { cache_id: data.id });
    return data.cached_data;
  }

  return null;
}

async function aggregateResults(supabase: any, params: any) {
  const { query, searchType, intent, location, filters, limit } = params;
  const allResults: any[] = [];

  // Search local services
  if (searchType === 'all' || searchType === 'local' || intent === 'service') {
    const services = await searchServices(supabase, query, location, filters);
    allResults.push(...services.map((s: any) => ({ ...s, type: 'service' })));
  }

  // Search jobs
  if (searchType === 'all' || searchType === 'jobs' || intent === 'job') {
    const jobs = await searchJobs(supabase, query, location, filters);
    allResults.push(...jobs.map((j: any) => ({ ...j, type: 'job' })));
  }

  // Search marketplace
  if (searchType === 'all' || searchType === 'marketplace' || intent === 'product') {
    const products = await searchMarketplace(supabase, query, filters);
    allResults.push(...products.map((p: any) => ({ ...p, type: 'product' })));
  }

  // Search business profiles
  const businesses = await searchBusinesses(supabase, query, location);
  allResults.push(...businesses.map((b: any) => ({ ...b, type: 'business' })));

  return allResults;
}

async function searchServices(supabase: any, query: string, location: any, filters: any) {
  let queryBuilder = supabase
    .from('services')
    .select('*, service_providers(*)')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .eq('is_active', true);

  if (filters.minRating) {
    queryBuilder = queryBuilder.gte('rating_average', filters.minRating);
  }

  if (filters.category) {
    queryBuilder = queryBuilder.eq('category', filters.category);
  }

  const { data, error } = await queryBuilder.limit(20);

  if (error) {
    console.error('Service search error:', error);
    return [];
  }

  return data || [];
}

async function searchJobs(supabase: any, query: string, location: any, filters: any) {
  const { data, error } = await supabase
    .from('jobs_clean_master')
    .select('*')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,company_name.ilike.%${query}%`)
    .limit(20);

  if (error) {
    console.error('Job search error:', error);
    return [];
  }

  return data || [];
}

async function searchMarketplace(supabase: any, query: string, filters: any) {
  let queryBuilder = supabase
    .from('business_catalog')
    .select('*, business_profiles(*)')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .eq('is_active', true);

  if (filters.priceRange) {
    queryBuilder = queryBuilder
      .gte('price', filters.priceRange.min)
      .lte('price', filters.priceRange.max);
  }

  const { data, error } = await queryBuilder.limit(20);

  if (error) {
    console.error('Marketplace search error:', error);
    return [];
  }

  return data || [];
}

async function searchBusinesses(supabase: any, query: string, location: any) {
  const { data, error } = await supabase
    .from('business_profiles')
    .select('*')
    .or(`business_name.ilike.%${query}%,description.ilike.%${query}%`)
    .eq('verified', true)
    .limit(20);

  if (error) {
    console.error('Business search error:', error);
    return [];
  }

  return data || [];
}

async function rankResults(results: any[], query: string, location: any, filters: any) {
  return results.map(result => {
    let score = 0;

    // Relevance score (0-40 points)
    const relevance = calculateRelevanceScore(result, query);
    score += relevance * 0.4;

    // Rating score (0-20 points)
    const rating = result.rating_average || result.service_providers?.rating_average || 0;
    score += (rating / 5) * 20;

    // Distance score (0-20 points) - if location provided
    if (location && result.latitude && result.longitude) {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        result.latitude,
        result.longitude
      );
      const maxDistance = filters.maxDistance || 50000; // 50km default
      score += Math.max(0, (1 - distance / maxDistance) * 20);
    }

    // Freshness score (0-10 points)
    if (result.created_at) {
      const daysSinceCreated = (Date.now() - new Date(result.created_at).getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, (1 - daysSinceCreated / 365) * 10);
    }

    // Popularity score (0-10 points)
    const reviews = result.rating_count || result.service_providers?.rating_count || 0;
    score += Math.min(10, reviews / 10);

    return { ...result, ranking_score: score };
  }).sort((a, b) => b.ranking_score - a.ranking_score);
}

function calculateRelevanceScore(result: any, query: string): number {
  const searchText = (
    (result.name || result.title || result.business_name || '') + ' ' +
    (result.description || '') + ' ' +
    (result.category || '')
  ).toLowerCase();

  const queryWords = query.toLowerCase().split(' ');
  let matches = 0;

  queryWords.forEach(word => {
    if (searchText.includes(word)) matches++;
  });

  return (matches / queryWords.length) * 100;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

async function cacheResults(supabase: any, cacheKey: string, results: any[]) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // Cache for 1 hour

  await supabase
    .from('search_cache')
    .upsert({
      cache_key: cacheKey,
      cached_data: { results, total: results.length },
      expires_at: expiresAt.toISOString()
    }, { onConflict: 'cache_key' });
}

async function trackAnalytics(supabase: any, analytics: any) {
  await supabase
    .from('search_analytics')
    .insert({
      user_id: analytics.userId,
      query_text: analytics.query,
      search_type: analytics.searchType,
      intent: analytics.intent,
      result_count: analytics.resultCount,
      has_location: !!analytics.location,
      latitude: analytics.location?.latitude,
      longitude: analytics.location?.longitude,
      response_time_ms: analytics.responseTime,
      source: analytics.source
    });
}