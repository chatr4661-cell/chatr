// Cloud speech-to-text for in-call translation / AI answer.
// Receives a short base64 audio utterance captured on-device and transcribes it
// with the Lovable AI Gateway (OpenAI-compatible /audio/transcriptions).
// Used by both peers during a live call — keeps STT off the device so it works
// reliably inside the Android WebView (no webkitSpeechRecognition there).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

function b64decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/audio/transcriptions";

// MIME -> file extension (OpenAI infers container from the filename extension).
const EXT_BY_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/aac": "aac",
  "audio/3gpp": "3gp",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ text: "", error: "no_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const audioBase64: string = (body.audioBase64 || "").toString();
    const mimeType: string = (body.mimeType || "audio/webm").toString().split(";")[0];
    // Pass a 2-letter language hint to improve accuracy (e.g. "hi", "pa").
    const lang: string = (body.lang || "").toString().split("-")[0].toLowerCase();

    if (!audioBase64) {
      return new Response(JSON.stringify({ error: "Missing audio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bytes = b64decode(audioBase64);
    // Ignore near-empty captures (noise / accidental triggers).
    if (bytes.byteLength < 1200) {
      return new Response(JSON.stringify({ text: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = EXT_BY_MIME[mimeType] || "webm";

    const buildForm = (model: string) => {
      const form = new FormData();
      form.append("model", model);
      form.append("file", new Blob([bytes], { type: mimeType }), `utterance.${ext}`);
      if (lang) form.append("language", lang);
      return form;
    };

    // 1) Primary: Lovable AI Gateway.
    const upstream = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: buildForm("openai/gpt-4o-mini-transcribe"),
    });

    if (upstream.ok) {
      const data = await upstream.json().catch(() => ({}));
      const text: string = (data?.text || "").toString().trim();
      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const detail = await upstream.text().catch(() => "");
    console.error("voice-stt gateway error:", upstream.status, detail);

    // 2) Fallback: call OpenAI directly (handles 402 credit exhaustion etc).
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (OPENAI_API_KEY) {
      const oai = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: buildForm("gpt-4o-mini-transcribe"),
      });
      if (oai.ok) {
        const data = await oai.json().catch(() => ({}));
        const text: string = (data?.text || "").toString().trim();
        return new Response(JSON.stringify({ text, provider: "openai" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const oaiDetail = await oai.text().catch(() => "");
      console.error("voice-stt openai fallback error:", oai.status, oaiDetail);
    }

    // 3) Fallback: Google Gemini transcription (inline audio).
    const GEMINI_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (GEMINI_KEY) {
      const prompt = lang
        ? `Transcribe this audio verbatim in its original language. Output only the transcript text.`
        : `Transcribe this audio verbatim. Output only the transcript text.`;
      const g = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: audioBase64 } },
              ],
            }],
          }),
        },
      );
      if (g.ok) {
        const data = await g.json().catch(() => ({}));
        const text: string = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").toString().trim();
        return new Response(JSON.stringify({ text, provider: "gemini" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const gDetail = await g.text().catch(() => "");
      console.error("voice-stt gemini fallback error:", g.status, gDetail);
    }

    return new Response(
      JSON.stringify({ text: "", error: `stt_${upstream.status}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("voice-stt error:", error);
    return new Response(JSON.stringify({ text: "", error: "exception" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
