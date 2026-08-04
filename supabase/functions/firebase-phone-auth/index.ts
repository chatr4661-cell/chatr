import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * CHATR canonical phone-auth session exchange.
 *
 * Contract: the client sends a Firebase ID TOKEN obtained after a successful
 * phone OTP verification. This function verifies that token with Google, then
 * mints a backend session for the canonical user for that phone number.
 *
 * Security rules enforced here:
 *  - A phone number is NEVER a credential. Passwords are server-generated
 *    high-entropy values, rotated on every exchange, never returned.
 *  - No caller may obtain a session without a Google-verified ID token whose
 *    phone_number matches the requested phone number.
 *  - Never log tokens, OTPs, passwords or session material.
 */

const FIREBASE_API_KEY =
  Deno.env.get("FIREBASE_API_KEY") ?? "AIzaSyDUUbQlOmkHsrEyMw9AmQBXbjNx11iM7w4";
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") ?? "chatr-91067";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** E.164 digits only, used for the canonical internal identifier. */
const digitsOnly = (phone: string) => phone.replace(/[^\d]/g, "");

const canonicalEmail = (phone: string) => `${digitsOnly(phone)}@chatr.local`;

const randomPassword = () => {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

/** Verify a Firebase ID token with Google and return its claims. */
async function verifyFirebaseIdToken(idToken: string) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!res.ok) {
    return null;
  }

  const data = await res.json().catch(() => null);
  const user = data?.users?.[0];
  if (!user?.localId || !user?.phoneNumber) return null;
  return { uid: user.localId as string, phoneNumber: user.phoneNumber as string };
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    try {
      const body = await req.json().catch(() => null);
      const phoneNumber: string | undefined = body?.phone_number;
      const idToken: string | undefined = body?.firebase_id_token ?? body?.id_token;

      if (!phoneNumber || typeof phoneNumber !== "string") {
        return json({ error: "Missing phone_number" }, 400);
      }
      if (!idToken || typeof idToken !== "string") {
        // Legacy clients sent only firebase_uid. That path allowed anyone to
        // mint a session for any phone number and is permanently disabled.
        return json(
          {
            error:
              "Missing firebase_id_token. Update the CHATR client — unverified phone auth is no longer supported.",
          },
          400
        );
      }
      if (digitsOnly(phoneNumber).length < 10) {
        return json({ error: "Invalid phone number" }, 400);
      }

      const claims = await verifyFirebaseIdToken(idToken);
      if (!claims) {
        console.warn("[phone-auth] ID token rejected by Google");
        return json({ error: "Phone verification failed. Please try again." }, 401);
      }

      if (digitsOnly(claims.phoneNumber) !== digitsOnly(phoneNumber)) {
        console.warn("[phone-auth] phone/token mismatch rejected");
        return json({ error: "Phone verification failed. Please try again." }, 401);
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      // Server-side abuse guard: cap exchanges per phone per hour.
      const rateKey = digitsOnly(phoneNumber);
      try {
        const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count } = await supabaseAdmin
          .from("auth_exchange_attempts")
          .select("id", { count: "exact", head: true })
          .eq("phone_key", rateKey)
          .gte("created_at", since);
        if ((count ?? 0) >= 20) {
          return json({ error: "Too many attempts. Please try again later." }, 429);
        }
        await supabaseAdmin.from("auth_exchange_attempts").insert({ phone_key: rateKey });
      } catch (e) {
        console.warn("[phone-auth] rate-limit bookkeeping unavailable");
      }

      const email = canonicalEmail(phoneNumber);
      const password = randomPassword();

      // Canonical user lookup for this phone number (shared by every CHATR
      // domain/client — chatr.chat, chatrchat.in, native apps).
      let userId: string | null = null;
      let isNewUser = false;

      // Paginate defensively so lookup stays correct as the user base grows.
      for (let page = 1; page <= 50 && !userId; page++) {
        const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        const match = data?.users?.find((u) => u.email === email);
        if (match) userId = match.id;
        if (!data || (data.users?.length ?? 0) < 1000) break;
      }

      if (userId) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password,
          phone_confirm: true,
          user_metadata: { phone_number: phoneNumber, firebase_uid: claims.uid },
        });
        if (updateError) {
          console.error("[phone-auth] credential rotation failed:", updateError.message);
          return json({ error: "Authentication failed. Please try again." }, 400);
        }
      } else {
        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { phone_number: phoneNumber, firebase_uid: claims.uid },
        });
        if (createError || !created?.user) {
          console.error("[phone-auth] user creation failed:", createError?.message);
          return json({ error: "Authentication failed. Please try again." }, 400);
        }
        userId = created.user.id;
        isNewUser = true;
      }

      // Sign in with the freshly rotated, server-only password.
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );

      const { data: signIn, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !signIn?.session) {
        console.error("[phone-auth] session mint failed:", signInError?.message);
        return json({ error: "Authentication failed. Please try again." }, 400);
      }

      return json({
        session: signIn.session,
        user: signIn.user,
        isNewUser,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[phone-auth] unexpected error:", message);
      return json({ error: "Authentication failed. Please try again." }, 500);
    }
});
