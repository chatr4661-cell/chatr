// Engineering Agent — converts a CEO plan into actionable dev tasks (specs, API plans, Lovable prompts)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the Engineering Agent (CTO) for CHATR.
Convert a strategic plan or feature request into concrete, shippable dev tasks.

Output a single JSON object:
{
  "tasks": [
    {
      "title": "Short imperative task title",
      "description": "1-3 sentence summary",
      "task_type": "feature" | "bug" | "refactor" | "infra" | "research",
      "priority": "low" | "medium" | "high",
      "estimated_hours": number,
      "feature_spec": "Detailed spec: user story, acceptance criteria, edge cases.",
      "api_plan": "Endpoints, payloads, RLS implications (or 'N/A').",
      "lovable_prompt": "A copy-paste prompt to give to Lovable to build this exact piece."
    }
  ]
}

Rules:
- Generate 3-7 tasks per request.
- Each lovable_prompt must be self-contained, specific, and reference real CHATR file/route patterns.
- Prefer small shippable tasks over giant ones.
- task_type "feature" by default.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).in("role", ["ceo", "admin"]).maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const { plan_id, brief } = await req.json().catch(() => ({}));

    let context = brief || "";
    if (plan_id) {
      const { data: plan } = await supabase.from("cc_plans").select("title, description, payload").eq("id", plan_id).maybeSingle();
      if (plan) {
        context = `Plan: ${plan.title}\n${plan.description || ""}\nExisting tasks: ${JSON.stringify(plan.payload?.tasks || [])}`;
      }
    }
    if (!context) context = "Generate the next 5 most impactful engineering tasks for CHATR this week.";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: context },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Add credits in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiRes.text(); console.error("AI error", aiRes.status, t);
      throw new Error("AI gateway failure");
    }

    const aiData = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiData.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }

    const tasksIn: any[] = Array.isArray(parsed.tasks) ? parsed.tasks.slice(0, 8) : [];
    const rows = tasksIn.map(t => ({
      plan_id: plan_id || null,
      title: String(t.title || "Untitled task").slice(0, 200),
      description: String(t.description || ""),
      task_type: ["feature", "bug", "refactor", "infra", "research"].includes(t.task_type) ? t.task_type : "feature",
      priority: ["low", "medium", "high"].includes(t.priority) ? t.priority : "medium",
      estimated_hours: t.estimated_hours ? Number(t.estimated_hours) : null,
      feature_spec: t.feature_spec || null,
      api_plan: t.api_plan || null,
      lovable_prompt: t.lovable_prompt || null,
      status: "pending",
    }));

    const { data: inserted, error: insErr } = await supabase.from("cc_dev_tasks").insert(rows).select();
    if (insErr) throw insErr;

    await supabase.from("cc_logs").insert({
      agent: "engineering_agent",
      action: `Generated ${inserted?.length || 0} dev tasks`,
      level: "success",
      plan_id: plan_id || null,
      details: { count: inserted?.length || 0 },
    });

    return new Response(JSON.stringify({ tasks: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cc-engineering-agent error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
