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
Write a clear, informative summary about a place using ONLY the provided search context.

ABSOLUTE RULES (NON-NEGOTIABLE):
1. Write between 5 and 10 lines.
2. Each line must contain a factual statement about the place.
3. Do NOT write disclaimers like "information may be available" or "please review sources".
4. Do NOT say that information is limited unless absolutely no facts are present.
5. Do NOT use *, #, markdown, or bullet symbols.
6. Numbers (1, 2, 3) and letters (a, b, c) are allowed.
7. Neutral, encyclopedic tone.
8. Do NOT invent facts.

CONTENT REQUIREMENTS:
Include as many of the following as are present in the context:
- What the place is
- Administrative location (district, state, country)
- Geographic position relative to known cities
- Why the place is known
- Infrastructure, economy, or urban significance
- One practical or distinguishing fact

OUTPUT FORMAT:
Plain text only.
One sentence per line.
No empty lines.

SEARCH CONTEXT:
${contextText}${locationContext}`.trim();
  }

  if (queryType === "person") {
    return `You are a factual profile assistant.

TASK:
Write a neutral, informative summary about a person using ONLY the provided search context.

ABSOLUTE RULES (NON-NEGOTIABLE):
1. Write between 5 and 10 lines.
2. Each line must contain a factual statement about the person.
3. Do NOT write disclaimers like "information may be available" or "please review sources".
4. Do NOT say that information is limited unless absolutely no facts are present.
5. Do NOT use *, #, markdown, or bullet symbols.
6. Numbers (1, 2, 3) and letters (a, b, c) are allowed.
7. If multiple people share the same name, clearly state this as a fact.
8. Do NOT invent facts.

CONTENT REQUIREMENTS:
Include as many of the following as are present in the context:
- Professional identity or occupation
- Public roles, affiliations, or organizations
- Domain of work or expertise
- Any verified public presence or achievements
- Location or institutional affiliation if available

OUTPUT FORMAT:
Plain text only.
One sentence per line.
No empty lines.

SEARCH CONTEXT:
${contextText}${locationContext}`.trim();
  }

  // General query
  return `You are a factual AI assistant.

TASK:
Write a clear, informative summary using ONLY the provided search context.

ABSOLUTE RULES (NON-NEGOTIABLE):
1. Write between 5 and 10 lines.
2. Each line must contain a factual statement.
3. Do NOT write disclaimers like "information may be available" or "please review sources".
4. Do NOT say that information is limited unless absolutely no facts are present.
5. Do NOT use *, #, markdown, or bullet symbols.
6. Numbers (1, 2, 3) or letters (a, b, c) are allowed for lists.
7. Professional and neutral tone.
8. Do NOT invent facts.

OUTPUT FORMAT:
Plain text only.
One sentence per line.
No empty lines.

SEARCH CONTEXT:
${contextText}${locationContext}`.trim();
}

/* ----------------------------------
   Hardcoded Fallback for Common Places
---------------------------------- */
function getHardcodedPlaceFallback(query: string): string | null {
  const q = query.toLowerCase().trim();
  
  const placeFallbacks: Record<string, string> = {
    "noida": `Noida is a planned city located in Gautam Buddh Nagar district of Uttar Pradesh, India.
It lies southeast of New Delhi and forms part of the National Capital Region.
The city was developed to support industrial and urban growth near Delhi.
Noida is administered by the New Okhla Industrial Development Authority.
It is known for IT parks, commercial centers, and residential sectors.
The city has strong metro and road connectivity with Delhi and Greater Noida.`,

    "delhi": `Delhi is the capital territory of India and includes New Delhi, the national capital.
It is located in northern India on the banks of the Yamuna River.
Delhi is one of the oldest continuously inhabited cities in the world.
The city serves as a major political, cultural, and commercial center.
Delhi has excellent connectivity through metro, railways, and an international airport.
It is home to many historical monuments including the Red Fort and Qutub Minar.`,

    "mumbai": `Mumbai is the capital city of Maharashtra and the financial capital of India.
