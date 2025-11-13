// Universal Search Engine - Multi-source AI-powered search
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchParams {
  query: string;
  latitude?: number;
  longitude?: number;
  maxDistance?: number; // in km
  userId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, latitude, longitude, maxDistance = 10, userId }: SearchParams = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Step 1: Check cache first
    const { data: cachedData } = await supabaseClient
      .from('search_cache')
      .select('response_data, id')
      .eq('query', query.toLowerCase())
      .single();

    if (cachedData) {
      // Update cache hit count
      await supabaseClient.rpc('increment_cache_hit', { cache_id: cachedData.id });

      return new Response(
        JSON.stringify({ ...cachedData.response_data, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: AI Intent Understanding
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    let aiIntent: any = null;

    if (LOVABLE_API_KEY) {
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              content: `You are a universal search intent analyzer for Chatr.chat.
Analyze queries and extract:
1. intent: What user wants (find service, order food, book appointment, hire worker, etc.)
2. category: Main category (plumbing, food, healthcare, jobs, beauty, etc.)
3. subcategory: Specific type
4. urgency: low/medium/high
5. keywords: Important search terms
6. filters: price range, rating, distance preferences
7. suggestions: 5 related searches

Respond in JSON format:
{
  "intent": "brief intent",
  "category": "main category",
  "subcategory": "specific type",
  "urgency": "low|medium|high",
  "keywords": ["keyword1", "keyword2"],
  "filters": {"price": "budget/premium", "minRating": 4.0},
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4", "suggestion 5"]
}`
            },
            {
              role: 'user',
              content: `Analyze: "${query}"${latitude && longitude ? ` (User location: ${latitude}, ${longitude})` : ''}`
            }
          ],
          temperature: 0.3,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const aiMessage = aiData.choices?.[0]?.message?.content || '{}';
        try {
          aiIntent = JSON.parse(aiMessage);
        } catch {
          aiIntent = {
            intent: 'general search',
            category: 'general',
            keywords: [query]
          };
        }
      }
    }

    // Step 3: Store search query
    const { data: searchQueryData } = await supabaseClient
      .from('search_queries')
      .insert({
        user_id: userId || null,
        query_text: query,
        intent: aiIntent?.intent || 'general',
        category: aiIntent?.category || null,
        location_lat: latitude || null,
        location_lng: longitude || null,
        source: 'app'
      })
      .select()
      .single();

    const queryId = searchQueryData?.id;

    // Step 4: Multi-source search
    const allResults: any[] = [];

    // Source 1: Chatr Plus Services
    const { data: services } = await supabaseClient
      .from('chatr_plus_services')
      .select(`
        *,
        chatr_plus_sellers (
          business_name,
          is_verified,
          phone_number,
          address,
          city,
          rating_average,
          latitude,
          longitude
        )
      `)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
      .eq('is_active', true)
      .limit(20);

    if (services) {
      for (const service of services) {
        let distance = null;
        if (latitude && longitude && service.chatr_plus_sellers?.latitude && service.chatr_plus_sellers?.longitude) {
          distance = calculateDistance(
            latitude,
            longitude,
            service.chatr_plus_sellers.latitude,
            service.chatr_plus_sellers.longitude
          );
        }

        if (!maxDistance || !distance || distance <= maxDistance) {
          allResults.push({
            id: service.id,
            title: service.name,
            description: service.description || '',
            contact: service.chatr_plus_sellers?.phone_number,
            address: service.chatr_plus_sellers?.address,
            distance,
            rating: service.average_rating || service.chatr_plus_sellers?.rating_average || 0,
            review_count: service.review_count || 0,
            price: `₹${service.price}`,
            image_url: service.image_url,
            verified: service.chatr_plus_sellers?.is_verified || false,
            source: 'chatr_services',
            result_type: 'service',
            metadata: {
              seller_name: service.chatr_plus_sellers?.business_name,
              category: service.category,
              city: service.chatr_plus_sellers?.city
            }
          });
        }
      }
    }

    // Source 2: Jobs
    const { data: jobs } = await supabaseClient
      .from('local_jobs')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
      .eq('status', 'active')
      .limit(10);

    if (jobs) {
      jobs.forEach(job => {
        allResults.push({
          id: job.id,
          title: job.title,
          description: job.description,
          contact: job.contact_info,
          address: job.location,
          rating: 0,
          review_count: 0,
          price: job.salary_range || 'Negotiable',
          source: 'jobs',
          result_type: 'job',
          metadata: {
            category: job.category,
            employment_type: job.employment_type,
            company: job.company_name
          }
        });
      });
    }

    // Source 3: Healthcare
    const { data: healthcare } = await supabaseClient
      .from('local_healthcare')
      .select('*')
      .or(`name.ilike.%${query}%,specialty.ilike.%${query}%,services.cs.{${query}}`)
      .eq('is_active', true)
      .limit(10);

    if (healthcare) {
      healthcare.forEach(provider => {
        allResults.push({
          id: provider.id,
          title: provider.name,
          description: provider.bio || `${provider.specialty} specialist`,
          contact: provider.phone,
          address: provider.address,
          rating: provider.rating || 0,
          review_count: provider.reviews_count || 0,
          price: provider.consultation_fee ? `₹${provider.consultation_fee}` : 'Call for price',
          image_url: provider.profile_image,
          verified: provider.is_verified || false,
          source: 'healthcare',
          result_type: 'healthcare',
          metadata: {
            specialty: provider.specialty,
            available_today: provider.available_today
          }
        });
      });
    }

    // Source 4: Food (if integrated)
    // Add food delivery integration here if needed

    // Source 5: Chatr Sellers (general)
    const { data: sellers } = await supabaseClient
      .from('chatr_plus_sellers')
      .select('*')
      .or(`business_name.ilike.%${query}%,business_type.ilike.%${query}%,description.ilike.%${query}%`)
      .eq('is_active', true)
      .limit(10);

    if (sellers) {
      for (const seller of sellers) {
        let distance = null;
        if (latitude && longitude && seller.latitude && seller.longitude) {
          distance = calculateDistance(latitude, longitude, seller.latitude, seller.longitude);
        }

        if (!maxDistance || !distance || distance <= maxDistance) {
          allResults.push({
            id: seller.id,
            title: seller.business_name,
            description: seller.description || '',
            contact: seller.phone_number,
            address: seller.address,
            distance,
            rating: seller.rating_average || 0,
            review_count: seller.rating_count || 0,
            price: 'View Services',
            image_url: seller.logo_url,
            verified: seller.is_verified || false,
            source: 'sellers',
            result_type: 'seller',
            metadata: {
              business_type: seller.business_type,
              city: seller.city,
              total_bookings: seller.total_bookings
            }
          });
        }
      }
    }

    // Step 5: Store results in database
    if (queryId && allResults.length > 0) {
      const resultsToInsert = allResults.map(r => ({
        query_id: queryId,
        ...r
      }));

      await supabaseClient
        .from('search_results')
        .insert(resultsToInsert);
    }

    // Step 6: Prepare response
    const response = {
      query,
      intent: aiIntent,
      results: allResults,
      total: allResults.length,
      timestamp: new Date().toISOString()
    };

    // Step 7: Cache if results are good
    if (allResults.length >= 3) {
      await supabaseClient
        .from('search_cache')
        .upsert({
          query: query.toLowerCase(),
          response_data: response,
          last_updated: new Date().toISOString()
        });
    }

    return new Response(
      JSON.stringify(response),
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

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
