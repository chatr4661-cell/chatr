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

    const intentData = await intentResponse.json();
    const analysis = JSON.parse(
      intentData.choices[0].message.tool_calls[0].function.arguments
    );

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

    // Business module - services/bookings
    if (analysis.modules.includes('business')) {
      fetchPromises.push(
        (async () => {
          let query = supabase
            .from('service_providers')
            .select('*');
          
          // Filter by location if available
          if (city) {
            query = query.ilike('location', `%${city}%`);
          }
          
          const { data } = await query.limit(10);
          
          results.data.business = {
            type: 'service_providers',
            providers: data || [],
            count: data?.length || 0,
            location: city || 'all locations',
            hasLocation: !!(latitude && longitude)
          };
        })()
      );
    }

    // Health module
    if (analysis.modules.includes('health')) {
      fetchPromises.push(
        (async () => {
          const { data } = await supabase
            .from('service_providers')
            .select('*')
            .eq('category', 'healthcare')
            .limit(5);
          
          results.data.health = {
            type: 'healthcare_providers',
            providers: data || [],
            count: data?.length || 0
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

    // Food module
    if (analysis.modules.includes('food')) {
      fetchPromises.push(
        (async () => {
          let query = supabase
            .from('food_vendors')
            .select('*');
          
          // Filter by location if available
          if (city) {
            query = query.ilike('location', `%${city}%`);
          }
          
          const { data } = await query.limit(10);
          
          results.data.food = {
            type: 'food_vendors',
            vendors: data || [],
            count: data?.length || 0,
            location: city || 'all locations',
            hasLocation: !!(latitude && longitude)
          };
        })()
      );
    }

    // Deals module
    if (analysis.modules.includes('deals')) {
      fetchPromises.push(
        (async () => {
          let query = supabase
            .from('local_deals')
            .select('*')
            .eq('is_active', true);
          
          // Filter by location if available
          if (city) {
            query = query.ilike('city', `%${city}%`);
          }
          
          const { data } = await query.limit(10);
          
          results.data.deals = {
            type: 'local_deals',
            deals: data || [],
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

    const finalResponse = await responseGeneration.json();
    const conversationalText = finalResponse.choices[0].message.content;

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
