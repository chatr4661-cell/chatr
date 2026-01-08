/**
 * Agent Voice TTS - Text to Speech for AI Agents
 * Uses Lovable AI gateway for speech synthesis
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, personality, voice } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    console.log(`Generating TTS for: "${text.substring(0, 50)}..."`);

    // Use browser's native TTS as primary - return instruction for client
    // This avoids API costs while still providing voice capability
    
    // For enhanced TTS, we could integrate with ElevenLabs or other services
    // For now, return a signal for the client to use browser TTS
    
    // If OpenAI key is available, use it for higher quality TTS
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text.substring(0, 4096), // Max length
          voice: voice || getVoiceForPersonality(personality),
          response_format: 'mp3',
          speed: 1.0
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('OpenAI TTS error:', error);
        throw new Error('TTS generation failed');
      }

      const audioBuffer = await response.arrayBuffer();
      const base64Audio = base64Encode(audioBuffer);

      return new Response(
        JSON.stringify({ audioContent: base64Audio }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: instruct client to use browser TTS
    return new Response(
      JSON.stringify({ 
        useBrowserTTS: true,
        text: text,
        personality: personality
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('TTS error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'TTS failed',
        useBrowserTTS: true 
      }),
      { 
        status: 200, // Return 200 so client can fallback
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function getVoiceForPersonality(personality?: string): string {
  const p = (personality || '').toLowerCase();
  
  if (p.includes('professional') || p.includes('formal')) {
    return 'onyx'; // Deep, professional
  }
  if (p.includes('friendly') || p.includes('warm') || p.includes('casual')) {
    return 'nova'; // Warm, friendly
  }
  if (p.includes('energetic') || p.includes('enthusiastic')) {
    return 'shimmer'; // Energetic
  }
  if (p.includes('calm') || p.includes('soothing')) {
    return 'alloy'; // Neutral, calm
  }
  if (p.includes('authoritative') || p.includes('confident')) {
    return 'fable'; // Authoritative
  }
  
  // Default
  return 'nova';
}
