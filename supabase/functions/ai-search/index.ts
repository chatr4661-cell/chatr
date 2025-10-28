import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query) {
      throw new Error("Query is required");
    }

    console.log("Search query:", query);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Call Lovable AI for search and summarization
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
            content: "You are a search assistant. Provide a concise summary of the topic and suggest 3 follow-up questions. Format your response as JSON with 'summary' and 'followUps' fields."
          },
          {
            role: "user",
            content: `Search query: "${query}"\n\nProvide a brief summary and 3 follow-up questions.`
          }
        ]
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("Payment required. Please add credits to your Lovable workspace.");
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error("AI search failed");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse AI response
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch {
      // Fallback if AI didn't return valid JSON
      parsedContent = {
        summary: content,
        followUps: [
          `Tell me more about ${query}`,
          `What are the latest developments in ${query}?`,
          `How does ${query} work?`
        ]
      };
    }

    // Mock search results for demo
    const mockResults = [
      {
        title: `${query} - Overview`,
        snippet: `Comprehensive information about ${query}...`,
        url: `https://example.com/${query.toLowerCase().replace(/\s+/g, '-')}`
      },
      {
        title: `Understanding ${query}`,
        snippet: `Deep dive into ${query} and its applications...`,
        url: `https://example.com/guide-${query.toLowerCase().replace(/\s+/g, '-')}`
      },
      {
        title: `${query} Best Practices`,
        snippet: `Learn the best practices for ${query}...`,
        url: `https://example.com/best-practices-${query.toLowerCase().replace(/\s+/g, '-')}`
      }
    ];

    return new Response(
      JSON.stringify({
        summary: parsedContent.summary || parsedContent,
        followUps: parsedContent.followUps || [],
        results: mockResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error("Error in ai-search:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
