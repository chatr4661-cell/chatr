import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/* ----------------------------------
   CORS
---------------------------------- */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* ----------------------------------
   Types
---------------------------------- */
interface AIAnswerRequest {
  query: string;
  results: Array<{
    title: string;
    snippet: string;
    url: string;
    image?: string;
  }>;
  images?: Array<{
    url: string;
    thumbnail?: string;
    source: string;
    title: string;
  }>;
  location?: {
    lat: number | null;
    lon: number | null;
    city?: string;
  };
}

/* ----------------------------------
   Server
---------------------------------- */
serve(async (req) => {
  /* ---------- Preflight ---------- */
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    /* ---------- Parse request ---------- */
    const body: AIAnswerRequest = await req.json();
    const { query, results, images: googleImages, location } = body;

    console.log("📝 AI Answer request:", query);

    if (!query || !results || results.length === 0) {
      return new Response(
        JSON.stringify({ text: null, sources: [], images: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* ---------- API Key ---------- */
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    /* ---------- Build Context ---------- */
    const contextText = results
      .slice(0, 8)
      .map(
        (r, i) =>
          `[Source ${i + 1}: ${new URL(r.url).hostname}]
Title: ${r.title}
Content: ${r.snippet}`
      )
      .join("\n\n");

    const locationContext = location?.city
      ? `\nUser location: ${location.city}`
      : "";

    /* ---------- Images ---------- */
    const images =
      googleImages && googleImages.length > 0
        ? googleImages.slice(0, 6).map((img) => ({
            url: img.thumbnail || img.url,
            fullUrl: img.url,
            source: img.source,
            title: img.title,
          }))
        : results
            .filter((r) => r.image && !r.image.includes("favicon"))
            .slice(0, 4)
            .map((r) => ({
              url: r.image!,
              source: new URL(r.url).hostname,
            }));

    /* ---------- System Prompt ---------- */
    const systemPrompt = `
You are a factual AI search assistant similar to Perplexity.

RULES:
- Use ONLY the provided search context
- Do NOT invent facts
- Do NOT mention sources as numbers
- Cite sources naturally (e.g. "according to Wikipedia")

FORMAT:
• Start with a clear 2–3 sentence answer
• Use ## headers when useful
• Write flowing prose (no bullet lists)
• 200–350 words
• Bold key terms using **bold**
• End with a short takeaway

SEARCH CONTEXT:
${contextText}${locationContext}
`.trim();

    /* ---------- Call OpenRouter ---------- */
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://chatr.app",
          "X-Title": "CHATR Search",
        },
        body: JSON.stringify({
          model: "qwen/qwen-2.5-7b-instruct:free",
          temperature: 0.6,
          max_tokens: 600,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `User Query: ${query}\n\nAnswer clearly and accurately.`,
            },
          ],
        }),
      }
    );

    console.log("📡 OpenRouter status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limited. Please try again shortly.",
            text: null,
            sources: [],
            images: [],
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "OpenRouter free quota exhausted.",
            text: null,
            sources: [],
            images: [],
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(
        `OpenRouter error ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();
    const aiText = data?.choices?.[0]?.message?.content ?? null;

    /* ---------- Sources ---------- */
    const sources = results.slice(0, 6).map((r) => ({
      title: r.title,
      url: r.url,
      domain: new URL(r.url).hostname.replace("www.", ""),
    }));

    /* ---------- Final Response ---------- */
    return new Response(
      JSON.stringify({
        text: aiText,
        sources,
        images,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ AI Answer Error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Unknown server error",
        text: null,
        sources: [],
        images: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
