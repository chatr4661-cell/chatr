import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * sync-contacts
 * Privacy-safe ingestion endpoint for the crowdsourced phonebook (Chatr Shield).
 *
 * The client sends normalized contact names + phone numbers. We hash the phone
 * numbers server-side (SHA-256) so raw numbers are NEVER persisted, then push a
 * single batch into contacts_sync_queue. A pg_cron worker drains the queue every
 * 5 minutes into the global hashed phonebook.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface IncomingContact {
  name?: string;
  phone?: string;
}

// E.164 normalization (matches app-wide standard: default +91 for local numbers)
function normalizePhone(raw: string): string {
  const trimmed = (raw ?? "").trim();
  const hasPlus = trimmed.startsWith("+");
  const hasDoubleZero = trimmed.startsWith("00");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (hasPlus) return `+${digits}`;
  if (hasDoubleZero) return `+${digits.slice(2)}`;
  if (digits.length > 10) return `+${digits}`;
  return `+91${digits}`;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Parse + validate body
    let body: { contacts?: IncomingContact[]; consent?: boolean };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const consent = body?.consent === true;
    if (!consent) {
      return new Response(
        JSON.stringify({ error: "Privacy consent required to sync contacts" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contacts = Array.isArray(body?.contacts) ? body.contacts : [];
    if (contacts.length === 0) {
      return new Response(JSON.stringify({ error: "No contacts provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (contacts.length > 5000) {
      return new Response(JSON.stringify({ error: "Batch too large (max 5000)" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build hashed payload (dedupe by hash within the batch)
    const seen = new Set<string>();
    const payload: { phone_hash: string; name: string }[] = [];
    for (const c of contacts) {
      const name = (c?.name ?? "").trim();
      const normalized = normalizePhone(c?.phone ?? "");
      if (!name || !normalized) continue;
      const phone_hash = await sha256Hex(normalized);
      if (seen.has(phone_hash)) continue;
      seen.add(phone_hash);
      payload.push({ phone_hash, name });
    }

    if (payload.length === 0) {
      return new Response(JSON.stringify({ error: "No valid contacts after normalization" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inserted, error: insertErr } = await admin
      .from("contacts_sync_queue")
      .insert({
        user_id: userId,
        payload,
        consent_given: true,
        item_count: payload.length,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("[sync-contacts] insert failed:", insertErr.message);
      return new Response(JSON.stringify({ error: "Failed to queue contacts" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, queued: payload.length, batch_id: inserted.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[sync-contacts] error:", err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
