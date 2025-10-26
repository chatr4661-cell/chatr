import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, sessionId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use Lovable AI with vision to detect objects
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: "system",
            content: "You are an object detection expert. Detect common brandable objects in images: cups, mugs, phones, tablets, laptops, t-shirts, hats, bottles, cans, bags, watches, headphones, backgrounds. Return only JSON."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Detect all brandable objects in this image. Return as JSON array with: {\"objects\": [{\"type\": \"object_type\", \"confidence\": 0.0-1.0, \"position\": {\"x\": 0-100, \"y\": 0-100}, \"size\": {\"width\": 0-100, \"height\": 0-100}}]}"
              },
              {
                type: "image_url",
                image_url: { url: imageData }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const detection = JSON.parse(data.choices[0].message.content);

    // Get brand placements for detected objects
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const brandedObjects = [];

    for (const obj of detection.objects || []) {
      // Get a brand for this object type
      const { data: brandData, error } = await supabase.rpc('get_brand_for_object', {
        p_object_type: obj.type
      });

      if (brandData && brandData.length > 0) {
        const brand = brandData[0];
        brandedObjects.push({
          ...obj,
          brand: {
            brand_id: brand.brand_id,
            brand_name: brand.brand_name,
            placement_id: brand.placement_id,
            replacement_asset_url: brand.replacement_asset_url,
            replacement_type: brand.replacement_type
          }
        });

        // Track impression (view)
        await supabase.rpc('track_brand_impression', {
          p_brand_id: brand.brand_id,
          p_placement_id: brand.placement_id,
          p_user_id: null, // Will be set on client
          p_impression_type: 'view',
          p_detected_object: obj.type,
          p_duration: 0
        });
      }
    }

    return new Response(JSON.stringify({ 
      objects: brandedObjects,
      sessionId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in detect-video-objects:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      objects: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