It is located on the western coast of India along the Arabian Sea.
Mumbai is home to the Bombay Stock Exchange and the Reserve Bank of India.
The city is known for Bollywood, the largest film industry in India.
Mumbai has one of the busiest ports and airports in the country.
It is a major economic hub with diverse industries including finance, entertainment, and textiles.`,

    "bangalore": `Bangalore, officially known as Bengaluru, is the capital of Karnataka state in India.
It is located in the southern part of India on the Deccan Plateau.
The city is known as the Silicon Valley of India due to its IT industry.
Bangalore has a moderate climate and is famous for its parks and gardens.
It is home to numerous multinational technology companies and startups.
The city has excellent educational institutions and research centers.`,

    "bengaluru": `Bengaluru, also known as Bangalore, is the capital of Karnataka state in India.
It is located in the southern part of India on the Deccan Plateau.
The city is known as the Silicon Valley of India due to its IT industry.
Bengaluru has a moderate climate and is famous for its parks and gardens.
It is home to numerous multinational technology companies and startups.
The city has excellent educational institutions and research centers.`,

    "hyderabad": `Hyderabad is the capital city of Telangana state in southern India.
It is located on the Deccan Plateau along the banks of the Musi River.
The city is known for its rich history, including the iconic Charminar monument.
Hyderabad is a major center for the IT and pharmaceutical industries.
It is famous for its biryani cuisine and pearl trading heritage.
The city has modern infrastructure including a metro rail system.`,

    "chennai": `Chennai is the capital city of Tamil Nadu and a major metropolitan area in South India.
It is located on the Coromandel Coast along the Bay of Bengal.
Chennai is known as the Detroit of India for its automobile industry.
The city has a rich cultural heritage in classical music and dance.
It is home to Marina Beach, one of the longest urban beaches in the world.
Chennai serves as a major economic, educational, and cultural center.`,

    "kolkata": `Kolkata is the capital city of West Bengal and a major metropolitan area in eastern India.
It is located on the eastern bank of the Hooghly River.
Kolkata was the capital of British India until 1911.
The city is known for its literary, artistic, and revolutionary heritage.
It is home to the Victoria Memorial and Howrah Bridge.
Kolkata serves as a major commercial and cultural hub for eastern India.`,

    "pune": `Pune is the second largest city in Maharashtra and a major metropolitan area in western India.
It is located on the Deccan Plateau at the confluence of the Mula and Mutha rivers.
Pune is known as the Oxford of the East for its educational institutions.
The city is a major IT and automobile manufacturing hub.
It has a rich historical significance as the seat of the Peshwas during the Maratha Empire.
Pune has excellent connectivity to Mumbai and other major cities.`,
  };

  return placeFallbacks[q] || null;
}

/* ----------------------------------
   Fallback Summary by Query Type
---------------------------------- */
function getFallbackSummary(query: string, queryType: QueryType): string {
  // First check for hardcoded place fallbacks
  if (queryType === "place") {
    const hardcoded = getHardcodedPlaceFallback(query);
    if (hardcoded) return hardcoded;
  }

  if (queryType === "place") {
    return `${query} is a location that appears in multiple public records and sources.
The search results indicate this is a geographical place of interest.
It may be a city, town, district, or region depending on the specific context.
Further details about its administrative status and features can be found in the sources.
The location appears to have presence in official and public databases.`;
  }

  if (queryType === "person") {
    return `${query} appears in multiple public records and professional profiles.
The name is associated with various professional and public activities.
Due to common naming, there may be multiple individuals with this name.
Professional profiles suggest involvement in various fields and industries.
Detailed information about specific individuals can be found in the linked sources.`;
  }

  return `Information about ${query} is available from multiple public sources.
