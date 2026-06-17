// Low-latency text translation for live in-call translation.
// Translates a short spoken phrase from one language to another using the
// Lovable AI Gateway. Replies are short, so this is a single non-streaming call.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Map BCP-47 locale -> human language name for the prompt.
const LANG_NAMES: Record<string, string> = {
  en: "English", hi: "Hindi", pa: "Punjabi", bn: "Bengali", ta: "Tamil",
  te: "Telugu", mr: "Marathi", gu: "Gujarati", kn: "Kannada", ml: "Malayalam",
  ur: "Urdu", es: "Spanish", fr: "French", de: "German", it: "Italian",
  pt: "Portuguese", ru: "Russian", ja: "Japanese", ko: "Korean",
  zh: "Chinese (Mandarin)", ar: "Arabic",
};

const nameFor = (locale: string): string => {
  const base = (locale || "").split("-")[0].toLowerCase();
  return LANG_NAMES[base] || locale || "the target language";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const body = await req.json().catch(() => ({}));
    const text: string = (body.text || "").toString().trim();
    const sourceLang: string = (body.sourceLang || "").toString();
    const targetLang: string = (body.targetLang || "").toString();

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!targetLang) {
      return new Response(JSON.stringify({ error: "Missing targetLang" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const srcName = sourceLang ? nameFor(sourceLang) : "the detected language";
    const tgtName = nameFor(targetLang);

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ translated: text, targetLang, fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system =
      `You are a real-time speech interpreter on a live phone call. ` +
      `Translate the user's message from ${srcName} into ${tgtName}. ` +
      `Output ONLY the translation as natural, conversational spoken ${tgtName} — ` +
      `no quotes, no transliteration, no explanations, no notes. ` +
      `Preserve tone, names, and numbers. If the text is already in ${tgtName}, return it unchanged.`;

    const upstream = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: text },
        ],
        temperature: 0.2,
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("voice-translate gateway fallback:", upstream.status, detail);
      return new Response(JSON.stringify({ translated: text, targetLang, fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await upstream.json();
    const translated: string =
      data?.choices?.[0]?.message?.content?.toString().trim() || "";

    return new Response(JSON.stringify({ translated, targetLang }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("voice-translate error:", error);
    return new Response(JSON.stringify({ translated: "", fallback: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
