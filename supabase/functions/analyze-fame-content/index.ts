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
    const { imageUrl, caption, category } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Analyze content with AI
    const analysisPrompt = `Analyze this social media content for viral potential.

Content Details:
- Category: ${category || 'general'}
- Caption: ${caption || 'no caption'}
- Has Image: ${imageUrl ? 'yes' : 'no'}

Provide a comprehensive analysis as JSON with:
{
  "viralityScore": (0-100),
  "engagementPrediction": "low|medium|high|viral",
  "suggestions": [
    {"type": "angle|lighting|timing|hashtag|caption", "tip": "specific suggestion"},
    ...
  ],
  "trendingHashtags": ["#tag1", "#tag2", ...],
  "estimatedCoins": (10-1000),
  "isLikelyViral": true/false,
  "improvements": ["specific improvement 1", "specific improvement 2"]
}

Be realistic but encouraging. Focus on actionable tips.`;

    const messages: any[] = [
      { role: "system", content: "You are an expert social media virality analyst. Analyze content and provide actionable insights." },
      { role: "user", content: analysisPrompt }
    ];

    // Add image if available
    if (imageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: "Analyze this image:" },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-fame-content:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      viralityScore: 50,
      engagementPrediction: 'medium',
      suggestions: [],
      trendingHashtags: [],
      estimatedCoins: 50,
      isLikelyViral: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
