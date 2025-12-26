import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    thumbnail: string;
    source: string;
    title: string;
  }>;
  location?: {
    lat: number | null;
    lon: number | null;
    city?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, results, images: googleImages, location }: AIAnswerRequest = await req.json();
    console.log('📝 AI Answer request for:', query);

    if (!query || !results || results.length === 0) {
      console.log('❌ No query or results provided');
      return new Response(
        JSON.stringify({ text: null, sources: [], images: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('❌ GOOGLE_GEMINI_API_KEY not configured');
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }
    console.log('✅ Gemini API key found');

    // Build context from search results with source attribution
    const contextText = results
      .slice(0, 8)
      .map((r, i) => `[Source ${i + 1}: ${new URL(r.url).hostname}]\nTitle: ${r.title}\nContent: ${r.snippet}`)
      .join('\n\n');

    const locationContext = location?.city 
      ? `\nUser is searching from: ${location.city}`
      : '';

    // Use Google Image Search results if available, otherwise fall back to webpage images
    const images = googleImages && googleImages.length > 0
      ? googleImages.slice(0, 6).map(img => ({ 
          url: img.thumbnail || img.url, 
          fullUrl: img.url,
          source: img.source,
          title: img.title
        }))
      : results
          .filter(r => r.image && !r.image.includes('favicon'))
          .slice(0, 4)
          .map(r => ({ url: r.image!, source: new URL(r.url).hostname }));

    // Perplexity-style system prompt for rich, informative content
    const systemPrompt = `You are an expert AI search assistant that provides comprehensive, well-researched answers in the style of Perplexity AI.

RESPONSE FORMAT:
1. Start with a clear, engaging opening paragraph that directly answers the query (2-3 sentences)
2. Add relevant sections with headers when appropriate (use ## for headers)
3. Use inline citations like "according to Wikipedia" or "as noted on britannica.com" - NO bracketed numbers
4. Write in flowing prose, not bullet points
5. Include specific facts, dates, statistics when available
6. End with a brief conclusion or key takeaway

STYLE GUIDELINES:
- Write naturally like a knowledgeable friend explaining something
- Be comprehensive but concise (200-350 words)
- Bold important terms or names using **term**
- Use paragraph breaks for readability
- Cite sources naturally within sentences, not at the end
- If it's a location/place query, include geography, demographics, notable features

Search Results Context:
${contextText}${locationContext}

Remember: Write like Perplexity - informative, flowing prose with natural source citations.`;

    console.log('🚀 Calling Gemini API...');

    // Use the v1 endpoint; v1beta has different model availability and can produce 404s for valid models.
    const modelsToTry = ['gemini-2.0-flash-exp', 'gemini-2.0-flash', 'gemini-1.5-flash'];

    let data: any | null = null;
    let usedModel: string | null = null;
    let lastStatus: number | null = null;
    let lastErrorText: string | null = null;
    let lastErrorMessage: string | null = null;
    let hardQuotaExceeded = false;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${systemPrompt}\n\nUser Query: ${query}\n\nProvide a comprehensive answer about this topic.`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 600,
      },
    };

    const extractGeminiErrorMessage = (raw: string | null): string | null => {
      if (!raw) return null;
      try {
        const j = JSON.parse(raw);
        return j?.error?.message || null;
      } catch {
        return raw;
      }
    };

    for (const model of modelsToTry) {
      usedModel = model;

      for (let attempt = 0; attempt < 3; attempt++) {
        const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        lastStatus = response.status;
        console.log(`📡 Gemini response status (${model}) [attempt ${attempt + 1}/3]:`, response.status);

        if (response.ok) {
          data = await response.json();
          break;
        }

        const errorText = await response.text();
        lastErrorText = errorText?.substring(0, 1200) || null;
        lastErrorMessage = extractGeminiErrorMessage(errorText);

        console.error(
          `AI API error (${model}):`,
          response.status,
          lastErrorMessage || lastErrorText
        );

        if (response.status === 429) {
          // If the key has no quota/billing (often shows `limit: 0`) retries/models won't help.
          const msg = (lastErrorMessage || '').toLowerCase();
          if (msg.includes('limit: 0') || msg.includes('billing') || msg.includes('quota exceeded')) {
            hardQuotaExceeded = true;
            break;
          }

          // Retry on rate limiting
          if (attempt < 2) {
            const retryAfterHeader = response.headers.get('retry-after');
            const retryAfterSec = retryAfterHeader ? Number(retryAfterHeader) : NaN;
            const waitMs = Number.isFinite(retryAfterSec)
              ? Math.min(15000, Math.max(1000, retryAfterSec * 1000))
              : 900 * (attempt + 1) ** 2;

            console.log(`⏳ Rate limited by Gemini; retrying in ${waitMs}ms...`);
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }
        }

        // Non-retryable error for this attempt/model
        break;
      }

      if (data || hardQuotaExceeded) break;
    }

    if (!data) {
      if (lastStatus === 429) {
        return new Response(
          JSON.stringify({
            error:
              lastErrorMessage ||
              'Gemini quota exceeded / rate limited. Please enable billing for your Gemini API key.',
            details: lastErrorText,
            model: usedModel,
            text: null,
            sources: [],
            images: [],
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (lastStatus === 402) {
        return new Response(
          JSON.stringify({
            error: 'Gemini billing/credits issue (402).',
            details: lastErrorText,
            model: usedModel,
            text: null,
            sources: [],
            images: [],
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          error: 'Gemini API error',
          message: lastErrorMessage,
          details: lastErrorText,
          model: usedModel,
          text: null,
          sources: [],
          images: [],
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📊 Gemini response:', JSON.stringify(data).substring(0, 200));

    const aiText =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p?.text)
        .filter(Boolean)
        .join('') || null;

    console.log('✅ AI text generated:', aiText ? 'yes' : 'no');

    // Extract source information
    const sources = results.slice(0, 6).map(r => ({
      title: r.title,
      url: r.url,
      domain: new URL(r.url).hostname.replace('www.', '')
    }));

    return new Response(
      JSON.stringify({
        text: aiText,
        sources,
        images
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI answer error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        text: null,
        sources: [],
        images: [],
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
