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

type QueryType = "place" | "person" | "general";

/* ----------------------------------
   Query Type Detection
---------------------------------- */
function detectQueryType(query: string, results: Array<{ title: string; snippet: string; url: string }>): QueryType {
  const queryLower = query.toLowerCase();
  const combinedText = results
    .map((r) => `${r.title} ${r.snippet}`)
    .join(" ")
    .toLowerCase();

  // Place indicators in query
  const placeQueryKeywords = [
    "city", "town", "village", "district", "state", "country", "capital",
    "where is", "location of", "map of", "weather in", "things to do in",
    "hotels in", "restaurants in", "places in", "travel to", "visit"
  ];

  // Place indicators in results
  const placeResultKeywords = [
    "located", "district", "city", "town", "village", "population",
    "geography", "coordinates", "latitude", "longitude", "area",
    "municipality", "region", "province", "capital", "india", "usa",
    "united states", "europe", "asia", "country", "wikipedia",
    "known for", "famous for", "tourist", "landmark", "monument"
  ];

  // Person indicators in query
  const personQueryKeywords = [
    "who is", "biography", "age of", "born", "death", "career",
    "profession", "job of", "works at", "married", "children"
  ];

  // Person indicators in results
  const personResultKeywords = [
    "linkedin", "facebook", "twitter", "instagram", "profile",
    "biography", "born", "age", "career", "profession", "ceo",
    "founder", "director", "manager", "engineer", "doctor",
    "politician", "actor", "actress", "singer", "author", "writer"
  ];

  // Score-based detection
  let placeScore = 0;
  let personScore = 0;

  // Check query keywords
  for (const keyword of placeQueryKeywords) {
    if (queryLower.includes(keyword)) placeScore += 2;
  }
  for (const keyword of personQueryKeywords) {
    if (queryLower.includes(keyword)) personScore += 2;
  }

  // Check results keywords
  for (const keyword of placeResultKeywords) {
    if (combinedText.includes(keyword)) placeScore += 1;
  }
  for (const keyword of personResultKeywords) {
    if (combinedText.includes(keyword)) personScore += 1;
  }

  // Wikipedia with geographic/location context = place
  if (combinedText.includes("wikipedia") && 
      (combinedText.includes("district") || combinedText.includes("city") || 
       combinedText.includes("located") || combinedText.includes("india"))) {
    placeScore += 3;
  }

  // LinkedIn or professional profiles = person
  if (combinedText.includes("linkedin") || combinedText.includes("profile")) {
    personScore += 3;
  }

  console.log(`📊 Query type detection - Place: ${placeScore}, Person: ${personScore}`);

  if (placeScore > personScore && placeScore >= 3) return "place";
  if (personScore > placeScore && personScore >= 3) return "person";
  return "general";
}

/* ----------------------------------
   System Prompts by Query Type
---------------------------------- */
function getSystemPrompt(queryType: QueryType, contextText: string, locationContext: string): string {
  if (queryType === "place") {
    return `You are a factual geography assistant.

TASK:
Write a clear and reliable summary about a place using ONLY the provided search context.

STRICT RULES:
1. Summary must be 5 to 10 lines.
2. One complete sentence per line.
3. Do NOT use *, #, markdown, or bullet symbols.
4. Numbers (1, 2, 3) and letters (a, b, c) are allowed for lists.
5. Neutral, factual tone.
6. Do not invent facts.
7. If information is limited, say so clearly.

CONTENT TO INCLUDE:
- What the place is
- Where it is located
- Administrative or regional context
- Why it is known
- One practical or distinguishing fact

OUTPUT FORMAT:
Plain text only.
One sentence per line.
No markdown formatting whatsoever.

SEARCH CONTEXT:
${contextText}${locationContext}`.trim();
  }

  if (queryType === "person") {
    return `You are a factual profile assistant.

TASK:
Write a neutral summary about a person using ONLY the provided search context.

STRICT RULES:
1. Summary must be 5 to 10 lines.
2. One complete sentence per line.
3. Do NOT use *, #, markdown, or bullet symbols.
4. Numbers (1, 2, 3) and letters (a, b, c) are allowed for lists.
5. Do not invent facts.
6. If multiple people share the same name, clearly state this.
7. If information is limited, say so clearly.

CONTENT TO INCLUDE:
- Professional identity if available
- Public roles or affiliations
- Type of work or domain
- Any verified public presence
- Clarification if identity is ambiguous

OUTPUT FORMAT:
Plain text only.
One sentence per line.
No markdown formatting whatsoever.

SEARCH CONTEXT:
${contextText}${locationContext}`.trim();
  }

  // General query
  return `You are a factual AI assistant.

TASK:
Write a clear, neutral summary using ONLY the provided search context.

STRICT RULES:
1. Summary must be between 5 and 10 lines.
2. Each line should be a complete sentence.
3. Do NOT use *, #, markdown, or bullet symbols.
4. Numbers (1, 2, 3) or letters (a, b, c) are allowed for lists.
5. Do NOT invent facts.
6. If information is limited, state that transparently.

STYLE:
- Professional and neutral tone.
- Simple language.
- No hype, no exaggeration.

OUTPUT FORMAT:
Plain text only.
One sentence per line.
No markdown formatting whatsoever.

SEARCH CONTEXT:
${contextText}${locationContext}`.trim();
}

