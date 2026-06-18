// Cloud speech-to-text for in-call translation / AI answer.
// Receives a short base64 audio utterance captured on-device and transcribes it
// with the Lovable AI Gateway (OpenAI-compatible /audio/transcriptions).
// Used by both peers during a live call — keeps STT off the device so it works
// reliably inside the Android WebView (no webkitSpeechRecognition there).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode as b64decode } from "https://deno.land/std@0.224.0/encoding/base64.ts";

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
    const blob = new Blob([bytes], { type: mimeType });

    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("file", blob, `utterance.${ext}`);
    if (lang) form.append("language", lang);

    const upstream = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: form,
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("voice-stt gateway error:", upstream.status, detail);
      return new Response(
        JSON.stringify({ text: "", error: `stt_${upstream.status}` }),
        { status: upstream.status === 402 ? 402 : 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await upstream.json().catch(() => ({}));
    const text: string = (data?.text || "").toString().trim();

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("voice-stt error:", error);
    return new Response(JSON.stringify({ text: "", error: "exception" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
