// Visual Search - Upload image and find similar services/products
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, imageBase64, userId } = await req.json();

    if (!imageUrl && !imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image URL or base64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    // Use the image URL or construct from base64
    const finalImageUrl = imageUrl || `data:image/jpeg;base64,${imageBase64}`;

    // Step 1: Analyze image using GPT-5 Vision
    let imageAnalysis: any = null;
    let detectedObjects: string[] = [];
    let searchQuery = '';

    if (OPENAI_API_KEY) {
      const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-2025-08-07',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this image and provide:
1. Main objects/items visible
2. Category (e.g., food, furniture, appliance, service, etc.)
3. Specific details (brand, type, condition, etc.)
4. Suggested search query to find similar items or services
5. Colors, style, and key features

Respond in JSON format:
{
  "objects": ["object1", "object2"],
  "category": "category",
  "details": "detailed description",
  "search_query": "search query to find similar items",
  "colors": ["color1", "color2"],
  "style": "style description",
  "estimated_value": "price range if applicable"
}`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: finalImageUrl
                  }
                }
              ]
            }
          ],
          max_completion_tokens: 1000
        }),
      });

      const visionData = await visionResponse.json();
      
      if (visionData.choices?.[0]?.message?.content) {
        try {
          imageAnalysis = JSON.parse(visionData.choices[0].message.content);
          detectedObjects = imageAnalysis.objects || [];
          searchQuery = imageAnalysis.search_query || imageAnalysis.details || '';
        } catch {
          // If JSON parsing fails, use the content as is
          searchQuery = visionData.choices[0].message.content;
          imageAnalysis = { content: searchQuery };
        }
      }
    }

    // Step 2: Search for similar services/products based on image analysis
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const searchResults: any[] = [];

    if (searchQuery) {
      // Search in services
      const { data: services } = await supabaseClient
        .from('chatr_plus_services')
        .select(`
          *,
          chatr_plus_sellers (
            business_name,
            is_verified,
            phone_number,
            address,
            rating_average
          )
        `)
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
        .eq('is_active', true)
        .limit(10);

      if (services) {
        services.forEach(service => {
          searchResults.push({
            id: service.id,
            title: service.name,
            description: service.description,
            price: `₹${service.price}`,
            image_url: service.image_url,
            rating: service.average_rating,
            source: 'chatr_services',
            type: 'service',
            seller: service.chatr_plus_sellers?.business_name,
            verified: service.chatr_plus_sellers?.is_verified
          });
        });
      }

      // Search in sellers
      const { data: sellers } = await supabaseClient
        .from('chatr_plus_sellers')
        .select('*')
        .or(`business_name.ilike.%${searchQuery}%,business_type.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .eq('is_active', true)
        .limit(5);

      if (sellers) {
        sellers.forEach(seller => {
          searchResults.push({
            id: seller.id,
            title: seller.business_name,
            description: seller.description,
            image_url: seller.logo_url,
            rating: seller.rating_average,
            source: 'sellers',
            type: 'seller',
            verified: seller.is_verified
          });
        });
      }
    }

    // Step 3: Get AI recommendations based on image
    let aiRecommendations = null;
    if (LOVABLE_API_KEY && imageAnalysis) {
      const recommendationsResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              content: 'You are a visual search assistant. Based on image analysis, suggest relevant services, products, or professionals the user might need.'
            },
            {
              role: 'user',
              content: `Image analysis: ${JSON.stringify(imageAnalysis)}\n\nSuggest 5 relevant services or products the user might be looking for based on this image.`
            }
          ],
          temperature: 0.3,
        }),
      });

      const recommendationsData = await recommendationsResponse.json();
      if (recommendationsData.choices?.[0]?.message?.content) {
        aiRecommendations = recommendationsData.choices[0].message.content;
      }
    }

    // Step 4: Store visual search history
    if (userId) {
      await supabaseClient
        .from('visual_search_history')
        .insert({
          user_id: userId,
          image_url: imageUrl || 'uploaded_image',
          image_analysis: imageAnalysis,
          search_query_generated: searchQuery,
          results_found: searchResults.length
        });
    }

    return new Response(
      JSON.stringify({
        image_analysis: imageAnalysis,
        detected_objects: detectedObjects,
        search_query: searchQuery,
        results: searchResults,
        ai_recommendations: aiRecommendations,
        total_results: searchResults.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Visual search error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
