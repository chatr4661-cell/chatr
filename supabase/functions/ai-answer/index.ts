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
   Models with fallback
---------------------------------- */
const PRIMARY_MODEL = "qwen/qwen-2.5-72b-instruct:free";
const FALLBACK_MODEL = "mistralai/mistral-7b-instruct:free";

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
   Helper: Call OpenRouter
---------------------------------- */
async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string
): Promise<{ ok: boolean; status: number; data?: any; errorText?: string }> {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://chatr.app",
        "X-Title": "CHATR Search",
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        max_tokens: 600,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return { ok: false, status: response.status, errorText };
  }

  const data = await response.json();
  return { ok: true, status: response.status, data };
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

    /* ---------- System Prompt (Plain text, no markdown) ---------- */
    const systemPrompt = `
You are a factual AI assistant.

TASK:
Write a clear, neutral summary using ONLY the provided search context.

STRICT RULES:
1. Summary must be between 5 and 10 lines.
2. Each line should be a complete sentence.
3. Do NOT use *, #, markdown, or bullet symbols.
4. Numbers (1, 2, 3) or letters (a, b, c) are allowed for lists.
5. Do NOT invent facts.
6. If multiple people share the same name, clearly say so.
7. If information is limited, state that transparently.

STYLE:
- Professional and neutral tone.
- Simple language.
- No hype, no exaggeration.

OUTPUT FORMAT:
Plain text only.
One sentence per line.
No markdown formatting whatsoever.

SEARCH CONTEXT:
${contextText}${locationContext}
`.trim();

    const userMessage = `User Query: ${query}\n\nProvide a clear and accurate summary.`;

    /* ---------- Call OpenRouter with fallback ---------- */
    console.log("🤖 Trying primary model:", PRIMARY_MODEL);
    let result = await callOpenRouter(OPENROUTER_API_KEY, PRIMARY_MODEL, systemPrompt, userMessage);

    // If primary model fails with 404, try fallback
    if (!result.ok && result.status === 404) {
      console.log("⚠️ Primary model unavailable, trying fallback:", FALLBACK_MODEL);
      result = await callOpenRouter(OPENROUTER_API_KEY, FALLBACK_MODEL, systemPrompt, userMessage);
    }

    console.log("📡 OpenRouter status:", result.status);

    if (!result.ok) {
      if (result.status === 429) {
        return new Response(
          JSON.stringify({
            error: "AI is temporarily busy. Please try again shortly.",
            text: null,
            sources: [],
            images,
          }),
          {
            status: 200, // Return 200 so frontend handles gracefully
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (result.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI quota temporarily exhausted.",
            text: null,
            sources: [],
            images,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // For any other error, return graceful fallback
      console.error("OpenRouter error:", result.status, result.errorText);
      return new Response(
        JSON.stringify({
          error: "AI summary temporarily unavailable.",
          text: null,
          sources: [],
          images,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    /* ---------- Extract and validate AI text ---------- */
    let aiText = result.data?.choices?.[0]?.message?.content?.trim() || null;

    // Validate response - ensure it's meaningful
    if (!aiText || aiText.split("\n").filter((l: string) => l.trim()).length < 3) {
      console.warn("⚠️ AI returned short/empty response, using fallback text");
      aiText = `Information about "${query}" is limited based on available public sources. The search found some relevant records, but more specific details may be required for a comprehensive summary. Please review the sources below for additional context.`;
    }

    // Clean any markdown that might have slipped through
    aiText = aiText
      .replace(/\*\*/g, '')
      .replace(/##/g, '')
      .replace(/\*/g, '')
      .replace(/#/g, '')
      .trim();

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
    // Return graceful error - never expose raw errors
    return new Response(
      JSON.stringify({
        error: "AI summary temporarily unavailable.",
        text: null,
        sources: [],
        images: [],
      }),
      {
        status: 200, // Return 200 so frontend handles gracefully
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