/* ----------------------------------
   Fallback Summary by Query Type
---------------------------------- */
function getFallbackSummary(query: string, queryType: QueryType): string {
  if (queryType === "place") {
    return `Information about "${query}" is based on available public sources.
This appears to be a geographical location.
The search found some relevant records about this place.
More specific details may be available in the sources below.
Please review the linked sources for comprehensive information.`;
  }

  if (queryType === "person") {
    return `Information about "${query}" is based on available public sources.
The name appears in multiple public records and profiles.
Due to common naming, there may be multiple individuals with this name.
More specific context is needed for precise identification.
Please review the sources below for detailed information.`;
  }

  return `Information about "${query}" is limited based on available public sources.
The search found some relevant records.
More specific details may be required for a comprehensive summary.
Please review the sources below for additional context.`;
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
        temperature: 0.5,
        max_tokens: 700,
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

    // ALWAYS attempt AI summary if query exists (even with empty results)
    if (!query) {
      return new Response(
        JSON.stringify({ text: null, sources: [], images: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* ---------- API Key ---------- */
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      console.error("❌ OPENROUTER_API_KEY not configured");
      return new Response(
        JSON.stringify({
          text: getFallbackSummary(query, "general"),
          sources: [],
          images: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* ---------- Handle empty results gracefully ---------- */
    const safeResults = results || [];
    
    /* ---------- Detect Query Type ---------- */
    const queryType = detectQueryType(query, safeResults);
    console.log(`🔍 Detected query type: ${queryType}`);

    /* ---------- Build Context ---------- */
    const contextText = safeResults.length > 0
      ? safeResults
          .slice(0, 8)
          .map(
            (r, i) =>
              `[Source ${i + 1}: ${new URL(r.url).hostname}]
Title: ${r.title}
Content: ${r.snippet}`
          )
          .join("\n\n")
      : `Query: "${query}" - Limited search results available.`;

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
        : safeResults
            .filter((r) => r.image && !r.image.includes("favicon"))
            .slice(0, 4)
            .map((r) => ({
              url: r.image!,
              source: new URL(r.url).hostname,
            }));

    /* ---------- Get Query-Specific Prompt ---------- */
    const systemPrompt = getSystemPrompt(queryType, contextText, locationContext);
    const userMessage = `User Query: ${query}\n\nProvide a clear and accurate summary in 5-10 lines.`;

    /* ---------- Call OpenRouter with fallback ---------- */
    console.log("🤖 Trying primary model:", PRIMARY_MODEL);
    let result = await callOpenRouter(OPENROUTER_API_KEY, PRIMARY_MODEL, systemPrompt, userMessage);

    // If primary model fails with 404, try fallback
    if (!result.ok && result.status === 404) {
      console.log("⚠️ Primary model unavailable, trying fallback:", FALLBACK_MODEL);
      result = await callOpenRouter(OPENROUTER_API_KEY, FALLBACK_MODEL, systemPrompt, userMessage);
    }

    console.log("📡 OpenRouter status:", result.status);

    /* ---------- Sources ---------- */
    const sources = safeResults.slice(0, 6).map((r) => ({
      title: r.title,
      url: r.url,
      domain: new URL(r.url).hostname.replace("www.", ""),
    }));

    if (!result.ok) {
      console.error("OpenRouter error:", result.status, result.errorText);
      // Return fallback summary instead of error
      return new Response(
        JSON.stringify({
          text: getFallbackSummary(query, queryType),
          sources,
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

    // Validate response - ensure it's meaningful (at least 5 non-empty lines)
    const lineCount = aiText ? aiText.split("\n").filter((l: string) => l.trim().length > 10).length : 0;
    
    if (!aiText || lineCount < 3) {
      console.warn("⚠️ AI returned short/empty response, using fallback text");
      aiText = getFallbackSummary(query, queryType);
    }

    // Clean any markdown that might have slipped through
    aiText = aiText
      .replace(/\*\*/g, "")
      .replace(/##/g, "")
      .replace(/\*/g, "")
      .replace(/#/g, "")
      .replace(/^[-•]\s/gm, "") // Remove bullet points at start of lines
      .trim();

    /* ---------- Final Response ---------- */
    console.log(`✅ AI Answer generated successfully for query type: ${queryType}`);
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
    // Return graceful fallback - never expose raw errors
    const query = "your search";
    return new Response(
      JSON.stringify({
        text: getFallbackSummary(query, "general"),
        sources: [],
        images: [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
