import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro-latest"];

async function callGemini(
  apiKey: string | undefined,
  systemInstruction: string,
  userText: string,
  jsonMode = false,
): Promise<string | null> {
  for (const model of apiKey ? MODELS : []) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
          ...(jsonMode ? { generationConfig: { responseMimeType: "application/json" } } : {}),
        }),
      },
    );
    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text as string;
    } else if (res.status !== 404) {
      console.error(`Gemini ${model} failed: ${res.status} ${await res.text()}`);
      break;
    }
  }

  // Fallback: Lovable AI Gateway (no user key needed)


  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userText },
        ],
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text) return text as string;
    } else {
      console.error(`Lovable gateway failed: ${res.status} ${await res.text()}`);
    }
  }
  return null;
}


// Structured prompts for the legacy action-based callers (useAIChatFeatures)
const ACTIONS: Record<string, { system: string; user: (b: any) => string }> = {
  "smart-reply": {
    system:
      'Generate 3 natural reply suggestions with varying tones. Respond with JSON: {"replies":[{"text":string,"tone":"professional"|"friendly"|"quick"}]}',
    user: (b) => `Message: "${b.messageText ?? ""}"`,
  },
  summarize: {
    system:
      'Summarize the conversation concisely. Respond with JSON: {"summary":string,"keyPoints":string[],"actionItems":string[]}',
    user: (b) =>
      (b.messages ?? []).map((m: any) => `${m.role}: ${m.content}`).join("\n") || "No messages provided",
  },
  "extract-tasks": {
    system:
      'Extract actionable tasks. Respond with JSON: {"tasks":[{"title":string,"priority":"low"|"medium"|"high","dueDate":string,"category":string}]}',
    user: (b) => `Message: "${b.messageText ?? ""}"`,
  },
  "sentiment-analysis": {
    system:
      'Analyze sentiment. Respond with JSON: {"sentiment":"positive"|"neutral"|"negative","confidence":number,"suggestedReactions":string[],"tone":string}',
    user: (b) => `Message: "${b.messageText ?? ""}"`,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json();
    const { action, prompt, messageText, system_prompt, messages } = body ?? {};

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_GEMINI_API_KEY");

    // Structured action path — keeps existing app features working
    if (action && ACTIONS[action]) {
      const spec = ACTIONS[action];
      const text = await callGemini(GEMINI_API_KEY, spec.system, spec.user(body), true);
      if (!text) return json({ error: "Gemini failed" }, 502);
      let data: any;
      try {
        data = JSON.parse(text.replace(/^```json\s*|```$/g, "").trim());
      } catch {
        data = action === "summarize" ? { summary: text } : { raw: text };
      }
      if (action === "smart-reply" && Array.isArray(data?.replies)) {
        data.replies = data.replies.map((r: any) =>
          typeof r === "string" ? { text: r, tone: "friendly" } : r,
        );
      }
      return json({ success: true, data });
    }

    // Generic prompt path
    const userText =
      prompt ||
      messageText ||
      messages?.map((m: any) => `${m.role}: ${m.content}`).join("\n") ||
      "";
    if (!userText) return json({ error: "No prompt" }, 400);

    const systemInstruction =
      system_prompt || "You are CHATR AI — a concise, intelligent executive assistant.";
    const text = await callGemini(GEMINI_API_KEY, systemInstruction, userText);
    if (!text) return json({ error: "Gemini failed" }, 502);

    return json({ success: true, response: text, summary: text });
  } catch (e: any) {
    console.error("ai-chat-assistant error:", e);
    return json({ error: e?.message ?? "Unknown error" }, 500);
  }
});
