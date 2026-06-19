// Zero-cost cloud fallback for bidirectional voice AI.
// Streams tokens (SSE) from the Lovable AI Gateway so the client can start
// speaking the first sentence before the full reply is generated.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const body = await req.json().catch(() => ({}));
    const userText: string = (body.message || "").toString().trim();
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];
    const systemPrompt: string =
      (body.systemPrompt || "").toString().trim() ||
      "You are Chatr's voice assistant. Reply in short, natural spoken sentences. " +
        "Keep answers concise (1-3 sentences) unless asked for detail. Never use markdown, " +
        "bullet points, or emojis — your reply will be read aloud.";
    const model: string = (body.model || "google/gemini-3-flash-preview").toString();

    if (!userText) {
      return new Response(JSON.stringify({ error: "Missing message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history
        .filter((m) => m && m.content && (m.role === "user" || m.role === "assistant"))
        .slice(-12),
      { role: "user", content: userText },
    ];

    const sseHeaders = { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" };
    const sseOnce = (content: string) =>
      new Response(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`, { headers: sseHeaders });

    // 1) Primary: Lovable AI Gateway (streaming).
    if (LOVABLE_API_KEY) {
      const upstream = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { "Lovable-API-Key": LOVABLE_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, stream: true }),
      });
      if (upstream.ok && upstream.body) {
        return new Response(upstream.body, { headers: sseHeaders });
      }
      const detail = await upstream.text().catch(() => "");
      console.error("voice-ai-stream gateway error:", upstream.status, detail);
    }

    // 2) Fallback: OpenAI directly (streaming) — handles credit exhaustion.
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (OPENAI_API_KEY) {
      const oai = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages, stream: true }),
      });
      if (oai.ok && oai.body) {
        return new Response(oai.body, { headers: sseHeaders });
      }
      const detail = await oai.text().catch(() => "");
      console.error("voice-ai-stream openai fallback error:", oai.status, detail);
    }

    // 3) Fallback: OpenRouter (OpenAI-compatible streaming).
    const OR_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (OR_KEY) {
      const or = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OR_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "openai/gpt-4o-mini", messages, stream: true }),
      });
      if (or.ok && or.body) {
        return new Response(or.body, { headers: sseHeaders });
      }
      const detail = await or.text().catch(() => "");
      console.error("voice-ai-stream openrouter fallback error:", or.status, detail);
    }

    // 4) Fallback: Google Gemini (non-streaming, emitted as one SSE chunk).
    const GEMINI_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (GEMINI_KEY) {
      const sys = messages.find((m) => m.role === "system")?.content || "";
      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
      const g = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents }),
        },
      );
      if (g.ok) {
        const data = await g.json();
        const reply: string = data?.candidates?.[0]?.content?.parts?.[0]?.text?.toString().trim() || "";
        if (reply) return sseOnce(reply);
      } else {
        const detail = await g.text().catch(() => "");
        console.error("voice-ai-stream gemini fallback error:", g.status, detail);
      }
    }

    // 5) Last resort: graceful spoken fallback.
    return sseOnce("Sorry, they are busy right now. Please leave a short message and they will call you back.");
  } catch (error) {
    console.error("voice-ai-stream error:", error);
    const fallback = "Sorry, they are busy right now. Please leave a short message and they will call you back.";
    return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: fallback } }] })}\n\ndata: [DONE]\n\n`, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }
});
