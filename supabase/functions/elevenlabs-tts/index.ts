// Secure TTS proxy: keeps ELEVENLABS_API_KEY server-side, returns MP3 bytes.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_VOICE = 'EXAVITQu4vr4xnSDxMaL'; // Sarah
const MODEL = 'eleven_turbo_v2_5';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'TTS_NOT_CONFIGURED' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { text, voiceId } = await req.json().catch(() => ({}));
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'INVALID_TEXT' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trimmed = text.slice(0, 1000); // cap chat-message length
    const vid = (typeof voiceId === 'string' && voiceId) || DEFAULT_VOICE;

    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${vid}/stream?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, model_id: MODEL }),
      },
    );

    if (!upstream.ok || !upstream.body) {
      const err = await upstream.text();
      return new Response(JSON.stringify({ error: 'TTS_UPSTREAM', detail: err.slice(0, 200) }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'TTS_ERROR', detail: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
