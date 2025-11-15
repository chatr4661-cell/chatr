import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { postId, content, action } = await req.json();

    // Basic content filtering
    const forbiddenWords = ["spam", "scam", "abuse"];
    const containsForbidden = forbiddenWords.some(word => 
      content.toLowerCase().includes(word)
    );

    if (containsForbidden || action === "flag") {
      await supabase
        .from("world_posts")
        .update({ 
          moderation_status: "flagged",
          moderation_reason: containsForbidden ? "Contains prohibited content" : "User reported"
        })
        .eq("id", postId);

      return new Response(
        JSON.stringify({ moderated: true, action: "flagged" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ moderated: false, action: "approved" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
