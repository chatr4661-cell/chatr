// Sales Agent — generates leads + outreach messages from a plan or ICP
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the Sales Agent for CHATR (a communication super-app for India).
Generate a batch of high-quality B2B leads matching the given Ideal Customer Profile (ICP),
plus a tailored LinkedIn DM and a follow-up email per lead.

Output a single JSON object:
{
  "icp_summary": "1-line ICP description",
  "leads": [
    {
      "full_name": "Realistic person name",
      "company": "Real or realistic company name",
      "role_title": "e.g., Founder, Head of Growth",
      "email": "name@company.com (best guess)",
      "linkedin_url": "https://www.linkedin.com/in/handle",
      "location": "City, Country",
      "industry": "industry",
      "icp_match_score": 0-100,
      "outreach": {
        "linkedin_dm": "Personalized 2-3 sentence opener referencing something specific.",
        "follow_up_email": "Subject + 4-6 sentence value pitch + clear CTA."
      }
    }
  ]
}

Rules:
- Generate exactly the requested number of leads (default 5, max 10).
- Make leads diverse but ALL match the ICP.
- Outreach must be specific, no generic spam.
- Lead with value, not a pitch.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const { icp, count = 5, plan_id } = await req.json().catch(() => ({}));
    const n = Math.min(Math.max(Number(count) || 5, 1), 10);
    const userPrompt = `Generate ${n} leads matching this ICP: ${icp || "Indian early-stage SaaS founders (Seed–Series A) who'd benefit from a unified communication + earning super-app for their teams and customers."}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
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

    const leadsIn: any[] = Array.isArray(parsed.leads) ? parsed.leads.slice(0, n) : [];
    const inserted: any[] = [];

    for (const l of leadsIn) {
      const { data: leadRow, error: leadErr } = await supabase.from("cc_leads").insert({
        plan_id: plan_id || null,
        full_name: String(l.full_name || "Unknown").slice(0, 200),
        company: String(l.company || "").slice(0, 200),
        role_title: String(l.role_title || "").slice(0, 200),
        email: l.email || null,
        linkedin_url: l.linkedin_url || null,
        location: l.location || null,
        industry: l.industry || null,
        icp_match_score: Math.min(Math.max(parseInt(l.icp_match_score) || 70, 0), 100),
        status: "new",
        source: "ai_generated",
      }).select().single();

      if (leadErr) { console.error("Lead insert error", leadErr); continue; }
      inserted.push(leadRow);

      // Outreach drafts
      const dm = l.outreach?.linkedin_dm;
      const email = l.outreach?.follow_up_email;
      const outreachRows = [];
      if (dm) outreachRows.push({
        lead_id: leadRow.id, plan_id: plan_id || null, channel: "linkedin",
        message_body: String(dm), sequence_step: 1, status: "draft",
      });
      if (email) outreachRows.push({
        lead_id: leadRow.id, plan_id: plan_id || null, channel: "email",
        subject: "Quick idea for " + (leadRow.company || "you"),
        message_body: String(email), sequence_step: 2, status: "draft",
      });
      if (outreachRows.length) await supabase.from("cc_outreach").insert(outreachRows);
    }

    // Update today's revenue metric
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase.from("cc_revenue_metrics").select("*").eq("metric_date", today).maybeSingle();
    if (existing) {
      await supabase.from("cc_revenue_metrics").update({
        leads_generated: (existing.leads_generated || 0) + inserted.length,
      }).eq("id", existing.id);
    } else {
      await supabase.from("cc_revenue_metrics").insert({
        metric_date: today, leads_generated: inserted.length,
      });
    }

    await supabase.from("cc_logs").insert({
      agent: "sales_agent",
      action: `Generated ${inserted.length} leads`,
      level: "success",
      plan_id: plan_id || null,
      details: { icp_summary: parsed.icp_summary, count: inserted.length },
    });

    return new Response(JSON.stringify({ leads: inserted, icp_summary: parsed.icp_summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cc-sales-agent error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
