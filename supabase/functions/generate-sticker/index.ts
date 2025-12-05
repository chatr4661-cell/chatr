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
    const { photoUrl, style = 'cartoon' } = await req.json();

    if (!photoUrl) {
      return new Response(
        JSON.stringify({ error: 'Photo URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Style prompts for different sticker styles
    const stylePrompts: Record<string, string> = {
      cartoon: 'Transform this image into a cute cartoon sticker with bold outlines, vibrant colors, and a fun expression. Make it look like a sticker with clean edges and transparent background.',
      emoji: 'Transform this image into an emoji-style sticker with simplified features, bright yellow tones, and exaggerated expressions. Round face with thick outlines.',
      anime: 'Transform this image into an anime-style sticker with big expressive eyes, smooth shading, and Japanese anime aesthetics. Clean lineart with soft colors.',
      chibi: 'Transform this image into a chibi-style sticker with an oversized head, small body, cute proportions, and adorable expressions. Very kawaii style.',
      pixel: 'Transform this image into a pixel art sticker with 16-bit style pixels, limited color palette, and retro game aesthetics. Sharp pixelated edges.',
      sketch: 'Transform this image into a hand-drawn sketch sticker with pencil-like strokes, cross-hatching, and artistic shading. Black and white with subtle tones.',
    };

    const prompt = stylePrompts[style] || stylePrompts.cartoon;

    console.log(`Generating ${style} sticker from photo...`);

    // Handle both base64 and URL formats
    let imageContent: { type: string; image_url: { url: string } };
    
    if (photoUrl.startsWith('data:')) {
      // Base64 image - use directly
      imageContent = {
        type: 'image_url',
        image_url: { url: photoUrl }
      };
    } else if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      // Regular URL - use directly
      imageContent = {
        type: 'image_url',
        image_url: { url: photoUrl }
      };
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid image format. Please upload a valid image.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              imageContent
            ]
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const stickerUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!stickerUrl) {
      console.error('No sticker image in response:', JSON.stringify(data));
      throw new Error('Failed to generate sticker image');
    }

    console.log('Sticker generated successfully');

    return new Response(
      JSON.stringify({ stickerUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating sticker:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate sticker' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
