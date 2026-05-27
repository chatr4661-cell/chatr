// Notify all vendors/admins when a new home_solutions booking arrives.
// Sends push notification (via send-push-notification) + SMS (via send-sms).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { bookingId } = await req.json();
    if (!bookingId) {
      return new Response(JSON.stringify({ error: "bookingId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, key);

    const { data: booking, error: bErr } = await supabase
      .from("home_solutions_bookings")
      .select("id,item_title,contact_name,contact_phone,address,price_label,category,quantity,preferred_date")
      .eq("id", bookingId)
      .single();
    if (bErr || !booking) throw new Error(bErr?.message || "Booking not found");

    // Find vendor + admin recipients
    const { data: roles, error: rErr } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["vendor", "admin"]);
    if (rErr) throw rErr;

    const userIds = Array.from(new Set((roles || []).map((r) => r.user_id)));
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, recipients: 0, note: "no vendors" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const title = "🆕 New Home Solutions Booking";
    const body = `${booking.item_title} • ${booking.contact_name} • ${booking.price_label}`;

    // Phones for SMS
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, phone_number")
      .in("id", userIds);

    // Fan-out push notifications
    const pushResults = await Promise.allSettled(
      userIds.map((uid) =>
        supabase.functions.invoke("send-push-notification", {
          body: {
            userId: uid,
            title,
            body,
            notificationType: "update",
            data: {
              click_action: "/admin/home-solutions",
              bookingId: booking.id,
              category: booking.category,
            },
          },
        })
      )
    );

    // Fan-out SMS (best effort)
    const smsBody = `New Chatr booking: ${booking.item_title} by ${booking.contact_name} (${booking.contact_phone}). ${booking.price_label}. Address: ${booking.address}. Open: /admin/home-solutions`;
    const smsResults = await Promise.allSettled(
      (profiles || [])
        .filter((p) => p.phone_number)
        .map((p) =>
          supabase.functions.invoke("send-sms", {
            body: { to: p.phone_number, body: smsBody },
          })
        )
    );

    const pushOk = pushResults.filter((r) => r.status === "fulfilled").length;
    const smsOk = smsResults.filter((r) => r.status === "fulfilled").length;

    console.log(`[notify-home-solutions-vendors] booking=${bookingId} push=${pushOk}/${userIds.length} sms=${smsOk}`);

    return new Response(
      JSON.stringify({ ok: true, recipients: userIds.length, pushOk, smsOk }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[notify-home-solutions-vendors] error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
