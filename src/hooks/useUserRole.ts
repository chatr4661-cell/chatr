import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "moderator" | "user" | "ceo";

export function useUserRole() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDesignatedAdmin, setIsDesignatedAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) {
            setRoles([]);
            setIsDesignatedAdmin(false);
            setLoading(false);
          }
          return;
        }

        // Check if verified user account phone corresponds to designated administrator (9717845477)
        const userPhone = user.phone || (user.user_metadata?.phone as string) || '';
        const cleanUserPhone = userPhone.replace(/\D/g, '');
        let isFounder = cleanUserPhone.endsWith('9717845477');

        // Check profiles table for phone_number as additional verified source
        if (!isFounder) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("phone_number")
            .eq("id", user.id)
            .maybeSingle();
          const cleanProfilePhone = (profile?.phone_number || '').replace(/\D/g, '');
          if (cleanProfilePhone.endsWith('9717845477')) {
            isFounder = true;
          }
        }

        // Fetch roles from user_roles
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
        const mappedRoles = (data || []).map((r: any) => r.role as AppRole);

        if (isFounder && !mappedRoles.includes("admin")) {
          mappedRoles.push("admin");
          // Self-heal: ensure db has admin role recorded
          supabase.from("user_roles").insert({ user_id: user.id, role: "admin" as any }).select().maybeSingle().catch(() => {});
        }
        if (isFounder && !mappedRoles.includes("ceo")) {
          mappedRoles.push("ceo");
        }

        if (mounted) {
          setRoles(mappedRoles);
          setIsDesignatedAdmin(isFounder);
          setLoading(false);
        }
      } catch (err) {
        console.warn("[useUserRole] Error loading roles:", err);
        if (mounted) setLoading(false);
      }
    };

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = isDesignatedAdmin || roles.includes("admin") || roles.includes("ceo");

  return {
    roles,
    loading,
    isCEO: isDesignatedAdmin || roles.includes("ceo"),
    isAdmin,
    hasRole: (r: AppRole) => roles.includes(r) || (isDesignatedAdmin && (r === "admin" || r === "ceo")),
  };
}
