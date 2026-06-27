import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const inputSchema = z.object({
  imageBase64: z.string().min(1),
  prompt: z.string().default("Analyze this image and describe what you see."),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const validationResult = inputSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: validationResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { imageBase64, prompt } = validationResult.data;

    // Prefer OpenRouter if a key is set, otherwise use the Lovable AI Gateway.
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const useOpenRouter = Boolean(openRouterKey);
    const API_KEY = openRouterKey || lovableKey;

    if (!API_KEY) {
      throw new Error("No API key configured (OPENROUTER_API_KEY or LOVABLE_API_KEY).");
    }

    const payload = {
      // Vision-capable model id valid for BOTH OpenRouter and the Lovable Gateway.
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
            },
          ],
        },
      ],
      max_tokens: 1500,
    };

    const fetchUrl = useOpenRouter ? OPENROUTER_API_URL : LOVABLE_API_URL;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (useOpenRouter) {
      headers["Authorization"] = `Bearer ${API_KEY}`;
      headers["HTTP-Referer"] = "https://chatr.chat";
      headers["X-Title"] = "Chatr Visual Intelligence";
    } else {
      // Lovable Gateway authenticates via the Lovable-API-Key header.
      headers["Authorization"] = `Bearer ${API_KEY}`;
      headers["Lovable-API-Key"] = API_KEY;
    }

    const response = await fetch(fetchUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI Gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API Error: ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || "No response generated.";

    return new Response(
      JSON.stringify({ success: true, text: aiText }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Visual Intelligence error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
