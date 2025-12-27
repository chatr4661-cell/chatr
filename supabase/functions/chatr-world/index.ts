import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PRIMARY_MODEL = 'qwen/qwen-2.5-72b-instruct:free';
const FALLBACK_MODEL = 'mistralai/mistral-7b-instruct:free';

// Simple intent detection without AI
function detectIntent(query: string): { modules: string[]; primary_intent: string; search_terms: string[]; location_needed: boolean } {
  const q = query.toLowerCase();
  const modules: string[] = [];
  
  if (q.includes('food') || q.includes('restaurant') || q.includes('eat') || q.includes('pizza') || q.includes('burger') || q.includes('biryani') || q.includes('cafe')) {
    modules.push('food');
  }
  if (q.includes('doctor') || q.includes('hospital') || q.includes('health') || q.includes('clinic') || q.includes('medical')) {
    modules.push('health');
  }
  if (q.includes('job') || q.includes('work') || q.includes('hiring') || q.includes('career') || q.includes('service')) {
    modules.push('business');
  }
  if (q.includes('deal') || q.includes('discount') || q.includes('offer') || q.includes('coupon') || q.includes('sale')) {
    modules.push('deals');
  }
  if (q.includes('clean') || q.includes('plumber') || q.includes('electrician') || q.includes('repair') || q.includes('home service')) {
    modules.push('business');
  }
  
  if (modules.length === 0) {
    modules.push('browser', 'food');
  }
  
  return {
    modules,
    primary_intent: query,
    search_terms: query.split(' ').filter(w => w.length > 2),
    location_needed: q.includes('near') || q.includes('nearby') || q.includes('local')
  };
}

// AI call with fallback
async function callAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const models = [PRIMARY_MODEL, FALLBACK_MODEL];
  
  for (const model of models) {
    try {
      console.log(`Trying model: ${model}`);
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://chatr.chat',
          'X-Title': 'Chatr World',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        })
      });

      if (!response.ok) {
        console.error(`Model ${model} failed:`, response.status);
        continue;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      
      if (content && content.trim().length > 10) {
        console.log(`Model ${model} succeeded`);
        return content;
      }
    } catch (err) {
      console.error(`Model ${model} error:`, err);
    }
  }
  
  return '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userId, latitude, longitude, city, country } = await req.json();
    
    console.log('Received request:', { query, userId, city, country });
    
    const isLocationQuery = query.toLowerCase().includes('near') || 
                            query.toLowerCase().includes('nearby') || 
                            query.toLowerCase().includes('local');
    
    if (isLocationQuery && (!latitude || !longitude)) {
      return new Response(
        JSON.stringify({ 
          error: 'LOCATION_REQUIRED',
          message: 'This search requires your location. Please enable location services.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY') ?? '';
    if (!openRouterKey) {
      console.warn('OPENROUTER_API_KEY not configured; using fallback response text');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use simple intent detection
    const analysis = detectIntent(query);
    console.log('Intent analysis:', analysis);

    // Fetch data from modules
    const results: any = { modules: analysis.modules, intent: analysis.primary_intent, data: {} };
    const fetchPromises = [];

    if (analysis.modules.includes('browser')) {
      results.data.browser = { type: 'web_results', query, suggestion: `Searching for "${query}"` };
    }

    if (analysis.modules.includes('business')) {
      fetchPromises.push(
        (async () => {
          let jobQuery = supabase.from('chatr_jobs').select('*').eq('is_active', true);
          if (city) jobQuery = jobQuery.ilike('location', `%${city}%`);
          const { data } = await jobQuery.limit(10);
          results.data.business = {
            type: 'jobs',
            providers: (data || []).map(j => ({
              id: j.id, name: j.title, description: `${j.company_name}`, location: j.location
            })),
            count: data?.length || 0
          };
        })()
      );
    }

    if (analysis.modules.includes('health')) {
      fetchPromises.push(
        (async () => {
          let healthQuery = supabase.from('chatr_healthcare').select('*').eq('is_active', true);
          if (city) healthQuery = healthQuery.ilike('city', `%${city}%`);
          const { data } = await healthQuery.limit(10);
          results.data.health = {
            type: 'healthcare',
            providers: (data || []).map(h => ({
              id: h.id, name: h.name, specialty: h.specialty, location: h.city, fee: h.consultation_fee
            })),
            count: data?.length || 0
          };
        })()
      );
    }

    if (analysis.modules.includes('food')) {
      fetchPromises.push(
        (async () => {
          let foodQuery = supabase.from('chatr_restaurants').select('*').eq('is_active', true);
          if (city) foodQuery = foodQuery.ilike('city', `%${city}%`);
          const { data } = await foodQuery.limit(10);
          results.data.food = {
            type: 'restaurants',
            vendors: (data || []).map(r => ({
              id: r.id, name: r.name, cuisine: r.cuisine_type, location: r.city, rating: r.rating_average
            })),
            count: data?.length || 0
          };
        })()
      );
    }

    if (analysis.modules.includes('deals')) {
      fetchPromises.push(
        (async () => {
          let dealsQuery = supabase.from('chatr_deals').select('*').eq('is_active', true).gte('expires_at', new Date().toISOString());
          if (city) dealsQuery = dealsQuery.ilike('location', `%${city}%`);
          const { data } = await dealsQuery.limit(10);
          results.data.deals = {
            type: 'deals',
            deals: (data || []).map(d => ({
              id: d.id, name: d.title, discount: `${d.discount_percent}% OFF`, code: d.coupon_code
            })),
            count: data?.length || 0
          };
        })()
      );
    }

    await Promise.all(fetchPromises);

    // Generate response with AI (plain text prompt)
    const systemPrompt = `You are Chatr World assistant.
Help users find services, food, deals and healthcare.
Give short helpful answers with specific names and details.
Use plain text, no markdown formatting.
Be friendly and conversational.
Always mention how to order or book if relevant.`;

    const userPrompt = `Location: ${city || 'Unknown'}, ${country || 'Unknown'}
Query: ${query}
Available data: ${JSON.stringify(results.data)}
Give a helpful response about what is available.`;

    let conversationalText = openRouterKey
      ? await callAI(openRouterKey, systemPrompt, userPrompt)
      : '';
    
    // Fallback response if AI fails
    if (!conversationalText) {
      const dataCount = Object.values(results.data).reduce((sum: number, d: any) => sum + (d.count || d.vendors?.length || d.providers?.length || 0), 0);
      if (dataCount > 0) {
        conversationalText = `I found ${dataCount} results for "${query}" in ${city || 'your area'}. Check the results below to see what's available. You can tap on any item for more details.`;
      } else {
        conversationalText = `I searched for "${query}" but couldn't find exact matches in ${city || 'your area'}. Try broadening your search or check nearby areas.`;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        query,
        analysis,
        response: conversationalText,
        modules: results.data,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Chatr World error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
