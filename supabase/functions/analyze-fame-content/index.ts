import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, category, analysisType = 'full' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // System prompts for different analysis types
    const systemPrompts = {
      full: `You are a viral content AI analyst. Analyze images for viral potential across social media platforms.

Provide analysis in this exact JSON format:
{
  "fameScore": number (0-100),
  "category": string,
  "viralPrediction": {
    "likelihood": "low|medium|high|viral",
    "estimatedReach": string,
    "estimatedCoins": number
  },
  "composition": {
    "lighting": "poor|good|excellent",
    "framing": "poor|good|excellent",
    "angle": "poor|good|excellent",
    "background": "cluttered|acceptable|clean"
  },
  "suggestions": string[],
  "trending": {
    "isOnTrend": boolean,
    "trendName": string,
    "trendScore": number
  },
  "improvements": string[],
  "hashtags": string[],
  "estimatedEngagement": {
    "likes": string,
    "shares": string,
    "comments": string
  }
}`,
      realtime: `You are a real-time camera guidance AI. Provide instant feedback for improving shot composition.

Provide brief, actionable guidance in JSON:
{
  "guidance": string,
  "fameScore": number (0-100),
  "quickTips": string[],
  "captureNow": boolean
}`,
      optimization: `You are a post-capture optimization AI. Suggest improvements for already captured content.

Provide optimization suggestions in JSON:
{
  "optimizations": string[],
  "enhancedCaption": string,
  "hashtags": string[],
  "bestPostingTime": string,
  "crossPlatformTips": {
    "instagram": string,
    "tiktok": string,
    "youtube": string
  }
}`
    };

    const prompt = analysisType === 'realtime' 
      ? 'Analyze this live camera feed for composition, lighting, and viral potential. Give immediate, actionable guidance.'
      : analysisType === 'optimization'
      ? 'This is a captured image. Suggest optimizations for maximum engagement and virality.'
      : `Analyze this ${category} content for viral potential. Consider composition, trends, and engagement factors.`;

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
            role: 'system',
            content: systemPrompts[analysisType as keyof typeof systemPrompts] || systemPrompts.full
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageData } }
            ]
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return new Response(
      JSON.stringify({ analysis, rawResponse: content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing content:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
