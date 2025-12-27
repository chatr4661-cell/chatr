import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userId, latitude, longitude, city, country } = await req.json();
    
    console.log('Received request:', { query, userId, latitude, longitude, city, country });
    
    // Validate location data when query requires it
    const isLocationQuery = query.toLowerCase().includes('near') || 
                            query.toLowerCase().includes('nearby') || 
                            query.toLowerCase().includes('local') ||
                            query.toLowerCase().includes('around me');
    
    if (isLocationQuery && (!latitude || !longitude)) {
      console.error('Location required but missing coordinates');
      return new Response(
        JSON.stringify({ 
          error: 'LOCATION_REQUIRED',
          message: 'This search requires your location. Please enable location services.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Analyze intent using AI
    const intentResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are Chatr World AI. Analyze user queries and determine which modules to engage:
- browser: web search, information lookup
- health: medical, wellness, healthcare queries
- business: services, bookings, marketplace
- community: social connections, groups
- food: restaurant, delivery queries
- deals: discounts, offers, local deals

Return a JSON with: modules (array), primary_intent (string), search_terms (array), location_needed (boolean)`
          },
          { role: 'user', content: query }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'analyze_intent',
            parameters: {
              type: 'object',
              properties: {
                modules: { type: 'array', items: { type: 'string' } },
                primary_intent: { type: 'string' },
                search_terms: { type: 'array', items: { type: 'string' } },
                location_needed: { type: 'boolean' },
                entity_type: { type: 'string', enum: ['hostel', 'restaurant', 'doctor', 'service', 'product', 'other'] }
              },
              required: ['modules', 'primary_intent', 'search_terms']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'analyze_intent' } }
      })
    });

    if (!intentResponse.ok) {
      const errText = await intentResponse.text();
      console.error('Intent API error:', intentResponse.status, errText);
      throw new Error(`Intent analysis failed: ${intentResponse.status}`);
    }

    const intentData = await intentResponse.json();
    console.log('Intent API response:', JSON.stringify(intentData));

    // Safe access with null checks
    const toolCall = intentData?.choices?.[0]?.message?.tool_calls?.[0];
    let analysis: { modules: string[]; primary_intent: string; search_terms: string[]; location_needed: boolean; entity_type?: string };
    
    if (!toolCall?.function?.arguments) {
      console.error('No tool call in intent response:', JSON.stringify(intentData));
      // Fallback to default analysis
      analysis = {
        modules: ['browser', 'food'],
        primary_intent: query,
        search_terms: query.split(' ').filter((w: string) => w.length > 2),
        location_needed: query.toLowerCase().includes('near')
      };
    } else {
      analysis = JSON.parse(toolCall.function.arguments);
    }

    console.log('Intent analysis:', analysis);

    // Fetch data from multiple modules in parallel
    const results: any = {
      modules: analysis.modules,
      intent: analysis.primary_intent,
      data: {}
    };

    const fetchPromises = [];

    // Browser module - web search
    if (analysis.modules.includes('browser')) {
      fetchPromises.push(
        (async () => {
          results.data.browser = {
            type: 'web_results',
            query: query,
            suggestion: `Searching the web for "${analysis.search_terms.join(', ')}"`
          };
        })()
      );
    }

    // Business/Jobs module
    if (analysis.modules.includes('business')) {
      fetchPromises.push(
        (async () => {
          let jobQuery = supabase
            .from('chatr_jobs')
            .select('*')
            .eq('is_active', true);
          
          if (city) {
            jobQuery = jobQuery.ilike('location', `%${city}%`);
          }
          
          const { data } = await jobQuery.limit(10);
          
          results.data.business = {
            type: 'jobs',
            providers: (data || []).map(j => ({
              id: j.id,
              name: j.title,
              description: `${j.company_name} - ${j.salary_min ? `₹${j.salary_min.toLocaleString()}-${j.salary_max?.toLocaleString()}` : 'Competitive'}`,
              location: j.location,
              company: j.company_name
            })),
            count: data?.length || 0,
            location: city || 'all locations',
            hasLocation: !!(latitude && longitude)
          };
        })()
      );
    }

    // Health module - using chatr_healthcare
    if (analysis.modules.includes('health')) {
      fetchPromises.push(
        (async () => {
          let healthQuery = supabase
            .from('chatr_healthcare')
            .select('*')
            .eq('is_active', true);
          
          if (city) {
            healthQuery = healthQuery.ilike('city', `%${city}%`);
          }
          
          const { data } = await healthQuery.limit(10);
          
          results.data.health = {
            type: 'healthcare_providers',
            providers: (data || []).map(h => ({
              id: h.id,
              name: h.name,
              description: h.description,
              specialty: h.specialty,
              location: h.city,
              fee: h.consultation_fee,
              rating: h.rating_average,
              phone: h.phone
            })),
            count: data?.length || 0,
            location: city || 'all locations'
          };
        })()
      );
    }

    // Community module
    if (analysis.modules.includes('community')) {
      fetchPromises.push(
        (async () => {
          const { data } = await supabase
            .from('conversations')
            .select('*')
            .eq('is_community', true)
            .limit(5);
          
          results.data.community = {
            type: 'communities',
            communities: data || [],
            count: data?.length || 0
          };
        })()
      );
    }

    // Food module - using chatr_restaurants
    if (analysis.modules.includes('food')) {
      fetchPromises.push(
        (async () => {
          let foodQuery = supabase
            .from('chatr_restaurants')
            .select('*')
            .eq('is_active', true);
          
          if (city) {
            foodQuery = foodQuery.ilike('city', `%${city}%`);
          }
          
          const { data } = await foodQuery.limit(10);
          
          results.data.food = {
            type: 'restaurants',
            vendors: (data || []).map(r => ({
              id: r.id,
              name: r.name,
              description: r.description,
              location: r.city,
              address: r.address,
              price: r.delivery_fee,
              rating: r.rating_average,
              phone: r.phone,
              cuisine: r.cuisine_type
            })),
            count: data?.length || 0,
            location: city || 'all locations',
            hasLocation: !!(latitude && longitude)
          };
        })()
      );
    }

    // Deals module - using chatr_deals
    if (analysis.modules.includes('deals')) {
      fetchPromises.push(
        (async () => {
          let dealsQuery = supabase
            .from('chatr_deals')
            .select('*')
            .eq('is_active', true)
            .gte('expires_at', new Date().toISOString());
          
          if (city) {
            dealsQuery = dealsQuery.ilike('location', `%${city}%`);
          }
          
          const { data } = await dealsQuery.limit(10);
          
          results.data.deals = {
            type: 'deals',
            deals: (data || []).map(d => ({
              id: d.id,
              name: d.title,
              description: d.description,
              discount: `${d.discount_percent}% OFF`,
              code: d.coupon_code,
              expires_at: d.expires_at
            })),
            count: data?.length || 0,
            location: city || 'all locations'
          };
        })()
      );
    }

    await Promise.all(fetchPromises);

    // Generate conversational response
    const responseGeneration = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are Chatr World - a conversational multiverse interface that helps users find and order services, food, deals, healthcare, and more. 

When presenting results:
- Show specific items with names, prices, and details
- Include actionable next steps (how to order, book, purchase)
- Mention delivery/pickup options for food
- Include contact info or booking methods for services
- Be conversational and helpful

Format your response with markdown for better readability.`
          },
          {
            role: 'user',
            content: `User location: ${city || 'unknown'}, ${country || 'unknown'}
            
User asked: "${query}"

Data gathered from modules:
${JSON.stringify(results.data, null, 2)}

Provide a helpful, conversational response that:
1. Acknowledges their location if relevant
2. Presents available options with specific details
3. Explains how they can order/book/purchase
4. Mentions any deals or special offers
5. Provides next steps

Be specific about what's available and how to get it.`
          }
        ]
      })
    });

    if (!responseGeneration.ok) {
      const errText = await responseGeneration.text();
      console.error('Response generation API error:', responseGeneration.status, errText);
      throw new Error(`Response generation failed: ${responseGeneration.status}`);
    }

    const finalResponse = await responseGeneration.json();
    console.log('Final response received');

    // Safe access with null checks
    const conversationalText = finalResponse?.choices?.[0]?.message?.content 
      || 'I found some results for you, but I had trouble formatting a response. Please check the data below.';

    return new Response(
      JSON.stringify({
        success: true,
        query,
        analysis,
        response: conversationalText,
        modules: results.data,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Chatr World error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
