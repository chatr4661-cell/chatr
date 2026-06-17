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

    if (!LOVABLE_API_KEY) {
      const fallback = "Sorry, they are busy right now. Please leave a short message and they will call you back.";
      return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: fallback } }] })}\n\ndata: [DONE]\n\n`, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    const upstream = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, stream: true }),
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      console.error("voice-ai-stream gateway fallback:", upstream.status, detail);
      const fallback = upstream.status === 402
        ? "Sorry, AI calling needs workspace credits. Please leave a message and they will call back."
        : "Sorry, they are busy right now. Please leave a short message and they will call you back.";
      return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: fallback } }] })}\n\ndata: [DONE]\n\n`, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    // Pass the SSE stream straight through to the client.
    return new Response(upstream.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("voice-ai-stream error:", error);
    const fallback = "Sorry, they are busy right now. Please leave a short message and they will call you back.";
    return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: fallback } }] })}\n\ndata: [DONE]\n\n`, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }
});