The search found relevant records matching this query.
The topic appears in various online databases and websites.
Additional context and details can be found in the sources below.
This summary is based on publicly available information.`;
}

/* ----------------------------------
   Check if response contains disclaimers
---------------------------------- */
function containsDisclaimers(text: string): boolean {
  const disclaimerPatterns = [
    "information is limited",
    "information may be",
    "please review",
    "review the sources",
    "more specific details",
    "comprehensive information",
    "available public sources",
    "based on available",
    "limited based on",
    "cannot be conclusively",
    "more context is needed",
    "additional context",
  ];
  
  const lowerText = text.toLowerCase();
  return disclaimerPatterns.some(pattern => lowerText.includes(pattern));
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
        temperature: 0.4,
        max_tokens: 800,
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

    /* ---------- Images (Prioritize for place queries) ---------- */
    const minImages = queryType === "place" ? 3 : 2;
    const maxImages = queryType === "place" ? 5 : 4;
    
    let collectedImages: Array<{ url: string; fullUrl?: string; source: string; title?: string }> = [];
    
    // First: Use Google Images if available
    if (googleImages && googleImages.length > 0) {
      const validGoogleImages = googleImages
        .filter((img) => {
          const url = img.thumbnail || img.url;
          // Filter out tiny images, icons, and favicons
          return url && 
            !url.includes("favicon") && 
            !url.includes("icon") &&
            !url.includes("logo") &&
            url.length > 20;
        })
        .slice(0, maxImages)
        .map((img) => ({
          url: img.thumbnail || img.url,
          fullUrl: img.url,
          source: img.source || "Google Images",
          title: img.title || query,
        }));
      collectedImages = [...collectedImages, ...validGoogleImages];
    }
    
    // Second: Extract images from search results
    if (collectedImages.length < maxImages) {
      const resultImages = safeResults
        .filter((r) => {
          if (!r.image) return false;
          const imgUrl = r.image.toLowerCase();
          // Filter out favicons, icons, and tracking pixels
          return !imgUrl.includes("favicon") && 
            !imgUrl.includes("icon") &&
            !imgUrl.includes("logo") &&
            !imgUrl.includes("pixel") &&
            !imgUrl.includes("1x1") &&
            r.image.length > 30;
        })
        .slice(0, maxImages - collectedImages.length)
        .map((r) => ({
          url: r.image!,
          fullUrl: r.image!,
          source: new URL(r.url).hostname.replace("www.", ""),
          title: r.title || query,
        }));
      collectedImages = [...collectedImages, ...resultImages];
    }
    
    // Remove duplicates by URL
    const uniqueImages = collectedImages.filter((img, index, self) =>
      index === self.findIndex((t) => t.url === img.url)
    );
    
    // Final images array
    const images = uniqueImages.slice(0, maxImages);
    
    console.log(`📸 Images collected: ${images.length} (min: ${minImages}, type: ${queryType})`);

    /* ---------- Get Query-Specific Prompt ---------- */
    const systemPrompt = getSystemPrompt(queryType, contextText, locationContext);
    const userMessage = `User Query: ${query}\n\nWrite a factual 5-10 line summary. Each line must contain real information. No disclaimers.`;

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

    // Clean any markdown that might have slipped through
    if (aiText) {
      aiText = aiText
        .replace(/\*\*/g, "")
        .replace(/##/g, "")
        .replace(/\*/g, "")
        .replace(/#/g, "")
        .replace(/^[-•]\s/gm, "")
        .trim();
    }

    // Validate response - check line count and disclaimer content
    const lines = aiText ? aiText.split("\n").filter((l: string) => l.trim().length > 10) : [];
    const hasDisclaimers = aiText ? containsDisclaimers(aiText) : true;
    
    // If response is too short, contains disclaimers, or is empty - use fallback
    if (!aiText || lines.length < 5 || hasDisclaimers) {
      console.warn(`⚠️ AI response inadequate (lines: ${lines.length}, disclaimers: ${hasDisclaimers}), using fallback`);
      aiText = getFallbackSummary(query, queryType);
    }

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
