import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { caller_id, caller_phone, receiver_id } = await req.json();

    if (!receiver_id || (!caller_id && !caller_phone)) {
      return new Response(JSON.stringify({ error: "caller and receiver info required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Get caller profile and trust score
    let callerProfile = null;
    let trustScore = null;

    if (caller_id) {
      const [profileRes, trustRes] = await Promise.all([
        supabase.from("profiles").select("username, avatar_url, primary_handle, phone_number").eq("id", caller_id).single(),
        supabase.from("user_trust_scores").select("trust_score, verification_level").eq("user_id", caller_id).single(),
      ]);
      callerProfile = profileRes.data;
      trustScore = trustRes.data;
    } else if (caller_phone) {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, primary_handle")
        .eq("phone_number", caller_phone)
        .maybeSingle();
      
      if (data) {
        callerProfile = data;
        const { data: ts } = await supabase
          .from("user_trust_scores")
          .select("trust_score, verification_level")
          .eq("user_id", data.id)
          .single();
        trustScore = ts;
      }
    }

    // 2. Check contact intelligence
    let contactIntel = null;
    if (caller_id) {
      const { data } = await supabase
        .from("contact_intelligence")
        .select("pickup_likelihood, preferred_route, total_calls, missed_calls, last_outcome")
        .eq("user_id", receiver_id)
        .eq("contact_id", caller_id)
        .maybeSingle();
      contactIntel = data;
    }

    // 3. Check spam reports
    let spamCount = 0;
    if (caller_id) {
      const { count } = await supabase
        .from("trust_factors")
        .select("*", { count: "exact", head: true })
        .eq("user_id", caller_id)
        .eq("factor_type", "spam_report");
      spamCount = count || 0;
    }

    // 4. Check if caller is blocked
    let isBlocked = false;
    if (caller_id) {
      const { data } = await supabase
        .from("blocked_contacts")
        .select("id")
        .eq("user_id", receiver_id)
        .eq("blocked_user_id", caller_id)
        .maybeSingle();
      isBlocked = !!data;
    }

    // 5. Determine risk level and intent
    const score = trustScore?.trust_score ?? 50;
    let riskLevel: "safe" | "medium" | "high" = "medium";
    let intent = "unknown";
    let confidence = 50;

    if (isBlocked) {
      riskLevel = "high";
      intent = "blocked_contact";
      confidence = 100;
    } else if (spamCount > 3) {
      riskLevel = "high";
      intent = "likely_spam";
      confidence = 85 + Math.min(spamCount * 2, 10);
    } else if (score >= 80 && contactIntel) {
      riskLevel = "safe";
      intent = "known_contact";
      confidence = 90;
    } else if (score >= 60) {
      riskLevel = "safe";
      intent = "verified_user";
      confidence = 75;
    } else if (score < 30) {
      riskLevel = "high";
      intent = "suspicious";
      confidence = 70;
    }

    // 6. Use AI for advanced screening if needed
    let aiScreening = null;
    if (riskLevel === "medium" || riskLevel === "high") {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        try {
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                {
                  role: "system",
                  content: "You are a call screening AI. Analyze the caller data and provide a brief intent classification. Respond in JSON format: {\"intent\": \"personal|business|sales|fraud|unknown\", \"confidence\": 0-100, \"summary\": \"brief description\"}",
                },
                {
                  role: "user",
                  content: JSON.stringify({
                    caller_name: callerProfile?.username,
                    trust_score: score,
                    spam_reports: spamCount,
                    call_history: contactIntel ? {
                      total_calls: contactIntel.total_calls,
                      missed: contactIntel.missed_calls,
                      pickup_rate: contactIntel.pickup_likelihood,
                    } : null,
                    is_registered: !!callerProfile,
                  }),
                },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "classify_caller",
                  description: "Classify the incoming caller",
                  parameters: {
                    type: "object",
                    properties: {
                      intent: { type: "string", enum: ["personal", "business", "sales", "fraud", "unknown"] },
                      confidence: { type: "number" },
                      summary: { type: "string" },
                    },
                    required: ["intent", "confidence", "summary"],
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "classify_caller" } },
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
            if (toolCall) {
              aiScreening = JSON.parse(toolCall.function.arguments);
              intent = aiScreening.intent;
              confidence = aiScreening.confidence;
            }
          }
        } catch (e) {
          console.error("AI screening failed:", e);
        }
      }
    }

    return new Response(JSON.stringify({
      caller: {
        name: callerProfile?.username || "Unknown",
        avatar: callerProfile?.avatar_url,
        handle: callerProfile?.primary_handle ? `@${callerProfile.primary_handle}` : null,
        is_registered: !!callerProfile,
      },
      trust: {
        score,
        level: trustScore?.verification_level || "unverified",
        tier: score >= 70 ? "safe" : score >= 40 ? "unknown" : "risky",
      },
      screening: {
        risk_level: riskLevel,
        intent,
        confidence,
        summary: aiScreening?.summary || (
          riskLevel === "safe" ? "Trusted caller" :
          riskLevel === "high" ? "Exercise caution" :
          "Unknown caller"
        ),
        is_blocked: isBlocked,
        spam_reports: spamCount,
      },
      history: contactIntel ? {
        total_calls: contactIntel.total_calls,
        pickup_rate: Math.round((contactIntel.pickup_likelihood || 0) * 100),
        preferred_route: contactIntel.preferred_route,
      } : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Call screening error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
