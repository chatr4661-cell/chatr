import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Use AI to understand search intent and suggest relevant services
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant for Chatr+, a superapp for local services in India. 
            When users search for something, analyze their intent and suggest relevant service categories and keywords.
            
            Available categories:
            - Food & Dining: restaurants, home food, chai, biryani, cafes
            - Home Services: plumbers, electricians, cleaners, carpenters, repairs
            - Healthcare: doctors, dentists, clinics, labs, consultations
            - Beauty & Wellness: salons, spas, massage, beauty treatments
            - Local Jobs: hire helpers, drivers, maids, gig workers
            - Education: tutors, coaching, skill training
            - Business Tools: mini-apps, listings, dashboards
            
            Return a JSON object with:
            {
              "category": "most relevant category",
              "keywords": ["keyword1", "keyword2", "keyword3"],
              "intent": "brief description of what user wants",
              "suggestions": ["service suggestion 1", "service suggestion 2"]
            }`
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error("AI service unavailable");
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    let parsedResult;
    try {
      parsedResult = JSON.parse(aiContent);
    } catch {
      // If AI doesn't return valid JSON, create a basic response
      parsedResult = {
        category: "general",
        keywords: [query],
        intent: query,
        suggestions: []
      };
    }

    return new Response(
      JSON.stringify(parsedResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in chatr-plus-ai-search:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        suggestions: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
