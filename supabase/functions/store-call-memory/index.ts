import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StoreMemoryRequest {
  callId?: string;
  peerId?: string;
  peerPhone?: string;
  transcript?: string;
  // Optional: store explicit memories directly without AI extraction
  memories?: Array<{
    content: string;
    memoryType?: string;
    importance?: number;
    tags?: string[];
    expiresAt?: string | null;
  }>;
}

interface ExtractedMemory {
  content: string;
  memory_type: string;
  importance: number;
  tags: string[];
}

const VALID_TYPES = ["fact", "preference", "action_item", "person", "event", "other"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body: StoreMemoryRequest = await req.json().catch(() => ({}));
    const { callId, peerId, peerPhone } = body;

    console.log("[store-call-memory] user:", userId, "call:", callId);

    // Resolve transcript: prefer provided, else fetch from call_transcriptions
    let transcript = body.transcript?.trim();
    if (!transcript && callId) {
      const { data: rows } = await supabase
        .from("call_transcriptions")
        .select("text")
        .eq("call_id", callId)
        .order("timestamp", { ascending: true });
      if (rows && rows.length > 0) {
        transcript = rows.map((r: { text: string }) => r.text).join(" ");
      }
    }

    let toStore: ExtractedMemory[] = [];

    // Path 1: caller supplied explicit memories
    if (Array.isArray(body.memories) && body.memories.length > 0) {
      toStore = body.memories
        .filter((m) => m && typeof m.content === "string" && m.content.trim().length > 0)
        .map((m) => ({
          content: m.content.trim().slice(0, 2000),
          memory_type: VALID_TYPES.includes(m.memoryType ?? "") ? (m.memoryType as string) : "fact",
          importance: clampImportance(m.importance),
          tags: Array.isArray(m.tags) ? m.tags.slice(0, 10).map(String) : [],
        }));
    } else if (transcript) {
      // Path 2: AI extraction from transcript
      toStore = await extractMemories(transcript);
    }

    if (toStore.length === 0) {
      return new Response(
        JSON.stringify({ stored: 0, memories: [], message: "No memories to store" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const records = toStore.map((m) => ({
      user_id: userId,
      call_id: callId ?? null,
      peer_id: peerId ?? null,
      peer_phone: peerPhone ?? null,
      memory_type: m.memory_type,
      content: m.content,
      importance: m.importance,
      tags: m.tags,
      source: "call",
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("call_memories")
      .insert(records)
      .select();

    if (insertError) {
      console.error("[store-call-memory] insert error:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[store-call-memory] stored", inserted?.length ?? 0, "memories");

    return new Response(
      JSON.stringify({ stored: inserted?.length ?? 0, memories: inserted ?? [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[store-call-memory] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function clampImportance(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}

async function extractMemories(transcript: string): Promise<ExtractedMemory[]> {
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_AI_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  const prompt = `You are an AI memory extractor. From the call transcript below, extract durable, useful facts worth remembering for future conversations (preferences, personal facts, commitments, important events, names/relationships). Ignore small talk and ephemeral details.

Transcript:
"${transcript.slice(0, 12000)}"

Return ONLY a JSON array (no markdown). Each item:
{"content": string, "memory_type": one of ["fact","preference","action_item","person","event","other"], "importance": 1-5, "tags": string[]}
Return [] if nothing is worth remembering.`;

  // Prefer Lovable AI Gateway when available
  try {
    if (lovableKey) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const text = data.choices?.[0]?.message?.content ?? "";
        return parseMemories(text);
      }
      console.error("[store-call-memory] Lovable AI error:", resp.status, await resp.text());
    }
  } catch (e) {
    console.error("[store-call-memory] Lovable AI exception:", e);
  }

  // Fallback to direct Gemini
  if (geminiApiKey) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
          }),
        },
      );
      if (resp.ok) {
        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        return parseMemories(text);
      }
      console.error("[store-call-memory] Gemini error:", resp.status);
    } catch (e) {
      console.error("[store-call-memory] Gemini exception:", e);
    }
  }

  return [];
}

function parseMemories(text: string): ExtractedMemory[] {
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m: unknown): m is Record<string, unknown> => !!m && typeof m === "object")
      .map((m) => ({
        content: String((m as { content?: unknown }).content ?? "").trim().slice(0, 2000),
        memory_type: VALID_TYPES.includes(String((m as { memory_type?: unknown }).memory_type))
          ? String((m as { memory_type?: unknown }).memory_type)
          : "fact",
        importance: clampImportance((m as { importance?: unknown }).importance),
        tags: Array.isArray((m as { tags?: unknown }).tags)
          ? ((m as { tags: unknown[] }).tags).slice(0, 10).map(String)
          : [],
      }))
      .filter((m) => m.content.length > 0);
  } catch (e) {
    console.error("[store-call-memory] parse error:", e);
    return [];
  }
}
