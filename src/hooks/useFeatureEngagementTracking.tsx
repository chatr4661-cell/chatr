import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Map URL prefix → (feature_key, module). Tracks which app feature
// the user is currently viewing so the smart push engine can personalize.
const ROUTE_MAP: { prefix: string; feature_key: string; module: string }[] = [
  { prefix: "/earn", feature_key: "earn_micro_tasks", module: "earn" },
  { prefix: "/jobs", feature_key: "chatr_jobs", module: "jobs" },
  { prefix: "/food", feature_key: "food_delivery", module: "food" },
  { prefix: "/local-deals", feature_key: "local_deals", module: "deals" },
  { prefix: "/chatr-games", feature_key: "chatr_games", module: "games" },
  { prefix: "/marketplace", feature_key: "marketplace", module: "marketplace" },
  { prefix: "/healthcare", feature_key: "healthcare", module: "healthcare" },
  { prefix: "/health-wallet", feature_key: "healthcare", module: "healthcare" },
  { prefix: "/referrals", feature_key: "contacts_invite", module: "contacts" },
  { prefix: "/chatr-plus", feature_key: "chatr_plus", module: "chatr_plus" },
  { prefix: "/ai", feature_key: "ai_assistant", module: "ai" },
  { prefix: "/dhandha", feature_key: "dhandha_business", module: "business" },
  { prefix: "/communities", feature_key: "communities", module: "communities" },
  { prefix: "/stories", feature_key: "stories", module: "stories" },
  { prefix: "/caller-id", feature_key: "caller_id", module: "caller_id" },
  { prefix: "/chatr-points", feature_key: "wallet_points", module: "wallet" },
];

export function useFeatureEngagementTracking() {
  const loc = useLocation();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    const path = loc.pathname;
    const match = ROUTE_MAP.find((r) => path === r.prefix || path.startsWith(r.prefix + "/"));
    if (!match) return;

    // Dedupe within a single navigation session
    const key = `${match.feature_key}:${path}`;
    if (lastTrackedRef.current === key) return;
    lastTrackedRef.current = key;

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (!userId) return;

        const now = new Date().toISOString();
        const { data: existing } = await supabase
          .from("user_feature_engagement")
          .select("id, visit_count, first_visited_at")
          .eq("user_id", userId)
          .eq("feature_key", match.feature_key)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("user_feature_engagement")
            .update({
              visit_count: (existing.visit_count ?? 0) + 1,
              last_visited_at: now,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("user_feature_engagement").insert({
            user_id: userId,
            feature_key: match.feature_key,
            module: match.module,
            visit_count: 1,
            first_visited_at: now,
            last_visited_at: now,
          });
        }
      } catch (e) {
        // silent
      }
    })();
  }, [loc.pathname]);
}
