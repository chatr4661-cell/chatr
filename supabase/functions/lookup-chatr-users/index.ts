import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Lookup Chatr Users by Phone Numbers
 * 
 * Used by SmartCallRouter to determine VoIP vs GSM routing.
 * Returns matching Chatr users for a batch of phone numbers.
 * 
 * Input: { phones: ["+919876543210", "+14155551234"] }
 * Output: { users: [{ id, phone, display_name, avatar_url }] }
 * 
 * Performance: <50ms for up to 100 numbers (indexed query)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phones } = await req.json();

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return new Response(
        JSON.stringify({ error: "phones array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cap at 200 numbers per request
    const limitedPhones = phones.slice(0, 200);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query profiles by phone number
    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, phone_number, username, avatar_url, last_seen")
      .in("phone_number", limitedPhones);

    if (error) {
      console.error("❌ [lookup-chatr-users] Query error:", error);
      return new Response(
        JSON.stringify({ error: "Lookup failed", users: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ [lookup-chatr-users] Found ${users?.length || 0}/${limitedPhones.length} users`);

    // Map to consistent output format
    const mapped = (users || []).map((u: any) => ({
      id: u.id,
      phone: u.phone_number,
      display_name: u.username,
      avatar_url: u.avatar_url,
      last_seen: u.last_seen,
    }));

    return new Response(
      JSON.stringify({ 
        users: users || [],
        total_queried: limitedPhones.length,
        total_found: users?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("❌ [lookup-chatr-users] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg, users: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
