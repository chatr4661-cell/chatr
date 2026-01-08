import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptionRequest {
  audioUrl?: string;
  audioBase64?: string;
  callId?: string;
  language?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { audioUrl, audioBase64, callId, language = 'en' }: TranscriptionRequest = await req.json();

    console.log('[live-transcription] Request received:', { hasUrl: !!audioUrl, hasBase64: !!audioBase64, callId, language });

    if (!audioUrl && !audioBase64) {
      return new Response(
        JSON.stringify({ error: 'Audio URL or base64 required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI for transcription (Gemini)
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_AI_API_KEY');
    
    let transcription = '';
    let confidence = 0.95;
    let words: Array<{ word: string; start: number; end: number }> = [];

    if (geminiApiKey && audioBase64) {
      // Use Gemini for transcription
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: `Transcribe this audio accurately. Return only the transcribed text, nothing else. Language: ${language}` },
                { inline_data: { mime_type: 'audio/webm', data: audioBase64 } }
              ]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        transcription = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log('[live-transcription] Gemini transcription:', transcription.substring(0, 100));
      }
    } else {
      // Fallback: Use Web Speech API simulation or return placeholder
      transcription = '[Live transcription requires audio processing]';
      confidence = 0.5;
    }

    // Store transcription if callId provided
    if (callId && transcription) {
      await supabaseClient
        .from('call_transcriptions')
        .insert({
          call_id: callId,
          text: transcription,
          confidence,
          timestamp: new Date().toISOString(),
          language,
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        transcription,
        confidence,
        words,
        language,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[live-transcription] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
